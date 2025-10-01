import React from "react";
import { Lock, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calculateConfidenceLevel } from "@/components/results/ResultsCalculator";

export default function ResultsLock({ test, variants }) {
  if (!test || !variants?.length) return null;
  const control = variants.find(v => v.variant_type === "control");
  const others = variants.filter(v => v.variant_type !== "control");

  const minVisitorsPerVariant = Math.min(...variants.map(v => v.visitor_count || 0));
  const hoursRunning = test.started_date ? (Date.now() - new Date(test.started_date).getTime()) / 36e5 : 0;

  // Compute best observed confidence vs control
  let bestConf = 0;
  others.forEach(v => {
    const conf = calculateConfidenceLevel(control, v);
    bestConf = Math.max(bestConf, conf || 0);
  });

  const locked = minVisitorsPerVariant < 100 || hoursRunning < 24 || bestConf < 0.95;

  if (!locked) return null;

  const visitorProgress = Math.min(100, Math.round((minVisitorsPerVariant / 100) * 100));
  const timeProgress = Math.min(100, Math.round((hoursRunning / 24) * 100));
  const confProgress = Math.min(100, Math.round(bestConf * 100));

  const overall = Math.min(visitorProgress, timeProgress, confProgress);

  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-5 h-5 text-amber-700" />
          <div className="font-medium text-amber-800">Results locked to prevent peeking bias</div>
        </div>
        <div className="text-sm text-amber-800 mb-3">
          Results will unlock once each variant has ≥100 visitors, the test has run ≥24 hours, and one variant reaches ≥95% confidence.
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-700">Progress to unlock</div>
          <Progress value={overall} />
          <div className="flex gap-4 text-xs text-slate-600">
            <span>Visitors: {visitorProgress}%</span>
            <span>Time: {timeProgress}%</span>
            <span>Confidence: {confProgress}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}