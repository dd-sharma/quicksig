
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { ABTest, Variant, Visitor, Conversion, User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card as UICard, CardContent as UICardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TestTube,
  Play,
  Users as UsersIcon,
  TrendingUp,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  calculateConversionRate,
  calculateConfidenceLevel,
  calculateUplift,
} from "@/components/results/ResultsCalculator";
import TestsPerformanceTable from "@/components/results/TestsPerformanceTable";
import { format, differenceInDays, startOfDay } from "date-fns";
import PerformanceOverviewChart from "@/components/results/PerformanceOverviewChart";
import WinnersLosers from "@/components/results/WinnersLosers";
import QuickActionsPanel from "@/components/results/QuickActionsPanel";
import TestInsights from "@/components/results/TestInsights";
import AIInterpreter from "@/components/services/AIInterpreter";
import InterpretationHistoryService from "@/components/services/InterpretationHistoryService";
import SmartAlertsService from "@/components/services/SmartAlertsService";
import BusinessReportExporter from "@/components/ai/BusinessReportExporter";
import { ExportService } from "@/components/services/ExportService";
import DateRangePicker from "@/components/ui/DateRangePicker";

export default function ResultsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tests, setTests] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTests: 0,
    activeTests: 0,
    avgConfidence: 0,
    totalVisitors: 0,
    avgUplift: 0,
    testsThisMonth: 0,
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [series30d, setSeries30d] = useState([]); // [{date, active, visitors, avgCR}]
  const [winners, setWinners] = useState([]);
  const [losers, setLosers] = useState([]);
  const [insights, setInsights] = useState({
    avgConfidence: 0,
    visitorsThisMonth: 0,
    significanceRate: 0,
    bestUplift: 0,
  });
  const [quickInsights, setQuickInsights] = useState([]);
  const [aggregateImpact, setAggregateImpact] = useState(0);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  // Prevent concurrent loads + backoff for 429
  const [isFetching, setIsFetching] = useState(false);
  const backoffRef = useRef(1000);
  const retryTimeoutRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (isFetching) return; // Prevent concurrent fetches

    setIsLoading(true);
    setLoadError(null);
    setIsRefreshing(true);
    setIsFetching(true); // Set fetching state to true

    try {
      const currentUser = await User.me();
      if (!currentUser?.organization_id) {
        setTests([]);
        setMetrics({
          totalTests: 0,
          activeTests: 0,
          avgConfidence: 0,
          totalVisitors: 0,
          avgUplift: 0,
          testsThisMonth: 0,
        });
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetching(false); // Ensure fetching state is reset
        return;
      }

      const filterCriteria = { organization_id: currentUser.organization_id };
      if (dateRange.start) {
        filterCriteria.start_date_gte = dateRange.start.toISOString();
      }
      if (dateRange.end) {
        filterCriteria.end_date_lte = dateRange.end.toISOString();
        // For general metrics, we might want tests that *ran* within the range,
        // so filter by tests whose started_date is before or equal to range.end,
        // AND whose ended_date is after or equal to range.start (or null if still running).
        // For simplicity with common backend filtering, we'll apply it to created_date or started_date for initial fetch.
        // Let's modify this to filter by tests whose *created_date* is within the range for overall test count.
        // For filtering actual *visitor/conversion* data, we'll filter them by their respective dates later.
        // For now, let's keep ABTest.filter simple: if dateRange.start/end are meant to filter the *tests* themselves,
        // then the backend needs to support a relevant date field. If it's for `created_date`:
        if (dateRange.start) filterCriteria.created_date_gte = dateRange.start.toISOString();
        if (dateRange.end) filterCriteria.created_date_lte = dateRange.end.toISOString();
      }

      const allTests = await ABTest.filter(filterCriteria, "-created_date");
      setTests(allTests);

      if (allTests.length === 0) {
        setMetrics({
          totalTests: 0,
          activeTests: 0,
          avgConfidence: 0,
          totalVisitors: 0,
          avgUplift: 0,
          testsThisMonth: 0,
        });
        setSeries30d([]);
        setWinners([]);
        setLosers([]);
        setInsights({
          avgConfidence: 0,
          visitorsThisMonth: 0,
          significanceRate: 0,
          bestUplift: 0,
        });
        setQuickInsights([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsFetching(false); // Ensure fetching state is reset
        // reset backoff when successful
        backoffRef.current = 1000;
        return;
      }

      // Initialize 30-day series buckets
      const days = 30;
      const today = startOfDay(new Date());
      const dateKeys = Array.from({ length: days }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        return format(d, "MMM d");
      });
      const dateKeyToISO = Array.from({ length: days }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (days - 1 - i));
        return d.toISOString().slice(0, 10);
      });

      const daily = dateKeys.map((label) => ({ date: label, active: 0, visitors: 0, avgCR: 0 }));
      const visitorsByISO = {};
      const conversionsByISO = {};

      let winnersList = [];
      let losersList = [];
      let completedCount = 0;
      let completedWithWinner = 0;
      let maxUplift = 0;

      // Aggregate org-wide metrics
      let totalVisitors = 0;
      const confidences = [];
      const uplifts = [];

      // Month window for testsThisMonth
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const testsThisMonth = allTests.filter((t) => {
        const d = new Date(t.created_date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }).length;

      // Prepare a local array to collect insights during fetch
      const quickInsightsRef = [];
      let aggImpact = 0;

      for (const test of allTests) {
        // Pull stats per test
        const visitorFilter = { ab_test_id: test.id };
        const conversionFilter = { ab_test_id: test.id };

        // Apply date range filter to visitors and conversions if specified
        if (dateRange.start) {
          visitorFilter.first_seen_date_gte = dateRange.start.toISOString();
          conversionFilter.conversion_date_gte = dateRange.start.toISOString();
        }
        if (dateRange.end) {
          visitorFilter.first_seen_date_lte = dateRange.end.toISOString();
          conversionFilter.conversion_date_lte = dateRange.end.toISOString();
        }

        const [visitors, conversions, variants] = await Promise.all([
          Visitor.filter(visitorFilter),
          Conversion.filter(conversionFilter),
          Variant.filter({ ab_test_id: test.id }),
        ]);

        totalVisitors += visitors.length;

        // Active tests per day based on start/end window
        const start = test.started_date ? new Date(test.started_date) : null;
        const end = test.ended_date ? new Date(test.ended_date) : null;

        if (start) {
          dateKeyToISO.forEach((iso, idx) => {
            const d = new Date(iso);
            d.setHours(0,0,0,0);
            const activeOnDay = (!start || d >= start) && (!end || d <= end) && (test.test_status === "running" || (start && (!end || d <= end)));
            if (activeOnDay) {
              daily[idx].active += 1;
            }
          });
        }

        // Aggregate visitors / conversions per day
        visitors.forEach(v => {
          const iso = v.first_seen_date?.slice(0, 10);
          if (!iso) return;
          visitorsByISO[iso] = (visitorsByISO[iso] || 0) + 1;
        });
        conversions.forEach(c => {
          const iso = c.conversion_date?.slice(0, 10);
          if (!iso) return;
          conversionsByISO[iso] = (conversionsByISO[iso] || 0) + 1;
        });

        // Build per-variant stats for winners/losers and overall metrics
        const variantStats = variants.map((v) => {
          const vVisitors = visitors.filter((vi) => vi.assigned_variant_id === v.id).length;
          const vConversions = conversions.filter((c) => c.variant_id === v.id).length;
          return {
            ...v,
            visitor_count: vVisitors,
            conversion_count: vConversions,
            conversion_rate: calculateConversionRate(vVisitors, vConversions),
          };
        });
        const control = variantStats.find((v) => v.variant_type === "control");
        const treatments = variantStats.filter((v) => v.variant_type !== "control");

        // Quick Insights for running tests
        if (test.test_status === "running" && control && treatments.length > 0) {
          // Best treatment vs control
          let bestTreatment = treatments[0];
          for (const v of treatments) {
            if (v.conversion_rate > bestTreatment.conversion_rate) bestTreatment = v;
          }
          const conf = calculateConfidenceLevel(control, bestTreatment) || 0;
          const uplift = calculateUplift(control, bestTreatment) || 0;
          const totalV = variantStats.reduce((s, v) => s + v.visitor_count, 0);

          // Generate interpretation (cached)
          const interp = AIInterpreter.generateInterpretation(test, {
            control,
            variant: bestTreatment,
            confidence: conf,
            upliftPct: uplift,
            totalVisitors: totalV,
            startedAt: test.started_date ? new Date(test.started_date) : null
          });

          // Persist history snapshot with change detection
          await InterpretationHistoryService.recordSnapshot(test.id, interp, totalV, conf);

          // Smart alerts
          if (conf >= 0.95) {
            await SmartAlertsService.notifySignificance(test, conf * 100);
          }
          // Simple stagnation check: >14 days, low confidence
          if (test.started_date) {
            const daysRunning = Math.max(0, Math.floor((Date.now() - new Date(test.started_date).getTime()) / (1000 * 60 * 60 * 24)));
            if (daysRunning >= 14 && conf < 0.8) {
              await SmartAlertsService.notifyStagnating(test);
            }
          }
          // High impact alert (rough) - Assuming an average order value of $50 for calculation example
          const projected = AIInterpreter.calculateBusinessImpact(uplift, totalV, 50).monthly;
          if (projected > 10000) {
            await SmartAlertsService.notifyHighImpact(test, projected);
          }

          // Aggregate impact across running winners (only add if positive and decent confidence)
          if (uplift > 0 && conf >= 0.9) {
            aggImpact += projected;
          }

          quickInsightsRef.push({
            id: test.id,
            name: test.test_name,
            status: interp.meta.status,
            summary: interp.executiveSummary,
            confidencePct: interp.meta.confidencePct
          });
        }

        if (control && treatments.length > 0) {
          let best = null;
          for (const v of treatments) {
            const conf = calculateConfidenceLevel(control, v);
            const uplift = calculateUplift(control, v);
            if (!best || v.conversion_rate > best.conversion_rate) {
              best = { ...v, confidence: conf, uplift };
            }
          }
          const daysRunning = start ? Math.max(1, differenceInDays(new Date(), start)) : 0;

          if (test.test_status === "completed") {
            completedCount += 1;
            const isWinner = best && best.confidence >= 0.95;
            if (isWinner) completedWithWinner += 1;
            if (best) {
              maxUplift = Math.max(maxUplift, best.uplift || 0);
              winnersList.push({
                id: test.id,
                name: test.test_name,
                uplift: best.uplift || 0,
                confidence: best.confidence || 0,
                daysRunning,
                isWinner,
              });
            }
            if (best) {
              if (!Number.isNaN(best.confidence)) confidences.push(Math.max(0, Math.min(1, best.confidence)));
              if (Number.isFinite(best.uplift)) uplifts.push(best.uplift);
            }
          } else if (best) {
            // Potential losers category for tests showing negative uplift with enough data
            if (best.visitor_count >= 30 && control.visitor_count >= 30 && best.uplift < 0) { // Only consider negative uplifts for losers list
              losersList.push({
                id: test.id,
                name: test.test_name,
                uplift: best.uplift || 0,
                confidence: best.confidence || 0,
                daysRunning,
              });
            }
          }
        }
      }

      // Fill daily CR from totals
      dateKeyToISO.forEach((iso, idx) => {
        const v = visitorsByISO[iso] || 0;
        const c = conversionsByISO[iso] || 0;
        daily[idx].visitors = v;
        daily[idx].avgCR = v > 0 ? (c / v) * 100 : 0;
      });

      // Prepare winners/losers sorted sets
      winnersList = winnersList
        .filter(w => Number.isFinite(w.uplift))
        .sort((a, b) => (b.uplift - a.uplift))
        .slice(0, 3);

      losersList = losersList
        .filter(l => Number.isFinite(l.uplift))
        .sort((a, b) => (a.uplift - b.uplift))
        .slice(0, 3);

      // Insights
      const significanceRate = completedCount > 0 ? completedWithWinner / completedCount : 0;

      // Visitors this month from visitorsByISO
      const monthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const visitorsThisMonth = Object.entries(visitorsByISO).reduce((sum, [iso, val]) => {
        return iso.startsWith(monthISO) ? sum + val : sum;
      }, 0);

      const avgConfidence = confidences.length > 0 ? (confidences.reduce((a, b) => a + b, 0) / confidences.length) : 0;
      const avgUplift = uplifts.length > 0 ? (uplifts.reduce((a, b) => a + b, 0) / uplifts.length) : 0;

      setSeries30d(daily);
      setWinners(winnersList);
      setLosers(losersList);
      setInsights({
        avgConfidence: avgConfidence,
        visitorsThisMonth,
        significanceRate,
        bestUplift: maxUplift || 0,
      });
      setQuickInsights(quickInsightsRef);
      setAggregateImpact(aggImpact);

      setMetrics({
        totalTests: allTests.length,
        activeTests: allTests.filter((t) => t.test_status === "running").length,
        avgConfidence,
        totalVisitors,
        avgUplift,
        testsThisMonth,
      });

      setLastUpdated(new Date().toISOString());
      // reset backoff on success
      backoffRef.current = 1000;
    } catch (e) {
      const msg = String(e?.message || "");
      const is429 = msg.includes("429") || e?.status === 429;
      if (is429) {
        const delay = Math.min(backoffRef.current, 30000); // Max delay 30s
        toast("We're being rate limited", { description: `Retrying results load in ${Math.round(delay/1000)}s...` });
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(); // Retry the fetch
        }, delay);
        backoffRef.current = Math.min(delay * 2, 30000); // Exponential backoff, capped at 30s
      } else {
        console.error("Failed to load results dashboard:", e);
        setLoadError(e?.message || "Failed to load data");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsFetching(false); // Ensure fetching state is reset
    }
  }, [dateRange.start, dateRange.end, isFetching]); // isFetching is a dep because the initial check relies on its state

  useEffect(() => {
    fetchData();
    // Cleanup any pending retry timeouts when the component unmounts
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [fetchData]);

  // Auto-refresh every 60s only if there are running tests
  useEffect(() => {
    if (metrics.activeTests > 0) {
      const id = setInterval(() => {
        fetchData();
      }, 60000);
      return () => clearInterval(id);
    }
    // Cleanup if activeTests becomes 0
    return () => {}; // No-op if no interval to clear
  }, [metrics.activeTests, dateRange.start, dateRange.end, fetchData]); // include fetchData

  const exportAllResults = () => {
    if (!tests || tests.length === 0) return;
    // Build a simple summary export for current tests using ExportService
    const rows = tests.map(t => ({
      test_name: t.test_name,
      status: t.test_status,
      started: t.started_date ? t.started_date : "",
      ended: t.ended_date ? t.ended_date : "",
    }));
    const headers = [
      { key: "test_name", header: "Test Name" },
      { key: "status", header: "Status" },
      { key: "started", header: "Started (ISO)" },
      { key: "ended", header: "Ended (ISO)" },
    ];
    let filename = "all_tests_results";
    if (dateRange.start && dateRange.end) {
      filename += `_${format(dateRange.start, 'yyyyMMdd')}_${format(dateRange.end, 'yyyyMMdd')}`;
    } else if (dateRange.start) {
      filename += `_from_${format(dateRange.start, 'yyyyMMdd')}`;
    } else if (dateRange.end) {
      filename += `_to_${format(dateRange.end, 'yyyyMMdd')}`;
    }

    const csv = ExportService.rowsToCSV(rows, headers);
    ExportService.downloadCSV(csv, filename);
  };

  const headerCards = useMemo(() => ([
    {
      title: "Total Tests Run",
      value: metrics.totalTests.toLocaleString(),
      icon: TestTube,
      color: "text-blue-600",
      bg: "bg-blue-100",
      subtext: "All time",
    },
    {
      title: "Active Tests",
      value: metrics.activeTests.toLocaleString(),
      icon: Play,
      color: "text-green-600",
      bg: "bg-green-100",
      subtext: "Currently running",
    },
    {
      title: "Avg. Confidence",
      value: `${(metrics.avgConfidence * 100).toFixed(1)}%`,
      icon: CheckCircle2,
      color: "text-purple-600",
      bg: "bg-purple-100",
      subtext: "Completed tests",
    },
    {
      title: "Total Visitors",
      value: metrics.totalVisitors.toLocaleString(),
      icon: UsersIcon,
      color: "text-slate-700",
      bg: "bg-slate-200",
      subtext: "Across all tests",
    },
    {
      title: "Avg. Uplift",
      value: `${metrics.avgUplift >= 0 ? "+" : ""}${metrics.avgUplift.toFixed(1)}%`,
      icon: TrendingUp,
      color: metrics.avgUplift >= 0 ? "text-emerald-600" : "text-red-600",
      bg: metrics.avgUplift >= 0 ? "bg-emerald-100" : "bg-red-100",
      subtext: "Winner vs control",
    },
    {
      title: "Tests This Month",
      value: metrics.testsThisMonth.toLocaleString(),
      icon: Calendar,
      color: "text-orange-600",
      bg: "bg-orange-100",
      subtext: "Created this month",
    },
  ]), [metrics]);

  // Loading state
  if (isLoading && !isRefreshing) { // Only show full loading skeleton if it's the initial load or a full reload, not just refreshing
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Results Dashboard</h1>
          <p className="text-slate-600">Organization-wide performance at a glance</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <UICard key={i} className="shadow-sm">
              <UICardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-8 w-28" />
              </UICardContent>
            </UICard>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (loadError && !isLoading) { // Show error only if not loading anymore
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <UICard className="border-red-200">
          <UICardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-1">We couldn't load your data</h2>
            <p className="text-slate-600 mb-4">{loadError}</p>
            <Button onClick={fetchData}>Retry</Button>
          </UICardContent>
        </UICard>
      </div>
    );
  }

  // Empty state
  if (!isLoading && tests.length === 0 && !loadError) { // Show empty state only if not loading and no error
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <UICard className="text-center">
          <UICardContent className="p-8">
            <TestTube className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No tests yet</h2>
            <p className="text-slate-600 mb-6">
              Create your first A/B test to start seeing organization-wide results here.
              {dateRange.start || dateRange.end ? " (Clear date filter to see all tests)" : ""}
            </p>
            <Link to={createPageUrl("TestsNew")}>
              <Button>
                Create your first test
              </Button>
            </Link>
            <div className="mt-4 text-sm text-slate-500">
              Need help? See our getting started guide in the docs.
            </div>
          </UICardContent>
        </UICard>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Results Dashboard</h1>
        <p className="text-slate-600">Organization-wide performance at a glance</p>
      </div>

      <div className="px-0 pt-0 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <span className="text-sm text-slate-500">
            {dateRange.start || dateRange.end ? "Filtering metrics by selected date range" : "Showing all time"}
          </span>
        </div>
      </div>

      {/* Quick Insights */}
      {quickInsights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-slate-700">Quick Insights</div>
            <div className="text-xs text-slate-500">
              Est. Monthly Impact from winners: ${Math.round(aggregateImpact).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickInsights.map((qi) => {
              const color =
                qi.status === "winner" ? "border-emerald-200 bg-emerald-50" :
                qi.status === "negative" ? "border-red-200 bg-red-50" :
                qi.status === "trending" ? "border-amber-200 bg-amber-50" :
                "border-slate-200 bg-white";
              return (
                <UICard key={qi.id} className={`shadow-sm border ${color}`}>
                  <UICardContent className="p-4">
                    <div className="text-sm font-semibold text-slate-900">{qi.name}</div>
                    <div className="text-xs text-slate-500 mb-1">{qi.confidencePct.toFixed(1)}% confidence</div>
                    <div className="text-sm text-slate-700">{qi.summary}</div>
                    <div className="mt-2 text-xs">
                      <a className="text-blue-600 hover:underline" href={createPageUrl("TestDetail", { id: qi.id })}>
                        View full insights
                      </a>
                    </div>
                  </UICardContent>
                </UICard>
              );
            })}
          </div>

          {/* Export action */}
          <div className="mt-3">
            <BusinessReportExporter test={{ test_name: "Organization Summary" }} interpretation={{ executiveSummary: "Summary of current running tests.", meta: {} }} metrics={{}} />
          </div>
        </div>
      )}

      {/* Header KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {headerCards.map((card) => (
          <UICard key={card.title} className="shadow-sm hover:shadow-md transition-shadow">
            <UICardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-xl ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <Badge variant="outline" className="text-xs">{card.subtext}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </UICardContent>
          </UICard>
        ))}
      </div>

      {/* Performance Overview + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PerformanceOverviewChart data={series30d} />
        </div>
        <QuickActionsPanel
          onRefresh={fetchData}
          onExportAll={exportAllResults}
          lastUpdated={lastUpdated}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Insights */}
      <div className="mb-6">
        <TestInsights insights={insights} />
      </div>

      {/* Winners & Losers */}
      <div className="mb-6">
        <WinnersLosers winners={winners} losers={losers} />
      </div>

      {/* Main content with performance table and sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TestsPerformanceTable />
        </div>
        <UICard>
          <CardHeader className="pb-3">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <UICardContent>
            <div className="text-slate-500 text-sm">
              Coming soon: organization-wide activity feed and highlights.
            </div>
          </UICardContent>
        </UICard>
      </div>
    </div>
  );
}
