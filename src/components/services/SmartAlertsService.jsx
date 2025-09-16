import { User } from "@/api/entities";
import { SendEmail } from "@/api/integrations";

const KEY_PREFIX = "ai_alert_"; // localStorage key prefix
function oncePerKey(key, ttlMs = 6 * 60 * 60 * 1000) { // 6h
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
    await SendEmail({
      to: user.email,
      subject: `QuickSig: ${test.test_name} reached significance`,
      body: `Your test "${test.test_name}" reached ${(confidencePct).toFixed(1)}% confidence. Visit the dashboard to review and implement the winner.`
    });
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
  }
};

export default SmartAlertsService;