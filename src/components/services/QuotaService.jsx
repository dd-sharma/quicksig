import { ABTest, Organization, UsageTracking, VisitorSession } from "@/api/entities";
import { format, subMonths } from "date-fns";

// Simple in-memory cache (front-end session scope)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function k(key) {
  return `quota:${key}`;
}
function setCache(key, value) {
  cache.set(k(key), { value, ts: Date.now() });
}
function getCache(key) {
  const entry = cache.get(k(key));
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(k(key));
    return null;
  }
  return entry.value;
}

function monthYear(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Fallback stats to prevent cascading UI failures
function defaultStats() {
  const my = monthYear();
  const nextReset = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), "yyyy-MM-dd");
  return {
    monthYear: my,
    visitorsUsed: 0,
    visitorsQuota: 10000,
    runningCount: 0,
    concurrentLimit: 3,
    planType: "free",
    quotaResetDate: nextReset,
  };
}

async function ensureUsageRow(organizationId, my) {
  const rows = await UsageTracking.filter({ organization_id: organizationId, month_year: my });
  if (rows && rows.length) return rows[0];
  return await UsageTracking.create({
    organization_id: organizationId,
    month_year: my,
    visitors_used: 0,
    tests_created: 0,
    last_updated: new Date().toISOString(),
  });
}

async function getRunningTests(orgId) {
  return ABTest.filter({ organization_id: orgId, test_status: "running" });
}

const QuotaService = {
  // Returns { monthYear, visitorsUsed, visitorsQuota, runningCount, concurrentLimit, planType, quotaResetDate }
  async getUsageStats(organizationId) {
    // Guard: if org is missing, return safe defaults
    if (!organizationId) {
      return defaultStats();
    }

    try {
      const cached = getCache(`stats:${organizationId}`);
      if (cached) return cached;

      const org = await Organization.get(organizationId);
      const my = monthYear();

      const usage = await ensureUsageRow(organizationId, my);

      // Prefer persisted visitors_used; if zero, approximate with sessions in current month
      let visitorsUsed = usage.visitors_used || 0;
      if (!visitorsUsed) {
        const sessions = await VisitorSession.filter({});
        const monthPrefix = my; // YYYY-MM
        const orgTests = await ABTest.filter({ organization_id: organizationId });
        const testIds = new Set(orgTests.map(t => t.id));
        visitorsUsed = sessions.filter(s => {
          if (!s.created_at && !s.created_date) return false;
          const iso = (s.created_at || s.created_date).slice(0, 7);
          return testIds.has(s.test_id) && iso === monthPrefix;
        }).length;
      }

      const running = await getRunningTests(organizationId);

      const stats = {
        monthYear: my,
        visitorsUsed,
        visitorsQuota: org.monthly_visitor_quota ?? 10000,
        runningCount: running.length,
        concurrentLimit: org.concurrent_test_limit ?? 3,
        planType: org.plan_type || org.subscription_tier || "free",
        quotaResetDate:
          org.quota_reset_date ||
          format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), "yyyy-MM-dd"),
      };

      setCache(`stats:${organizationId}`, stats);
      return stats;
    } catch (error) {
      // Provide safe defaults to avoid cascading UI failures
      console.error("QuotaService.getUsageStats failed:", error);
      return defaultStats();
    }
  },

  // { allowed, remaining, total, used }
  async checkVisitorQuota(organizationId) {
    const stats = await this.getUsageStats(organizationId);
    const remaining = Math.max(0, (stats.visitorsQuota || 0) - (stats.visitorsUsed || 0));
    return {
      allowed: remaining > 0,
      remaining,
      total: stats.visitorsQuota || 0,
      used: stats.visitorsUsed || 0,
    };
  },

  // { allowed, current, limit }
  async checkConcurrentTestLimit(organizationId) {
    const stats = await this.getUsageStats(organizationId);
    return {
      allowed: stats.runningCount < stats.concurrentLimit,
      current: stats.runningCount,
      limit: stats.concurrentLimit,
    };
  },

  // Increment persisted counter (used by simulator or tracking)
  async incrementVisitorCount(organizationId, count = 1) {
    const my = monthYear();
    const usage = await ensureUsageRow(organizationId, my);
    await UsageTracking.update(usage.id, {
      visitors_used: (usage.visitors_used || 0) + count,
      last_updated: new Date().toISOString(),
    });
    cache.delete(k(`stats:${organizationId}`));
    return this.getUsageStats(organizationId);
  },

  // Manually set visitors_used (for admin override/testing)
  async setVisitorsUsed(organizationId, value) {
    const my = monthYear();
    const usage = await ensureUsageRow(organizationId, my);
    await UsageTracking.update(usage.id, {
      visitors_used: Math.max(0, Number(value) || 0),
      last_updated: new Date().toISOString(),
    });
    cache.delete(k(`stats:${organizationId}`));
    return this.getUsageStats(organizationId);
  },

  // Resets monthly visitors for current month and updates organization's next reset date
  async resetMonthlyQuota(organizationId) {
    const my = monthYear();
    const usage = await ensureUsageRow(organizationId, my);
    await UsageTracking.update(usage.id, {
      visitors_used: 0,
      last_updated: new Date().toISOString(),
    });
    const nextReset = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), "yyyy-MM-dd");
    await Organization.update(organizationId, { quota_reset_date: nextReset });
    cache.delete(k(`stats:${organizationId}`));
    return this.getUsageStats(organizationId);
  },

  // Historical usage for last N months
  // Returns array: [{ key: 'YYYY-MM', month: 'Jan', visitors, exceeded }]
  async getHistoricalUsage(organizationId, months = 6) {
    // Guard: if org is missing, return empty history
    if (!organizationId) return [];

    const cacheHit = getCache(`history:${organizationId}:${months}`);
    if (cacheHit) return cacheHit;

    try {
      const org = await Organization.get(organizationId);
      const quota = org.monthly_visitor_quota ?? 10000;

      // Pull all rows for org (client-side filter)
      const rows = await UsageTracking.filter({ organization_id: organizationId });
      const byKey = new Map(rows.map(r => [r.month_year, r]));

      const out = [];
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const d = subMonths(new Date(now), i);
        const key = monthYear(d);
        const label = format(d, "MMM");
        const row = byKey.get(key);
        const visitors = row?.visitors_used || 0;
        out.push({
          key,
          month: label,
          visitors,
          exceeded: visitors > quota,
        });
      }

      setCache(`history:${organizationId}:${months}`, out);
      return out;
    } catch (error) {
      console.error("QuotaService.getHistoricalUsage failed:", error);
      return [];
    }
  },
};

export default QuotaService;