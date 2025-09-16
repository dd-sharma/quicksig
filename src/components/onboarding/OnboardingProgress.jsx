import React from "react";
import { Progress } from "@/components/ui/progress";

export default function OnboardingProgress({ step = 1, total = 5, etaMinutes = 3 }) {
  const percent = Math.round((step - 1) / total * 100);
  return (
    <div className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-600">Step {step} of {total}</div>
          <div className="text-sm text-slate-600">{etaMinutes} minutes left</div>
        </div>
        <Progress value={percent} />
      </div>
    </div>
  );
}