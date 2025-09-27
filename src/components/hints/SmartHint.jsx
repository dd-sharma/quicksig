import React from "react";
import { X, Lightbulb, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SmartHint({
  hint,
  onDismiss,
  onAction,
  style = "banner" // banner | card | tooltip | spotlight
}) {
  if (!hint) return null;

  const Content = (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        <Lightbulb className="w-4 h-4 text-amber-500" />
      </div>
      <div className="text-sm">
        <div className="text-slate-800">{hint.message}</div>
        {hint.actionLabel && onAction && (
          <Button size="sm" variant="link" className="px-0 text-blue-700" onClick={onAction}>
            {hint.actionLabel} <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
      {hint.dismissible !== false && (
        <button onClick={onDismiss} className="ml-auto text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (style === "banner") {
    return (
      <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
        {Content}
      </div>
    );
  }

  if (style === "card") {
    return (
      <Card className="mb-4 border-amber-200">
        <CardContent className="p-4">{Content}</CardContent>
      </Card>
    );
  }

  // For tooltip/spotlight, fallback to a small banner for now to avoid intrusive behavior
  return (
    <div className="mb-3 p-2 rounded bg-amber-50 border border-amber-200 text-xs">
      {Content}
    </div>
  );
}