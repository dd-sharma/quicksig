import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { requiredSampleSizeTwoProportions, mdeForSampleSize, fmtPct } from "./ResultsCalculator";

export default function SampleSizeCalculator() {
  const [baselinePct, setBaselinePct] = useState(5);
  const [mdePct, setMdePct] = useState(10);
  const [alpha, setAlpha] = useState(5);
  const [power, setPower] = useState(80);
  const [dailyVisitors, setDailyVisitors] = useState(1000);
  const [variants, setVariants] = useState(2);

  const baseline = Math.max(0.0001, Math.min(0.9999, baselinePct / 100));
  const mdeAbs = Math.max(0.0001, mdePct / 100 * baseline); // interpret as relative MDE
  const alphaDec = Math.max(0.0001, alpha / 100);
  const powerDec = Math.max(0.5, Math.min(0.99, power / 100));

  const nPerVariant = useMemo(() => {
    return requiredSampleSizeTwoProportions({ baseline, mdeAbs, alpha: alphaDec, power: powerDec });
  }, [baseline, mdeAbs, alphaDec, powerDec]);

  const totalVisitorsNeeded = nPerVariant * variants;
  const days = useMemo(() => {
    if (dailyVisitors <= 0) return 0;
    return Math.ceil(totalVisitorsNeeded / dailyVisitors);
  }, [totalVisitorsNeeded, dailyVisitors]);

  const curveData = useMemo(() => {
    // Generate relationship of MDE (relative) vs n per group
    const points = [];
    for (let rel = 5; rel <= 30; rel += 1) {
      const mdeRel = rel / 100;
      const mdeAbsRel = baseline * mdeRel;
      const n = requiredSampleSizeTwoProportions({ baseline, mdeAbs: mdeAbsRel, alpha: alphaDec, power: powerDec });
      points.push({ mde: rel, n });
    }
    return points;
  }, [baseline, alphaDec, powerDec]);

  const applyPreset = (preset) => {
    if (preset === 'quick') {
      setPower(80); setAlpha(5); setMdePct(20);
    } else if (preset === 'standard') {
      setPower(80); setAlpha(5); setMdePct(10);
    } else if (preset === 'high') {
      setPower(90); setAlpha(1); setMdePct(10);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sample Size Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-sm text-slate-600">Baseline CR (%)</label>
            <Input type="number" value={baselinePct} onChange={(e) => setBaselinePct(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">MDE (relative %)</label>
            <Input type="number" value={mdePct} onChange={(e) => setMdePct(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Alpha (%)</label>
            <Input type="number" value={alpha} onChange={(e) => setAlpha(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Power (%)</label>
            <Input type="number" value={power} onChange={(e) => setPower(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Daily Visitors</label>
            <Input type="number" value={dailyVisitors} onChange={(e) => setDailyVisitors(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button variant="outline" onClick={() => applyPreset('quick')}>Quick Test</Button>
          <Button variant="outline" onClick={() => applyPreset('standard')}>Standard Test</Button>
          <Button variant="outline" onClick={() => applyPreset('high')}>High Confidence</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600">Required per variant</div>
            <div className="text-xl font-semibold">{nPerVariant.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600">Total visitors (all variants)</div>
            <div className="text-xl font-semibold">{totalVisitorsNeeded.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600">Estimated days</div>
            <div className="text-xl font-semibold">{days}</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mde" tick={{ fontSize: 12 }} label={{ value: "MDE (relative %)", position: "insideBottom", offset: -5 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, n) => [v.toLocaleString(), n === 'n' ? 'Sample per group' : n]} />
              <Line type="monotone" dataKey="n" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-xs text-slate-500">
          Note: Calculations are approximations suitable for most business decisions. For critical decisions, consult a data scientist.
        </div>
      </CardContent>
    </Card>
  );
}