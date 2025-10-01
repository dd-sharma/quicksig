import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Separator } from "@/components/ui/separator";

export default function BusinessImpactCalculator({ upliftPct = 0, monthlyVisitors = 0, defaultAOV = 50, onCompute }) {
  const [aov, setAov] = React.useState(defaultAOV);
  const [proj, setProj] = React.useState({ monthly: 0, quarterly: 0, annual: 0 });

  React.useEffect(() => {
    const baselineCR = 0.02; // default assumption
    const imp = (upliftPct || 0) / 100;
    const addedConversions = monthlyVisitors * baselineCR * imp;
    const m = addedConversions * aov;
    const q = m * 3;
    const y = m * 12;
    const res = { monthly: m, quarterly: q, annual: y };
    setProj(res);
    onCompute && onCompute(res);
  }, [upliftPct, monthlyVisitors, aov, onCompute]);

  const data = [
    { name: "3 mo", value: proj.quarterly },
    { name: "6 mo", value: proj.monthly * 6 },
    { name: "12 mo", value: proj.annual },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Average Order Value ($)</Label>
            <Input type="number" value={aov} onChange={(e) => setAov(Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Monthly Visitors</Label>
            <Input type="number" value={monthlyVisitors} readOnly className="bg-slate-50" />
          </div>
          <div>
            <Label>Observed Uplift (%)</Label>
            <Input type="number" value={Number(upliftPct).toFixed(2)} readOnly className="bg-slate-50" />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`} />
              <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
              <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 text-sm text-slate-700">
          Projected revenue impact — Monthly: ${Math.round(proj.monthly).toLocaleString()}, Quarterly: ${Math.round(proj.quarterly).toLocaleString()}, Annual: ${Math.round(proj.annual).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}