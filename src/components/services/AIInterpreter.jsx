
import { formatDistanceToNow } from "date-fns";

// In-memory cache for 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000;
const _cache = new Map();

function cacheKey(testId, results) {
  // Basic hash from key metrics
  const parts = [
    testId,
    results?.variant?.id,
    results?.control?.visitor_count,
    results?.control?.conversion_count,
    results?.variant?.visitor_count,
    results?.variant?.conversion_count,
    results?.confidence,
    results?.upliftPct
  ].join("|");
  return parts;
}

function getCached(key) {
  const item = _cache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value) {
  _cache.set(key, { value, ts: Date.now() });
}

// Template-driven interpreter (no LLM)
const AIInterpreter = {
  // test: ABTest record
  // results: {
  //   control: { visitor_count, conversion_count, conversion_rate },
  //   variant: { id, variant_name, visitor_count, conversion_count, conversion_rate },
  //   confidence: 0..1,
  //   upliftPct: number, // +/-
  //   totalVisitors: number,
  //   startedAt?: Date
  // }
  generateInterpretation(test, results) {
    const key = cacheKey(test?.id, results || {});
    const cached = getCached(key);
    if (cached) return cached;

    const control = results?.control || {};
    const variant = results?.variant || {};
    const confidence = Number(results?.confidence || 0);
    const upliftPct = Number(results?.upliftPct || 0);
    const totalVisitors = Number(results?.totalVisitors || 0);
    const startedAt = results?.startedAt || null;

    // Template selection
    let status = "trending";
    let summary = "Early signal detected, but evidence is not strong enough.";
    let action = "Collect more data before making a decision.";
    let risk = "Uncertain — avoid implementing changes yet.";

    if (upliftPct >= 10 && confidence * 100 >= 95) {
      status = "winner";
      summary = `Variant ${variant?.variant_name || "B"} is a clear winner with ${upliftPct.toFixed(1)}% better performance.`;
      action = "Implement this variant immediately to capture the improvement.";
      risk = "Low risk — strong statistical evidence supports this change.";
    } else if (confidence * 100 >= 85 && confidence * 100 < 95 && upliftPct >= 5) {
      status = "trending";
      summary = `Variant ${variant?.variant_name || "B"} shows promising results (+${upliftPct.toFixed(1)}%), but needs confirmation.`;
      action = "Continue testing for another 3–7 days to reach statistical significance.";
      risk = "Moderate risk — results are encouraging but not conclusive.";
    } else if (Math.abs(upliftPct) < 5 && confidence * 100 < 85) {
      status = "no_diff";
      summary = "No meaningful difference detected between variants.";
      action = "End test and try a more dramatic variation.";
      risk = "Implementation risk is low since variants perform similarly.";
    } else if (upliftPct < 0) {
      status = "negative";
      summary = "The original (control) performs better than the variant.";
      action = "Keep the original and explore different improvement ideas.";
      risk = "High risk if variant is implemented — expect performance decline.";
    }

    // Confidence text
    const confidencePct = confidence * 100;
    const confidenceText = this.getConfidenceExplanation(confidencePct);

    // Risk assessment (simple band around uplift)
    const mostLikely = upliftPct;
    const band = Math.max(5, Math.abs(mostLikely) * 0.5);
    const bestCasePct = mostLikely + band;
    const worstCasePct = mostLikely - band;

    // Segment insights
    const segmentInsights = this.buildSegmentInsights(results?.segments);

    const out = {
      executiveSummary: summary,
      confidence: confidenceText,
      recommendation: this.getRecommendation(status, confidencePct, totalVisitors),
      riskAssessment: {
        bestCasePct,
        mostLikelyPct: mostLikely,
        worstCasePct,
        riskNote: risk
      },
      segmentInsights,
      meta: {
        status,
        confidencePct,
        upliftPct,
        totalVisitors,
        durationText: startedAt ? "Running" : null
      }
    };

    setCached(key, out);
    return out;
  },

  // Build simple segment insights from by-device and by-source stats
  buildSegmentInsights(segments) {
    if (!segments) return [];
    const insights = [];

    const evalBucket = (label, bucket) => {
      const n1 = bucket.control.n || 0;
      const x1 = bucket.control.x || 0;
      const n2 = bucket.treatment.n || 0;
      const x2 = bucket.treatment.x || 0;

      const cr1 = n1 ? (x1 / n1) * 100 : 0;
      const cr2 = n2 ? (x2 / n2) * 100 : 0;
      const uplift = cr1 === 0 ? (cr2 > 0 ? Infinity : 0) : ((cr2 - cr1) / cr1) * 100;

      const conf = this._twoPropConfidence(n1, x1, n2, x2) * 100;

      if (n1 + n2 < 30) return; // too small
      if (!Number.isFinite(uplift)) return;

      if (Math.abs(uplift) >= 8 && conf >= 85) {
        insights.push({
          segment: label,
          status: uplift > 0 ? "positive" : "negative",
          message:
            `${label}: ${uplift > 0 ? "Variant outperforms" : "Variant underperforms"} by ${uplift.toFixed(1)}% (confidence ~${conf.toFixed(0)}%).`
        });
      }
    };

    if (segments.device) {
      Object.entries(segments.device).forEach(([k, v]) => {
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        evalBucket(label, v);
      });
    }

    if (segments.source) {
      const labelMap = { direct: "Direct traffic", search: "Search traffic", referral: "Referral traffic" };
      Object.entries(segments.source).forEach(([k, v]) => {
        evalBucket(labelMap[k] || k, v);
      });
    }

    // Return at most 3 if any
    return insights.slice(0, 3);
  },

  _twoPropConfidence(n1, x1, n2, x2) {
    if (!n1 || !n2 || n1 === 0 || n2 === 0) return 0;
    const pooled = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    if (se === 0) return 0;
    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const z = (p2 - p1) / se;

    const normalCdf = (z) => {
      const t = 1 / (1 + 0.2316419 * Math.abs(z));
      const d = 0.3989423 * Math.exp(-z * z / 2);
      let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
      if (z > 0) p = 1 - p;
      return p;
    };
    const pTwo = 2 * (1 - normalCdf(Math.abs(z)));
    return Math.max(0, Math.min(1, 1 - pTwo));
  },

  getConfidenceExplanation(confPct) {
    if (confPct >= 95) return "Very confident this is a real improvement.";
    if (confPct >= 90) return "Fairly confident, but some uncertainty remains.";
    if (confPct >= 80) return "Suggestive but needs more data.";
    return "Too early to draw conclusions.";
  },

  // winner/trending/no_diff/negative + confidence + visitors
  getRecommendation(status, confPct, visitors) {
    if (status === "winner") return "Implement the winning variant immediately.";
    if (status === "negative") return "Keep the original; do not roll out the variant.";
    if (status === "no_diff") return "Stop the test and try a more impactful change.";
    // trending or uncertain
    return confPct >= 85 ? "Continue testing a bit longer to confirm the result." : "Collect more data before deciding.";
  },

  // improvement (pct), monthlyVisitors, avgOrderValue
  calculateBusinessImpact(improvementPct, monthlyVisitors, avgOrderValue = 50) {
    if (!Number.isFinite(improvementPct) || !Number.isFinite(monthlyVisitors) || monthlyVisitors < 0 || avgOrderValue < 0) {
      return { monthly: 0, quarterly: 0, annual: 0 };
    }
    const baselineCR = 0.03; // conservative default
    const improvedCR = baselineCR * (1 + improvementPct / 100);
    const deltaCR = Math.max(0, improvedCR - baselineCR);
    const monthly = monthlyVisitors * deltaCR * avgOrderValue;
    return {
      monthly,
      quarterly: monthly * 3,
      annual: monthly * 12,
      assumptions: { avgOrderValue, baselineCR }
    };
  }
};

export function calculateEnhancedBusinessImpact(upliftPct, monthlyVisitors, averageOrderValue, options = {}) {
  const uplift = Math.max(0, Number(upliftPct || 0)) / 100;
  const visitors = Math.max(0, Number(monthlyVisitors || 0));
  const aov = Math.max(0, Number(averageOrderValue || 0));
  const convRate = Math.max(0.001, Number(options.baselineCR || 0.03));
  const additionalConversionsPerMonth = visitors * convRate * uplift;
  const monthlyRevenue = additionalConversionsPerMonth * aov;

  const months = Math.max(1, Number(options.avgCustomerLifespan || 12));
  const clvImpact = monthlyRevenue * months;

  const implHours = Math.max(0, Number(options.implementationHours || 10));
  const hourlyRate = Math.max(1, Number(options.hourlyRate || 150));
  const implementationCost = implHours * hourlyRate;

  const dailyRevenue = monthlyRevenue / 30;
  const daysToImplement = Math.max(0, Number(options.daysToImplement || 7));
  const dailyOpportunityCost = dailyRevenue;
  const costOfDelay = daysToImplement * dailyOpportunityCost;

  const quarterly = monthlyRevenue * 3;
  const annual = monthlyRevenue * 12;

  const roi = implementationCost > 0 ? ((annual - implementationCost) / implementationCost) * 100 : null;
  const breakEvenDays = dailyRevenue > 0 ? (implementationCost / dailyRevenue) : null;

  return {
    monthly: monthlyRevenue,
    quarterly,
    annual,
    clvImpact,
    breakEvenDays,
    costOfDelay,
    roi
  };
}

export default AIInterpreter;
