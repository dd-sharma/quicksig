import React from "react";
import UsageDashboard from "@/components/quota/UsageDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlanManagement() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Plan & Usage</h1>
        <p className="text-slate-600">Manage your plan and monitor monthly usage.</p>
      </div>

      <UsageDashboard />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-lg font-semibold">Free</div>
              <div className="text-2xl font-bold mt-1">$0</div>
              <ul className="text-sm text-slate-600 mt-2 space-y-1">
                <li>• 10,000 visitors</li>
                <li>• 3 concurrent tests</li>
                <li>• Core features</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-lg font-semibold">Professional</div>
              <div className="text-2xl font-bold mt-1">$199</div>
              <ul className="text-sm text-slate-600 mt-2 space-y-1">
                <li>• 100,000 visitors</li>
                <li>• Unlimited tests</li>
                <li>• Priority support</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-lg font-semibold">Business</div>
              <div className="text-2xl font-bold mt-1">$499</div>
              <ul className="text-sm text-slate-600 mt-2 space-y-1">
                <li>• 500,000 visitors</li>
                <li>• Unlimited tests</li>
                <li>• SLA + SSO</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}