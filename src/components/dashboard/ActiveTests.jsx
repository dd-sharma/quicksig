import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Eye, MoreVertical } from "lucide-react";

const activeTests = [
  {
    id: 1,
    name: "Homepage Hero Section",
    status: "running",
    visitors: 2847,
    conversionRate: "3.2%",
    confidence: 95,
    project: "Main Website",
    startDate: "Dec 15, 2024"
  },
  {
    id: 2,
    name: "Checkout Button Color",
    status: "running", 
    visitors: 1432,
    conversionRate: "5.8%",
    confidence: 87,
    project: "E-commerce",
    startDate: "Dec 18, 2024"
  },
  {
    id: 3,
    name: "Pricing Page Layout",
    status: "paused",
    visitors: 892,
    conversionRate: "2.1%",
    confidence: 42,
    project: "SaaS Landing",
    startDate: "Dec 12, 2024"
  }
];

export default function ActiveTests() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold">Active A/B Tests</CardTitle>
        <Button variant="outline" size="sm">
          View All Tests
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeTests.map((test) => (
            <div key={test.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">{test.name}</h3>
                  <Badge variant={test.status === "running" ? "default" : "secondary"} className="text-xs">
                    {test.status === "running" ? (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Running
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3 mr-1" />
                        Paused
                      </>
                    )}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Visitors</p>
                  <p className="font-semibold">{test.visitors.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Conversion Rate</p>
                  <p className="font-semibold text-green-600">{test.conversionRate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Confidence</p>
                  <p className={`font-semibold ${test.confidence >= 95 ? 'text-green-600' : test.confidence >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {test.confidence}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Started</p>
                  <p className="text-sm">{test.startDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Project:</span>
                  <Badge variant="outline" className="text-xs">{test.project}</Badge>
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Results
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}