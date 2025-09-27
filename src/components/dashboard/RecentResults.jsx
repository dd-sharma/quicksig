
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Award } from "lucide-react";
import DecisionTooltip from "@/components/decision/DecisionTooltip";
import DecisionStatusBadge from "@/components/decision/DecisionStatusBadge"; // New import

const recentResults = [
  {
    id: 1,
    name: "Email Signup Form",
    winner: "Variant B",
    improvement: "+24%",
    status: "significant",
    completedDate: "Dec 14, 2024",
    visitors: 5240
  },
  {
    id: 2,
    name: "Product Page CTA",
    winner: "Variant A",
    improvement: "+12%",
    status: "significant", 
    completedDate: "Dec 10, 2024",
    visitors: 3890
  },
  {
    id: 3,
    name: "Navigation Menu",
    winner: "No Winner",
    improvement: "+2%",
    status: "inconclusive",
    completedDate: "Dec 8, 2024",
    visitors: 2156
  }
];

export default function RecentResults() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold">Recent Test Results</CardTitle>
        <Button variant="outline" size="sm">
          View All Results
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentResults.map((result) => {
            const uplift = parseFloat(String(result.improvement).replace('%','').replace('+','').replace('−','-')) || 0;
            const isSignificant = result.status === "significant";
            const ctx = {
              test_name: result.name,
              status: "completed",
              winner_declared: isSignificant && result.winner !== "No Winner",
              no_significant_difference: !isSignificant || result.winner === "No Winner",
              confidence: isSignificant ? 95 : 70, // Assuming 95% for significant, 70% for inconclusive as a default
              uplift,
              visitors: result.visitors,
              sample_size: result.visitors // Assuming visitors is also the sample size for simplicity
            };
            const status = isSignificant ? "ready" : "warning";
            const timeText = isSignificant ? "Ready now" : "Needs more data";
            return (
              <div key={result.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{result.name}</h3>
                    <DecisionStatusBadge status={status} confidencePct={ctx.confidence} timeText={timeText} />
                    <DecisionTooltip type={isSignificant ? "implementation_guidance" : "what_to_test_next"} context={ctx} style="floating" icon="brain" label="Advice" />
                  </div>
                  <span className="text-xs text-slate-500">{result.completedDate}</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Winner</p>
                    <p className="font-semibold">{result.winner}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Improvement</p>
                    <div className="flex items-center gap-1">
                      {result.improvement.startsWith('+') ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${result.improvement.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {result.improvement}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Visitors</p>
                    <p className="font-semibold">{result.visitors.toLocaleString()}</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  View Detailed Report
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
