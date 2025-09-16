import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Settings, FileText } from "lucide-react";

const quickActions = [
  {
    title: "Create A/B Test",
    description: "Start testing variations of your pages",
    icon: Plus,
    color: "bg-blue-500 hover:bg-blue-600",
    action: "create-test"
  },
  {
    title: "View Analytics",
    description: "Analyze your conversion data",
    icon: BarChart3,
    color: "bg-green-500 hover:bg-green-600",
    action: "view-analytics"
  },
  {
    title: "Generate Report",
    description: "Export your test results",
    icon: FileText,
    color: "bg-purple-500 hover:bg-purple-600",
    action: "generate-report"
  },
  {
    title: "Setup Integration",
    description: "Connect your analytics tools",
    icon: Settings,
    color: "bg-orange-500 hover:bg-orange-600",
    action: "setup-integration"
  }
];

export default function QuickActions() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.action}
              variant="outline"
              className="h-auto p-4 justify-start hover:border-slate-300 transition-colors"
            >
              <div className={`p-2 rounded-lg ${action.color} mr-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-900">{action.title}</div>
                <div className="text-xs text-slate-500 mt-1">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}