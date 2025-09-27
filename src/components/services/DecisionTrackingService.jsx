
import { ActivityLog, User, ABTest } from "@/api/entities";

// Helper to normalize decision type key from action/newStatus
function getDecisionTypeKey(action) {
  if (action === "implement" || action === "completed") return "stop_winner";
  if (action === "stop" || action === "end_test" || action === "archived") return "stop_inconclusive";
  if (action === "continue" || action === "running" || action === "paused") return "continue_testing";
  if (action === "revert" || action === "stop_negative") return "stop_negative";
  return "other";
}

// Improved followed detection: use recommendation.type when available, fall back to title pattern
function inferFollowed(recommendation, action) {
  const type = recommendation?.type || null;
  const title = recommendation?.title || "";
  const act = String(action || "").toLowerCase();

  if (type) {
    if (type === "when_to_stop" || type === "stop_test" || type === "implementation_guidance") {
      return act === "completed" || act === "archived";
    }
    if (type === "what_to_test_next" || type === "continue_testing") {
      return act === "running" || act === "paused";
    }
  }

  // Fallback: pattern matching on title
  if (/implement|stop|end/i.test(title)) {
    return act === "completed" || act === "archived";
  }
  if (/continue|gather|more data/i.test(title)) {
    return act === "running" || act === "paused";
  }
  return null; // unknown
}

// Simple style classifier from user.decision_patterns
function classifyDecisionStyle(patterns) {
  const total = patterns?.total_decisions_made || 0;
  const followed = patterns?.recommendations_followed || 0;
  const followRate = total ? (followed / total) * 100 : 0;

  // Heuristic thresholds
  if (followRate >= 70) return "trusting";
  if (followRate <= 30) return "independent";
  return "balanced";
}

const DecisionTrackingService = {
  async trackDecisionView(testId, recommendationType, recommendation) {
    try {
      const user = await User.me();
      const logEntry = {
        user_id: user.id,
        organization_id: user.organization_id || null,
        entity_type: "decision_support",
        entity_id: testId,
        action: "viewed_recommendation",
        action_description: `Viewed decision support (${recommendationType})`,
        details: {
          recommendation_type: recommendationType,
          recommendation_title: recommendation?.title || null,
          confidence: recommendation?.confidencePct ?? null,
          traffic_light: recommendation?.trafficLight || null,
          source: recommendation?.source || null
        }
      };
      await ActivityLog.create(logEntry);
      // Debug
      // eslint-disable-next-line no-console
      console.log("[Decision Tracking] ActivityLog created (view):", logEntry);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to track decision view:", error);
    }
  },

  async trackDecisionMade(testId, action, recommendation, followed) {
    try {
      const user = await User.me();
      const test = await ABTest.get(testId);

      // Determine followed if not provided
      const resolvedFollowed = (typeof followed === "boolean")
        ? followed
        : inferFollowed(recommendation, action);

      // Calculate time from first recommendation view to decision
      const recentViews = await ActivityLog.filter({
        entity_id: testId,
        entity_type: "decision_support",
        action: "viewed_recommendation",
        user_id: user.id
      }, "-created_date", 10);

      const firstViewTime = recentViews?.[recentViews.length - 1]?.created_date
        ? new Date(recentViews[recentViews.length - 1].created_date).getTime()
        : null;
      const decisionTime = Date.now();
      const hoursToDecision = firstViewTime ? (decisionTime - firstViewTime) / (1000 * 60 * 60) : null;

      const logEntry = {
        user_id: user.id,
        organization_id: user.organization_id || null,
        entity_type: "test_decision",
        entity_id: testId,
        action: "decision_made",
        action_description: `Decision made: ${action}`,
        details: {
          decision_action: action,
          recommendation_followed: resolvedFollowed ?? null,
          recommendation_title: recommendation?.title || null,
          recommendation_type: recommendation?.type || null,
          confidence_at_decision: test?.confidence || null,
          visitors_at_decision: test?.total_visitors || null,
          days_running: test?.started_date ? Math.floor((Date.now() - new Date(test.started_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
          hours_to_decision: hoursToDecision,
          test_result: test?.winning_variant_id ? "winner" : "no_winner",
          source: (typeof window !== "undefined" && window.location.search.includes("source=email")) ? "email" : "in_app",
          // NEW: financial impact (if available on recommendation)
          estimated_monthly_impact: recommendation?.businessImpact?.monthly ?? null,
          estimated_annual_impact: recommendation?.businessImpact?.annual ?? null,
          cost_of_delay: recommendation?.businessImpact?.costOfDelay ?? null
        }
      };
      await ActivityLog.create(logEntry);
      // Debug
      // eslint-disable-next-line no-console
      console.log("[Decision Tracking] ActivityLog created (decision):", logEntry);

      // Update user's patterns
      await this.updateUserPatterns(user, action, resolvedFollowed, hoursToDecision);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to track decision:", error);
    }
  },

  async updateUserPatterns(user, action, followed, hoursToDecision) {
    try {
      // Reload user to ensure latest server state
      const freshUser = await User.me();
      const existing = freshUser?.decision_patterns || {};

      // Initialize structure
      const patterns = {
        total_decisions_made: Number(existing.total_decisions_made || 0),
        recommendations_followed: Number(existing.recommendations_followed || 0),
        recommendations_overridden: Number(existing.recommendations_overridden || 0),
        avg_time_to_decision_hours: Number(existing.avg_time_to_decision_hours || 0),
        decisions_by_type: existing.decisions_by_type || {},
        last_decision_date: existing.last_decision_date || null
      };

      // Mutations
      patterns.total_decisions_made += 1;
      if (followed === true) patterns.recommendations_followed += 1;
      if (followed === false) patterns.recommendations_overridden += 1;

      if (hoursToDecision != null) {
        const countBefore = Math.max(0, (patterns.total_decisions_made - 1));
        const currentAvg = Number(patterns.avg_time_to_decision_hours || 0);
        patterns.avg_time_to_decision_hours = countBefore > 0
          ? (currentAvg * countBefore + hoursToDecision) / (countBefore + 1)
          : hoursToDecision;
      }

      const key = getDecisionTypeKey(action);
      if (!patterns.decisions_by_type[key]) {
        patterns.decisions_by_type[key] = { followed: 0, overridden: 0 };
      }
      if (followed === true) patterns.decisions_by_type[key].followed += 1;
      if (followed === false) patterns.decisions_by_type[key].overridden += 1;

      patterns.last_decision_date = new Date().toISOString();

      // Debug
      // eslint-disable-next-line no-console
      console.log("[Decision Tracking] Saving patterns:", patterns);

      await User.updateMyUserData({ decision_patterns: patterns });

      // Verify
      const verify = await User.me();
      // eslint-disable-next-line no-console
      console.log("[Decision Tracking] Patterns after save:", verify?.decision_patterns || null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update user decision patterns:", error);
    }
  },

  async getUserDecisionStyle(userId) {
    try {
      const user = userId ? await User.get(userId) : await User.me();
      const patterns = user?.decision_patterns || {};
      const total = patterns.total_decisions_made || 0;
      const followed = patterns.recommendations_followed || 0;
      const avgTime = Number(patterns.avg_time_to_decision_hours || 0);
      const followRate = total ? Math.round((followed / total) * 100) : 0;
      const style = classifyDecisionStyle(patterns);

      // Debug visibility
      // eslint-disable-next-line no-console
      console.log("[DecisionTracking] User style:", { style, avgTime, followRate, total });

      return {
        style,
        avgDecisionTime: avgTime,
        followRate,
        totalDecisions: total
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[DecisionTracking] getUserDecisionStyle error:", e);
      return {
        style: "balanced",
        avgDecisionTime: 0,
        followRate: 0,
        totalDecisions: 0
      };
    }
  },

  async getOrganizationPatterns(organizationId) {
    try {
      if (!organizationId) return null;
      const logs = await ActivityLog.filter(
        { organization_id: organizationId, entity_type: "test_decision", action: "decision_made" },
        "-created_date",
        200
      );

      let total = 0;
      let followed = 0;
      let sumConfidence = 0;
      let sumHours = 0;
      let withHours = 0;

      for (const l of (logs || [])) {
        total += 1;
        if (l.details?.recommendation_followed === true) followed += 1;
        if (typeof l.details?.confidence_at_decision === "number") sumConfidence += l.details.confidence_at_decision;
        if (typeof l.details?.hours_to_decision === "number") {
          sumHours += l.details.hours_to_decision;
          withHours += 1;
        }
      }
      const followRate = total ? Math.round((followed / total) * 100) : 0;
      const avgConfidence = total ? Math.round((sumConfidence / total)) : 0;
      const avgHours = withHours ? Math.round((sumHours / withHours) * 10) / 10 : 0;

      const result = { totalDecisions: total, followRate, avgConfidenceAtDecision: avgConfidence, avgDecisionTimeHours: avgHours };

      // Debug
      // eslint-disable-next-line no-console
      console.log("[DecisionTracking] Org patterns:", result);

      return result;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[DecisionTracking] getOrganizationPatterns error:", e);
      return null;
    }
  }
};

export default DecisionTrackingService;
