
import { format as formatDateFns } from "date-fns";
import { ABTest, Variant, Visitor, Conversion, Project, User, ExportLog } from "@/api/entities";

function sanitizeCell(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  const safe = s.replace(/"/g, '""');
  if (/^[=+\-@]/.test(safe)) return "'" + safe;
  return safe;
}
function withBOM(s) { return "\uFEFF" + s; }
function toISO(date) {
  if (!date) return "";
  try { return (typeof date === "string" ? new Date(date) : date).toISOString(); } catch { return ""; }
}
function formatDateHuman(date, fmt = "MMM d, yyyy") {
  if (!date) return "";
  try { return formatDateFns(typeof date === "string" ? new Date(date) : date, fmt); } catch { return ""; }
}
function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return "";
  return `${Number(value).toFixed(decimals)}%`;
}
function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return "";
  return Number(value).toFixed(decimals);
}
function autoFilename(base) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${base}_${ts}.csv`;
}
function rowsToCSV(rows, headers) {
  const cols = headers.map(h => (typeof h === "string" ? { key: h, header: h } : h));
  const headerLine = cols.map(c => `"${sanitizeCell(c.header)}"`).join(",");
  const lines = rows.map(r =>
    cols.map(c => {
      const v = typeof c.key === "function" ? c.key(r) : r[c.key];
      return `"${sanitizeCell(v)}"`;
    }).join(",")
  );
  return [headerLine, ...lines].join("\n");
}
async function logExport(meta) {
  try {
    const me = await User.me();
    await ExportLog.create({
      user_id: me?.id || null,
      organization_id: me?.organization_id || null,
      export_type: meta.export_type || "custom",
      format: meta.format || "csv",
      filename: meta.filename || "",
      row_count: meta.row_count || 0,
      created_at: new Date().toISOString(),
      filters: meta.filters || {}
    });
  } catch { /* ignore */ }
}
function downloadCSV(csvContent, filenameBase = "export") {
  const filename = autoFilename(filenameBase);
  const blob = new Blob([withBOM(csvContent)], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return filename;
}
function calcCR(visitors, conversions) {
  const v = visitors || 0;
  return v > 0 ? (conversions / v) * 100 : 0;
}

// Add helper to format range for filenames and metadata
function rangeLabel(range) {
  if (!range?.start && !range?.end) return "all";
  const toPart = (d) => d ? formatDateFns(typeof d === "string" ? new Date(d) : d, "yyyyMMdd") : "…";
  return `${toPart(range.start)}-${toPart(range.end)}`;
}
function prependMeta(csvCore, meta = []) {
  if (!meta || meta.length === 0) return csvCore;
  const metaLines = meta.map(m => `"${m.replace(/"/g, '""')}"`).join("\n");
  return [metaLines, "", csvCore].join("\n");
}


export const ExportService = {
  formatDate: toISO,
  formatDateHuman,
  formatPercentage,
  formatNumber,
  rowsToCSV,
  downloadCSV,

  async exportTestSummary(test, options = {}) {
    const headers = [
      { key: "test_name", header: "Test Name" },
      { key: "status", header: "Status" },
      { key: "started", header: "Started (ISO)" },
      { key: "ended", header: "Ended (ISO)" },
      { key: "duration_days", header: "Duration (days)" },
      { key: "total_visitors", header: "Total Visitors" },
      { key: "winner", header: "Winner" },
      { key: "confidence_pct", header: "Confidence (%)" },
      { key: "uplift_pct", header: "Uplift (%)" },
      { key: "project_id", header: "Project Id" },
      { key: "test_type", header: "Test Type" },
    ];
    const row = {
      test_name: test.test_name,
      status: test.test_status,
      started: toISO(test.started_date),
      ended: toISO(test.ended_date),
      duration_days: (() => {
        try {
          if (!test.started_date || !test.ended_date) return "";
          const s = new Date(test.started_date).getTime();
          const e = new Date(test.ended_date).getTime();
          return Math.max(0, Math.round((e - s) / (1000 * 60 * 60 * 24)));
        } catch { return ""; }
      })(),
      total_visitors: test.total_visitors ?? "",
      winner: test.results?.winner?.variant_name || test.winnerName || "",
      confidence_pct: test.results?.winner ? (test.results.winner.confidence * 100).toFixed(1) : (test.confidence || ""),
      uplift_pct: test.results?.winner ? (test.results.winner.uplift || 0).toFixed(2) : (test.uplift || ""),
      project_id: test.project_id || "",
      test_type: test.test_type || ""
    };
    const core = rowsToCSV([row], headers);
    const meta = [
      `Export: Test Summary`,
      `Exported At (ISO): ${new Date().toISOString()}`,
      options.dateRange ? `Date Range: ${rangeLabel(options.dateRange)}` : `Date Range: all`
    ];
    const csv = prependMeta(core, meta);
    const filename = downloadCSV(csv, (options.filenameBase || "test_summary") + (options.dateRange ? `_${rangeLabel(options.dateRange)}` : ""));
    await logExport({ export_type: "test_summary", filename, row_count: 1, filters: { test_id: test.id, dateRange: options.dateRange || null } });
  },

  async exportTestDetailed(testId, options = {}) {
    const [test, variants, visitorsAll, conversionsAll] = await Promise.all([
      ABTest.get(testId),
      Variant.filter({ ab_test_id: testId }),
      Visitor.filter({ ab_test_id: testId }),
      Conversion.filter({ ab_test_id: testId }),
    ]);
    const inRange = (d) => {
      if (!options?.dateRange) return true;
      const date = d ? new Date(d) : null;
      const s = options.dateRange.start ? new Date(options.dateRange.start) : null;
      const e = options.dateRange.end ? new Date(options.dateRange.end) : null;
      if (s && date && date < s) return false;
      if (e && date && date > e) return false;
      return true;
    };
    const visitors = visitorsAll.filter(v => inRange(v.first_seen_date));
    const conversions = conversionsAll.filter(c => inRange(c.conversion_date));

    const headers = [
      { key: "test_name", header: "Test Name" },
      { key: "variant_name", header: "Variant" },
      { key: "variant_type", header: "Type" },
      { key: "traffic_pct", header: "Traffic (%)" },
      { key: "visitors", header: "Visitors" },
      { key: "conversions", header: "Conversions" },
      { key: "cr_pct", header: "Conversion Rate (%)" },
      { key: "uplift_pct", header: "Uplift vs Control (%)" },
      { key: "confidence_pct", header: "Confidence (%)" },
    ];

    const stats = variants.map(v => {
      const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
      const vConversions = conversions.filter(c => c.variant_id === v.id).length;
      const cr = calcCR(vVisitors, vConversions);
      return { v, visitors: vVisitors, conversions: vConversions, cr };
    });
    const control = stats.find(s => s.v.variant_type === "control");
    const rows = stats.map(s => {
      let uplift = "";
      let conf = "";
      if (control && s.v.id !== control.v.id) {
        const p1 = (control.conversions || 0) / Math.max(1, control.visitors || 1);
        const p2 = (s.conversions || 0) / Math.max(1, s.visitors || 1);
        uplift = (p2 - p1) * 100;
        const se = Math.sqrt((p1 * (1 - p1)) / Math.max(1, control.visitors) + (p2 * (1 - p2)) / Math.max(1, s.visitors));
        const z = se > 0 ? Math.abs((p2 - p1) / se) : 0;
        const confPct = Math.min(99.9, Math.max(0, (1 - Math.exp(-0.5 * z * z)) * 100));
        conf = confPct;
      }
      return {
        test_name: test.test_name,
        variant_name: s.v.variant_name,
        variant_type: s.v.variant_type,
        traffic_pct: s.v.traffic_percentage ?? "",
        visitors: s.visitors,
        conversions: s.conversions,
        cr_pct: s.cr.toFixed(2),
        uplift_pct: uplift === "" ? "" : uplift.toFixed(2),
        confidence_pct: conf === "" ? "" : conf.toFixed(1),
      };
    });

    const core = rowsToCSV(rows, headers);
    const meta = [
      `Export: Test Detailed`,
      `Exported At (ISO): ${new Date().toISOString()}`,
      options.dateRange ? `Date Range: ${rangeLabel(options.dateRange)}` : `Date Range: all`
    ];
    const csv = prependMeta(core, meta);
    const filename = downloadCSV(csv, (options.filenameBase || "test_detailed") + (options.dateRange ? `_${rangeLabel(options.dateRange)}` : ""));
    await logExport({ export_type: "test_detailed", filename, row_count: rows.length, filters: { test_id: testId, dateRange: options.dateRange || null } });
  },

  async exportTestRaw(testId, options = {}) {
    const [visitorsAll, conversionsAll] = await Promise.all([
      Visitor.filter({ ab_test_id: testId }),
      Conversion.filter({ ab_test_id: testId }),
    ]);
    const inRange = (d) => {
      if (!options?.dateRange) return true;
      const date = d ? new Date(d) : null;
      const s = options.dateRange.start ? new Date(options.dateRange.start) : null;
      const e = options.dateRange.end ? new Date(options.dateRange.end) : null;
      if (s && date && date < s) return false;
      if (e && date && date > e) return false;
      return true;
    };
    const visitors = visitorsAll.filter(v => inRange(v.first_seen_date));
    const conversions = conversionsAll.filter(c => inRange(c.conversion_date));

    const headersV = [
      { key: "visitor_id", header: "Visitor ID" },
      { key: "assigned_variant_id", header: "Variant ID" },
      { key: "first_seen_date", header: "First Seen (ISO)" },
      { key: "last_seen_date", header: "Last Seen (ISO)" },
      { key: "device_type", header: "Device" },
      { key: "browser", header: "Browser" },
      { key: "referrer_source", header: "Referrer" },
      { key: "user_agent", header: "User Agent" },
    ];
    const rowsV = visitors.map(v => ({
      visitor_id: v.visitor_id,
      assigned_variant_id: v.assigned_variant_id,
      first_seen_date: toISO(v.first_seen_date),
      last_seen_date: toISO(v.last_seen_date),
      device_type: v.device_type || "",
      browser: v.browser || "",
      referrer_source: v.referrer_source || "",
      user_agent: v.user_agent || "",
    }));
    const csvV = rowsToCSV(rowsV, headersV);

    const headersC = [
      { key: "visitor_id", header: "Visitor ID" },
      { key: "variant_id", header: "Variant ID" },
      { key: "conversion_date", header: "Conversion (ISO)" },
      { key: "goal_type", header: "Goal Type" },
      { key: "conversion_value", header: "Value" },
      { key: "referrer_source", header: "Referrer" },
    ];
    const rowsC = conversions.map(c => ({
      visitor_id: c.visitor_id,
      variant_id: c.variant_id,
      conversion_date: toISO(c.conversion_date),
      goal_type: c.goal_type || "",
      conversion_value: c.conversion_value ?? "",
      referrer_source: c.referrer_source || "",
    }));
    const csvC = rowsToCSV(rowsC, headersC);

    const meta = [
      `Export: Test Raw Logs`,
      `Exported At (ISO): ${new Date().toISOString()}`,
      options.dateRange ? `Date Range: ${rangeLabel(options.dateRange)}` : `Date Range: all`
    ];

    const combinedCore = ["Visitors Log", csvV, "", "Conversions Log", csvC].join("\n");
    const combined = prependMeta(combinedCore, meta);
    const filenameBase = (options.filenameBase || "test_raw_logs") + (options.dateRange ? `_${rangeLabel(options.dateRange)}` : "");
    const finalName = downloadCSV(combined, filenameBase);
    await logExport({ export_type: "test_raw", filename: finalName, row_count: rowsV.length + rowsC.length, filters: { test_id: testId, dateRange: options.dateRange || null } });
  },

  async exportOrganizationData(orgId, { dateFrom, dateTo, status = "all", projectId, format = "summary" } = {}) {
    let tests = await ABTest.filter({ organization_id: orgId }, "-created_date");
    if (status !== "all") tests = tests.filter(t => t.test_status === status);
    if (projectId) tests = tests.filter(t => t.project_id === projectId);
    const range = { start: dateFrom ? new Date(dateFrom) : null, end: dateTo ? new Date(dateTo) : null };
    if (range.start) tests = tests.filter(t => t.started_date ? new Date(t.started_date) >= range.start : true);
    if (range.end) tests = tests.filter(t => t.ended_date ? new Date(t.ended_date) <= range.end : true);

    const meta = [
      `Export: Organization Tests (${format})`,
      `Exported At (ISO): ${new Date().toISOString()}`,
      `Date Range: ${rangeLabel(range)}`,
      `Filters: status=${status}${projectId ? `, project=${projectId}` : ""}`
    ];

    if (format === "summary") {
      const rows = tests.map(t => ({
        test_name: t.test_name,
        status: t.test_status,
        started: toISO(t.started_date),
        ended: toISO(t.ended_date),
        project_id: t.project_id || "",
        test_type: t.test_type || "",
      }));
      const headers = [
        { key: "test_name", header: "Test Name" },
        { key: "status", header: "Status" },
        { key: "started", header: "Started (ISO)" },
        { key: "ended", header: "Ended (ISO)" },
        { key: "project_id", header: "Project Id" },
        { key: "test_type", header: "Test Type" },
      ];
      const core = rowsToCSV(rows, headers);
      const csv = prependMeta(core, meta);
      const filename = downloadCSV(csv, `org_tests_summary_${rangeLabel(range)}`);
      await logExport({ export_type: "org_tests_summary", filename, row_count: rows.length, filters: { dateFrom, dateTo, status, projectId } });
      return;
    }

    if (format === "detailed") {
      const headers = [
        { key: "test_name", header: "Test Name" },
        { key: "variant", header: "Variant" },
        { key: "type", header: "Type" },
        { key: "traffic_pct", header: "Traffic (%)" },
        { key: "visitors", header: "Visitors" },
        { key: "conversions", header: "Conversions" },
        { key: "cr_pct", header: "Conversion Rate (%)" },
      ];
      const allRows = [];
      for (const t of tests) {
        const [variants, visitors, conversions] = await Promise.all([
          Variant.filter({ ab_test_id: t.id }),
          Visitor.filter({ ab_test_id: t.id }),
          Conversion.filter({ ab_test_id: t.id }),
        ]);
        variants.forEach(v => {
          const vVisitors = visitors.filter(vi => (!range.start || new Date(vi.first_seen_date) >= range.start) && (!range.end || new Date(vi.first_seen_date) <= range.end) && vi.assigned_variant_id === v.id).length;
          const vConversions = conversions.filter(c => (!range.start || new Date(c.conversion_date) >= range.start) && (!range.end || new Date(c.conversion_date) <= range.end) && c.variant_id === v.id).length;
          const cr = calcCR(vVisitors, vConversions);
          allRows.push({
            test_name: t.test_name,
            variant: v.variant_name,
            type: v.variant_type,
            traffic_pct: v.traffic_percentage ?? "",
            visitors: vVisitors,
            conversions: vConversions,
            cr_pct: cr.toFixed(2),
          });
        });
      }
      const core = rowsToCSV(allRows, headers);
      const csv = prependMeta(core, meta);
      const filename = downloadCSV(csv, `org_tests_detailed_${rangeLabel(range)}`);
      await logExport({ export_type: "org_tests_detailed", filename, row_count: allRows.length, filters: { dateFrom, dateTo, status, projectId } });
      return;
    }

    if (format === "timeseries") {
      const headers = [
        { key: "test_name", header: "Test Name" },
        { key: "date", header: "Date (YYYY-MM-DD)" },
        { key: "visitors", header: "Visitors" },
        { key: "conversions", header: "Conversions" },
        { key: "avg_cr_pct", header: "Avg CR (%)" },
      ];
      const allRows = [];
      for (const t of tests) {
        const [visitors, conversions] = await Promise.all([
          Visitor.filter({ ab_test_id: t.id }),
          Conversion.filter({ ab_test_id: t.id }),
        ]);
        const byDayV = visitors.reduce((acc, v) => {
          const iso = (v.first_seen_date || "").slice(0, 10);
          if (!iso) return acc;
          const d = new Date(iso);
          if (range.start && d < range.start) return acc;
          if (range.end && d > range.end) return acc;
          acc[iso] = (acc[iso] || 0) + 1;
          return acc;
        }, {});
        const byDayC = conversions.reduce((acc, c) => {
          const iso = (c.conversion_date || "").slice(0, 10);
          if (!iso) return acc;
          const d = new Date(iso);
          if (range.start && d < range.start) return acc;
          if (range.end && d > range.end) return acc;
          acc[iso] = (acc[iso] || 0) + 1;
          return acc;
        }, {});
        const days = Array.from(new Set([...Object.keys(byDayV), ...Object.keys(byDayC)])).sort();
        days.forEach(d => {
          const v = byDayV[d] || 0;
          const c = byDayC[d] || 0;
          const cr = v > 0 ? (c / v) * 100 : 0;
          allRows.push({
            test_name: t.test_name,
            date: d,
            visitors: v,
            conversions: c,
            avg_cr_pct: cr.toFixed(2),
          });
        });
      }
      const core = rowsToCSV(allRows, headers);
      const csv = prependMeta(core, meta);
      const filename = downloadCSV(csv, `org_timeseries_${rangeLabel(range)}`);
      await logExport({ export_type: "org_timeseries", filename, row_count: allRows.length, filters: { dateFrom, dateTo, status, projectId } });
      return;
    }
  }
};

// Add segmentation export without redefining the object
ExportService.exportSegmentationData = async (testId, options = {}) => {
  const { dateRange } = options || {};
  const [variants, visitorsAll, conversionsAll] = await Promise.all([
    Variant.filter({ ab_test_id: testId }),
    Visitor.filter({ ab_test_id: testId }),
    Conversion.filter({ ab_test_id: testId }),
  ]);

  const inRange = (d) => {
    if (!dateRange) return true;
    const date = d ? new Date(d) : null;
    const s = dateRange.start ? new Date(dateRange.start) : null;
    const e = dateRange.end ? new Date(dateRange.end) : null;
    if (s && date && date < s) return false;
    if (e && date && date > e) return false;
    return true;
  };

  const normalizeDevice = (device) => {
    const d = (device || "desktop").toLowerCase();
    if (d.includes("mobile") || d === "phone") return "mobile";
    if (d.includes("tablet") || d === "ipad") return "tablet";
    return "desktop";
  };
  const categorizeReferrer = (src) => {
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
  };

  const visitors = visitorsAll.filter(v => inRange(v.first_seen_date));
  const conversions = conversionsAll.filter(c => inRange(c.conversion_date));

  const control = variants.find(v => v.variant_type === "control");

  const visitorById = {};
  visitorsAll.forEach(v => { visitorById[v.visitor_id] = v; });

  const agg = { device: {}, source: {} };
  const ensure = (obj, segment, variantId) => {
    if (!obj[segment]) obj[segment] = {};
    if (!obj[segment][variantId]) obj[segment][variantId] = { visitors: 0, conversions: 0 };
  };

  visitors.forEach(v => {
    const dev = normalizeDevice(v.device_type);
    const src = categorizeReferrer(v.referrer_source);
    const varId = v.assigned_variant_id;
    if (!varId) return;
    ensure(agg.device, dev, varId);
    agg.device[dev][varId].visitors += 1;
    ensure(agg.source, src, varId);
    agg.source[src][varId].visitors += 1;
  });

  conversions.forEach(c => {
    const v = visitorById[c.visitor_id];
    if (!v) return; // Visitor for this conversion might be out of range or not found
    const dev = normalizeDevice(v.device_type);
    const src = categorizeReferrer(v.referrer_source);
    const varId = c.variant_id;
    if (!varId) return;
    ensure(agg.device, dev, varId);
    agg.device[dev][varId].conversions += 1;
    ensure(agg.source, src, varId);
    agg.source[src][varId].conversions += 1;
  });

  const rows = [];
  const pushRows = (type, obj) => {
    for (const seg of Object.keys(obj)) {
      const varMap = obj[seg];
      const ctrlStats = control ? (varMap[control.id] || { visitors: 0, conversions: 0 }) : null;
      variants.forEach(variant => {
        const stats = varMap[variant.id] || { visitors: 0, conversions: 0 };
        const cr = stats.visitors > 0 ? (stats.conversions / stats.visitors) * 100 : 0;
        let uplift = "";
        if (control && variant.id !== control.id) {
          const p1 = (ctrlStats.conversions || 0) / Math.max(1, ctrlStats.visitors || 1);
          const p2 = (stats.conversions || 0) / Math.max(1, stats.visitors || 1);
          uplift = (p2 - p1) * 100;
        }
        rows.push({
          segment_type: type,
          segment: seg,
          variant: variant.variant_name,
          visitors: stats.visitors,
          conversions: stats.conversions,
          cr_pct: cr.toFixed(2),
          uplift_pct: uplift === "" ? "" : uplift.toFixed(2),
        });
      });
    }
  };
  pushRows("device", agg.device);
  pushRows("source", agg.source);

  const headers = [
    { key: "segment_type", header: "Segment Type" },
    { key: "segment", header: "Segment" },
    { key: "variant", header: "Variant" },
    { key: "visitors", header: "Visitors" },
    { key: "conversions", header: "Conversions" },
    { key: "cr_pct", header: "Conversion Rate (%)" },
    { key: "uplift_pct", header: "Uplift vs Control (%)" },
  ];

  const core = rowsToCSV(rows, headers);
  const meta = [
    `Export: Segmentation Data`,
    `Exported At (ISO): ${new Date().toISOString()}`,
    dateRange ? `Date Range: ${rangeLabel(dateRange)}` : `Date Range: all`
  ];
  const csv = prependMeta(core, meta);
  const filename = downloadCSV(csv, (options.filenameBase || "segmentation") + (dateRange ? `_${rangeLabel(dateRange)}` : ""));
  await logExport({ export_type: "segmentation", filename, row_count: rows.length, filters: { test_id: testId, dateRange: dateRange || null } });
  return filename;
};

export default ExportService;
