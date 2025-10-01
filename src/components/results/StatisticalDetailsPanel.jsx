
import React, { useEffect, useMemo, useState } from "react";
import { Variant, Visitor, Conversion } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Info } from "lucide-react";
import {
  calculateConversionRate,
  zTestTwoProportions,
  confidenceIntervalDiff,
  cohensH,
  interpretCohensH,
  achievedPower,
  requiredSampleSizeTwoProportions,
  sampleRatioMismatch,
  bayesianAB,
  fmtPct
} from "./ResultsCalculator";

export default function StatisticalDetailsPanel({ test, looksCount = 1 }) {
  const [variants, setVariants] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [conversions, setConversions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const vs = await Variant.filter({ ab_test_id: test.id });
      const vis = await Visitor.filter({ ab_test_id: test.id });
      const conv = await Conversion.filter({ ab_test_id: test.id });
      setVariants(vs);
      setVisitors(vis);
      setConversions(conv);
    };
    if (test?.id) load();
  }, [test?.id]);

  const rows = useMemo(() => {
    if (!variants.length) return [];
    const control = variants.find(v => v.variant_type === "control");
    if (!control) return [];
    const out = [];
    for (const v of variants) {
      if (v.id === control.id) continue;
      const n1 = visitors.filter(x => x.assigned_variant_id === control.id).length;
      const x1 = conversions.filter(x => x.variant_id === control.id).length;
      const n2 = visitors.filter(x => x.assigned_variant_id === v.id).length;
      const x2 = conversions.filter(x => x.variant_id === v.id).length;

      const crC = calculateConversionRate(n1, x1);
      const crV = calculateConversionRate(n2, x2);

      const z = zTestTwoProportions({ n1, x1, n2, x2 });
      const ci = confidenceIntervalDiff({ n1, x1, n2, x2, confidence: 0.95 });
      const h = cohensH(z.p1, z.p2);
      const powerAchieved = achievedPower({ n1, x1, n2, x2, alpha: 0.05 });
      const needed = requiredSampleSizeTwoProportions({ baseline: z.p1 || 0.0001, mdeAbs: Math.abs(z.p2 - z.p1) || 0.0001, alpha: 0.05, power: 0.8 });
      const bayes = bayesianAB({ n1, x1, n2, x2, samples: 2000 });

      out.push({
        id: v.id,
        name: v.variant_name,
        n1, x1, n2, x2,
        crC, crV,
        zScore: z.z,
        pValue: z.pValue,
        ci95: ci,
        h,
        hLabel: interpretCohensH(h),
        power: powerAchieved,
        needed,
        probBetter: bayes.probBetter,
        credInt: bayes.credInt
      });
    }
    return out;
  }, [variants, visitors, conversions]);

  const health = useMemo(() => {
    if (!variants.length) return null;
    const planned = variants.map(v => (v.traffic_percentage || 0) / 100);
    const counts = variants.map(v => visitors.filter(x => x.assigned_variant_id === v.id).length);
    const srm = sampleRatioMismatch({ counts, plannedSplit: planned, tolerance: 0.05 });
    const tooManyVariants = variants.filter(v => v.variant_type !== 'control').length > 1;
    const lowPower = rows.some(r => r.power < 0.8);
    return { srm, tooManyVariants, lowPower };
  }, [variants, visitors, rows]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Statistical Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {health && (health.srm.mismatch || health.lowPower || health.tooManyVariants) && (
          <div className="flex flex-wrap gap-2">
            {health.srm.mismatch && (
              <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" /> Sample ratio mismatch suspected</Badge>
            )}
            {health.lowPower && (
              <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" /> Low statistical power (&lt;80%)</Badge>
            )}
            {health.tooManyVariants && (
              <Badge className="bg-blue-100 text-blue-700"><Info className="w-3 h-3 mr-1" /> Multiple testing considerations</Badge>
            )}
          </div>
        )}

        <TooltipProvider>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>CR (C)</TableHead>
                  <TableHead>CR (V)</TableHead>
                  <TableHead>Z-score</TableHead>
                  <TableHead>P-value</TableHead>
                  <TableHead>95% CI (uplift)</TableHead>
                  <TableHead>Cohen's h</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>Needed N/var</TableHead>
                  <TableHead>Bayesian P(&gt;C)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.crC.toFixed(2)}%</TableCell>
                    <TableCell>{r.crV.toFixed(2)}%</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger className="underline decoration-dotted">{r.zScore.toFixed(2)}</TooltipTrigger>
                        <TooltipContent>Z-score for two-proportion test</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{r.pValue.toExponential(2)}</TableCell>
                    <TableCell>{fmtPct(r.ci95.lower * 100, 2)} to {fmtPct(r.ci95.upper * 100, 2)}</TableCell>
                    <TableCell>{r.h.toFixed(3)} ({r.hLabel})</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.max(0, Math.min(100, r.power * 100))} />
                        <span className="text-xs">{(r.power * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{r.needed.toLocaleString()}</TableCell>
                    <TableCell>{fmtPct(r.probBetter * 100, 1)}<div className="text-[10px] text-slate-500">CI: {fmtPct(r.credInt.lower * 100, 1)}–{fmtPct(r.credInt.upper * 100, 1)}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
