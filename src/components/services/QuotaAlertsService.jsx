import { Organization } from "@/api/entities";
import QuotaService from "./QuotaService";
import { SendEmail } from "@/api/integrations";
import { usageAlertEmail } from "./EmailTemplates";

const QuotaAlertsService = {
  async checkAndNotify(organizationId, recipientEmail) {
    const stats = await QuotaService.getUsageStats(organizationId);
    const org = await Organization.get(organizationId);
    const percent = Math.round((stats.visitorsUsed / (stats.visitorsQuota || 1)) * 100);

    const send = async (level) => {
      const html = usageAlertEmail({ level: String(level), used: stats.visitorsUsed, total: stats.visitorsQuota });
      await SendEmail({ to: recipientEmail, subject: "QuickSig Usage Alert", body: html });
    };

    if (percent >= 100 && !org.quota_alert_100_sent) {
      await send(100);
      await Organization.update(org.id, { quota_alert_100_sent: true });
    } else if (percent >= 80 && !org.quota_alert_80_sent) {
      await send(80);
      await Organization.update(org.id, { quota_alert_80_sent: true });
    } else if (percent >= 50 && !org.quota_alert_50_sent) {
      await send(50);
      await Organization.update(org.id, { quota_alert_50_sent: true });
    }
  }
};

export default QuotaAlertsService;