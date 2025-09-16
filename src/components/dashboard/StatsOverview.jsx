import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, Activity } from "lucide-react";

const stats = [
  {
    title: "Active Tests",
    value: "3",
    change: "+2 this week",
    trend: "up",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    title: "Total Visitors",
    value: "12,847",
    change: "+18% vs last month",
    trend: "up", 
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    title: "Conversion Rate",
    value: "4.2%",
    change: "+0.8% improvement",
    trend: "up",
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    title: "Tests Completed",
    value: "15",
    change: "This quarter",
    trend: "neutral",
    icon: Activity,
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  }
];

export default function StatsOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              {stat.trend === "up" && (
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.change}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}