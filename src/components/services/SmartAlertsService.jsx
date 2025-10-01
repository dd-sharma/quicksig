
import { ABTest, User } from "@/api/entities";
import { SendEmail } from "@/api/integrations";
import EmailNotificationService from "./EmailNotificationService";
import { significanceAlertEmail } from "./EmailTemplates";
import { toast } from "sonner";
import { normalizeABTest } from "@/components/utils/abtestNormalize";

const KEY_PREFIX = "ai_alert_"; // localStorage key prefix
function oncePerKey(key, ttlMs = 60 * 60 * 1000) { // 1 hour by default
  const item = localStorage.getItem(key);
  const now = Date.now();
  if (item) {
    const ts = Number(item);
    if (!Number.isNaN(ts) && now - ts < ttlMs) return false;
  }
  localStorage.setItem(key, String(now));
  return true;
}

const SmartAlertsService = {
  async notifySignificance(test, confidencePct) {
    const key = `${KEY_PREFIX}sig_${test.id}`;
    if (!oncePerKey(key)) return;
    const user = await User.me();
    // Respect user preference
    if (!user?.notification_prefs?.significance_alerts) return;
    // Use central service to build, send, and log
    await EmailNotificationService.sendSignificanceAlert(test, confidencePct);
  },

  async notifyUnusualPattern(test, message) {
    const key = `${KEY_PREFIX}pattern_${test.id}`;
    if (!oncePerKey(key)) return;
    const user = await User.me();
    await SendEmail({
      to: user.email,
      subject: `QuickSig: Unusual pattern in ${test.test_name}`,
      body: `We detected a potentially unusual pattern in "${test.test_name}": ${message}`
    });
  },

  async notifyStagnating(test) {
    const key = `${KEY_PREFIX}stagnating_${test.id}`;
    if (!oncePerKey(key)) return;
    const user = await User.me();
    await SendEmail({
      to: user.email,
      subject: `QuickSig: ${test.test_name} is stagnating`,
      body: `The test "${test.test_name}" is showing limited progress towards significance. Consider adjusting your hypothesis or increasing sample size.`
    });
  },

  async notifyHighImpact(test, monthlyImpact) {
    const key = `${KEY_PREFIX}impact_${test.id}`;
    if (!oncePerKey(key)) return;
    const user = await User.me();
    await SendEmail({
      to: user.email,
      subject: `QuickSig: High business impact detected`,
      body: `We estimate a potential impact of ~$${Math.round(monthlyImpact).toLocaleString()} per month for "${test.test_name}".`
    });
  },

  async scanAndNotify(organization_id) {
    try {
      if (!organization_id) return;
      const me = await User.me();
      const raw = await ABTest.filter({ organization_id }, "-updated_date", 50);
      const tests = (raw || []).map(normalizeABTest);

      const now = Date.now();
      for (const t of (tests || [])) {
        const started = t.started_date ? new Date(t.started_date).getTime() : null;
        const ended = t.ended_date ? new Date(t.ended_date).getTime() : null;
        const running = t.test_status === "running";

        // Long-running > 30 days
        if (running && started && (now - started) > 30 * 24 * 60 * 60 * 1000) {
          const key = `${KEY_PREFIX}30d_${t.id}`;
          if (oncePerKey(key)) {
            toast("Time to decide", { description: `“${t.test_name}” has been running over 30 days.` });
            // Email
            await SendEmail({
              to: me.email,
              subject: `QuickSig: Time to decide on "${t.test_name}"`,
              body: `Your test "${t.test_name}" has been running for over 30 days. Consider making a decision.`
            });
          }
        }

        // Completed (simulate "reached significance")
        if (ended) {
          const key = `${KEY_PREFIX}ready_${t.id}`;
          if (oncePerKey(key)) {
            toast.success(`"${t.test_name}" is ready for decision`);
          }
        }

        // Approaching sample size (heuristic with total_visitors)
        if (running && Number(t.total_visitors || 0) > 2000) {
          const key = `${KEY_PREFIX}approach_${t.id}`;
          if (oncePerKey(key)) {
            toast("Prepare for analysis", { description: `“${t.test_name}” is approaching sufficient sample size.` });
          }
        }
      }
    } catch {
      // silent
    }
  }
};

export default SmartAlertsService;
