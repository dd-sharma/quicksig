import React from "react";
import DateRangeService from "@/components/services/DateRangeService";

const DateRangeContext = React.createContext(null);

export function DateRangeProvider({ children }) {
  const persisted = (() => {
    try {
      const raw = localStorage.getItem("qs_date_range");
      if (!raw) return null;
      const { start, end, applyGlobally } = JSON.parse(raw);
      return {
        start: start ? new Date(start) : null,
        end: end ? new Date(end) : null,
        applyGlobally: !!applyGlobally
      };
    } catch { return null; }
  })();

  const [range, setRange] = React.useState(persisted || DateRangeService.getDefaultRange());
  const [applyGlobally, setApplyGlobally] = React.useState(persisted?.applyGlobally ?? true);

  const update = (r) => {
    setRange(r);
    try {
      localStorage.setItem("qs_date_range", JSON.stringify({ start: r.start?.toISOString() || null, end: r.end?.toISOString() || null, applyGlobally }));
    } catch {}
  };

  const toggleApplyGlobally = (v) => {
    setApplyGlobally(v);
    try {
      localStorage.setItem("qs_date_range", JSON.stringify({ start: range.start?.toISOString() || null, end: range.end?.toISOString() || null, applyGlobally: v }));
    } catch {}
  };

  return (
    <DateRangeContext.Provider value={{ range, setRange: update, applyGlobally, setApplyGlobally: toggleApplyGlobally }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = React.useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}

export default DateRangeContext;