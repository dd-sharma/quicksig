
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus,
  BarChart3,
  Zap, // NEW
  RefreshCw, // NEW
  Loader2 // NEW
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns"; 

import StatsOverview from "../components/dashboard/StatsOverview";
import ActiveTests from "../components/dashboard/ActiveTests";
import RecentResults from "../components/dashboard/RecentResults";
import QuickActions from "../components/dashboard/QuickActions";
import VisitorsTrend from "../components/dashboard/VisitorsTrend";
import InsightsPanel from "../components/dashboard/InsightsPanel";
import GettingStartedChecklist from "../components/dashboard/GettingStartedChecklist";
import RecentCompletedTests from "../components/dashboard/RecentCompletedTests";

import { ABTest, User } from "@/api/entities";
import OnboardingHints from "@/components/onboarding/OnboardingHints";

import SmartHint from "@/components/hints/SmartHint";
import ProgressiveDisclosureService from "@/components/services/ProgressiveDisclosureService";
import HINT_RULES from "@/components/hints/HintRules";
import SmartAlertsService from "@/components/services/SmartAlertsService";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prompt, setPrompt] = useState(null);
  const [hint, setHint] = useState(null);
  const [decisionTests, setDecisionTests] = useState([]); // NEW
  const [refreshing, setRefreshing] = useState(false); // NEW

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Extracted data fetching logic into a useCallback hook for reusability
  const fetchDashboardData = useCallback(async () => {
    try {
      const me = await User.me();
      if (!me?.organization_id) return;

      // Trigger smart alerts scan on page load
      await SmartAlertsService.scanAndNotify(me.organization_id);

      // Fetch tests with a higher limit (50) to provide sufficient data for both prompts and hints
      const tests = await ABTest.filter({ organization_id: me.organization_id }, "-created_date", 50);
      const runningTests = tests.filter(t => t.test_status === "running");
      const now = Date.now();

      // NEW: decision candidates
      const candidates = tests.filter(t => {
        const running = t.test_status === "running";
        const started = t.started_date ? new Date(t.started_date).getTime() : null;
        const days = started ? Math.floor((now - started) / (1000*60*60*24)) : 0;
        const completed = t.test_status === "completed";
        const approachingSample = running && Number(t.total_visitors || 0) > 2000;
        return completed || days > 30 || approachingSample;
      });
      setDecisionTests(candidates);

      // --- Start Prompt Logic (retains original "first match wins" behavior) ---
      let promptMessage = null;
      if (tests.length === 0) {
        promptMessage = "👋 Ready to start testing? Create your first A/B test in under 5 minutes";
      } else {
        const significant = tests.find(t => t.test_status === "completed" && t.p_value <= 0.05); // Assuming p_value <= 0.05 for significance
        if (significant) {
          promptMessage = "🎉 You have a winner! One of your variants shows significant improvement";
        } else {
          const longRunning = runningTests.find(t => t.started_date && (now - new Date(t.started_date).getTime()) > 30 * 24 * 60 * 60 * 1000);
          if (longRunning) {
            promptMessage = "📅 Long-running test - consider ending it if you have enough data";
          } else if (runningTests.length > 0) {
            const latest = runningTests[0];
            const started = latest.started_date ? new Date(latest.started_date).getTime() : null;
            if (started && (now - started) < 24 * 60 * 60 * 1000) {
              promptMessage = "⏰ New test! Results will be more reliable after 24 hours";
            }
          }
        }
      }
      setPrompt(promptMessage);
      // --- End Prompt Logic ---

      // --- Start Hint Logic ---
      const testsCreated = tests.length;
      const testsCompleted = tests.filter(t => t.test_status === "completed").length;
      const runningTestsCount = runningTests.length; // Count of running tests for context
      
      const context = {
        on_page: "Dashboard",
        tests_created: testsCreated,
        tests_completed: testsCompleted,
        running_tests_count: runningTestsCount,
        avg_test_duration_days: 0 // optional: could compute if needed
      };
      const next = await ProgressiveDisclosureService.getNextHint({ rules: HINT_RULES, context });
      if (next) {
        await ProgressiveDisclosureService.markShown(next);
        setHint(next);
      }
      // --- End Hint Logic ---

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error); // Log error for debugging
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]); // Depend on fetchDashboardData to ensure it's called on mount

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    // add a tiny delay for UX
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Mobile refresh control */}
      <div className="md:hidden flex items-center justify-end mb-2">
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {refreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {hint && (
        <SmartHint
          hint={{ ...hint, actionLabel: hint.actionLabel }}
          onDismiss={async () => { 
            await ProgressiveDisclosureService.dismiss(hint.id); 
            setHint(null); 
          }}
          onAction={() => {}}
          style={hint.style || "banner"}
        />
      )}
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome back 👋
            </h1>
            <p className="text-slate-600">
              {format(currentTime, "MMM. d, yyyy")} · {currentTime.toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <Link to={createPageUrl("TestsNew")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create New Test
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full transform -translate-x-10 translate-y-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Ready to boost your conversions?</h2>
                <p className="text-blue-50 mb-4">
                  Your tests are helping you make data-driven decisions
                </p>
                <Link to={createPageUrl("TestsNew")}>
                  <Button className="bg-white text-blue-700 hover:bg-blue-50">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Test
                  </Button>
                </Link>
              </div>
              <div className="hidden md:block">
                <BarChart3 className="w-24 h-24 text-white/20" />
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Quick Decision Cards (mobile-optimized) */}
        {decisionTests.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3 px-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Zap className="w-5 h-5 text-blue-600" />
                <span>
                  {decisionTests.length} {decisionTests.length === 1 ? 'test needs' : 'tests need'} your decision
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="space-y-3">
                {decisionTests.slice(0, 3).map(t => {
                  const started = t.started_date ? new Date(t.started_date).getTime() : null;
                  const days = started ? Math.floor((Date.now() - started) / (1000*60*60*24)) : 0;
                  const label = t.test_status === "completed" ? '✅ Winner found'
                    : days > 30 ? '⏰ Running too long'
                    : '📉 Approaching sample size';
                  return (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white rounded-lg border border-blue-100">
                      <div className="flex-1">
                        <div className="font-medium text-sm sm:text-base">{t.test_name}</div>
                        <div className="text-xs sm:text-sm text-slate-600">{label}</div>
                      </div>
                      <Link to={createPageUrl(`TestDetail?id=${t.id}`)} className="w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto touch-manipulation min-h-[44px]">
                          Make Decision →
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {prompt && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800">
          {prompt}
        </div>
      )}

      {/* Stats Overview */}
      <StatsOverview />

      {/* Trend chart */}
      <div className="mb-8">
        <VisitorsTrend />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <ActiveTests />
          <RecentCompletedTests />
          <RecentResults />
        </div>
        <div className="space-y-6">
          <QuickActions />
          <InsightsPanel />
          <GettingStartedChecklist />
          
          {/* Usage Summary - keep existing simple summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Usage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Tests this month</span>
                  <span className="font-semibold">3 / 50</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '6%'}}></div>
                </div>
                <div className="text-xs text-slate-500">
                  Upgrade for more capacity in Plan & Usage.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <OnboardingHints />
    </div>
  );
}
