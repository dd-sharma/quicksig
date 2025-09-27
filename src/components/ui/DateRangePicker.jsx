import React from "react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function fmt(d) {
  if (!d) return "";
  return format(d, "MMM. d, yyyy");
}

const presets = [
  { key: "today", label: "Today", get: () => {
    const now = new Date();
    return { start: startOfDay(now), end: endOfDay(now) };
  }},
  { key: "yesterday", label: "Yesterday", get: () => {
    const y = subDays(new Date(), 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }},
  { key: "last7", label: "Last 7 days", get: () => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 6));
    return { start, end };
  }},
  { key: "last14", label: "Last 14 days", get: () => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 13));
    return { start, end };
  }},
  { key: "last30", label: "Last 30 days", get: () => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 29));
    return { start, end };
  }},
  { key: "last90", label: "Last 90 days", get: () => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 89));
    return { start, end };
  }},
  { key: "thisMonth", label: "This month", get: () => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }},
  { key: "lastMonth", label: "Last month", get: () => {
    const now = new Date();
    const lm = subMonths(now, 1);
    return { start: startOfMonth(lm), end: endOfMonth(lm) };
  }},
  { key: "thisQuarter", label: "This quarter", get: () => {
    const now = new Date();
    return { start: startOfQuarter(now), end: endOfQuarter(now) };
  }},
  { key: "lastQuarter", label: "Last quarter", get: () => {
    const now = new Date();
    const lq = subQuarters(now, 1);
    return { start: startOfQuarter(lq), end: endOfQuarter(lq) };
  }},
  { key: "thisYear", label: "This year", get: () => {
    const now = new Date();
    return { start: startOfYear(now), end: endOfYear(now) };
  }},
  { key: "lastYear", label: "Last year", get: () => {
    const ly = subYears(new Date(), 1);
    return { start: startOfYear(ly), end: endOfYear(ly) };
  }},
  { key: "all", label: "All time", get: () => ({ start: null, end: null }) },
];

export default function DateRangePicker({ value, onChange, className, showLabel = true }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ start: value?.start || null, end: value?.end || null });
  const [monthOffset, setMonthOffset] = React.useState(0);

  // Normalize dependencies to simple vars to satisfy lint rules
  const startVal = value?.start || null;
  const endVal = value?.end || null;

  React.useEffect(() => {
    setDraft({ start: startVal, end: endVal });
  }, [startVal, endVal]);

  const apply = () => {
    // ensure start <= end
    let { start, end } = draft;
    if (start && end && start > end) {
      const tmp = start; start = end; end = tmp;
    }
    onChange?.({ start, end });
    setOpen(false);
  };

  const clear = () => {
    onChange?.({ start: null, end: null });
    setOpen(false);
  };

  const display = value?.start || value?.end
    ? `${value?.start ? fmt(value.start) : "…"} - ${value?.end ? fmt(value.end) : "…"}`
    : "All time";

  const baseMonth = new Date();
  baseMonth.setMonth(baseMonth.getMonth() + monthOffset);

  const renderCalendar = (which) => {
    const month = new Date(baseMonth);
    if (which === "right") month.setMonth(month.getMonth() + 1);
    const year = month.getFullYear();
    const m = month.getMonth();

    // Build grid
    const first = new Date(year, m, 1);
    const startWeekday = first.getDay(); // 0-6
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));

    const pick = (d) => {
      if (!draft.start || (draft.start && draft.end)) {
        setDraft({ start: d, end: null });
      } else if (draft.start && !draft.end) {
        setDraft(prev => ({ ...prev, end: d }));
      }
    };

    const isInRange = (d) => {
      if (!d || !draft.start || !draft.end) return false;
      const s = startOfDay(draft.start).getTime();
      const e = endOfDay(draft.end).getTime();
      const x = d.getTime();
      return x >= s && x <= e;
    };

    const isSelected = (d) => {
      if (!d) return false;
      return (draft.start && startOfDay(d).getTime() === startOfDay(draft.start).getTime()) ||
             (draft.end && startOfDay(d).getTime() === startOfDay(draft.end).getTime());
    };

    return (
      <div className="w-64">
        <div className="flex items-center justify-between mb-2">
          {which === "left" ? (
            <Button variant="ghost" size="icon" onClick={() => setMonthOffset(o => o - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : <div />}
          <div className="text-sm font-medium">{format(month, "MMMM yyyy")}</div>
          {which === "right" ? (
            <Button variant="ghost" size="icon" onClick={() => setMonthOffset(o => o + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : <div />}
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, idx) => (
            <button
              key={idx}
              disabled={!d}
              onClick={() => d && pick(d)}
              className={`h-8 text-sm rounded-md ${!d ? "opacity-0" : "hover:bg-slate-100"} ${isInRange(d) ? "bg-blue-50" : ""} ${isSelected(d) ? "ring-2 ring-blue-500 bg-blue-100" : ""}`}
            >
              {d ? d.getDate() : ""}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-start gap-2 ${className || ""}`}>
          <CalendarIcon className="w-4 h-4" />
          <span className="truncate">{display}</span>
          {value?.start || value?.end ? (
            <X className="w-3.5 h-3.5 ml-auto" onClick={(e) => { e.stopPropagation(); clear(); }} />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        {showLabel && <div className="text-sm font-medium mb-2">Select date range</div>}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-40">
            <div className="grid grid-cols-1 gap-1">
              {presets.map(p => (
                <Button key={p.key} variant="ghost" className="justify-start text-sm" onClick={() => setDraft(p.get())}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            {renderCalendar("left")}
            <div className="hidden md:block">{renderCalendar("right")}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input type="date" value={draft.start ? format(draft.start, "yyyy-MM-dd") : ""} onChange={e => setDraft(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))} />
          <Input type="date" value={draft.end ? format(draft.end, "yyyy-MM-dd") : ""} onChange={e => setDraft(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))} />
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" onClick={clear}>Reset</Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}