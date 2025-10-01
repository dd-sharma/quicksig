
import { SendEmail } from "@/api/integrations";
import { ABTest, Variant, Visitor, Conversion, EmailLog, User, Organization } from "@/api/entities";
import { calculateUplift, calculateConfidenceLevel, calculateConversionRate } from "@/components/results/ResultsCalculator";
import { testCompletionEmail, significanceAlertEmail, statusChangeEmail, weeklySummaryEmail, bulkCompletionEmail, teamActivityEmail } from "./EmailTemplates";
import DecisionSupportService from "./DecisionSupportService";
import DecisionTrackingService from "./DecisionTrackingService";

// Placeholder for external utility functions, replace with actual imports/definitions if available in the project context.
// These are needed for the weekly summary's quick links.
const absoluteUrl = (path) => `http://localhost:3000${path}`; // Replace with actual domain logic
const createPageUrl = (params) => `/app/dashboard?${params}`; // Replace with actual routing logic

// Helper: rough daily visitors estimate
function estimateDailyVisitors(test, totalVisitors) {
  const started = test?.started_date ? new Date(test.started_date).getTime() : null;
  if (!started) return Math.max(1, Math.round((totalVisitors || 0) / 7)); // fallback: assume 7 days
  const days = Math.max(1, Math.round((Date.now() - started) / (1000 * 60 * 60 * 24)));
  return Math.max(1, Math.round((totalVisitors || 0) / days));
}

// Helper: personalized decision style message
function messageForStyle(styleKey) {
  const messages = {
    trusting: "You trust the data and act quickly on recommendations. Keep making confident decisions!",
    balanced: "You balance data with intuition. Your measured approach leads to thoughtful decisions.",
    independent: "You prefer to make your own calls. Consider testing the recommendations occasionally to see if they align with your instincts."
  };
  return messages[styleKey] || messages.balanced;
}

export async function sendEmailWithTemplate({ to, subject, html, email_type, test }) {
  // wraps SendEmail + logging
  try {
    await SendEmail({ to, subject, body: html });
    await EmailLog.create({
      recipient_email: to,
      email_type,
      test_id: test?.id || null,
      organization_id: test?.organization_id || null,
      sent_date: new Date().toISOString(),
      status: "sent"
    });
  } catch (e) {
    await EmailLog.create({
      recipient_email: to,
      email_type,
      test_id: test?.id || null,
      organization_id: test?.organization_id || null,
      sent_date: new Date().toISOString(),
      status: "failed",
      error_details: e?.message || String(e)
    });
    // Fallback notification for client-side
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-alert
      window.alert?.("We couldn't send your email notification. Please check your email settings.");
    }
  }
}

function getLocalHour(date, tz) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: tz || "UTC" });
    const parts = fmt.formatToParts(date);
    const h = parts.find(p => p.type === "hour")?.value || "00";
    return Number(h);
  } catch {
    return date.getUTCHours();
  }
}

const buildDecisionCTA = (test) => {
  const resultsUrl = absoluteUrl(createPageUrl(`TestDetail?id=${test.id}`));
  return `
  <div style="margin: 20px 0; padding: 20px; background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; text-align: center;">
    <div style="font-size: 18px; font-weight: bold; color: #14532d; margin-bottom: 10px;">
      ✅ Your test is ready for a decision!
    </div>
    <div style="color: #166534; margin-bottom: 15px;">
      ${test.test_name} has reached statistical significance
    </div>
    <a href="${resultsUrl}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Make Decision Now →
    </a>
  </div>`;
};

const EmailNotificationService = {
  // Quiet hours check (non-critical): 18:00–09:00
  isQuietHours(user) {
    const hour = getLocalHour(new Date(), user?.timezone || "UTC");
    return hour >= 18 || hour < 9;
  },

  async teammateNotifications(test, eventText, actorUser) {
    const users = await User.filter({ organization_id: test.organization_id });
    // Filter out the actor and users who have explicitly disabled team activity notifications
    const others = users.filter(u => u.id !== actorUser?.id && u.notification_prefs?.team_activity !== false && u.email);

    for (const u of others) {
      const html = teamActivityEmail({
        actor: actorUser?.full_name || actorUser?.email || "A teammate",
        action: eventText,
        test
      });
      await sendEmailWithTemplate({
        to: u.email,
        subject: `${actorUser?.full_name || "A teammate"} ${eventText} "${test.test_name}"`,
        html,
        email_type: "team_activity",
        test
      });
    }
  },

  async computeStats(testId) {
    const [variants, visitors, conversions] = await Promise.all([
      Variant.filter({ ab_test_id: testId }),
      Visitor.filter({ ab_test_id: testId }),
      Conversion.filter({ ab_test_id: testId }),
    ]);

    const totalVisitors = visitors.length;
    const control = variants.find(v => v.variant_type === "control");
    const treatments = variants.filter(v => v.variant_type !== "control");

    let winner = control;
    let uplift = 0;
    let confidence = 0;

    if (control && treatments.length > 0) {
      const withStats = treatments.map(v => {
        const vV = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
        const vC = conversions.filter(c => c.variant_id === v.id).length;
        const cV = visitors.filter(vi => vi.assigned_variant_id === control.id).length;
        const cC = conversions.filter(c => c.variant_id === control.id).length;
        const u = calculateUplift(
          { visitor_count: cV, conversion_count: cC },
          { visitor_count: vV, conversion_count: vC }
        );
        const conf = calculateConfidenceLevel(
          { visitor_count: cV, conversion_count: cC },
          { visitor_count: vV, conversion_count: vC }
        );
        return { v, uplift: u, confidence: conf, vVisitors: vV, vConversions: vC, cVisitors: cV, cConversions: cC };
      });

      // pick highest conversion rate vs control
      let best = withStats[0];
      for (const s of withStats) {
        const bestCr = calculateConversionRate(best.vVisitors, best.vConversions);
        const currCr = calculateConversionRate(s.vVisitors, s.vConversions);
        if (currCr > bestCr) best = s;
      }
      winner = best.v;
      uplift = best.uplift || 0;
      confidence = best.confidence || 0;
    }

    return {
      totalVisitors,
      winnerName: winner?.variant_name || "Control",
      upliftPct: uplift,
      confidencePct: confidence * 100
    };
  },

  async handleStatusChange(test, newStatus, actorUser) {
    const user = actorUser || await User.me();
    const prefs = user?.notification_prefs || {};
    const to = user?.email;
    const changedAt = new Date().toISOString();

    if (newStatus === "completed" && prefs.test_completion && to) {
      // Batching: enqueue completion in NotificationQueue via local lightweight batching (fallback immediate send).
      const stats = await this.computeStats(test.id);
      const durationText = test.started_date && test.ended_date
        ? `${new Date(test.started_date).toLocaleDateString()} → ${new Date(test.ended_date).toLocaleDateString()}`
        : "N/A";

      // If user had another completion email sent in the last hour, send a bulk email including this test
      const recentCompletions = await EmailLog.filter({ recipient_email: to, email_type: "test_completion" }, "-created_date", 5);
      const withinHour = (d) => (new Date().getTime() - new Date(d).getTime()) <= 60 * 60 * 1000;
      const recentWithinHour = (recentCompletions || []).filter(r => withinHour(r.sent_date || r.created_date));

      if (recentWithinHour.length >= 1) {
        // Build bulk with this + those tests (best-effort: include current and prior single)
        // Note: For a true bulk, you'd fetch the stats for `recentWithinHour` tests too.
        // This implementation just includes the current test as part of a "bulk" email indication.
        const completedTestsInfo = [{
          id: test.id,
          test_name: test.test_name,
          winnerName: stats.winnerName,
          upliftPct: stats.upliftPct,
          confidencePct: stats.confidencePct
        }];
        const html = bulkCompletionEmail({ user, tests: completedTestsInfo }); // Assuming template can handle array of tests
        await sendEmailWithTemplate({
          to,
          subject: `🎯 ${completedTestsInfo.length} tests completed in the last hour`,
          html,
          email_type: "bulk_completion",
          test // Pass the current test as context for logging, or null if it's truly a bulk for multiple
        });
      } else {
        const html = testCompletionEmail({
          test,
          durationText,
          totalVisitors: stats.totalVisitors,
          winnerName: stats.winnerName,
          upliftPct: stats.upliftPct,
          confidencePct: stats.confidencePct
        }) + buildDecisionCTA(test);
        const subject = `🎯 Your A/B test '${test.test_name}' has completed!`;

        // Respect quiet hours for non-critical notifications
        if (this.isQuietHours(user)) {
          // Best-effort: In a real app, this would queue the email for later sending
          // via a background job or cron, not just a client-side setTimeout.
          // For this exercise, a setTimeout is used as a conceptual placeholder.
          if (typeof window !== "undefined") {
            setTimeout(() => {
              sendEmailWithTemplate({
                to,
                subject,
                html,
                email_type: "test_completion",
                test
              });
            }, 1000 * 60 * 60); // Delay 1 hour
          } else {
            // In a server environment, you'd use a proper task queue
            // For now, if not in browser, just send it
            await sendEmailWithTemplate({
              to,
              subject,
              html,
              email_type: "test_completion",
              test
            });
          }
        } else {
          await sendEmailWithTemplate({
            to,
            subject,
            html,
            email_type: "test_completion",
            test
          });
        }
      }

      // Notify teammates (team activity)
      await this.teammateNotifications(test, "completed the test", user);
      return;
    }

    if (["paused", "running", "archived"].includes(newStatus) && prefs.status_changes && to) {
      const html = statusChangeEmail({
        test,
        newStatus,
        actorName: user?.full_name || user?.email || "Someone",
        changedAt
      });
      const subject =
        newStatus === "paused" ? `⏸️ Test '${test.test_name}' has been paused`
          : newStatus === "running" ? `▶️ Test '${test.test_name}' is running again`
            : `🗄️ Test '${test.test_name}' has been archived`;

      await sendEmailWithTemplate({
        to,
        subject,
        html,
        email_type: "status_change",
        test
      });

      // Team broadcast for launches and completions
      if (newStatus === "running") {
        await this.teammateNotifications(test, "started testing", user);
      }
    }
  },

  async sendSignificanceAlert(test) {
    const user = await User.me();
    const to = user?.email;
    const prefs = user?.notification_prefs || {};
    if (!to || !prefs.significance_alerts) return;

    const stats = await this.computeStats(test.id);
    const html = significanceAlertEmail({
      test,
      winnerName: stats.winnerName,
      upliftPct: stats.upliftPct,
      confidencePct: stats.confidencePct
    }) + buildDecisionCTA(test);
    await sendEmailWithTemplate({
      to,
      subject: `✨ '${test.test_name}' has reached statistical significance!`,
      html,
      email_type: "significance_alert",
      test
    });
  },

  async sendWeeklySummaryToUser(user, org) {
    if (!user?.email || !user?.notification_prefs?.weekly_summary) return;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const tests = await ABTest.filter({ organization_id: org.id });

    const active = tests.filter(t => t.test_status === "running");
    const completedThisWeek = tests.filter(t => t.ended_date && new Date(t.ended_date) >= oneWeekAgo);

    let totalVisitorsSum = 0;
    let allConfidences = [];
    const runningTestsNames = [];
    const testDetailedStats = new Map(); // Store detailed stats for each test

    // Detailed stats for overview and needsAttention
    for (const t of tests) {
      const [visitors, variants, conversions] = await Promise.all([
        Visitor.filter({ ab_test_id: t.id }),
        Variant.filter({ ab_test_id: t.id }),
        Conversion.filter({ ab_test_id: t.id })
      ]);

      const currentTestTotalVisitors = visitors.length;
      totalVisitorsSum += currentTestTotalVisitors;

      let currentTestConfidencePct = 0;
      const control = variants.find(v => v.variant_type === "control");
      const treatments = variants.filter(v => v.variant_type !== "control");

      if (control && treatments.length > 0) {
        let bestTreatment = null;
        let highestConversionRate = -1;

        for (const v of treatments) {
          const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
          const vConversions = conversions.filter(c => c.variant_id === v.id).length;
          const currentCr = calculateConversionRate(vVisitors, vConversions);
          if (currentCr > highestConversionRate) {
            highestConversionRate = currentCr;
            bestTreatment = v;
          }
        }
        
        if (bestTreatment) {
            const cVisitors = visitors.filter(vi => vi.assigned_variant_id === control.id).length;
            const cConversions = conversions.filter(c => c.variant_id === control.id).length;
            const tVisitors = visitors.filter(vi => vi.assigned_variant_id === bestTreatment.id).length;
            const tConversions = conversions.filter(c => c.variant_id === bestTreatment.id).length;

            const conf = calculateConfidenceLevel(
                { visitor_count: cVisitors, conversion_count: cConversions },
                { visitor_count: tVisitors, conversion_count: tConversions }
            );
            if (!isNaN(conf)) {
                currentTestConfidencePct = conf * 100;
                allConfidences.push(currentTestConfidencePct);
            }
        }
      }

      testDetailedStats.set(t.id, {
        totalVisitors: currentTestTotalVisitors,
        confidencePct: currentTestConfidencePct
      });

      if (t.test_status === "running") {
        runningTestsNames.push(t.test_name);
      }
    }

    const avgConfidence = allConfidences.length ? (allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length) : 0;

    // Mock sparkline data as it's not generated from current data in the outline.
    // In a real app, this would come from a time-series data aggregation.
    const mockSparkline = [4, 7, 9, 6, 8, 10, 11];

    const overview = {
      activeCount: active.length,
      activeNames: active.slice(0, 5).map(t => t.test_name),
      completedThisWeek: completedThisWeek.length,
      totalVisitors: totalVisitorsSum,
      avgConfidence,
      sparkline: mockSparkline
    };

    // Mock winners data as it's hardcoded in the outline.
    // In a real app, this would involve more complex aggregation over completed tests.
    const winners = {
      topName: completedThisWeek[0]?.test_name || null,
      topUplift: 12.4, // Placeholder
      topConfidence: 96.2, // Placeholder
      totalUplift: 18.7 // Placeholder
    };

    const needsAttention = { items: runningTestsNames.slice(0, 3) };

    const quickLinks = active.map(t => ({
      label: t.test_name,
      url: absoluteUrl(createPageUrl(`TestDetail?id=${t.id}`))
    })).slice(0, 5);

    // Personalized decision insights
    const userDecisionStyle = await DecisionTrackingService.getUserDecisionStyle(user.id);
    const decisionInsights = {
      style: userDecisionStyle.style, // "trusting", "balanced", "independent"
      avgDecisionTime: userDecisionStyle.avgDecisionTime,
      followRate: userDecisionStyle.followRate,
      totalDecisions: userDecisionStyle.totalDecisions,
      message: messageForStyle(userDecisionStyle.style)
    };

    // Tests ready for decision via DecisionSupportService
    const testsNeedingDecision = [];
    for (const t of active) {
      const stats = testDetailedStats.get(t.id) || { totalVisitors: 0, confidencePct: 0 };
      const context = {
        test_id: t.id,
        test_name: t.test_name,
        status: t.test_status,
        confidence: stats.confidencePct,
        visitors: stats.totalVisitors,
        daily_visitors: estimateDailyVisitors(t, stats.totalVisitors),
        baseline_cr: 0.03, // Placeholder, usually would come from test settings or derived
        mde: 0.05, // Placeholder
        average_order_value: Number(org?.average_order_value || 50)
      };
      try {
        const recommendation = await DecisionSupportService.recommend({ type: "when_to_stop", context });
        if (recommendation?.trafficLight === "green") {
          testsNeedingDecision.push({
            name: t.test_name,
            recommendation: recommendation.title,
            confidence: Math.round(recommendation.confidencePct || 0),
            timeEstimate: recommendation.timeEstimateText || "",
            url: absoluteUrl(createPageUrl(`TestDetail?id=${t.id}`)),
            businessImpact: recommendation.businessImpact || null // NEW
          });
        }
      } catch (e) {
        // ignore
        console.error(`Error getting recommendation for test ${t.id}:`, e.message);
      }
    }

    // NEW: Aggregate financial opportunity
    let totalMonthlyImpact = 0;
    let highestImpactTest = null;
    for (const tn of testsNeedingDecision) {
      const impact = tn?.businessImpact?.monthly || 0;
      totalMonthlyImpact += impact;
      if (!highestImpactTest || impact > (highestImpactTest.impact || 0)) {
        highestImpactTest = { name: tn.name, impact };
      }
    }

    // Organization-wide patterns (best-effort)
    let orgPatterns = null;
    if (org?.id) {
      try {
        const res = await DecisionTrackingService.getOrganizationPatterns(org.id);
        orgPatterns = res || null;
      } catch (e) {
        orgPatterns = null;
        console.error(`Error getting organization patterns for org ${org.id}:`, e.message);
      }
    }

    const html = weeklySummaryEmail({
      user,
      org,
      overview,
      winners,
      insights: { message: "Headline tests are outperforming; prioritize copy this week." },
      needsAttention,
      quickLinks,
      decisionInsights,
      testsNeedingDecision,
      orgPatterns,
      // NEW
      totalMonthlyImpact,
      highestImpactTest
    });

    await sendEmailWithTemplate({
      to: user.email,
      subject: "📊 Your QuickSig Weekly Testing Summary",
      html,
      email_type: "weekly_summary"
    });
  },

  // Expose for use elsewhere if needed
  getPersonalizedMessage(styleObj) {
    const key = typeof styleObj === "string" ? styleObj : styleObj?.style;
    return messageForStyle(key);
  }
};

export default EmailNotificationService;
