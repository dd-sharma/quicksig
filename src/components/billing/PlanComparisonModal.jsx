import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "$50/month",
    trial: "14-day free trial",
    visitors: "Up to 10,000 tested users/month",
    tests: "3 concurrent tests",
    features: ["Basic integrations", "AI interpretation (limited)", "Regular support – Level 3"],
    limits: { monthly_visitor_quota: 10000, concurrent_test_limit: 3 }
  },
  {
    key: "growth",
    name: "Growth",
    price: "$250/month",
    trial: "14-day free trial",
    visitors: "Up to 100,000 tested users/month",
    tests: "Unlimited tests",
    features: ["All integrations", "Full AI suite", "Priority support – Level 2"],
    limits: { monthly_visitor_quota: 100000, concurrent_test_limit: 9999 }
  },
  {
    key: "scale",
    name: "Scale",
    price: "$500/month",
    trial: "14-day free trial",
    visitors: "Up to 500,000 tested users/month",
    tests: "Unlimited tests",
    features: ["Advanced statistics (Bayesian, sequential)", "Custom integrations", "White-label reports", "Priority support – Level 1"],
    limits: { monthly_visitor_quota: 500000, concurrent_test_limit: 9999 }
  }
];

export default function PlanComparisonModal({ open, onOpenChange, currentPlan, onSelectPlan, onStartTrial }) {
  const planKey = (currentPlan || "").toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Choose Your Plan</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(p => {
            const isCurrent = p.key === planKey;
            return (
              <div key={p.key} className={`border rounded-lg p-4 ${isCurrent ? "border-blue-500" : "border-slate-200"}`}>
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="text-2xl font-bold mt-1">{p.price}</div>
                <div className="text-xs text-emerald-700 mt-1">{p.trial}</div>
                <ul className="text-sm text-slate-700 mt-3 space-y-1">
                  <li>• {p.visitors}</li>
                  <li>• {p.tests}</li>
                  {p.features.map((f, i) => (<li key={i}>• {f}</li>))}
                </ul>
                <div className="mt-4 flex flex-col gap-2">
                  {isCurrent ? (
                    <Button variant="outline" disabled>Current Plan</Button>
                  ) : (
                    <Button onClick={() => onSelectPlan(p)}>Switch to {p.name}</Button>
                  )}
                  <Button variant="outline" onClick={() => onStartTrial(p)}>Start Free Trial</Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}