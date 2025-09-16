import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConversionEvent, VisitorSession, Variant } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, ChevronLeft, ChevronRight, Filter as FilterIcon } from "lucide-react";
import { format, differenceInSeconds, parseISO } from "date-fns";

export default function ConversionEventsTable({ testId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [variants, setVariants] = useState([]);
  const [goalFilter, setGoalFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [evts, sessions, vars] = await Promise.all([
        ConversionEvent.filter({ test_id: testId }, "-created_date"),
        VisitorSession.filter({ test_id: testId }),
        Variant.filter({ ab_test_id: testId })
      ]);

      setVariants(vars);

      const firstSessionByVisitor = sessions.reduce((acc, s) => {
        const d = new Date(s.created_at || s.created_date);
        const prev = acc[s.visitor_id];
        if (!prev || d < prev) acc[s.visitor_id] = d;
        return acc;
      }, {});

      const prepared = evts.map(e => {
        const tConv = new Date(e.created_at || e.created_date);
        const tFirst = firstSessionByVisitor[e.visitor_id];
        const timeTo = tFirst ? differenceInSeconds(tConv, tFirst) : null;
        return { ...e, time_to_conversion_sec: timeTo };
      });

      setEvents(prepared);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goals = useMemo(() => {
    const set = new Set(events.map(e => e.goal_name).filter(Boolean));
    return Array.from(set);
  }, [events]);

  const filtered = useMemo(() => {
    let data = [...events];
    if (goalFilter !== "all") data = data.filter(e => e.goal_name === goalFilter);
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter, 10);
      const since = new Date();
      since.setDate(since.getDate() - days);
      data = data.filter(e => new Date(e.created_at || e.created_date) >= since);
    }
    return data;
  }, [events, goalFilter, dateFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const agg = useMemo(() => {
    const total = filtered.length;
    const totalValue = filtered.reduce((s, e) => s + (e.conversion_value || 0), 0);
    const times = filtered.map(e => e.time_to_conversion_sec).filter(v => typeof v === "number").sort((a, b) => a - b);
    const median = times.length ? times[Math.floor(times.length / 2)] : null;
    return { total, avgValue: total ? totalValue / total : 0, medianTimeSec: median };
  }, [filtered]);

  const exportCSV = () => {
    const header = ["Event ID", "Visitor", "Variant", "Goal", "Value", "Timestamp", "Time to Conversion (sec)"];
    const rowsData = filtered.map(e => ([
      e.id,
      (e.visitor_id || "").slice(0, 8),
      variants.find(v => v.id === e.variant_id)?.variant_name || e.variant_id,
      e.goal_name || "-",
      e.conversion_value || 0,
      format(new Date(e.created_at || e.created_date), "PP p"),
      e.time_to_conversion_sec ?? ""
    ]));
    const csv = [header.join(","), ...rowsData.map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "conversion_events.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Conversions</CardTitle>
          <div className="flex gap-2">
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Goals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                {goals.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-slate-500">Total Conversions</div>
              <div className="text-lg font-semibold">{agg.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-slate-500">Avg. Value</div>
              <div className="text-lg font-semibold">${agg.avgValue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="text-xs text-slate-500">Median Time to Conversion</div>
              <div className="text-lg font-semibold">{agg.medianTimeSec != null ? `${Math.round(agg.medianTimeSec / 60)} min` : "-"}</div>
            </CardContent>
          </Card>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Visitor</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Time to Conversion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono text-xs">{(e.visitor_id || "").slice(0, 8)}</TableCell>
                  <TableCell>{variants.find(v => v.id === e.variant_id)?.variant_name || e.variant_id}</TableCell>
                  <TableCell>{e.goal_name || "-"}</TableCell>
                  <TableCell>{e.conversion_value ? `$${e.conversion_value.toFixed(2)}` : "-"}</TableCell>
                  <TableCell>{format(new Date(e.created_at || e.created_date), "PP p")}</TableCell>
                  <TableCell>{e.time_to_conversion_sec != null ? `${Math.round(e.time_to_conversion_sec / 60)} min` : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}