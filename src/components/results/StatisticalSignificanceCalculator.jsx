import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import {
  zTestTwoProportions,
  confidenceIntervalDiff,
  cohensH,
  interpretCohensH,
  achievedPower,
  requiredSampleSizeTwoProportions,
  fmtPct
} from "./ResultsCalculator";

export default function StatisticalSignificanceCalculator() {
  const [ctrlVisitors, setCtrlVisitors] = useState(1000);
  const [ctrlConversions, setCtrlConversions] = useState(50);
  const [varVisitors, setVarVisitors] = useState(1000);
  const [varConversions, setVarConversions] = useState(65);
  const [confidence, setConfidence] = useState("0.95");
  const [power, setPower] = useState("0.8");

  const n1 = Number(ctrlVisitors) || 0;
  const x1 = Number(ctrlConversions) || 0;
  const n2 = Number(varVisitors) || 0;
  const x2 = Number(varConversions) || 0;
  const conf = Number(confidence);
  const alpha = 1 - conf;
  const desiredPower = Number(power);

  const stats = useMemo(() => {
    const z = zTestTwoProportions({ n1, x1, n2, x2 });
    const ci = confidenceIntervalDiff({ n1, x1, n2, x2, confidence: conf });
    const p1 = n1 ? x1 / n1 : 0;
    const p2 = n2 ? x2 / n2 : 0;
    const h = cohensH(p1, p2);
    const powerAchieved = achievedPower({ n1, x1, n2, x2, alpha });
    const needed = requiredSampleSizeTwoProportions({ baseline: p1 || 0.0001, mdeAbs: Math.abs(p2 - p1) || 0.0001, alpha, power: desiredPower });
    const significant = z.pValue < alpha && n1 >= 30 && n2 >= 30;
    return { z, ci, p1, p2, h, powerAchieved, needed, significant };
  }, [n1, x1, n2, x2, conf, desiredPower, alpha]);

  const confidencePct = Math.max(0, 100 - (stats.z.pValue / alpha) * 100);
  const confidenceColor = stats.significant ? "bg-emerald-500" : stats.z.pValue < 0.1 ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Statistical Significance Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-slate-600">Control Visitors</label>
            <Input type="number" value={ctrlVisitors} onChange={(e) => setCtrlVisitors(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Control Conversions</label>
            <Input type="number" value={ctrlConversions} onChange={(e) => setCtrlConversions(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Treatment Visitors</label>
            <Input type="number" value={varVisitors} onChange={(e) => setVarVisitors(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Treatment Conversions</label>
            <Input type="number" value={varConversions} onChange={(e) => setVarConversions(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Desired Confidence</label>
            <Select value={confidence} onValueChange={setConfidence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.90">90%</SelectItem>
                <SelectItem value="0.95">95%</SelectItem>
                <SelectItem value="0.99">99%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Desired Power</label>
            <Select value={power} onValueChange={setPower}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.8">80%</SelectItem>
                <SelectItem value="0.9">90%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Confidence level</div>
            <Badge className={`text-xs ${stats.significant ? 'bg-emerald-100 text-emerald-700' : stats.z.pValue < 0.1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {stats.significant ? 'Significant' : stats.z.pValue < 0.1 ? 'Trending' : 'Not Significant'}
            </Badge>
          </div>
          <Progress value={Math.max(0, Math.min(100, confidencePct))} className={`${confidenceColor}`} />
          <div className="text-xs text-slate-500">P-value: {stats.z.pValue.toExponential(2)} (alpha {fmtPct(alpha * 100, 2)})</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-700 mb-1">Effect Size (Cohen's h)</div>
            <div className="text-slate-900">{stats.h.toFixed(3)} <span className="text-slate-500">({interpretCohensH(stats.h)})</span></div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-700 mb-1">95% CI for Difference</div>
            <div className="text-slate-900">{fmtPct(stats.ci.lower * 100, 2)} to {fmtPct(stats.ci.upper * 100, 2)}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-700 mb-1">Power Achieved</div>
            <div className="text-slate-900">{fmtPct(stats.powerAchieved * 100, 1)}</div>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          These calculations are approximations suitable for most business decisions. For critical decisions, consult a data scientist.
        </div>
      </CardContent>
    </Card>
  );
}