import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Settings, FileText, Users, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const quickActions = [
  {
    title: "Create A/B Test",
    description: "Start testing variations of your pages",
    icon: Plus,
    color: "bg-blue-500 hover:bg-blue-600",
    to: "TestsNew"
  },
  {
    title: "View Analytics",
    description: "Analyze your conversion data",
    icon: BarChart3,
    color: "bg-green-500 hover:bg-green-600",
    to: "ResultsDashboard"
  },
  {
    title: "Documentation",
    description: "See how to get the most from QuickSig",
    icon: BookOpen,
    color: "bg-purple-500 hover:bg-purple-600",
    to: "ApiDocs"
  },
  {
    title: "Invite Team Member",
    description: "Add teammates to collaborate",
    icon: Users,
    color: "bg-orange-500 hover:bg-orange-600",
    to: "SettingsTeam"
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
            <Link key={action.title} to={createPageUrl(action.to)}>
              <Button
                variant="outline"
                className="h-auto p-4 justify-start hover:border-slate-300 transition-colors w-full"
              >
                <div className={`p-2 rounded-lg ${action.color} mr-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900">{action.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{action.description}</div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}