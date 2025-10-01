import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatPercent(v) {
  if (v == null || Number.isNaN(v)) return "0%";
  return `${Number(v).toFixed(1)}%`;
}

export default function PerformanceOverviewChart({ data = [] }) {
  const [metric, setMetric] = useState("active"); // active | visitors | avgCR

  const yFormatter = useMemo(() => {
    if (metric === "avgCR") return (v) => `${v}%`;
    return (v) => `${v}`;
  }, [metric]);

  const chartData = useMemo(() => {
    // ensure values are numbers rounded reasonably
    return data.map(d => ({
      date: d.date,
      value: metric === "avgCR" ? Number((d.avgCR || 0).toFixed(2)) : (d[metric] || 0)
    }));
  }, [data, metric]);

  const tooltipFormatter = (value) => {
    if (metric === "avgCR") return [formatPercent(value), "Average Conversion Rate"];
    if (metric === "visitors") return [value, "Total Visitors"];
    return [value, "Active Tests"];
  };

  const yDomain = useMemo(() => {
    if (metric === "avgCR") return [0, Math.max(10, Math.ceil(Math.max(...chartData.map(d => d.value || 0)) / 5) * 5)];
    return [0, Math.max(5, Math.ceil(Math.max(...chartData.map(d => d.value || 0)) / 5) * 5)];
  }, [chartData, metric]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Performance Overview (Last 30 Days)</CardTitle>
          <Tabs value={metric} onValueChange={setMetric}>
            <TabsList>
              <TabsTrigger value="active">Active Tests</TabsTrigger>
              <TabsTrigger value="visitors">Total Visitors</TabsTrigger>
              <TabsTrigger value="avgCR">Avg. Conversion Rate</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={yFormatter} tick={{ fontSize: 12 }} domain={yDomain} />
              <Tooltip
                formatter={tooltipFormatter}
                labelFormatter={(l) => `Date: ${l}`}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={metric === "avgCR" ? "#7c3aed" : metric === "visitors" ? "#0ea5e9" : "#22c55e"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}