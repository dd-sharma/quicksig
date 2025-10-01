import React from 'react';

// Basic calculations kept for backward compatibility
export const calculateConversionRate = (visitors, conversions) => {
  if (!visitors || visitors <= 0) return 0;
  return (conversions / visitors) * 100;
};

// ---------------- Advanced Statistical Helpers ----------------

// Standard normal CDF approximation using Abramowitz-Stegun
export const normalCdf = (z) => {
  // For stability
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  // erf approximation
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  const cdf = 0.5 * (1 + sign * erf);
  return cdf;
};

export const pValueFromZ = (z, twoTailed = true) => {
  const pOne = 1 - normalCdf(Math.abs(z));
  return twoTailed ? 2 * pOne : pOne;
};

// z-test for two proportions (variant vs control)
export const zTestTwoProportions = ({ n1, x1, n2, x2 }) => {
  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;
  const pooled = (x1 + x2) / (n1 + n2 || 1);
  const se0 = Math.sqrt(pooled * (1 - pooled) * ((1 / (n1 || 1)) + (1 / (n2 || 1))));
  const z = se0 === 0 ? 0 : (p2 - p1) / se0; // variant - control
  const pTwoTailed = pValueFromZ(z, true);
  return { z, pValue: pTwoTailed, p1, p2, pooled };
};

// Confidence interval for difference in proportions (variant - control)
export const confidenceIntervalDiff = ({ n1, x1, n2, x2, confidence = 0.95 }) => {
  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;
  const diff = p2 - p1;
  const se = Math.sqrt((p1 * (1 - p1)) / (n1 || 1) + (p2 * (1 - p2)) / (n2 || 1));
  const zStar = confidence === 0.99 ? 2.576 : confidence === 0.90 ? 1.645 : 1.96;
  const me = zStar * se;
  return { lower: diff - me, upper: diff + me, diff, se, zStar };
};

// Cohen's h for proportions
export const cohensH = (p1, p2) => {
  // Guard
  const clamp = (p) => Math.max(0, Math.min(1, p));
  const a = 2 * (Math.asin(Math.sqrt(clamp(p1))) - Math.asin(Math.sqrt(clamp(p2))));
  return a;
};

export const interpretCohensH = (h) => {
  const ah = Math.abs(h);
  if (ah < 0.2) return 'negligible';
  if (ah < 0.5) return 'small';
  if (ah < 0.8) return 'medium';
  return 'large';
};

// Statistical power for two-proportion z-test (approx)
export const powerTwoProportions = ({ n1, n2, p1, p2, alpha = 0.05 }) => {
  const zAlpha = alpha === 0.10 ? 1.2816 : alpha === 0.01 ? 2.3263 : 1.6449; // one-sided surrogate; we’ll adjust
  // Use two-sided approx by taking zAlpha/2 equivalent critical ~1.96 for 0.05
  const zCrit = alpha === 0.10 ? 1.645 : alpha === 0.01 ? 2.576 : 1.96;
  const seAlt = Math.sqrt((p1 * (1 - p1)) / (n1 || 1) + (p2 * (1 - p2)) / (n2 || 1));
  if (seAlt === 0) return 0;
  const delta = Math.abs(p2 - p1);
  const z = delta / seAlt;
  // Power ~ P(|Z| > zCrit - z) under alternative
  const powerApprox = 1 - normalCdf(zCrit - z);
  return Math.max(0, Math.min(1, powerApprox));
};

// Required sample size per group for two-proportion test (absolute MDE)
export const requiredSampleSizeTwoProportions = ({ baseline, mdeAbs, alpha = 0.05, power = 0.8 }) => {
  // Guard
  if (!(baseline > 0 && baseline < 1) || !(mdeAbs > 0)) return 0;
  // z-scores
  const zAlpha = alpha === 0.10 ? 1.645 : alpha === 0.01 ? 2.576 : 1.96;
  const zBeta = power === 0.9 ? 1.2816 : 0.8416; // 0.9 vs ~0.8
  const p1 = baseline;
  const p2 = baseline + mdeAbs;
  const q1 = 1 - p1, q2 = 1 - p2;
  const num = (zAlpha * Math.sqrt(2 * p1 * q1) + zBeta * Math.sqrt(p1 * q1 + p2 * q2)) ** 2;
  const den = (p2 - p1) ** 2;
  const n = Math.ceil(num / den);
  return Math.max(0, n);
};

// Minimum Detectable Effect for a given sample size per variant (absolute)
export const mdeForSampleSize = ({ baseline, nPerGroup, alpha = 0.05, power = 0.8 }) => {
  if (!(baseline > 0 && baseline < 1) || !(nPerGroup > 0)) return 0;
  const zAlpha = alpha === 0.10 ? 1.645 : alpha === 0.01 ? 2.576 : 1.96;
  const zBeta = power === 0.9 ? 1.2816 : 0.8416;
  // Use iterative approximation for mde
  let low = 0.0001;
  let high = Math.min(0.5, 1 - baseline - 1e-6);
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const p1 = baseline;
    const p2 = baseline + mid;
    const q1 = 1 - p1, q2 = 1 - p2;
    const lhs = (zAlpha * Math.sqrt(2 * p1 * q1) + zBeta * Math.sqrt(p1 * q1 + p2 * q2)) ** 2;
    const rhs = (p2 - p1) ** 2 * nPerGroup;
    if (lhs > rhs) low = mid; else high = mid;
  }
  return (low + high) / 2;
};

// Uplift percent (variant vs control)
export const calculateUplift = (control, variant) => {
  const crC = calculateConversionRate(control.visitor_count, control.conversion_count);
  const crV = calculateConversionRate(variant.visitor_count, variant.conversion_count);
  if (crC === 0) return crV > 0 ? Infinity : 0;
  return ((crV - crC) / crC) * 100;
};

// Power achieved for given observed data
export const achievedPower = ({ n1, x1, n2, x2, alpha = 0.05 }) => {
  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;
  return powerTwoProportions({ n1, n2, p1, p2, alpha });
};

// Sample Ratio Mismatch detection (observed vs planned traffic split)
// plannedSplit: [controlShare(0..1), variantShare(0..1), ...]
export const sampleRatioMismatch = ({ counts, plannedSplit, tolerance = 0.05 }) => {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const observed = counts.map(c => c / total);
  const deviations = observed.map((o, i) => Math.abs(o - (plannedSplit[i] ?? 0)));
  const worst = Math.max(...deviations);
  return { mismatch: worst > tolerance, worstDeviation: worst, observed };
};

// Bayesian (Beta-Binomial) approximate probability treatment > control + credible interval via sampling
export const bayesianAB = ({ n1, x1, n2, x2, samples = 4000 }) => {
  // Beta(1 + successes, 1 + failures) posteriors
  const a1 = 1 + x1, b1 = 1 + (n1 - x1);
  const a2 = 1 + x2, b2 = 1 + (n2 - x2);
  // Simple gamma sampling for Beta via inverse-transform is complex; use approximate normal for Beta mean if large n
  // For robustness, use simple Monte Carlo with Beta approximation using Cheng's method fallback to Box-Muller when needed.
  // Here we implement a simple Beta sampler using two Gamma(k,1) via Marsaglia and Tsang
  const sampleGamma = (k) => {
    // Marsaglia and Tsang method for k >= 1; for k < 1, use boost
    if (k < 1) {
      const u = Math.random();
      return sampleGamma(k + 1) * Math.pow(u, 1 / k);
    }
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x = 0, v = 0, u = 0;
      do {
        const u1 = Math.random();
        const u2 = Math.random();
        const r = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        x = r;
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      u = Math.random();
      if (u < 1 - 0.331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const sampleBeta = (a, b) => {
    const ga = sampleGamma(a);
    const gb = sampleGamma(b);
    return ga / (ga + gb);
  };

  const draws1 = new Array(samples);
  const draws2 = new Array(samples);
  for (let i = 0; i < samples; i++) {
    draws1[i] = sampleBeta(a1, b1);
    draws2[i] = sampleBeta(a2, b2);
  }
  const diffs = draws2.map((v, i) => v - draws1[i]);
  const probBetter = diffs.filter(d => d > 0).length / samples;
  const sorted = diffs.slice().sort((a, b) => a - b);
  const lower = sorted[Math.floor(0.025 * samples)];
  const upper = sorted[Math.floor(0.975 * samples)];
  return { probBetter, credInt: { lower, upper } };
};

// Alpha spending (very simplified) for sequential looks
export const adjustedAlpha = ({ alpha = 0.05, looks = 1 }) => {
  const k = Math.max(1, looks);
  return alpha / Math.sqrt(k); // simple spend: Pocock-like softness
};

// Helper to format percent safely
export const fmtPct = (v, digits = 1) => {
  if (!Number.isFinite(v)) return '–';
  return `${v.toFixed(digits)}%`;
};