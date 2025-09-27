import { ABTest, Organization } from "@/api/entities";
import QuotaService from "@/components/services/QuotaService";

const GRACE_HOURS = 24;

function hoursDiff(from, to = new Date()) {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

const GracePeriodService = {
  async checkGracePeriod(organizationId) {
    const stats = await QuotaService.getUsageStats(organizationId);
    const org = await Organization.get(organizationId);

    const exceeded = (stats.used ?? stats.visitorsUsed) >= (stats.total ?? stats.visitorsQuota);
    const exceededAt = org.quota_exceeded_at ? new Date(org.quota_exceeded_at) : null;

    // Start grace marker if exceeded and not set
    if (exceeded && !exceededAt) {
      await this.startGracePeriod(organizationId);
      return { inGracePeriod: true, hoursRemaining: GRACE_HOURS, quotaExceededAt: new Date().toISOString() };
    }

    if (exceededAt) {
      const hrs = hoursDiff(exceededAt);
      const remaining = Math.max(0, GRACE_HOURS - hrs);
      return { inGracePeriod: remaining > 0, hoursRemaining: remaining, quotaExceededAt: exceededAt.toISOString() };
    }

    return { inGracePeriod: false, hoursRemaining: GRACE_HOURS, quotaExceededAt: null };
  },

  async startGracePeriod(organizationId) {
    await Organization.update(organizationId, {
      quota_exceeded_at: new Date().toISOString()
    });
    await this.sendQuotaWarningEmail(organizationId, "start");
  },

  async handleGracePeriodExpired(organizationId) {
    // Auto-pause all running tests
    const running = await ABTest.filter({ organization_id: organizationId, test_status: "running" });
    await Promise.all(running.map(t => ABTest.update(t.id, { test_status: "paused" })));
    await this.sendQuotaWarningEmail(organizationId, "expired");
  },

  async sendQuotaWarningEmail(organizationId, type = "start") {
    // Mock email: log formatted message
    // In a real app, integrate with Core.SendEmail or external provider.
    const org = await Organization.get(organizationId);
    const subject = type === "start"
      ? `[QuickSig] Quota exceeded – grace period started`
      : `[QuickSig] Grace period ended – tests auto-paused`;
    const body = `[Org: ${org.name}] ${subject} at ${new Date().toISOString()}`;
    // eslint-disable-next-line no-console
    console.log("MOCK EMAIL:", { to: "org-admin@yourdomain", subject, body });

    if (type === "start" && !org.grace_period_notified) {
      await Organization.update(organizationId, { grace_period_notified: true });
    }
  }
};

export default GracePeriodService;