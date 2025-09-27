import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600">Deep-dive analytics and insights.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Results Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          View full organization performance and trends.
          <div className="mt-4">
            <Link to={createPageUrl("ResultsDashboard")}><Button>Open Results Dashboard</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}