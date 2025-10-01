
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Brain, Lightbulb, Loader2 } from "lucide-react";
import DecisionSupportService from "@/components/services/DecisionSupportService";
import DecisionTrackingService from "@/components/services/DecisionTrackingService";

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || (navigator && navigator.maxTouchPoints > 0);
}

function IconByName({ name = "bulb", className = "w-4 h-4" }) {
  if (name === "brain") return <Brain className={className} />;
  return <Lightbulb className={className} />;
}

export default function DecisionTooltip(props) {
  const { type = "when_to_stop", context = {}, style = "inline", icon = "bulb", label = null, useAI = false, onRecommendation } = props;
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [rec, setRec] = React.useState(null);

  const trafficEmoji = rec?.traffic === "green" ? "🟢" : rec?.traffic === "red" ? "🔴" : rec?.traffic === "yellow" ? "🟡" : null;

  const load = async () => {
    setLoading(true);
    const r = await DecisionSupportService.recommend({ type, context, useAI });
    setRec(r || null);
    setLoading(false);
    if (r && context?.test_id) {
      await DecisionTrackingService.trackDecisionView(context.test_id, type, r);
    }
    if (r && typeof onRecommendation === "function") {
      onRecommendation(r);
    }
  };

  React.useEffect(() => {
    if (open && !rec && !loading) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ConfidenceRow = () => {
    if (!rec?.confidencePct && !rec?.timeEstimate) return null;
    return (
      <div className="mt-2 text-xs text-slate-600 space-y-1">
        {typeof rec.confidencePct === "number" && (
          <div className="font-medium">
            Confidence: {Math.round(rec.confidencePct)}%
          </div>
        )}
        {rec.timeEstimate && (
          <div className="text-slate-500">
            {rec.timeEstimate}
          </div>
        )}
      </div>
    );
  };

  const Content = (
    <Card className="shadow-lg max-h-[80vh] md:max-h-none overflow-y-auto">
      <CardContent className="p-3 md:p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2 mb-2">
              {trafficEmoji && <span className="text-lg">{trafficEmoji}</span>}
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800 mb-1">
                  {rec?.title || "Decision support"}
                </div>
                {rec?.explanation && (
                  <div className="text-xs text-slate-600 mb-2">
                    {rec.explanation}
                  </div>
                )}
              </div>
            </div>

            {Array.isArray(rec?.steps) && rec.steps.length > 0 && (
              <ul className="list-disc ml-6 text-xs text-slate-700 space-y-1">
                {rec.steps.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}

            <ConfidenceRow />

            {/* NEW: Business impact display */}
            {rec?.businessImpact && rec.businessImpact.monthly > 0 && (
              <div className="mt-3 p-2 bg-green-50 rounded-md border border-green-200">
                <div className="text-xs font-semibold text-green-800">
                  💰 Potential Impact
                </div>
                <div className="text-sm text-green-700">
                  ${Math.round(rec.businessImpact.monthly).toLocaleString()}/mo
                </div>
                {rec.businessImpact.costOfDelay > 100 && (
                  <div className="text-xs text-amber-600 mt-1">
                    Delay cost: ~${Math.round(rec.businessImpact.costOfDelay / 7).toLocaleString()}/day
                  </div>
                )}
              </div>
            )}

            {rec?.source === "ai" && (
              <div className="mt-2 text-[10px] text-slate-400">AI assisted</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  // Touch: use Popover for inline/floating
  if (style === "inline") {
    if (isTouchDevice()) {
      return (
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center text-slate-400 hover:text-slate-600 p-2 -m-2 touch-manipulation min-w-[44px] min-h-[44px] justify-center"
              aria-label="Decision support"
            >
              <IconByName name={icon} className="w-5 h-5 md:w-4 md:h-4" />
              {label && <span className="ml-2 text-xs text-slate-700">{label}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[90vw] max-w-sm mx-2">
            {Content}
          </PopoverContent>
        </Popover>
      );
    }

    // Desktop hover tooltip
    return (
      <TooltipProvider>
        <Tooltip open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center text-slate-400 hover:text-slate-600 p-1.5 -m-1.5"
              aria-label="Decision support"
            >
              <IconByName name={icon} className="w-4 h-4" />
              {label && <span className="ml-1.5 text-xs text-slate-700">{label}</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">{Content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Floating style: use popover on both
  if (style === "floating") {
    return (
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 touch-manipulation">
            <IconByName name={icon} className="w-4 h-4" />
            {label || "Advice"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] max-w-md md:max-w-sm mx-2">
          {Content}
        </PopoverContent>
      </Popover>
    );
  }

  // Expanded: inline full card
  return <div className="w-full">{Content}</div>;
}
