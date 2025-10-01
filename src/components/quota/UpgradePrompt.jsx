import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Rocket, ArrowRight } from "lucide-react";

export default function UpgradePrompt({ visible, usage, onClose, onUpgrade, context = "quota" }) {
  if (!visible) return null;

  const percent = usage?.total ? Math.min(100, Math.round((usage.used / usage.total) * 100)) : 0;
  const plans = [
    { name: "Professional", price: "$199/mo", visitors: "100,000", tests: "Unlimited" },
    { name: "Business", price: "$499/mo", visitors: "500,000", tests: "Unlimited" }
  ];

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            {context === "concurrent" ? "Concurrent test limit reached" : "Approaching visitor quota"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {context !== "concurrent" && (
            <div>
              <div className="text-sm text-slate-600 mb-2">Monthly Visitors</div>
              <div className="flex items-center justify-between text-sm">
                <span>{usage?.used?.toLocaleString() || 0} / {usage?.total?.toLocaleString() || 0}</span>
                <span>{percent}%</span>
              </div>
              <Progress value={percent} className="h-2 mt-1" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plans.map(p => (
              <Card key={p.name} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="text-lg font-semibold">{p.name}</div>
                  <div className="text-2xl font-bold mt-1">{p.price}</div>
                  <ul className="text-sm text-slate-600 mt-2 space-y-1">
                    <li>• {p.visitors} monthly visitors</li>
                    <li>• {p.tests} tests</li>
                    <li>• Priority support</li>
                  </ul>
                  <Button className="w-full mt-3" onClick={onUpgrade}>
                    Upgrade Now <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>Remind Me Later</Button>
            <Button variant="ghost" onClick={onClose}>Learn More</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}