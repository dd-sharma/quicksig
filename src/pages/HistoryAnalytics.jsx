import React, { useEffect, useMemo, useState } from "react";
import { ABTest, Variant, Visitor, Conversion, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";

function monthKey(d) {
  const dt = typeof d === "string" ? parseISO(d) : d;
  return format(dt, "yyyy-MM");
}

export default function HistoryAnalytics() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      const me = await User.me();
      const all = await ABTest.filter({ organization_id: me.organization_id }, "-created_date");
      setRows(all);
    })();
  }, []);

  const metrics = useMemo(() => {
    const monthly = {};
    rows.forEach(t => {
      if (!t.ended_date) return;
      const k = monthKey(t.ended_date);
      monthly[k] = monthly[k] || { tests: 0, winners: 0 };
      monthly[k].tests += 1;
      if (t.test_status === "completed") {
        // Winner heuristic: tag presence in description or later computed; placeholder ratio
        // Will refine if detailed stats exist elsewhere
      }
    });
    const data = Object.entries(monthly).sort((a,b) => a[0] < b[0] ? -1 : 1).map(([k,v]) => ({
      month: k,
      tests: v.tests,
      successRate: v.tests ? Math.round((v.winners / v.tests) * 100) : 0
    }));
    return { monthly: data };
  }, [rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">History Analytics</h1>
        <p className="text-slate-600">Trends across your archived and completed tests</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Tests over time (monthly)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tests" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Success rate trend</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}