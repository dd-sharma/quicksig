import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || (navigator && navigator.maxTouchPoints > 0);
}

export default function HelpTooltip({ content, side = "top", children, title }) {
  const trigger = children ? children : (
    <button
      type="button"
      className="inline-flex items-center text-slate-400 hover:text-slate-600 p-2 -m-2 min-w-[44px] min-h-[44px] justify-center touch-manipulation"
      aria-label={title || "Help"}
    >
      <Info className="w-4 h-4" />
    </button>
  );

  if (isTouchDevice()) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent side={side} className="max-w-xs">
          <div className="text-sm text-slate-800">{title}</div>
          <div className="text-xs text-slate-600 mt-1">{content}</div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="text-sm text-slate-800">{title}</div>
          <div className="text-xs text-slate-600 mt-1">{content}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}