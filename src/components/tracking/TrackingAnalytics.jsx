import React, { useEffect, useMemo, useState } from "react";
import { VisitorSession, ConversionEvent } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { format } from "date-fns";

const COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#6366f1", "#ef4444", "#14b8a6"];

export default function TrackingAnalytics({ testId }) {
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [s, e] = await Promise.all([
        VisitorSession.filter({ test_id: testId }),
        ConversionEvent.filter({ test_id: testId })
      ]);
      setSessions(s);
      setEvents(e);
    };
    load();
  }, [testId]);

  const byDay = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      const d = (s.created_at || s.created_date || "").slice(0, 10);
      if (!d) return;
      map[d] = map[d] || { date: d, visitors: 0, conversions: 0 };
      map[d].visitors += 1;
    });
    events.forEach(e => {
      const d = (e.created_at || e.created_date || "").slice(0, 10);
      if (!d) return;
      map[d] = map[d] || { date: d, visitors: 0, conversions: 0 };
      map[d].conversions += 1;
    });
    const arr = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    return arr.map(x => ({ ...x, cr: x.visitors > 0 ? (x.conversions / x.visitors) * 100 : 0, label: format(new Date(x.date), "MMM d") }));
  }, [sessions, events]);

  const devicePie = useMemo(() => {
    const counts = sessions.reduce((acc, s) => {
      const k = s.device_type || "desktop";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  const referrers = useMemo(() => {
    const counts = sessions.reduce((acc, s) => {
      const k = s.referrer_source || "Direct";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [sessions]);

  const funnel = useMemo(() => {
    const uniqueVisitors = new Set(sessions.map(s => s.visitor_id)).size;
    const totalSessions = sessions.length;
    const totalConversions = events.length;
    return [
      { name: "Visitors", value: uniqueVisitors },
      { name: "Sessions", value: totalSessions },
      { name: "Conversions", value: totalConversions }
    ];
  }, [sessions, events]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Visitors Over Time</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="visitors" stroke="#0ea5e9" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Conversion Rate by Day</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={byDay}>
              <defs>
                <linearGradient id="crColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="cr" stroke="#22c55e" fillOpacity={1} fill="url(#crColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Device Breakdown</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={devicePie} dataKey="value" nameKey="name" outerRadius={80} label>
                {devicePie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="shadow-sm">
        <CardHeader><CardTitle>Top Referrer Sources</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={referrers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="shadow-sm lg:col-span-2">
        <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}