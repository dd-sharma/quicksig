import React from "react";
import { Circle } from "lucide-react";

function clamp(v, a=0, b=100){ return Math.max(a, Math.min(b, v)); }

export default function TestQualityScore({ testData, variants, conflicts = [], estDurationDays, hypothesisPresent }) {
  const nameScore = (testData?.test_name || "").trim().length >= 4 ? 20 : 5;
  const variantNamesGood = variants.every(v => (v.variant_name || "").trim().length >= 2 && !/variant [a-z]$/i.test(v.variant_name || ""));
  const variantScore = variantNamesGood ? 10 : 4;
  const durationScore = estDurationDays && estDurationDays <= 30 ? 20 : 10;
  const conflictsScore = conflicts.length === 0 ? 20 : 5;
  const docScore = hypothesisPresent ? 15 : 6;
  const metricScore = testData?.success_metric?.type ? 15 : 5;

  const score = clamp(nameScore + variantScore + durationScore + conflictsScore + docScore + metricScore);

  const color = score < 50 ? "text-red-600" : score < 75 ? "text-amber-600" : "text-emerald-600";
  const ring = score < 50 ? "stroke-red-500" : score < 75 ? "stroke-amber-500" : "stroke-emerald-500";

  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="18" cy="18" r="16" fill="none"
          className={ring}
          strokeWidth="4"
          strokeDasharray={`${(score/100)*2*Math.PI*16} ${2*Math.PI*16}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <div>
        <div className={`text-xl font-bold ${color}`}>{score}</div>
        <div className="text-xs text-slate-600">Quality score</div>
      </div>
    </div>
  );
}