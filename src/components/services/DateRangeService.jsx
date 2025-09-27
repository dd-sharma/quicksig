import { format, differenceInCalendarDays } from "date-fns";

function normalize(d) {
  if (!d) return null;
  return typeof d === "string" ? new Date(d) : d;
}

export const DateRangeService = {
  parsePresetRange(preset) {
    // Handled in DateRangePicker directly; keep placeholder for consistency
    return null;
  },
  formatDateRange(start, end) {
    if (!start && !end) return "All time";
    const fmt = (d) => format(d, "MMM. d, yyyy");
    return `${start ? fmt(start) : "…"} - ${end ? fmt(end) : "…"}`
  },
  getComparisonRange(start, end) {
    const s = normalize(start); const e = normalize(end);
    if (!s || !e) return { start: null, end: null };
    const len = differenceInCalendarDays(e, s) + 1;
    const prevEnd = new Date(s); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (len - 1));
    return { start: prevStart, end: prevEnd };
  },
  isDateInRange(date, start, end) {
    const d = normalize(date);
    if (!d) return false;
    const s = start ? normalize(start) : null;
    const e = end ? normalize(end) : null;
    if (s && d < s) return false;
    if (e && d > e) return false;
    return true;
  },
  getDefaultRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return { start: start, end: end };
  },
  saveToUrl(range, extras = {}) {
    const url = new URL(window.location.href);
    if (range?.start) url.searchParams.set("start", range.start.toISOString());
    else url.searchParams.delete("start");
    if (range?.end) url.searchParams.set("end", range.end.toISOString());
    else url.searchParams.delete("end");
    Object.entries(extras || {}).forEach(([k,v]) => {
      if (v === undefined || v === null || v === "" ) url.searchParams.delete(k);
      else url.searchParams.set(k, String(v));
    });
    window.history.replaceState({}, "", url.toString());
  },
  loadFromUrl() {
    const url = new URL(window.location.href);
    const startISO = url.searchParams.get("start");
    const endISO = url.searchParams.get("end");
    return {
      start: startISO ? new Date(startISO) : null,
      end: endISO ? new Date(endISO) : null
    };
  }
};

export default DateRangeService;