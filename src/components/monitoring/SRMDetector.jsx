import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function pct(n) { return `${(n * 100).toFixed(1)}%`; }

export default function SRMDetector({ variants = [], threshold = 0.05 }) {
  if (!variants.length) return null;
  const total = variants.reduce((s, v) => s + (v.visitor_count || 0), 0) || 1;

  const mismatches = variants.map(v => {
    const expected = (Number(v.traffic_percentage) || 0) / 100;
    const observed = (v.visitor_count || 0) / total;
    const diff = Math.abs(observed - expected);
    return { v, expected, observed, diff, exceeds: diff > threshold };
  });

  const hasIssue = mismatches.some(m => m.exceeds);
  if (!hasIssue) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4" />
        <span className="font-semibold">Sample Ratio Mismatch detected</span>
      </div>
      <div className="text-xs">
        Expected vs observed traffic split differs by more than 5%. Possible causes: implementation issues, bots, or uneven audience.
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {mismatches.map((m) => (
          <Badge key={m.v.id} variant="outline" className={m.exceeds ? "border-amber-400 text-amber-700" : ""}>
            {m.v.variant_name}: exp {pct(m.expected)} · obs {pct(m.observed)}
          </Badge>
        ))}
      </div>
    </div>
  );
}