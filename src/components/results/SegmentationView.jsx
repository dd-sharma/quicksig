import React from "react";
import { Variant, Visitor, Conversion } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Monitor, Smartphone, Tablet as TabletIcon, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import ExportService from "@/components/services/ExportService";
import { calculateConversionRate, calculateUplift, calculateConfidenceLevel } from "@/components/results/ResultsCalculator";

function inRangeISO(dateStr, start, end) {
  if (!start && !end) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  if (start && d < new Date(start).getTime()) return false;
  if (end && d > new Date(end).getTime()) return false;
  return true;
}

function normalizeDevice(device) {
  const d = (device || "desktop").toLowerCase();
  if (d.includes("mobile") || d === "phone") return "mobile";
  if (d.includes("tablet") || d === "ipad") return "tablet";
  return "desktop";
}

function categorizeReferrer(src) {
  const s = (src || "").toLowerCase();
  if (!s || s === "(direct)" || s === "direct") return "direct";
  const search = ["google", "bing", "duckduckgo", "yahoo", "baidu"];
  const social = ["facebook", "twitter", "x.com", "linkedin", "instagram", "tiktok", "pinterest", "reddit"];
  const emailHints = ["mail", "gmail", "outlook", "yahoo mail", "email", "mailchimp", "sendgrid"];
  if (search.some(k => s.includes(k))) return "search";
  if (social.some(k => s.includes(k))) return "social";
  if (emailHints.some(k => s.includes(k)) || s.includes("utm_medium=email")) return "email";
  if (s.startsWith("http") || s.includes(".")) return "referral";
  return "other";
}

const DEVICE_ORDER = ["desktop", "mobile", "tablet"];
const SOURCE_ORDER = ["direct", "search", "social", "email", "referral", "other"];
const DEVICE_ICONS = { desktop: Monitor, mobile: Smartphone, tablet: TabletIcon };

function confidenceBadge(visitors) {
  if (visitors >= 500) return <Badge className="bg-green-100 text-green-700 border-green-200">High sample</Badge>;
  if (visitors >= 100) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Medium sample</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Low sample</Badge>;
}

export default function SegmentationView({ testId, dateRange }) {
  const [loading, setLoading] = React.useState(true);
  const [variants, setVariants] = React.useState([]);
  const [visitors, setVisitors] = React.useState([]);
  const [conversions, setConversions] = React.useState([]);

  const [view, setView] = React.useState("device"); // device | source
  const [hideSmall, setHideSmall] = React.useState(false);
  const [minShow, setMinShow] = React.useState(30); // hide threshold for rows
  const [warnSize, setWarnSize] = React.useState(100); // warning threshold

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [vlist, vvis, cconv] = await Promise.all([
          Variant.filter({ ab_test_id: testId }),
          Visitor.filter({ ab_test_id: testId }),
          Conversion.filter({ ab_test_id: testId }),
        ]);
        setVariants(vlist || []);
        setVisitors(vvis || []);
        setConversions(cconv || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  const data = React.useMemo(() => {
    if (!variants.length) return { device: {}, source: {}, totals: { device: {}, source: {} } };

    // Precompute visitor lookup by id for segment attribution on conversions
    const visitorById = {};
    visitors.forEach(v => { visitorById[v.visitor_id] = v; });

    // Apply date range filters
    const start = dateRange?.start ? dateRange.start.toISOString() : null;
    const end = dateRange?.end ? dateRange.end.toISOString() : null;

    const filteredVisitors = visitors.filter(v => inRangeISO(v.first_seen_date, start, end));
    const filteredConversions = conversions.filter(c => inRangeISO(c.conversion_date, start, end));

    // Initialize aggregation structures
    const agg = { device: {}, source: {} };
    const ensure = (obj, segment, variantId) => {
      if (!obj[segment]) obj[segment] = {};
      if (!obj[segment][variantId]) obj[segment][variantId] = { visitors: 0, conversions: 0 };
    };

    // Count visitors by segment and variant
    filteredVisitors.forEach(v => {
      const segDevice = normalizeDevice(v.device_type);
      const segSource = categorizeReferrer(v.referrer_source);
      const varId = v.assigned_variant_id;
      if (!varId) return;

      ensure(agg.device, segDevice, varId);
      agg.device[segDevice][varId].visitors += 1;

      ensure(agg.source, segSource, varId);
      agg.source[segSource][varId].visitors += 1;
    });

    // Count conversions by segment and variant (use visitor_id to pull segment)
    filteredConversions.forEach(c => {
      const v = visitorById[c.visitor_id];
      if (!v) return;
      const segDevice = normalizeDevice(v.device_type);
      const segSource = categorizeReferrer(v.referrer_source);
      const varId = c.variant_id;
      if (!varId) return;

      ensure(agg.device, segDevice, varId);
      agg.device[segDevice][varId].conversions += 1;

      ensure(agg.source, segSource, varId);
      agg.source[segSource][varId].conversions += 1;
    });

    return agg;
  }, [variants, visitors, conversions, dateRange?.start, dateRange?.end]);

  const rows = React.useMemo(() => {
    if (!variants.length) return [];
    const order = view === "device" ? DEVICE_ORDER : SOURCE_ORDER;
    const segments = view === "device" ? data.device : data.source;

    // find control variant
    const control = variants.find(v => v.variant_type === "control");
    if (!control) return [];

    const list = [];
    order.forEach(seg => {
      const varMap = segments[seg] || {};
      // segment total visitors (sum across variants)
      const segTotalVisitors = Object.values(varMap).reduce((s, x) => s + (x?.visitors || 0), 0);
      // optionally hide small segs
      if (hideSmall && segTotalVisitors < minShow) return;

      variants.forEach(variant => {
        const stats = varMap[variant.id] || { visitors: 0, conversions: 0 };
        const controlStats = varMap[control.id] || { visitors: 0, conversions: 0 };
        const cr = calculateConversionRate(stats.visitors, stats.conversions);
        const uplift = variant.id === control.id ? null : calculateUplift(
          { visitor_count: controlStats.visitors, conversion_count: controlStats.conversions },
          { visitor_count: stats.visitors, conversion_count: stats.conversions }
        );
        const conf = variant.id === control.id ? null :
          calculateConfidenceLevel(
            { visitor_count: controlStats.visitors, conversion_count: controlStats.conversions },
            { visitor_count: stats.visitors, conversion_count: stats.conversions }
          );

        list.push({
          segment: seg,
          variant_id: variant.id,
          variant_name: variant.variant_name,
          visitors: stats.visitors || 0,
          conversions: stats.conversions || 0,
          cr,
          uplift,
          confidence: conf,
          segTotalVisitors,
          isControl: variant.id === control.id
        });
      });
    });

    return list;
  }, [view, data, variants, hideSmall, minShow]);

  const chartData = React.useMemo(() => {
    if (!rows.length || !variants.length) return [];
    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.segment]) grouped[r.segment] = { segment: r.segment };
      // use variant name key
      grouped[r.segment][`${r.variant_name}`] = Number.isFinite(r.cr) ? Number(r.cr.toFixed(2)) : 0;
    });
    return Object.values(grouped);
  }, [rows, variants.length]);

  const segmentedStats = React.useMemo(() => {
    if (!rows.length) return null;
    // Aggregate by segment any variant CR; use best variant CR within segment
    const bySeg = rows.reduce((acc, r) => {
      if (!acc[r.segment]) acc[r.segment] = { segment: r.segment, maxCr: -1, minCr: 1e9, maxUplift: -1e9, totalVisitors: 0 };
      const v = acc[r.segment];
      v.maxCr = Math.max(v.maxCr, r.cr || 0);
      v.minCr = Math.min(v.minCr, r.cr || 0);
      v.maxUplift = Math.max(v.maxUplift, r.uplift ?? -1e9);
      v.totalVisitors += r.visitors || 0;
      return acc;
    }, {});
    const arr = Object.values(bySeg);
    const best = arr.reduce((b, x) => x.maxCr > (b?.maxCr || -1) ? x : b, null);
    const worst = arr.reduce((b, x) => x.minCr < (b?.minCr || 1e9) ? x : b, null);
    const highestUplift = arr.reduce((b, x) => x.maxUplift > (b?.maxUplift || -1e9) ? x : b, null);
    const mostVisitors = arr.reduce((b, x) => x.totalVisitors > (b?.totalVisitors || -1) ? x : b, null);
    return { best, worst, highestUplift, mostVisitors };
  }, [rows]);

  const exportCSV = async () => {
    await ExportService.exportSegmentationData(testId, { dateRange });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Segmentation</span>
            <div className="flex items-center gap-2">
              <Select value={view} onValueChange={setView}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="device">Device Type</SelectItem>
                  <SelectItem value="source">Traffic Source</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={hideSmall} onChange={(e)=>setHideSmall(e.target.checked)} />
                  Hide small segments
                </label>
                <Input type="number" value={minShow} onChange={(e)=>setMinShow(Number(e.target.value || 0))} className="w-20" />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-600">Loading segmentation...</div>
          ) : rows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Info className="w-4 h-4" /> No segmentation data available.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Best Performing Segment</div><div className="text-base font-semibold">{segmentedStats?.best?.segment || "-"}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Worst Performing Segment</div><div className="text-base font-semibold">{segmentedStats?.worst?.segment || "-"}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Highest Uplift Segment</div><div className="text-base font-semibold">{segmentedStats?.highestUplift?.segment || "-"}</div></CardContent></Card>
                <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Most Visitors</div><div className="text-base font-semibold">{segmentedStats?.mostVisitors?.segment || "-"}</div></CardContent></Card>
              </div>

              {/* Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {variants.map((v, idx) => (
                      <Bar key={v.id} dataKey={v.variant_name} fill={idx === 0 ? "#3b82f6" : ["#10b981","#f59e0b","#ef4444","#6366f1","#14b8a6"][idx % 5]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Warning */}
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
                <AlertTriangle className="w-4 h-4" />
                Segments with fewer than {warnSize} visitors may not be reliable.
              </div>

              {/* Table */}
              <div className="overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Visitors</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Conv. Rate</TableHead>
                      <TableHead>Uplift vs Control</TableHead>
                      <TableHead>Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const Icon = view === "device" ? (DEVICE_ICONS[r.segment] || Monitor) : Info;
                      const upliftColor = r.uplift == null ? "" : r.uplift > 0 ? "text-green-600" : r.uplift < 0 ? "text-red-600" : "";
                      const confPct = r.confidence != null ? (r.confidence * 100) : null;
                      const insufficient = r.visitors < 30;
                      return (
                        <TableRow key={i} className={r.isControl ? "bg-slate-50" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 capitalize">
                              {view === "device" ? <Icon className="w-4 h-4 text-slate-500" /> : null}
                              {r.segment}
                              <span className="ml-2">{confidenceBadge(r.visitors)}</span>
                              {insufficient && <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-600 rounded border">Insufficient data</span>}
                            </div>
                          </TableCell>
                          <TableCell>{r.variant_name}</TableCell>
                          <TableCell>{r.visitors.toLocaleString()}</TableCell>
                          <TableCell>{r.conversions.toLocaleString()}</TableCell>
                          <TableCell>{Number.isFinite(r.cr) ? `${r.cr.toFixed(2)}%` : "-"}</TableCell>
                          <TableCell className={upliftColor}>
                            {r.uplift == null ? "-" : `${r.uplift.toFixed(1)}%`}
                          </TableCell>
                          <TableCell>
                            {confPct == null ? "-" : `${confPct.toFixed(1)}%`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}