import { TemplateUsage, ActivityLog, User } from "@/api/entities";

const TemplateAnalyticsService = {
  async track(action, template, details = {}) {
    if (!template) return;
    await TemplateUsage.create({
      template_id: template.id || template._templateMeta?.id,
      template_name: template.name || template._templateMeta?.name,
      action,
      details
    });
  },
  async requestTemplate(subject) {
    const user = await User.me();
    await TemplateUsage.create({
      template_id: "request",
      template_name: subject?.slice(0, 80) || "Request",
      action: "requested",
      details: { subject }
    });
    if (user) {
      await ActivityLog.create({
        user_id: user.id,
        organization_id: user.organization_id,
        action_description: `requested new template: "${subject || "Unnamed"}"`,
        entity_type: "Template",
        entity_id: "request"
      });
    }
  }
};

export default TemplateAnalyticsService;