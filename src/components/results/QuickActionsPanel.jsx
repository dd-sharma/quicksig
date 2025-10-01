import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, RefreshCw, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActionsPanel({ onRefresh, onExportAll, lastUpdated, isRefreshing }) {
  const lastUpdatedText = lastUpdated
    ? `${Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000))} min ago`
    : "—";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Link to={createPageUrl("TestsNew")} className="w-full">
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" /> Create New Test
            </Button>
          </Link>
          <Button variant="outline" className="w-full gap-2" onClick={onExportAll}>
            <Download className="w-4 h-4" /> Export All Results
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh Data
          </Button>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Last updated: {lastUpdatedText}
        </div>
      </CardContent>
    </Card>
  );
}