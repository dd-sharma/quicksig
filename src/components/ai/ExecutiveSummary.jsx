import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Minus, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";

export default function ExecutiveSummary({ interpretation, testName }) {
  const { executiveSummary, meta } = interpretation || {};
  const status = meta?.status || "no_diff";
  const confidencePct = meta?.confidencePct || 0;

  const color = {
    winner: "bg-emerald-50 border-emerald-200",
    trending: "bg-amber-50 border-amber-200",
    no_diff: "bg-slate-50 border-slate-200",
    negative: "bg-red-50 border-red-200",
  }[status];

  const icon = {
    winner: <Trophy className="w-5 h-5 text-emerald-600" />,
    trending: <TrendingUp className="w-5 h-5 text-amber-600" />,
    no_diff: <Minus className="w-5 h-5 text-slate-600" />,
    negative: <TrendingDown className="w-5 h-5 text-red-600" />,
  }[status];

  const badgeVariant = status === "winner" ? "bg-emerald-100 text-emerald-700"
    : status === "negative" ? "bg-red-100 text-red-700"
    : status === "trending" ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-700";

  const confLabel = confidencePct >= 95 ? "High"
    : confidencePct >= 85 ? "Medium"
    : "Low";

  return (
    <Card className={`border ${color}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border">{icon}</div>
            <div>
              <div className="text-sm text-slate-500">Test</div>
              <div className="font-semibold text-slate-900">{testName}</div>
            </div>
          </div>
          <Badge className={`${badgeVariant} border`}>{confLabel} confidence</Badge>
        </div>
        <p className="mt-3 text-slate-800">{executiveSummary}</p>
        <div className="mt-3 text-xs text-slate-600 flex items-center gap-4">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {meta?.totalVisitors?.toLocaleString?.() || 0} visitors</span>
          {meta?.durationText && (<span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {meta.durationText}</span>)}
        </div>
      </CardContent>
    </Card>
  );
}