import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Row({ label, controlCR, varCR, uplift }) {
  const color = uplift > 0 ? "text-emerald-600" : uplift < 0 ? "text-red-600" : "text-slate-600";
  return (
    <div className="grid grid-cols-4 text-sm py-1">
      <div className="font-medium">{label}</div>
      <div>{controlCR.toFixed(2)}%</div>
      <div>{varCR.toFixed(2)}%</div>
      <div className={color}>{uplift >= 0 ? `+${uplift.toFixed(1)}%` : `${uplift.toFixed(1)}%`}</div>
    </div>
  );
}

export default function SegmentAnalyzer({ segments = [] }) {
  // segments: [{ name, controlCR, varCR, uplift }]
  const risky = segments.filter(s => s.uplift < 0);
  const strong = segments.filter(s => s.uplift > 10);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-slate-900">Segment Deep Dive</div>
          <div className="flex gap-2">
            <Badge variant="outline">{strong.length} strong segments</Badge>
            <Badge variant="outline" className="border-red-300 text-red-700">{risky.length} concerning</Badge>
          </div>
        </div>
        <div className="grid grid-cols-4 text-xs text-slate-500 pb-1 border-b">
          <div>Segment</div><div>Control CR</div><div>Variant CR</div><div>Uplift</div>
        </div>
        <div className="divide-y">
          {segments.map((s) => (
            <Row key={s.name} label={s.name} controlCR={s.controlCR} varCR={s.varCR} uplift={s.uplift} />
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-600">
          Tip: Roll out to strong segments first; investigate concerning segments before a full rollout.
        </div>
      </CardContent>
    </Card>
  );
}