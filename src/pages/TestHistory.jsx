
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ABTest, Variant, Visitor, Conversion, User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInCalendarDays, isSameMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input as NumberInput } from "@/components/ui/input"; // reuse Input for number type
import {
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Download,
  History as HistoryIcon,
  AlertTriangle,
  Tag,
  Sparkles,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { Calendar as ShadCalendar } from "@/components/ui/calendar";
// Removed unsupported dependency:
// import { DateRange } from "react-day-picker"
import { DateUtils } from "@/components/services/date-utils";

import {
  calculateConversionRate,
  calculateConfidenceLevel,
  calculateUplift,
} from "@/components/results/ResultsCalculator";

import VirtualList from "@/components/mobile/VirtualList"; // Added import

const STATUS_COLORS = {
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  archived: "bg-slate-100 text-slate-700 border-slate-200",
};

const PAGE_SIZE = 25;


const DateRangePicker = React.forwardRef(
  ({ className, value, onChange, ...props }, ref) => {
    return (
      <div className={cn("grid gap-2", className)} {...props}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {value?.from ? (
                value.to ? (
                  `${format(value.from, "MMM dd, yyyy")} - ${format(value.to, "MMM dd, yyyy")}`
                ) : (
                  format(value.from, "MMM dd, yyyy")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center" side="bottom">
            <ShadCalendar
              mode="range"
              defaultMonth={value?.from ? value.from : new Date()}
              selected={value}
              onSelect={onChange}
              numberOfMonths={2}
              pagedNavigation
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
DateRangePicker.displayName = "DateRangePicker"


export default function TestHistory() {
  const [isLoading, setIsLoading] = useState(true);
  const [tests, setTests] = useState([]); // enriched rows
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | completed | archived
  const [sortBy, setSortBy] = useState("recent"); // recent | oldest | uplift | visitors
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set()); // FIX: removed erroneous `new` before useState
  const [winnerQuery, setWinnerQuery] = useState("");
  const [minUplift, setMinUplift] = useState("");
  const [minConfidence, setMinConfidence] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [allTags, setAllTags] = useState([]);

  const [dateRange, setDateRange] = useState(undefined);
  const [dateField, setDateField] = useState("ended_date");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await User.me();
      if (!me?.organization_id) {
        setTests([]);
        setAllTags([]);
        return;
      }
      const [completed, archived] = await Promise.all([
        ABTest.filter({ organization_id: me.organization_id, test_status: "completed" }, "-ended_date"),
        ABTest.filter({ organization_id: me.organization_id, test_status: "archived" }, "-ended_date"),
      ]);
      const baseList = [...completed, ...archived];

      // Enrich each test with metrics
      const enriched = [];
      const tagSet = new Set();

      for (const t of baseList) {
        const [variants, visitors, conversions] = await Promise.all([
          Variant.filter({ ab_test_id: t.id }),
          Visitor.filter({ ab_test_id: t.id }),
          Conversion.filter({ ab_test_id: t.id }),
        ]);

        const totalVisitors = visitors.length;

        const control = variants.find(v => v.variant_type === "control");
        let winnerName = "No Clear Winner";
        let confidence = 0;
        let uplift = 0;

        if (control) {
          const variantStats = variants.map(v => {
            const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
            const vConversions = conversions.filter(c => c.variant_id === v.id).length;
            const cr = calculateConversionRate(vVisitors, vConversions);
            return { v, vVisitors, vConversions, cr };
          });

          const best = variantStats.reduce((a, b) => (a.cr > b.cr ? a : b), variantStats[0] || null);
          if (best && best.v.id !== control.id) {
            const cVisitors = variantStats.find(x => x.v.id === control.id)?.vVisitors || 0;
            const cConversions = variantStats.find(x => x.v.id === control.id)?.vConversions || 0;

            const conf = calculateConfidenceLevel(
              { visitor_count: cVisitors, conversion_count: cConversions },
              { visitor_count: best.vVisitors, conversion_count: best.vConversions }
            );
            confidence = conf ? conf * 100 : 0;
            uplift = calculateUplift(
              { visitor_count: cVisitors, conversion_count: cConversions },
              { visitor_count: best.vVisitors, conversion_count: best.vConversions }
            );
            winnerName = best.v.variant_name;
          }
        }

        const start = t.started_date ? new Date(t.started_date) : (t.created_date ? new Date(t.created_date) : null);
        const end = t.ended_date ? new Date(t.ended_date) : null;
        const duration = start && end ? differenceInCalendarDays(end, start) || 0 : 0;

        (t.tags || []).forEach(tag => tagSet.add(tag));

        enriched.push({
          test: t,
          status: t.test_status,
          startDate: start,
          endDate: end,
          createdDate: t.created_date ? new Date(t.created_date) : null,
          duration,
          totalVisitors,
          winnerName,
          confidence,
          uplift,
        });
      }

      setTests(enriched);
      setAllTags(Array.from(tagSet));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const completed = tests.filter(t => t.status === "completed");
    const winners = completed.filter(t => t.winnerName !== "No Clear Winner" && t.confidence >= 95);
    const durations = completed.map(t => t.duration || 0);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const totalVisitors = tests.reduce((sum, t) => sum + (t.totalVisitors || 0), 0);
    const successRate = completed.length ? Math.round((winners.length / completed.length) * 100) : 0;
    return {
      completedCount: completed.length,
      avgDuration,
      successRate,
      totalVisitors
    };
  }, [tests]);

  const filtered = useMemo(() => {
    let data = [...tests];

    if (statusFilter !== "all") {
      data = data.filter(d => d.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(d => d.test.test_name.toLowerCase().includes(q));
    }

    if (startDate) {
      const s = new Date(startDate);
      data = data.filter(d => (d.startDate ? d.startDate >= s : true));
    }
    if (endDate) {
      const e = new Date(endDate);
      data = data.filter(d => (d.endDate ? d.endDate <= e : true));
    }

    if (dateRange?.from) {
      data = data.filter(d => {
        const dateValue =
          dateField === "created_date" ? d.createdDate :
            dateField === "started_date" ? d.startDate :
              d.endDate;

        return dateValue && DateUtils.isWithinRange(dateValue, dateRange);
      });
    }

    if (winnerQuery.trim()) {
      const q = winnerQuery.toLowerCase();
      data = data.filter(d => (d.winnerName || "").toLowerCase().includes(q));
    }
    if (minUplift !== "" && !Number.isNaN(Number(minUplift))) {
      data = data.filter(d => (d.uplift || 0) >= Number(minUplift));
    }
    if (minConfidence !== "" && !Number.isNaN(Number(minConfidence))) {
      data = data.filter(d => (d.confidence || 0) >= Number(minConfidence));
    }
    if (tagQuery.trim()) {
      const required = tagQuery.split(",").map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
      data = data.filter(d => {
        const tags = (d.test.tags || []).map(t => t.toLowerCase());
        return required.every(req => tags.includes(req));
      });
    }

    switch (sortBy) {
      case "recent":
        data.sort((a, b) => (b.endDate?.getTime() || 0) - (a.endDate?.getTime() || 0));
        break;
      case "oldest":
        data.sort((a, b) => (a.endDate?.getTime() || 0) - (b.endDate?.getTime() || 0));
        break;
      case "uplift":
        data.sort((a, b) => (b.uplift || 0) - (a.uplift || 0));
        break;
      case "visitors":
        data.sort((a, b) => (b.totalVisitors || 0) - (a.totalVisitors || 0));
        break;
      default:
        break;
    }

    return data;
  }, [tests, statusFilter, search, startDate, endDate, sortBy, winnerQuery, minUplift, minConfidence, tagQuery, dateRange, dateField]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const startIndex = (pageClamped - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, total);
  const pageRows = filtered.slice(startIndex, endIndex);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = (checked) => {
    const ids = pageRows.map(r => r.test.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => checked ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const archiveOrRestore = async (row) => {
    const t = row.test;
    const me = await User.me();
    if (row.status === "archived") {
      await ABTest.update(t.id, { test_status: "completed", is_archived: false });
    } else if (row.status === "completed") {
      const ok = window.confirm(`Archive "${t.test_name}"? You can restore it later.`);
      if (!ok) return;
      await ABTest.update(t.id, {
        test_status: "archived",
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: me?.id || null
      });
    }
    fetchData();
  };

  const exportSingle = (row) => {
    const t = row.test;
    const headers = [
      "Test Name",
      "Status",
      "Start Date",
      "End Date",
      "Duration (days)",
      "Total Visitors",
      "Winner",
      "Confidence (%)",
      "Uplift (%)",
    ];
    const values = [
      t.test_name,
      row.status,
      row.startDate ? format(row.startDate, "MMM d, yyyy") : "",
      row.endDate ? format(row.endDate, "MMM d, yyyy") : "",
      row.duration,
      row.totalVisitors,
      row.winnerName,
      row.confidence.toFixed(1),
      row.uplift.toFixed(2),
    ];
    const csv = `${headers.join(",")}\n${values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.test_name}_summary.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportFiltered = async () => {
    const rows = [];
    for (const r of filtered) {
      const t = r.test;
      const [variants, visitors, conversions] = await Promise.all([
        Variant.filter({ ab_test_id: t.id }),
        Visitor.filter({ ab_test_id: t.id }),
        Conversion.filter({ ab_test_id: t.id })
      ]);
      const perVariant = variants.map(v => {
        const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
        const vConversions = conversions.filter(c => c.variant_id === v.id).length;
        const cr = calculateConversionRate(vVisitors, vConversions);
        return { variant_name: v.variant_name, visitors: vVisitors, conversions: vConversions, cr };
      });
      perVariant.forEach(pv => {
        rows.push({
          test_name: t.test_name,
          status: r.status,
          start_date: r.startDate ? format(r.startDate, "yyyy-MM-dd") : "",
          end_date: r.endDate ? format(r.endDate, "yyyy-MM-dd") : "",
          duration_days: r.duration,
          total_visitors: r.totalVisitors,
          variant: pv.variant_name,
          variant_visitors: pv.visitors,
          variant_conversions: pv.conversions,
          variant_cr_pct: pv.cr.toFixed(2),
          winner: r.winnerName,
          confidence_pct: r.confidence ? r.confidence.toFixed(1) : "",
          uplift_pct: r.winnerName !== "No Clear Winner" ? r.uplift.toFixed(2) : ""
        });
      });
    }
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(obj => headers.map(h => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const rangeSuffix = (() => {
      if (!startDate && !endDate) return "all";
      const s = startDate ? startDate : "start";
      const e = endDate ? endDate : "now";
      return `${s}_to_${e}`;
    })();

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test_history_${rangeSuffix}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const bulkArchive = async () => {
    if (selectedIds.size === 0) return;
    const selectedRows = filtered.filter(r => selectedIds.has(r.test.id));
    const toArchive = selectedRows.filter(r => r.status === "completed");
    if (toArchive.length === 0) {
      alert("No completed tests selected for archiving.");
      return;
    }
    const ok = window.confirm(`Archive ${toArchive.length} selected completed test(s)?`);
    if (!ok) return;
    const me = await User.me();
    await Promise.all(toArchive.map(r =>
      ABTest.update(r.test.id, {
        test_status: "archived",
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: me?.id || null
      })
    ));
    setSelectedIds(new Set());
    fetchData();
  };

  const bulkExport = async () => {
    if (selectedIds.size === 0) {
      alert("No tests selected for export.");
      return;
    }
    const subset = filtered.filter(r => selectedIds.has(r.test.id));
    const rows = [];
    for (const r of subset) {
      const t = r.test;
      const [variants, visitors, conversions] = await Promise.all([
        Variant.filter({ ab_test_id: t.id }),
        Visitor.filter({ ab_test_id: t.id }),
        Conversion.filter({ ab_test_id: t.id })
      ]);
      const perVariant = variants.map(v => {
        const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
        const vConversions = conversions.filter(c => c.variant_id === v.id).length;
        const cr = calculateConversionRate(vVisitors, vConversions);
        return { variant_name: v.variant_name, visitors: vVisitors, conversions: vConversions, cr };
      });
      perVariant.forEach(pv => {
        rows.push({
          test_name: t.test_name,
          status: r.status,
          start_date: r.startDate ? format(r.startDate, "yyyy-MM-dd") : "",
          end_date: r.endDate ? format(r.endDate, "yyyy-MM-dd") : "",
          duration_days: r.duration,
          total_visitors: r.totalVisitors,
          variant: pv.variant_name,
          variant_visitors: pv.visitors,
          variant_conversions: pv.conversions,
          variant_cr_pct: pv.cr.toFixed(2),
          winner: r.winnerName,
          confidence_pct: r.confidence ? r.confidence.toFixed(1) : "",
          uplift_pct: r.winnerName !== "No Clear Winner" ? r.uplift.toFixed(2) : ""
        });
      });
    }
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(obj => headers.map(h => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `test_history_selected_${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
  };

  const addTagsToSelected = async () => {
    if (selectedIds.size === 0) return;
    const input = window.prompt("Enter tags to add (comma-separated):");
    if (!input) return;
    const tagsToAdd = input.split(",").map(s => s.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    await Promise.all(
      [...selectedIds].map(async id => {
        const row = tests.find(r => r.test.id === id);
        const existing = row?.test?.tags || [];
        const merged = Array.from(new Set([...existing, ...tagsToAdd]));
        return ABTest.update(id, { tags: merged });
      })
    );
    setSelectedIds(new Set());
    fetchData();
  };

  const compareSelected = () => {
    if (selectedIds.size < 2) {
      alert("Select at least 2 tests to compare.");
      return;
    }
    if (selectedIds.size > 3) {
      alert("You can compare a maximum of 3 tests.");
      return;
    }
    const ids = [...selectedIds].slice(0,3).join(",");
    window.location.href = createPageUrl(`CompareTests?ids=${ids}`);
  };

  const archiveOlderThan = async (days = 60) => {
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    const candidates = filtered.filter(r => r.status === "completed" && r.endDate && r.endDate.getTime() < cutoff);
    if (candidates.length === 0) {
      alert("No completed tests older than the selected threshold.");
      return;
    }
    const ok = window.confirm(`Archive ${candidates.length} test(s) completed more than ${days} days ago?`);
    if (!ok) return;
    const me = await User.me();
    await Promise.all(
      candidates.map(r => ABTest.update(r.test.id, {
        test_status: "archived",
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: me?.id || null
      }))
    );
    setSelectedIds(new Set());
    fetchData();
  };

  const exportAuditLog = async () => {
    const logs = [];
    const headers = ["date","user_id","description","entity_type","entity_id"];
    const csv = [headers.join(","), ...logs.map(l => [l.created_date, l.user_id, l.action_description, l.entity_type, l.entity_id].map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit_log.csv"; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
  };

  const insights = useMemo(() => {
    const today = new Date();
    const inMonth = filtered.filter(r => r.endDate && isSameMonth(r.endDate, today));
    const best = inMonth.reduce((bestAcc, current) => (current.uplift || 0) > (bestAcc?.uplift || 0) ? current : bestAcc, null);
    const highConf = filtered.filter(r => (r.confidence || 0) >= 95).slice(0, 5);
    const oldCompleted = filtered.filter(r => r.status === "completed" && r.endDate && (Date.now() - r.endDate.getTime()) > 90 * 24 * 3600 * 1000).length;
    const ctaCount = filtered.filter(r => /cta|button|call to action/i.test(r.test.description || "")).length;
    return { best, highConf, oldCompleted, pattern: ctaCount >= 3 ? "CTA tests perform best lately." : null };
  }, [filtered]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-slate-700" />
              <h1 className="text-3xl font-bold text-slate-900">Test History</h1>
            </div>
            <p className="text-slate-600 mt-1">View and manage your completed and archived tests</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Total Tests Completed</div><div className="text-2xl font-bold">{stats.completedCount}</div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Average Test Duration</div><div className="text-2xl font-bold">{stats.avgDuration}d</div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Overall Success Rate</div><div className="2xl font-bold">{stats.successRate}%</div></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-4"><div className="text-sm text-slate-500">Total Visitors Tested</div><div className="2xl font-bold">{stats.totalVisitors.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card className="shadow-sm mb-3">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tests..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">From</span>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-[160px]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">To</span>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-[160px]" />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="uplift">Highest Uplift</SelectItem>
                  <SelectItem value="visitors">Most Visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input placeholder="Winner name" value={winnerQuery} onChange={(e)=>{ setWinnerQuery(e.target.value); setPage(1); }} />
            <NumberInput type="number" placeholder="Min uplift %" value={minUplift} onChange={(e)=>{ setMinUplift(e.target.value); setPage(1); }} />
            <NumberInput type="number" placeholder="Min confidence %" value={minConfidence} onChange={(e)=>{ setMinConfidence(e.target.value); setPage(1); }} />
            <Input placeholder="Tags (comma-separated)" value={tagQuery} onChange={(e)=>{ setTagQuery(e.target.value); setPage(1); }} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportFiltered}>
              <Download className="w-4 h-4 mr-2" /> Export Filtered
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" onClick={bulkExport}>
                  <Download className="w-4 h-4 mr-2" /> Export Selected
                </Button>
                <Button onClick={bulkArchive} className="bg-destructive hover:bg-destructive-hover text-white">
                  <Archive className="w-4 h-4 mr-2" /> Archive Selected
                </Button>
                <Button variant="outline" onClick={addTagsToSelected}>
                  <Tag className="w-4 h-4 mr-2" /> Add Tags to Selected
                </Button>
                <Button variant="outline" onClick={compareSelected}>
                  <Sparkles className="w-4 h-4 mr-2" /> Compare Selected
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => archiveOlderThan(60)}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Archive {">"}60 days
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-700">
            <div>Best test this month: <strong>{insights.best ? insights.best.test.test_name : "—"}</strong></div>
            <div>High-confidence tests (≥95%): {insights.highConf.length}</div>
            <div>Consider archiving: {insights.oldCompleted} old completed tests</div>
            {insights.pattern && <div>Pattern detected: {insights.pattern}</div>}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Date field:</span>
            <select
              className="border rounded-md h-9 px-2 text-sm"
              value={dateField}
              onChange={(e) => setDateField(e.target.value)}
            >
              <option value="created_date">Created</option>
              <option value="started_date">Started</option>
              <option value="ended_date">Ended</option>
            </select>
          </div>
          {/* Removed the generic "Showing X of Y" line from here as it's now handled below the table conditionally */}
          <Button variant="outline" className="ml-auto" onClick={() => { setSearch(""); setStatusFilter("all"); setDateRange(undefined); setDateField("ended_date"); }}>
            Clear all filters
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Completed & Archived Tests</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading tests...</div>
          ) : filtered.length > 50 ? (
            <div>
              {/* Table header - always visible */}
              <div className="border-b sticky top-0 bg-white z-10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filtered.length > 0 && filtered.every(r => selectedIds.has(r.test.id))}
                          onCheckedChange={(v) => {
                            const ids = filtered.map(r => r.test.id);
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              ids.forEach(id => v ? next.add(id) : next.delete(id));
                              return next;
                            });
                          }}
                        />
                      </TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Total Visitors</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Uplift</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
              </div>

              {/* Virtual scrolling body */}
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No tests found matching your criteria.</div>
              ) : (
                <VirtualList
                  items={filtered}
                  itemHeight={64}
                  height={600}
                  overscan={10}
                  className="border-x"
                  renderItem={(row) => (
                    // This structure renders a new Table for each row, which is not standard HTML table practice.
                    // However, this aligns with the provided outline.
                    <Table className="[overflow-unset]"> {/* Added [overflow-unset] to Table to prevent inner scrollbars if VirtualList already handles outer scroll */}
                      <TableBody className="[border-width:0_!important]"> {/* Remove border-y from TableBody items to avoid double borders */}
                        <TableRow key={row.test.id} className="hover:bg-slate-50">
                          <TableCell className="w-10">
                            <Checkbox
                              checked={selectedIds.has(row.test.id)}
                              onCheckedChange={() => toggleSelect(row.test.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link className="text-blue-600 hover:underline" to={createPageUrl(`TestDetail?id=${row.test.id}`)}>
                              {row.test.test_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[row.status]} border text-xs`}>
                              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.startDate ? format(row.startDate, "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell>{row.endDate ? format(row.endDate, "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell>{row.duration}d</TableCell>
                          <TableCell>{row.totalVisitors.toLocaleString()}</TableCell>
                          <TableCell>{row.winnerName}</TableCell>
                          <TableCell>{row.confidence ? `${row.confidence.toFixed(1)}%` : "-"}</TableCell>
                          <TableCell className={row.uplift > 0 ? "text-green-600" : row.uplift < 0 ? "text-red-600" : ""}>
                            {row.winnerName !== "No Clear Winner" ? `${row.uplift.toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl(`TestDetail?id=${row.test.id}`)}>
                                    <Eye className="w-4 h-4 mr-2" /> View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => archiveOrRestore(row)}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  {row.status === "archived" ? "Restore" : "Archive"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportSingle(row)}>
                                  <Download className="w-4 h-4 mr-2" /> Export
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                />
              )}

              <div className="text-sm text-slate-600 py-3 border-t">
                Showing {filtered.length} tests (virtual scrolling active for large datasets)
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.test.id))}
                          onCheckedChange={(v) => selectAllOnPage(Boolean(v))}
                        />
                      </TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Total Visitors</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Uplift</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-500">Loading...</TableCell>
                      </TableRow>
                    ) : pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-500">No tests found.</TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map(row => (
                        <TableRow key={row.test.id}>
                          <TableCell>
                            <Checkbox checked={selectedIds.has(row.test.id)} onCheckedChange={() => toggleSelect(row.test.id)} />
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link className="text-blue-600 hover:underline" to={createPageUrl(`TestDetail?id=${row.test.id}`)}>
                              {row.test.test_name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[row.status]} border text-xs`}>
                              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.startDate ? format(row.startDate, "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell>{row.endDate ? format(row.endDate, "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell>{row.duration}d</TableCell>
                          <TableCell>{row.totalVisitors.toLocaleString()}</TableCell>
                          <TableCell>{row.winnerName}</TableCell>
                          <TableCell>{row.confidence ? `${row.confidence.toFixed(1)}%` : "-"}</TableCell>
                          <TableCell className={row.uplift > 0 ? "text-green-600" : row.uplift < 0 ? "text-red-600" : ""}>
                            {row.winnerName !== "No Clear Winner" ? `${row.uplift.toFixed(2)}%` : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl(`TestDetail?id=${row.test.id}`)}>
                                    <Eye className="w-4 h-4 mr-2" /> View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => archiveOrRestore(row)}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  {row.status === "archived" ? "Restore" : "Archive"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportSingle(row)}>
                                  <Download className="w-4 h-4 mr-2" /> Export
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between py-4">
                <div className="text-sm text-slate-600">
                  {total === 0 ? "0-0 of 0 tests" : `${startIndex + 1}-${endIndex} of ${total} tests`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pageClamped <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm">
                    Page {pageClamped} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={pageClamped >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
