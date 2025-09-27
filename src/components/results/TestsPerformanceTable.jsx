import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ABTest, Variant, Visitor, Conversion, User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { format, subDays } from "date-fns";
import { 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Eye, 
  Search, 
  Filter as FilterIcon 
} from "lucide-react";
import { 
  calculateConversionRate, 
  calculateConfidenceLevel, 
  calculateUplift 
} from "@/components/results/ResultsCalculator";

const statusStyles = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  running: "bg-green-100 text-green-700 border-green-200",
  paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200"
};

const dateRanges = [
  { key: "7", label: "Last 7 days" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

const confidenceRanges = [
  { key: "all", label: "All" },
  { key: "high", label: "High (≥95%)" },
  { key: "medium", label: "Medium (80–95%)" },
  { key: "low", label: "Low (<80%)" },
];

export default function TestsPerformanceTable() {
  const [isLoading, setIsLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortField, setSortField] = useState("start"); // start | visitors | variants | best | confidence | uplift | name | status
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      if (!user?.organization_id) {
        setTests([]);
        setIsLoading(false);
        return;
      }
      const abTests = await ABTest.filter({ organization_id: user.organization_id }, "-created_date");
      
      const enriched = [];
      for (const t of abTests) {
        const [variants, visitors, conversions] = await Promise.all([
          Variant.filter({ ab_test_id: t.id }),
          Visitor.filter({ ab_test_id: t.id }),
          Conversion.filter({ ab_test_id: t.id }),
        ]);

        const variantStats = variants.map(v => {
          const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
          const vConversions = conversions.filter(c => c.variant_id === v.id).length;
          const rate = calculateConversionRate(vVisitors, vConversions);
          return {
            ...v,
            visitor_count: vVisitors,
            conversion_count: vConversions,
            conversion_rate: rate,
          };
        });

        const control = variantStats.find(v => v.variant_type === "control");
        const nonControl = variantStats.filter(v => v.variant_type !== "control");
        const best = variantStats.length > 0 
          ? variantStats.reduce((a, b) => (a.conversion_rate > b.conversion_rate ? a : b))
          : null;

        let confidence = 0;
        let uplift = 0;
        if (control && best && best.id !== control.id) {
          confidence = calculateConfidenceLevel(control, best) || 0;
          uplift = calculateUplift(control, best) || 0;
        }

        const totalVisitors = variantStats.reduce((sum, v) => sum + v.visitor_count, 0);

        enriched.push({
          test: t,
          variants: variantStats,
          variantCount: variants.length,
          totalVisitors,
          control,
          bestVariant: best,
          confidence,
          uplift,
          startDate: t.started_date ? new Date(t.started_date) : (t.created_date ? new Date(t.created_date) : null),
        });
      }

      setTests(enriched);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let data = [...tests];

    // Status filter
    if (statusFilter !== "all") {
      data = data.filter(d => d.test.test_status === statusFilter);
    }

    // Date range filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter, 10);
      const cutoff = subDays(new Date(), days);
      data = data.filter(d => {
        const date = d.startDate || new Date(d.test.created_date);
        return date >= cutoff;
      });
    }

    // Confidence filter
    if (confidenceFilter !== "all") {
      data = data.filter(d => {
        const confPct = d.confidence * 100;
        if (confidenceFilter === "high") return confPct >= 95;
        if (confidenceFilter === "medium") return confPct >= 80 && confPct < 95;
        if (confidenceFilter === "low") return confPct > 0 && confPct < 80;
        return true;
      });
    }

    // Search by name
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(d => d.test.test_name.toLowerCase().includes(q));
    }

    // Sorting
    const compare = (a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return dir * a.test.test_name.localeCompare(b.test.test_name);
        case "status":
          return dir * a.test.test_status.localeCompare(b.test.test_status);
        case "start": {
          const ad = a.startDate ? a.startDate.getTime() : 0;
          const bd = b.startDate ? b.startDate.getTime() : 0;
          return dir * (ad - bd);
        }
        case "variants":
          return dir * (a.variantCount - b.variantCount);
        case "visitors":
          return dir * (a.totalVisitors - b.totalVisitors);
        case "best":
          return dir * ((a.bestVariant?.conversion_rate || 0) - (b.bestVariant?.conversion_rate || 0));
        case "confidence":
          return dir * (a.confidence - b.confidence);
        case "uplift":
          return dir * (a.uplift - b.uplift);
        default:
          return 0;
      }
    };
    data.sort(compare);
    return data;
  }, [tests, statusFilter, dateFilter, confidenceFilter, search, sortField, sortDir]);

  const setSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "start" ? "desc" : "asc");
    }
  };

  const SortIndicator = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
    );
  };

  const exportFilteredResults = () => {
    if (filtered.length === 0) return;

    const rows = filtered.map(d => ({
      "Test Name": d.test.test_name,
      "Status": d.test.test_status,
      "Start Date": d.startDate ? format(d.startDate, "MMM d, yyyy") : "",
      "Variants": d.variantCount,
      "Visitors": d.totalVisitors,
      "Best Variant": d.bestVariant ? d.bestVariant.variant_name : "",
      "Best Conv Rate (%)": d.bestVariant ? d.bestVariant.conversion_rate.toFixed(2) : "0.00",
      "Confidence": `${(d.confidence * 100).toFixed(1)}%`,
      "Uplift (%)": d.control && d.bestVariant && d.bestVariant.id !== d.control.id ? d.uplift.toFixed(2) : "-"
    }));

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tests_performance.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportSingleTest = (d) => {
    const variants = d.variants;
    if (!variants || variants.length === 0) return;

    const rows = variants.map(v => ({
      "Variant": v.variant_name,
      "Visitors": v.visitor_count,
      "Conversions": v.conversion_count,
      "Conversion Rate (%)": v.conversion_rate.toFixed(2),
      "Confidence vs Control": d.control && v.id !== d.control.id ? `${(calculateConfidenceLevel(d.control, v) * 100).toFixed(1)}%` : "-",
      "Uplift vs Control (%)": d.control && v.id !== d.control.id ? calculateUplift(d.control, v).toFixed(2) : "-"
    }));

    const csv = [
      Object.keys(rows[0]).join(","),
      ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.test.test_name}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tests Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests..."
                className="pl-9"
              />
            </div>
            <div className="hidden md:flex items-center gap-2 text-slate-500">
              <FilterIcon className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Confidence" />
              </SelectTrigger>
              <SelectContent>
                {confidenceRanges.map(r => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportFilteredResults} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => setSort("name")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Test Name <SortIndicator field="name" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("status")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Status <SortIndicator field="status" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("start")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Start Date <SortIndicator field="start" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("variants")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Variants <SortIndicator field="variants" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("visitors")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Total Visitors <SortIndicator field="visitors" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("best")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Best Performer <SortIndicator field="best" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("confidence")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Confidence <SortIndicator field="confidence" />
                  </div>
                </TableHead>
                <TableHead onClick={() => setSort("uplift")} className="cursor-pointer">
                  <div className="flex items-center gap-1.5">
                    Uplift % <SortIndicator field="uplift" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No tests match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.test.id}>
                    <TableCell className="font-medium">
                      <Link to={createPageUrl(`TestDetail?id=${d.test.id}`)} className="text-blue-600 hover:underline">
                        {d.test.test_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusStyles[d.test.test_status]} border text-xs`}>
                        {d.test.test_status.charAt(0).toUpperCase() + d.test.test_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.startDate ? format(d.startDate, "MMM d, yyyy") : "-"}</TableCell>
                    <TableCell>{d.variantCount} {d.variantCount === 1 ? "variant" : "variants"}</TableCell>
                    <TableCell>{d.totalVisitors.toLocaleString()}</TableCell>
                    <TableCell>
                      {d.bestVariant ? (
                        <span className="font-medium">
                          {d.bestVariant.variant_name} - {d.bestVariant.conversion_rate.toFixed(2)}%
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {d.control && d.bestVariant && d.bestVariant.id !== d.control.id ? (
                        <div className="flex items-center gap-2">
                          <Progress value={d.confidence * 100} className="w-24 h-2" />
                          <span className="text-sm">{(d.confidence * 100).toFixed(1)}%</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className={d.uplift > 0 ? "text-green-600" : d.uplift < 0 ? "text-red-600" : ""}>
                      {d.control && d.bestVariant && d.bestVariant.id !== d.control.id ? `${d.uplift.toFixed(2)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={createPageUrl(`TestDetail?id=${d.test.id}`)}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Eye className="w-4 h-4" /> Details
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportSingleTest(d)}>
                          <Download className="w-4 h-4" /> Export
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-6 text-slate-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-slate-500">No tests match your filters.</div>
          ) : (
            filtered.map(d => (
              <Card key={d.test.id} className="border border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link to={createPageUrl(`TestDetail?id=${d.test.id}`)} className="font-semibold text-slate-900">
                      {d.test.test_name}
                    </Link>
                    <Badge className={`${statusStyles[d.test.test_status]} border text-xs`}>
                      {d.test.test_status.charAt(0).toUpperCase() + d.test.test_status.slice(1)}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-600">
                    {d.startDate ? format(d.startDate, "MMM d, yyyy") : "-"} • {d.variantCount} {d.variantCount === 1 ? "variant" : "variants"}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500">Visitors</div>
                      <div className="font-medium">{d.totalVisitors.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Best</div>
                      <div className="font-medium">
                        {d.bestVariant ? `${d.bestVariant.variant_name} - ${d.bestVariant.conversion_rate.toFixed(1)}%` : "-"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500">Confidence</div>
                      {d.control && d.bestVariant && d.bestVariant.id !== d.control.id ? (
                        <div className="flex items-center gap-2">
                          <Progress value={d.confidence * 100} className="h-2" />
                          <span className="text-xs">{(d.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ) : (
                        <div className="text-slate-500">-</div>
                      )}
                    </div>
                    <div>
                      <div className="text-slate-500">Uplift</div>
                      <div className={`font-medium ${d.uplift > 0 ? "text-green-600" : d.uplift < 0 ? "text-red-600" : ""}`}>
                        {d.control && d.bestVariant && d.bestVariant.id !== d.control.id ? `${d.uplift.toFixed(1)}%` : "-"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link to={createPageUrl(`TestDetail?id=${d.test.id}`)} className="flex-1">
                      <Button variant="outline" className="w-full gap-1.5">
                        <Eye className="w-4 h-4" /> Details
                      </Button>
                    </Link>
                    <Button variant="outline" className="gap-1.5" onClick={() => exportSingleTest(d)}>
                      <Download className="w-4 h-4" />
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}