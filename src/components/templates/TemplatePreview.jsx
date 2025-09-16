import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";

export default function TemplatePreview({ open, onOpenChange, template, onUse }) {
  if (!template) return null;

  const primary = template.successMetrics?.primary;
  const before = template.variants?.[0]?.content || "Original content";
  const after = template.variants?.[1]?.content || "Improved content";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{template.name}</span>
            <div className="flex gap-2">
              <Badge variant="outline">Impact: {template.estimatedImpact}</Badge>
              <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" /> {template.recommendedDuration}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-2">Before</div>
            <div className="text-sm">{before}</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-xs text-slate-500 mb-2">After</div>
            <div className="text-sm">{after}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-1">Recommended Success Metric</div>
          <div className="text-sm text-slate-700">
            {primary?.type === "click" && `Track clicks on ${primary.selector}`}
            {primary?.type === "conversion" && `Track conversions to ${primary.target_url}`}
            {primary?.type === "page_visit" && `Track visits to ${primary.target_url}`}
            {primary?.type === "custom_event" && `Track custom event "${primary.event_name}"`}
            {!primary && "Clicks on your primary CTA"}
          </div>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-1">Best Practices</div>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            {template.tips?.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-1">Industry Benchmarks</div>
          <div className="text-sm text-slate-700">
            {Object.entries(template.benchmarks || {}).map(([k,v]) => (
              <div key={k} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {k}: {v}</div>
            ))}
            {(!template.benchmarks || Object.keys(template.benchmarks).length === 0) && "Benchmarks vary by industry and traffic."}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => onUse?.(template)} className="bg-blue-600 hover:bg-blue-700">Use this template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}