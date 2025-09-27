import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Users, CheckCircle2, TrendingUp } from "lucide-react";

export default function TestInsights({ insights = {} }) {
  const {
    avgConfidence = 0,
    visitorsThisMonth = 0,
    significanceRate = 0,
    bestUplift = 0,
  } = insights;

  const items = [
    {
      icon: CheckCircle2,
      title: "Average Confidence",
      value: `${(avgConfidence * 100).toFixed(0)}%`,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      icon: Users,
      title: "Visitors This Month",
      value: visitorsThisMonth.toLocaleString(),
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      icon: Lightbulb,
      title: "Reached Significance",
      value: `${Math.round(significanceRate * 100)}%`,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      icon: TrendingUp,
      title: "Best Uplift",
      value: `${bestUplift >= 0 ? "+" : ""}${bestUplift.toFixed(1)}%`,
      color: bestUplift >= 0 ? "text-emerald-600" : "text-red-600",
      bg: bestUplift >= 0 ? "bg-emerald-100" : "bg-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${it.bg}`}>
                <it.icon className={`w-5 h-5 ${it.color}`} />
              </div>
              <Badge variant="outline" className="text-xs">{it.title}</Badge>
            </div>
            <div className="text-2xl font-bold text-slate-900">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}