import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Award } from "lucide-react";

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
          {recentResults.map((result) => (
            <div key={result.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">{result.name}</h3>
                  {result.status === "significant" && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Award className="w-3 h-3 mr-1" />
                      Significant
                    </Badge>
                  )}
                  {result.status === "inconclusive" && (
                    <Badge variant="secondary">Inconclusive</Badge>
                  )}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}