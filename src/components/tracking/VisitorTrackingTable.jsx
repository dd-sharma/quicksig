import React, { useEffect, useMemo, useState, useCallback } from "react";
import { VisitorSession, ConversionEvent, Variant } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { CheckCircle, XCircle, Download, Filter as FilterIcon, Search, ChevronLeft, ChevronRight, Monitor, Smartphone, Tablet } from "lucide-react";

function maskIp(ip) {
  if (!ip) return "-";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.000`;
  return ip.slice(0, 4) + "***";
}

export default function VisitorTrackingTable({ testId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [variants, setVariants] = useState([]);
  const [search, setSearch] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [convFilter, setConvFilter] = useState("all"); // all | yes | no
  const [deviceFilter, setDeviceFilter] = useState("all"); // all | desktop | mobile | tablet
  const [dateFilter, setDateFilter] = useState("30"); // 7 | 30 | 90 | all
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [sortField, setSortField] = useState("firstSeen");
  const [sortDir, setSortDir] = useState("desc");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sessions, conversions, vars] = await Promise.all([
        VisitorSession.filter({ test_id: testId }, "-created_date"),
        ConversionEvent.filter({ test_id: testId }, "-created_date"),
        Variant.filter({ ab_test_id: testId })
      ]);

      setVariants(vars);

      const convByVisitor = conversions.reduce((acc, c) => {
        const key = c.visitor_id;
        if (!acc[key]) acc[key] = { count: 0, value: 0 };
        acc[key].count += 1;
        acc[key].value += c.conversion_value || 0;
        return acc;
      }, {});

      // Group sessions by visitor_id
      const byVisitor = new Map();
      for (const s of sessions) {
        const v = byVisitor.get(s.visitor_id) || {
          visitor_id: s.visitor_id,
          variant_id: s.variant_id,
          sessions: 0,
          firstSeen: s.created_at || s.created_date,
          lastSeen: s.created_at || s.created_date,
          device_type: s.device_type,
          browser_name: s.browser_name,
          ip_address: s.ip_address,
          referrer_source: s.referrer_source,
          landing_page: s.landing_page
        };
        v.sessions += 1;
        // stick with first assigned variant; if changed, keep first
        if ((s.created_at || s.created_date) < v.firstSeen) {
          v.firstSeen = s.created_at || s.created_date;
          v.variant_id = s.variant_id;
        }
        if ((s.created_at || s.created_date) > v.lastSeen) {
          v.lastSeen = s.created_at || s.created_date;
          v.device_type = s.device_type || v.device_type;
          v.browser_name = s.browser_name || v.browser_name;
          v.referrer_source = s.referrer_source || v.referrer_source;
          v.landing_page = s.landing_page || v.landing_page;
        }
        byVisitor.set(s.visitor_id, v);
      }

      const rowsPrepared = Array.from(byVisitor.values()).map(r => {
        const conv = convByVisitor[r.visitor_id];
        return {
          ...r,
          converted: !!conv,
          conversion_value: conv ? conv.value : 0
        };
      });

      setRows(rowsPrepared);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const variantNameById = useMemo(() => {
    const map = {};
    variants.forEach(v => map[v.id] = v.variant_name);
    return map;
  }, [variants]);

  const filteredSorted = useMemo(() => {
    let data = rows.filter(r => {
      const matchSearch = !search || r.visitor_id.toLowerCase().includes(search.toLowerCase());
      const matchVariant = variantFilter === "all" || r.variant_id === variantFilter;
      const matchConv = convFilter === "all" || (convFilter === "yes" ? r.converted : !r.converted);
      const matchDevice = deviceFilter === "all" || (r.device_type || "desktop") === deviceFilter;
      let matchDate = true;
      if (dateFilter !== "all") {
        const days = parseInt(dateFilter, 10);
        const since = new Date();
        since.setDate(since.getDate() - days);
        matchDate = new Date(r.firstSeen) >= since;
      }
      return matchSearch && matchVariant && matchConv && matchDevice && matchDate;
    });

    data.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "visitor":
          return a.visitor_id.localeCompare(b.visitor_id) * dir;
        case "variant":
          return (variantNameById[a.variant_id] || "").localeCompare(variantNameById[b.variant_id] || "") * dir;
        case "device":
          return (a.device_type || "").localeCompare(b.device_type || "") * dir;
        case "sessions":
          return (a.sessions - b.sessions) * dir;
        case "converted":
          return ((a.converted ? 1 : 0) - (b.converted ? 1 : 0)) * dir;
        case "value":
          return ((a.conversion_value || 0) - (b.conversion_value || 0)) * dir;
        default:
          return (new Date(a.firstSeen) - new Date(b.firstSeen)) * dir;
      }
    });

    return data;
  }, [rows, search, variantFilter, convFilter, deviceFilter, dateFilter, sortField, sortDir, variantNameById]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));

  const exportCSV = () => {
    const header = ["Visitor ID", "Variant", "Device", "Browser", "First Seen", "Sessions", "Converted", "Conversion Value", "Referrer"];
    const rowsData = filteredSorted.map(r => ([
      r.visitor_id.slice(0, 8),
      variantNameById[r.variant_id] || r.variant_id,
      r.device_type || "-",
      r.browser_name || "-",
      format(new Date(r.firstSeen), "PP p"),
      r.sessions,
      r.converted ? "Yes" : "No",
      r.conversion_value ?? 0,
      r.referrer_source || "-"
    ]));
    const csv = [header.join(","), ...rowsData.map(cols => cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visitor_tracking.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const DeviceIcon = ({ type }) => {
    if (type === "mobile") return <Smartphone className="w-4 h-4" />;
    if (type === "tablet") return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">All Visitors</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search by visitor ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-56" />
            <Select value={variantFilter} onValueChange={setVariantFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Variants</SelectItem>
                {variants.map(v => <SelectItem key={v.id} value={v.id}>{v.variant_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={convFilter} onValueChange={setConvFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Converted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Converted</SelectItem>
                <SelectItem value="no">Not Converted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-36">
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
      </CardHeader>
      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("visitor"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>Visitor</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("variant"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>Variant</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("device"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>Device/Browser</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("firstSeen"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>First Seen</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("sessions"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>Sessions</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("converted"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>Converted</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortField("value"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>Value</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(r => (
                <TableRow key={r.visitor_id}>
                  <TableCell className="font-mono text-xs">{r.visitor_id.slice(0, 8)}</TableCell>
                  <TableCell>{variantNameById[r.variant_id] || r.variant_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DeviceIcon type={r.device_type} />
                      <span className="text-sm text-slate-700">{r.device_type || "-"}</span>
                      <span className="text-xs text-slate-400">• {r.browser_name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(r.firstSeen), "PP p")}</TableCell>
                  <TableCell>{r.sessions}</TableCell>
                  <TableCell>
                    {r.converted ? (
                      <Badge className="bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Yes</Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1"><XCircle className="w-3 h-3" /> No</Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.conversion_value ? `$${r.conversion_value.toFixed(2)}` : "-"}</TableCell>
                  <TableCell>{r.referrer_source || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{maskIp(r.ip_address)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-500">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredSorted.length)} of {filteredSorted.length}
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

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {paginated.map(r => (
            <Card key={r.visitor_id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs">{r.visitor_id.slice(0, 8)}</div>
                <div className="text-xs text-slate-500">{format(new Date(r.firstSeen), "PP p")}</div>
              </div>
              <div className="mt-2 text-sm">
                <div className="flex items-center gap-2">
                  <DeviceIcon type={r.device_type} />
                  <span>{r.device_type || "-"}</span>
                  <span className="text-slate-400">• {r.browser_name || "-"}</span>
                </div>
                <div className="mt-1">Variant: <span className="font-medium">{variantNameById[r.variant_id] || r.variant_id}</span></div>
                <div className="mt-1">Sessions: {r.sessions}</div>
                <div className="mt-1">Source: {r.referrer_source || "-"}</div>
                <div className="mt-1">Converted: {r.converted ? "Yes" : "No"} {r.conversion_value ? `($${r.conversion_value.toFixed(2)})` : ""}</div>
                <div className="mt-1 text-xs text-slate-500">IP: {maskIp(r.ip_address)}</div>
              </div>
            </Card>
          ))}
          {/* Pagination mobile */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}