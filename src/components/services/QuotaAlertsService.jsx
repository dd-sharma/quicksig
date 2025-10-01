import { Organization } from "@/api/entities";
import QuotaService from "./QuotaService";
import { SendEmail } from "@/api/integrations";
import { usageAlertEmail } from "./EmailTemplates";

const QuotaAlertsService = {
  async checkAndNotify(organizationId, recipientEmail) {
    // Input validation
    if (!organizationId) {
      console.error("QuotaAlertsService: organizationId is required");
      return { success: false, error: "Missing organizationId" };
    }

    if (!recipientEmail) {
      console.error("QuotaAlertsService: recipientEmail is required");
      return { success: false, error: "Missing recipientEmail" };
    }

    try {
      // Get usage stats with fallback handling
      let stats;
      try {
        stats = await QuotaService.getUsageStats(organizationId);
      } catch (error) {
        console.error("QuotaAlertsService: Failed to get usage stats:", error);
        return { success: false, error: "Failed to retrieve usage statistics" };
      }

      // Get organization data (for alert flags)
      let org;
      try {
        org = await Organization.get(organizationId);
      } catch (error) {
        console.error("QuotaAlertsService: Failed to get organization:", error);
        return { success: false, error: "Failed to retrieve organization data" };
      }

      // Calculate usage percentage safely
      const quota = stats?.visitorsQuota || 1; // avoid division by zero
      const used = stats?.visitorsUsed || 0;
      const percent = Math.round((used / quota) * 100);

      // Helper: send email with error handling
      const send = async (level) => {
        try {
          const html = usageAlertEmail({
            level: String(level),
            used: stats.visitorsUsed,
            total: stats.visitorsQuota,
          });
          await SendEmail({
            to: recipientEmail,
            subject: "QuickSig Usage Alert",
            body: html,
          });
          return true;
        } catch (error) {
          console.error(`QuotaAlertsService: Failed to send ${level}% alert email:`, error);
          return false;
        }
      };

      // Helper: update org alert flags safely
      const updateOrgFlag = async (field, value) => {
        try {
          await Organization.update(org.id, { [field]: value });
          return true;
        } catch (error) {
          console.error(`QuotaAlertsService: Failed to update ${field}:`, error);
          return false;
        }
      };

      // Check thresholds and send appropriate alerts
      let alertsSent = 0;
      const errors = [];

      if (percent >= 100 && !org.quota_alert_100_sent) {
        const emailSent = await send(100);
        if (emailSent) {
          const updated = await updateOrgFlag("quota_alert_100_sent", true);
          if (updated) alertsSent++;
          else errors.push("Failed to update 100% alert flag");
        } else {
          errors.push("Failed to send 100% alert email");
        }
      } else if (percent >= 80 && !org.quota_alert_80_sent) {
        const emailSent = await send(80);
        if (emailSent) {
          const updated = await updateOrgFlag("quota_alert_80_sent", true);
          if (updated) alertsSent++;
          else errors.push("Failed to update 80% alert flag");
        } else {
          errors.push("Failed to send 80% alert email");
        }
      } else if (percent >= 50 && !org.quota_alert_50_sent) {
        const emailSent = await send(50);
        if (emailSent) {
          const updated = await updateOrgFlag("quota_alert_50_sent", true);
          if (updated) alertsSent++;
          else errors.push("Failed to update 50% alert flag");
        } else {
          errors.push("Failed to send 50% alert email");
        }
      }

      return {
        success: true,
        alertsSent,
        currentUsagePercent: percent,
        errors: errors.length ? errors : undefined,
      };
    } catch (error) {
      console.error("QuotaAlertsService: Unexpected error in checkAndNotify:", error);
      return {
        success: false,
        error: "An unexpected error occurred while checking quota alerts",
      };
    }
  },
};

export default QuotaAlertsService;