import React from "react";

export default function DecisionStatusBadge({ status = "pending", confidencePct = null, timeText = "", issue = "", onClick }) {
  const cfg = {
    ready: { emoji: "🟢", color: "border-green-200 bg-green-50 text-green-700" },
    warning: { emoji: "🟡", color: "border-yellow-200 bg-yellow-50 text-yellow-700" },
    danger: { emoji: "🔴", color: "border-red-200 bg-red-50 text-red-700" },
    pending: { emoji: "⏳", color: "border-slate-200 bg-slate-50 text-slate-700" }
  }[status] || { emoji: "⏳", color: "border-slate-200 bg-slate-50 text-slate-700" };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-2 text-xs md:text-xs sm:text-sm px-3 py-2 md:px-2.5 md:py-1 rounded-full border ${cfg.color} ${onClick ? "cursor-pointer active:scale-95 transition-transform" : "opacity-100"} touch-manipulation`}
    >
      <span className="text-base md:text-xs">{cfg.emoji}</span>
      {issue && <span className="font-medium">{issue}</span>}
      {typeof confidencePct === "number" && <span className="font-medium">{Math.round(confidencePct)}%</span>}
      {timeText && <span className="text-slate-600 hidden sm:inline">{timeText}</span>}
    </button>
  );
}