import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function RiskAssessment({ bestCasePct = 0, mostLikelyPct = 0, worstCasePct = 0, riskNote = "" }) {
  const riskLevel =
    mostLikelyPct >= 10 && worstCasePct > 0 ? "Low" :
    mostLikelyPct >= 5 && worstCasePct > -2 ? "Medium" : "High";

  const cell = (label, v, color) => (
    <div className={`p-3 rounded-lg text-center ${color}`}>
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-lg font-semibold">{v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`}</div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-5">
        <div className="font-medium text-slate-900 mb-3">Risk Assessment</div>
        <div className="grid grid-cols-3 gap-3">
          {cell("Best case (95th pct)", bestCasePct, "bg-emerald-50")}
          {cell("Most likely", mostLikelyPct, "bg-blue-50")}
          {cell("Worst case (5th pct)", worstCasePct, "bg-red-50")}
        </div>
        <div className="mt-4 text-sm text-slate-700">
          Implementation risk level: <span className="font-semibold">{riskLevel}</span>
        </div>
        {riskNote && <div className="mt-1 text-xs text-slate-500">{riskNote}</div>}
      </CardContent>
    </Card>
  );
}