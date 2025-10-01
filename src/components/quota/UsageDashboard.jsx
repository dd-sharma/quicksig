
import React, { useEffect, useMemo, useState } from "react";
import QuotaService from "@/components/services/QuotaService"; // Updated import path
import { User, ABTest } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInCalendarDays } from "date-fns";
import { Pause } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Dot } from "recharts";

export default function UsageDashboard() {
  const [stats, setStats] = useState(null);
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      const user = await User.me();
      if (!user?.organization_id) return;
      const s = await QuotaService.getUsageStats(user.organization_id);
      setStats(s);
      const running = await ABTest.filter({ organization_id: user.organization_id, test_status: "running" });
      setTests(running);
      const hist = await QuotaService.getHistoricalUsage(user.organization_id, 6);
      setHistory(hist);
    };
    load();
  }, []);

  const percent = useMemo(() => {
    if (!stats) return 0;
    return Math.min(100, Math.round((stats.visitorsUsed / stats.visitorsQuota) * 100));
  }, [stats]);

  const daysRemaining = useMemo(() => {
    if (!stats?.quotaResetDate) return "-";
    const reset = new Date(stats.quotaResetDate);
    const now = new Date();
    return Math.max(0, differenceInCalendarDays(reset, now));
  }, [stats]);

  const pauseTest = async (id) => {
    await ABTest.update(id, { test_status: "paused" });
    const user = await User.me();
    const running = await ABTest.filter({ organization_id: user.organization_id, test_status: "running" });
    setTests(running);
  };

  const daysSinceMonthStart = useMemo(() => {
    if (!stats?.monthYear) return 0;
    const [y, m] = stats.monthYear.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const now = new Date();
    return Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
  }, [stats]);

  const daysInMonth = useMemo(() => {
    if (!stats?.monthYear) return 30;
    const [y, m] = stats.monthYear.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [stats]);

  const dailyAverage = useMemo(() => {
    if (!stats) return 0;
    return Math.round((stats.visitorsUsed || 0) / (daysSinceMonthStart || 1));
  }, [stats, daysSinceMonthStart]);

  const projectedTotal = useMemo(() => {
    return dailyAverage * (daysInMonth || 30);
  }, [dailyAverage, daysInMonth]);

  const daysUntilExceeded = useMemo(() => {
    if (!stats || projectedTotal <= (stats.visitorsQuota || 0)) return null;
    const remaining = (stats.visitorsQuota || 0) - (stats.visitorsUsed || 0);
    const perDay = dailyAverage || 1;
    return Math.max(0, Math.ceil(remaining / perDay));
  }, [stats, dailyAverage, projectedTotal]);

  // Trend line (simple least squares)
  const trendData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const x = history.map((_, i) => i + 1);
    const y = history.map(p => p.visitors);
    const n = x.length;
    
    // Handle cases where n is too small for meaningful regression
    if (n < 2) {
      return history.map(p => ({ ...p, trend: p.visitors })); // No trend if less than 2 data points
    }

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const denominator = (n * sumX2 - sumX * sumX);
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    return history.map((p, i) => ({ ...p, trend: Math.max(0, intercept + slope * (i + 1)) }));
  }, [history]);

  if (!stats) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">Loading usage...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Monthly Visitor Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{stats.visitorsUsed.toLocaleString()} / {stats.visitorsQuota.toLocaleString()} visitors</span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
          <div className="text-sm text-slate-600">Days remaining: {daysRemaining}</div>
          {percent >= 80 && (
            <Badge className={`${percent < 90 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-red-100 text-red-700 border-red-200"} border`}>
              {percent < 100 ? "Approaching limit" : "Limit reached"}
            </Badge>
          )}
          <div className="mt-3 p-3 bg-slate-50 rounded">
            <p className="text-xs text-slate-600">Daily Average: {dailyAverage.toLocaleString()} visitors</p>
            <p className="text-xs text-slate-600">Projected Monthly: {projectedTotal.toLocaleString()} visitors</p>
            {daysUntilExceeded !== null && (
              <p className="text-xs text-orange-600 font-medium mt-1">
                ⚠️ At current rate, you'll exceed quota in {daysUntilExceeded} days
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Concurrent Tests Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-600">Running: {tests.length} / {stats.concurrentLimit}</div>
          </div>
          <div className="space-y-2">
            {tests.map(t => (
              <div key={t.id} className="flex items-center justify-between border rounded-md p-2">
                <div>
                  <div className="font-medium">{t.test_name}</div>
                  <div className="text-xs text-slate-500">{t.test_url}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => pauseTest(t.id)}>
                  <Pause className="w-4 h-4 mr-1" /> Pause
                </Button>
              </div>
            ))}
            {tests.length === 0 && <div className="text-sm text-slate-500">No running tests.</div>}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <ReferenceLine y={stats?.visitorsQuota || 10000} stroke="#ef4444" strokeDasharray="4 4" label="Quota" />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="Trend"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 4"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-2 mt-2 text-xs flex-wrap">
            {history.map(p => (
              <span key={p.key} className={`px-2 py-0.5 rounded border ${p.exceeded ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                {p.month}: {p.visitors.toLocaleString()}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
