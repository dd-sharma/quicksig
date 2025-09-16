import React, { useEffect, useMemo, useState } from "react";
import { User, Organization, UsageTracking, ABTest } from "@/api/entities";
import QuotaService from "@/components/services/QuotaService";
import GracePeriodService from "@/components/services/GracePeriodService";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";

export default function AdminQuota() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [usage, setUsage] = useState(null);
  const [newCount, setNewCount] = useState("");
  const [plan, setPlan] = useState("free");
  const [resetDate, setResetDate] = useState("");
  const [graceToggle, setGraceToggle] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      const u = await User.me();
      if (u.role !== "admin") {
        navigate(createPageUrl("Dashboard"));
        return;
      }
      setUser(u);
      const o = await Organization.get(u.organization_id);
      setOrg(o);
      setPlan(o.plan_type || o.subscription_tier || "free");
      setResetDate(o.quota_reset_date || "");
      const stats = await QuotaService.getUsageStats(o.id);
      setUsage(stats);
      const hist = await QuotaService.getHistoricalUsage(o.id, 12);
      setHistory(hist);
    };
    load();
  }, [navigate]);

  const setManualVisitors = async () => {
    const my = usage.monthYear;
    const rows = await UsageTracking.filter({ organization_id: org.id, month_year: my });
    let row = rows[0];
    if (!row) {
      row = await UsageTracking.create({ organization_id: org.id, month_year: my, visitors_used: 0, tests_created: 0, last_updated: new Date().toISOString() });
    }
    await UsageTracking.update(row.id, { visitors_used: Number(newCount) || 0, last_updated: new Date().toISOString() });
    const stats = await QuotaService.getUsageStats(org.id);
    setUsage(stats);
  };

  const resetQuotasNow = async () => {
    await QuotaService.resetMonthlyQuota(org.id);
    const stats = await QuotaService.getUsageStats(org.id);
    setUsage(stats);
  };

  const changePlan = async () => {
    await Organization.update(org.id, { plan_type: plan, subscription_tier: plan, monthly_visitor_quota: plan === "free" ? 10000 : plan === "professional" ? 100000 : 500000, concurrent_test_limit: plan === "free" ? 3 : 99 });
    const stats = await QuotaService.getUsageStats(org.id);
    setUsage(stats);
  };

  const applyResetDate = async () => {
    await Organization.update(org.id, { quota_reset_date: resetDate });
  };

  const toggleGrace = async () => {
    if (graceToggle) {
      await GracePeriodService.startGracePeriod(org.id);
    } else {
      await Organization.update(org.id, { quota_exceeded_at: null, grace_period_notified: false });
    }
  };

  const clearUsage = async () => {
    const rows = await UsageTracking.filter({ organization_id: org.id });
    // Delete rows (admin-only tool)
    for (const r of rows) {
      await UsageTracking.delete(r.id);
    }
    const stats = await QuotaService.getUsageStats(org.id);
    setUsage(stats);
  };

  if (!org || !usage) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle>⚠️ Admin Testing Panel - Changes affect live data</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-600 mb-1">Manual visitor count (current month)</div>
              <div className="flex gap-2">
                <Input value={newCount} onChange={e => setNewCount(e.target.value)} placeholder="Enter visitors_used" />
                <Button onClick={setManualVisitors}>Set</Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Plan Type</div>
              <div className="flex gap-2">
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={changePlan}>Apply</Button>
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600 mb-1">Quota Reset Date</div>
              <div className="flex gap-2">
                <Input type="date" value={resetDate} onChange={e => setResetDate(e.target.value)} />
                <Button onClick={applyResetDate}>Save</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input type="checkbox" id="grace" checked={graceToggle} onChange={e => setGraceToggle(e.target.checked)} />
              <label htmlFor="grace" className="text-sm">Toggle Grace Period (on = start, off = clear)</label>
              <Button variant="outline" onClick={toggleGrace}>Apply</Button>
            </div>
            <div>
              <Button variant="destructive" onClick={clearUsage}>Clear All Usage Data</Button>
            </div>
            <div>
              <Button variant="outline" onClick={resetQuotasNow}>Reset Monthly Quota Now</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">Current: {usage.used?.toLocaleString?.() || usage.visitorsUsed?.toLocaleString?.()} / {usage.total?.toLocaleString?.() || usage.visitorsQuota?.toLocaleString?.()} visitors</div>
            <div className="text-sm">Month-Year: {usage.monthYear}</div>
            <div className="text-sm">Plan: {org.plan_type}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Raw UsageTracking (last 12 months)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Month</th>
                  <th className="p-2">Visitors</th>
                  <th className="p-2">Quota</th>
                  <th className="p-2">Exceeded</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.key} className="border-t">
                    <td className="p-2">{h.key}</td>
                    <td className="p-2">{h.visitors.toLocaleString()}</td>
                    <td className="p-2">{h.quota.toLocaleString()}</td>
                    <td className={`p-2 ${h.exceeded ? "text-red-600" : "text-emerald-600"}`}>{h.exceeded ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}