import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function ConfidenceExplainer({ confidencePct = 0, totalVisitors = 0 }) {
  const explanation =
    confidencePct >= 95 ? "Very confident this is a real improvement." :
    confidencePct >= 90 ? "Fairly confident, but some uncertainty remains." :
    confidencePct >= 80 ? "Suggestive but needs more data." :
    "Too early to draw conclusions.";

  const sampleLabel =
    totalVisitors >= 5000 ? "Sufficient" :
    totalVisitors >= 1000 ? "Needs more" : "Insufficient";

  const target = confidencePct >= 95 ? 95 : 95;
  const deltaNeeded = Math.max(0, target - confidencePct);
  const eta =
    deltaNeeded === 0 ? "Confidence target reached." :
    sampleLabel === "Sufficient" ? "Likely within a few days." :
    "Collect more traffic to improve confidence.";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-slate-900">Confidence</div>
          <div className="text-sm text-slate-600">{confidencePct.toFixed(1)}%</div>
        </div>
        <Progress value={confidencePct} className="h-2" />
        <div className="mt-3 text-sm text-slate-700">{explanation}</div>
        <div className="mt-2 text-xs text-slate-500">
          Sample size: <span className="font-medium">{sampleLabel}</span> • Visitors observed: {totalVisitors.toLocaleString()}
        </div>
        <div className="mt-1 text-xs text-slate-500">Estimated time to higher confidence: {eta}</div>
      </CardContent>
    </Card>
  );
}