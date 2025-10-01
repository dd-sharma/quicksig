// Demo data note: the "project" field below is a plain display string (e.g., "Main Website"),
// not a reference to the Project entity. No Project entity operations occur in this component.
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Eye, MoreVertical, ChevronDown, ChevronUp, Share2 } from "lucide-react";
import DecisionTooltip from "@/components/decision/DecisionTooltip";
import DecisionStatusBadge from "@/components/decision/DecisionStatusBadge";
import { useResponsive } from "@/components/hooks/useResponsive";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { shareTest } from "@/components/utils/share";

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
  const { isMobile } = useResponsive();
  const [expanded, setExpanded] = React.useState({});

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold">Active A/B Tests</CardTitle>
        <Link to={createPageUrl("Tests")}>
          <Button variant="outline" size="sm">
            View All Tests
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeTests.map((test) => {
            const ctx = {
              test_name: test.name,
              status: test.status === "running" ? "running" : "paused",
              confidence: Number(test.confidence) || 0,
              visitors: test.visitors || 0,
              test_duration: 7, // demo only; real value should be computed
              variant_count: 2
            };
            const status = ctx.confidence >= 95 ? "ready" : ctx.confidence >= 80 ? "warning" : "pending";
            const timeText = ctx.confidence >= 95 ? "Ready now" : "~3-5 days";

            if (isMobile) {
              return (
                <div key={test.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{test.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Status: <span className="capitalize">{test.status}</span> • CR: {test.conversionRate}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => shareTest({ id: test.id, name: test.name, winner: status === "ready" ? "Winner likely" : "—" })} title="Share">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggle(test.id)} aria-expanded={!!expanded[test.id]} aria-label="Expand">
                        {expanded[test.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {expanded[test.id] && (
                    <div className="mt-3 border-t pt-3 text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Visitors</p>
                          <p className="font-medium">{test.visitors.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Confidence</p>
                          <p className={`font-medium ${test.confidence >= 95 ? 'text-green-600' : test.confidence >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{test.confidence}%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Timeline</span>
                        <span className="text-xs text-slate-500">{timeText}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link to={createPageUrl("ResultsDashboard")}><Button size="sm" variant="outline">View Results</Button></Link>
                        <Link to={createPageUrl("TestDetail")}><Button size="sm">Open</Button></Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={test.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{test.name}</h3>
                    <DecisionStatusBadge status={status} confidencePct={ctx.confidence} timeText={timeText} />
                    <DecisionTooltip type="when_to_stop" context={ctx} style="floating" icon="bulb" label="Advice" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => shareTest({ id: test.id, name: test.name, winner: status === "ready" ? "Winner likely" : "—" })} title="Share">
                    <Share2 className="w-4 h-4" />
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
                  <Link to={createPageUrl("ResultsDashboard")}><Button variant="outline" size="sm">View Results</Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}