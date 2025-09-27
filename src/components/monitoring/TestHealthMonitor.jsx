import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Activity } from "lucide-react";

export default function TestHealthMonitor({ variants = [] }) {
  if (!variants.length) return null;
  const total = variants.reduce((s, v) => s + (v.visitor_count || 0), 0);
  const hasTraffic = total > 0;
  const trafficOk = hasTraffic && variants.every(v => v.visitor_count > 0);

  return (
    <Card className="mb-4">
      <CardContent className="p-4 flex items-center gap-4">
        <Activity className="w-5 h-5 text-slate-500" />
        <div className="text-sm">
          <div className="font-medium">Test Health</div>
          <div className="text-slate-600">
            {trafficOk ? (
              <span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Data collection active</span>
            ) : (
              <span className="flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" /> No traffic yet</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}