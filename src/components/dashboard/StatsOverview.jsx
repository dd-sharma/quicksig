
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TestTube, Target, Calendar, CheckCircle2 } from "lucide-react";
import { useResponsive } from "@/components/hooks/useResponsive";

const stats = [
  {
    title: "Active Tests",
    value: "3",
    subtext: "Currently running",
    icon: Target,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  },
  {
    title: "Total Tests",
    value: "12",
    subtext: "+2 vs last month",
    icon: TestTube,
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    title: "Average Confidence",
    value: "87%",
    subtext: "Completed tests",
    icon: CheckCircle2,
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    title: "Tests This Month",
    value: "4",
    subtext: "Created this month",
    icon: Calendar,
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  }
];

export default function StatsOverview() {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="mb-8">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-1 pb-1 -mx-1">
          {stats.map((stat) => (
            <div key={stat.title} className="min-w-[220px] snap-start">
              <div className="shadow-sm hover:shadow-md transition-shadow rounded-lg border bg-white">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-900 mb-0.5">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.subtext}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            {/* Top row: Title (left) and Icon (right) */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-medium text-slate-600">{stat.title}</p>
              {/* Move icon down ~12px (≈3mm) via transform so layout size stays the same */}
              <div className={`p-3 rounded-xl ${stat.bgColor} translate-y-3`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>

            {/* Value and subtext stay as is */}
            <div>
              <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.subtext}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
