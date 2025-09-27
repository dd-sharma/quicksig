
import { InvokeLLM } from "@/api/integrations";
import DECISION_RULES from "@/components/decision/DecisionRules";
import { ABTest } from "@/api/entities";
import { calculateEnhancedBusinessImpact } from "@/components/services/AIInterpreter"; // NEW

function pctToNumber(s) {
  if (s == null) return null;
  if (typeof s === "number") return s;
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function daysBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return Math.max(0, Math.round((e - s) / (24 * 60 * 60 * 1000)));
}

function pickFirstMatch(rules, ctx) {
  for (const key of Object.keys(rules)) {
    const rule = rules[key];
    // Simple evaluator for conditions expressed as functions
    if (typeof rule.conditionFn === "function") {
      try {
        if (rule.conditionFn(ctx)) {
          return { id: key, ...rule };
        }
      } catch {
        // ignore bad rule
      }
    }
  }
  return null;
}

async function getAIRecommendation(context) {
  const safe = {
    testName: context.testName || "",
    status: context.status || "",
    durationDays: String(context.durationDays ?? ""),
    confidence: String(context.confidence ?? ""),
    uplift: String(context.uplift ?? ""),
    visitors: String(context.visitors ?? ""),
    businessImpact: context.businessImpact || "",
    question: context.question || "What should I do next?"
  };

  const prompt = `
You are a world-class CRO advisor. Provide a concise, actionable recommendation (2-3 sentences) with 1-2 bullet next steps.

Context:
Test: ${safe.testName}
Status: ${safe.status}
Duration: ${safe.durationDays} days
Confidence: ${safe.confidence}%
Observed Uplift: ${safe.uplift}%
Visitors (approx): ${safe.visitors}
Business Impact (optional): ${safe.businessImpact}

Question:
${safe.question}

Now respond with:
- A one-line recommendation
- Two short, concrete next steps
`;
  try {
    const res = await InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommendation: { type: "string" },
          steps: { type: "array", items: { type: "string" } }
        }
      }
    });
    if (res?.recommendation) {
      return res;
    }
  } catch {
    // ignore AI failures, fall back to rules
  }
  return null;
}

// NEW: Historical context based on prior tests
async function getHistoricalContext({ organization_id, test_type, pageUrl }) {
  try {
    const limit = 50;
    const all = organization_id
      ? await ABTest.filter({ organization_id }, "-created_date", limit)
      : [];
    const similar = all.filter(t => {
      const sameType = test_type ? t.test_type === test_type : true;
      const similarUrl = pageUrl ? (t.test_url || "").includes((pageUrl || "").split("?")[0]) : true;
      return sameType && similarUrl && t.ended_date;
    });
    if (similar.length === 0) return null;

    const durations = similar.map(t => {
      const s = t.started_date ? new Date(t.started_date).getTime() : null;
      const e = t.ended_date ? new Date(t.ended_date).getTime() : null;
      return s && e ? Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24))) : null;
    }).filter(Boolean);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

    // crude proxy for uplift presence: presence of "winner" tag in description or tags
    const winners = similar.filter(t => Array.isArray(t.tags) && t.tags.some(tag => /winner/i.test(tag)));
    const successRate = similar.length ? Math.round((winners.length / similar.length) * 100) : null;

    return {
      averageDurationDays: avgDuration,
      successRate,
      sampleCount: similar.length,
      narrative: [
        avgDuration ? `Similar tests typically take ~${avgDuration} days to complete.` : null,
        Number.isFinite(successRate) ? `Success rate for similar tests: ~${successRate}%.` : null
      ].filter(Boolean).join(" ")
    };
  } catch (error) {
    console.error("Error fetching historical context:", error);
    return null;
  }
}

// NEW: Rough estimate for time-to-decision
function estimateTimeToDecision(ctx, historical) {
  const dailyVisitors = Math.max(1, Number(ctx.daily_visitors || ctx.visitors_per_day || 0));
  const mde = Math.max(0.005, Number(ctx.mde || 0.05)); // 0.5% min MDE default 5%
  const baseline = Math.max(0.001, Number(ctx.baseline_cr || 0.03));
  // Standard Z-scores for alpha=0.05 (two-tailed) and power=0.8
  const zAlpha = 1.96;
  const zBeta = 0.84;

  // Approx sample size per group (two-proportion z-test approximation)
  const p1 = baseline;
  const p2 = baseline * (1 + mde);
  const pBar = (p1 + p2) / 2;
  const qBar = 1 - pBar;
  // Formula for sample size per group, for two-sample proportion test
  const nPerGroup = Math.ceil((((zAlpha * Math.sqrt(2 * pBar * qBar)) + (zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)))) ** 2) / ((p2 - p1) ** 2));

  const groups = Math.max(2, Number(ctx.variant_count || 2));
  const required = nPerGroup * groups;

  const currentVisitors = Math.max(0, Number(ctx.visitors || 0));
  const remaining = Math.max(0, required - currentVisitors);
  const allocationRatio = Number(ctx.traffic_allocation_ratio || 1); // e.g., 0.5 for 50% traffic
  const effectiveDailyVisitors = dailyVisitors * allocationRatio;
  const daysToSample = effectiveDailyVisitors > 0 ? Math.ceil(remaining / effectiveDailyVisitors) : Infinity;

  // Confidence trajectory heuristic: combines current confidence with progress towards required sample
  const progressRatio = required > 0 ? currentVisitors / required : 0;
  const initialConfidenceBoost = progressRatio * 50; // Max 50% boost towards 99% if required sample is met
  const confidenceTrendPct = Math.min(99, Math.round((Number(ctx.confidence || 0) + initialConfidenceBoost)));
  const likelyWinnerChance = confidenceTrendPct >= 95 ? 90 : confidenceTrendPct >= 85 ? 70 : 40;

  // Use historical average to adjust
  const histDays = historical?.averageDurationDays || null;
  // Blend estimated days with historical average, giving more weight to estimation if historical is absent or very different
  const blendedDays = Number.isFinite(daysToSample) && histDays !== null
    ? Math.round(0.6 * daysToSample + 0.4 * histDays)
    : daysToSample;

  return {
    requiredSampleSize: required,
    remainingSample: remaining,
    estDaysToSignificance: Math.max(0, blendedDays),
    confidenceTrendPct: confidenceTrendPct,
    winnerLikelihoodPct: likelyWinnerChance
  };
}

// NEW: Compute financial impact from context
function calculateDecisionImpact(ctx) {
  const monthlyVisitors = Math.max(1, Number(ctx.monthly_visitors || ((ctx.daily_visitors || 100) * 30)));
  const aov = Math.max(0, Number(ctx.average_order_value || 50));
  const uplift = Number(ctx.uplift || 0);
  const baselineCR = Number(ctx.baseline_cr || 0.03);

  const impact = calculateEnhancedBusinessImpact(
    uplift,
    monthlyVisitors,
    aov,
    {
      baselineCR,
      implementationHours: 10,
      daysToImplement: 7
    }
  );

  let recommendation = "";
  if ((impact?.monthly || 0) > 10000) {
    recommendation = `High impact: $${Math.round(impact.monthly).toLocaleString()}/month potential`;
  } else if ((impact?.monthly || 0) > 1000) {
    recommendation = `Moderate impact: $${Math.round(impact.monthly).toLocaleString()}/month`;
  } else {
    recommendation = "Low impact: Focus on bigger changes";
  }

  return {
    monthly: impact?.monthly || 0,
    annual: impact?.annual || 0,
    costOfDelay: impact?.costOfDelay || 0,
    breakEvenDays: impact?.breakEvenDays || null,
    recommendation
  };
}

const DecisionSupportService = {
  // Primary entry point
  async recommend({ type, context, useAI = false }) {
    const ctx = { ...context };
    // Normalize common fields
    ctx.confidence = ctx.confidence != null ? Number(ctx.confidence) : null;
    ctx.uplift = ctx.uplift != null ? Number(ctx.uplift) : pctToNumber(ctx.uplift);
    ctx.sample_size = ctx.sample_size != null ? Number(ctx.sample_size) : null;
    ctx.visitors = ctx.visitors != null ? Number(ctx.visitors) : null;
    ctx.test_duration = ctx.test_duration || daysBetween(ctx.started_at, ctx.now || new Date().toISOString());

    let block = null;
    switch (type) {
      case "when_to_stop":
        block = DECISION_RULES.stop_test;
        break;
      case "what_to_test_next":
        block = DECISION_RULES.next_test_suggestions;
        break;
      case "why_not_significant":
        block = DECISION_RULES.significance_diagnostics;
        break;
      case "improve_test_velocity":
        block = DECISION_RULES.improve_velocity;
        break;
      case "interpret_results":
        block = DECISION_RULES.interpret_results;
        break;
      case "implementation_guidance":
        block = DECISION_RULES.implementation_guidance;
        break;
      default:
        block = DECISION_RULES.stop_test;
    }

    let ruleMatch = null;
    if (block) {
      if (Array.isArray(block)) {
        ruleMatch = block.find(r => r.conditionFn && r.conditionFn(ctx));
      } else {
        ruleMatch = pickFirstMatch(block, ctx);
      }
    }

    // Historical patterns + time-to-decision
    const historical = await getHistoricalContext({
      organization_id: ctx.organization_id,
      test_type: ctx.test_type,
      pageUrl: ctx.test_url
    });
    const timeEst = estimateTimeToDecision(ctx, historical);

    // Optional AI enhancement
    let ai = null;
    if (useAI) {
      ai = await getAIRecommendation({
        testName: ctx.test_name,
        status: ctx.status,
        durationDays: ctx.test_duration,
        confidence: ctx.confidence,
        uplift: ctx.uplift,
        visitors: ctx.visitors,
        businessImpact: ctx.business_impact,
        question: ctx.question
      });
    }

    const trafficLight = (() => {
      // If test is completed, it's green
      if (ctx.status === "completed") return "green";
      // If there's significant negative uplift, it's red
      if ((ctx.uplift || 0) < 0 && (ctx.confidence || 0) >= 90) return "red";
      // If confidence is high and sample size is met, it's green
      if ((ctx.confidence || 0) >= 95 && timeEst.remainingSample <= 0) return "green";
      // If confidence is getting high, it's yellow
      if ((ctx.confidence || 0) >= 85) return "yellow";
      // Otherwise, assume still in progress/needs more data
      return "yellow";
    })();

    const confidencePct = Math.min(99, Math.max(0, Math.round((ctx.confidence || timeEst.confidenceTrendPct || 0))));
    const timeEstimateText = timeEst.estDaysToSignificance <= 0
      ? "Ready for decision now"
      : Number.isFinite(timeEst.estDaysToSignificance)
        ? `~${timeEst.estDaysToSignificance} days until decision`
        : "Estimating time...";

    // NEW: add business impact to every response
    const businessImpact = calculateDecisionImpact({
      ...ctx,
      monthly_visitors: ctx.monthly_visitors || ((ctx.daily_visitors || 100) * 30),
    });

    // Compose response
    if (ruleMatch) {
      return {
        source: ai ? "rules+ai" : "rules",
        title: ruleMatch.recommendation || ruleMatch.title || "Recommendation",
        explanation: [ruleMatch.explanation || ruleMatch.issue || "", historical?.narrative].filter(Boolean).join(" ").trim(),
        steps: ai?.steps || ruleMatch.steps || ruleMatch.recommendations || [],
        ai: ai || null,
        trafficLight,
        confidencePct,
        timeEstimateText,
        businessImpact // NEW
      };
    }

    if (ai) {
      return {
        source: "ai",
        title: ai.recommendation || "AI Recommendation",
        explanation: historical?.narrative || "",
        steps: ai.steps || [],
        trafficLight,
        confidencePct,
        timeEstimateText,
        businessImpact // NEW
      };
    }

    // Default generic guidance
    return {
      source: "fallback",
      title: "Gather more data before deciding",
      explanation: historical?.narrative || "Current confidence and sample size suggest waiting for more data.",
      steps: ["Monitor confidence daily", "Consider increasing traffic allocation"],
      trafficLight,
      confidencePct,
      timeEstimateText,
      businessImpact // NEW
    };
  }
};

export default DecisionSupportService;
