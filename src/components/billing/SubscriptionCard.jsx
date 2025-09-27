import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

function pctColor(p) {
  if (p < 50) return "bg-emerald-500";
  if (p < 80) return "bg-amber-500";
  return "bg-red-500";
}

export default function SubscriptionCard({
  organization,
  usageStats, // { visitorsUsed, visitorsQuota, runningCount, concurrentLimit }
  onManageSubscription,
  onViewBillingHistory
}) {
  const plan = (organization?.plan_type || organization?.subscription_tier || "free");
  const planLabel = ({ free: "Free", professional: "Professional", business: "Business", starter: "Starter", growth: "Growth", scale: "Scale" }[plan]) || plan;
  const status = organization?.billing_status || "trial";
  const trialStart = organization?.trial_start_date ? new Date(organization.trial_start_date) : null;
  const trialEnd = organization?.trial_end_date ? new Date(organization.trial_end_date) : null;
  const nextBill = organization?.next_billing_date ? new Date(organization.next_billing_date) : trialEnd;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000*60*60*24))) : null;

  const visitorsPct = usageStats?.visitorsQuota ? Math.min(100, Math.round((usageStats.visitorsUsed / usageStats.visitorsQuota) * 100)) : 0;
  const testsPct = usageStats?.concurrentLimit ? Math.min(100, Math.round((usageStats.runningCount / usageStats.concurrentLimit) * 100)) : 0;

  const payment = organization?.payment_method;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Subscription & Billing</CardTitle>
          <Badge variant="outline" className="capitalize">{status}</Badge>
        </div>
        <div className="text-sm text-slate-600">
          Current plan: <span className="font-medium">{planLabel}</span>
          {status === "trial" && daysLeft !== null && (
            <span className="ml-2 text-amber-600">Trial: {daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Monthly visitors</span>
              <span>{usageStats?.visitorsUsed?.toLocaleString?.() || 0} / {usageStats?.visitorsQuota?.toLocaleString?.() || 0}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
              <div className={`h-2 rounded-full ${pctColor(visitorsPct)}`} style={{ width: `${visitorsPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Active tests</span>
              <span>{usageStats?.runningCount || 0} / {usageStats?.concurrentLimit || 0}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
              <div className={`h-2 rounded-full ${pctColor(testsPct)}`} style={{ width: `${testsPct}%` }} />
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          {nextBill ? (
            <>Next billing date: <span className="font-medium">{format(nextBill, "MMM. d, yyyy")}</span></>
          ) : (
            <>Billing date: <span className="font-medium">Not set</span></>
          )}
        </div>

        <div className="text-sm">
          <div className="text-slate-600">Payment method</div>
          {payment?.last4 ? (
            <div className="text-slate-800">
              {payment.brand || "Card"} •••• {payment.last4} &nbsp; exp {payment.exp_month?.toString().padStart(2,"0")}/{payment.exp_year}
            </div>
          ) : (
            <div className="text-slate-500">No payment method on file</div>
          )}
          {status === "trial" && trialEnd && (
            <div className="text-xs text-amber-600 mt-1">
              Card will be charged after trial ends on {format(trialEnd, "MMM. d, yyyy")}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="w-full sm:w-auto" onClick={onManageSubscription}>Manage Subscription</Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={onViewBillingHistory}>View Billing History</Button>
        </div>
      </CardContent>
    </Card>
  );
}