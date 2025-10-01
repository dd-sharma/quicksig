
import React, { useEffect, useMemo, useState } from "react";
import { ABTest, Variant, Visitor, Conversion } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Trophy, Equal } from "lucide-react"; // Changed 'Equals' to 'Equal'
import ExecutiveSummary from "@/components/ai/ExecutiveSummary";
import BusinessImpactCalculator from "@/components/ai/BusinessImpactCalculator";
import ConfidenceExplainer from "@/components/ai/ConfidenceExplainer";
import RiskAssessment from "@/components/ai/RiskAssessment";
import AIInterpreter from "@/components/services/AIInterpreter";
import { calculateConversionRate } from "@/components/results/ResultsCalculator";

function computeOverallStats(variants, visitors, conversions) {
  const byVariant = {};
  variants.forEach(v => {
    byVariant[v.id] = { ...v, visitor_count: 0, conversion_count: 0 };
  });

  visitors.forEach(v => {
    if (byVariant[v.variant_id || v.assigned_variant_id]) {
      const key = v.variant_id || v.assigned_variant_id;
      byVariant[key].visitor_count += 1;
    }
  });

  conversions.forEach(c => {
    if (byVariant[c.variant_id]) {
      byVariant[c.variant_id].conversion_count += 1;
    }
  });

  const list = Object.values(byVariant);
  const control = list.find(v => v.variant_type === "control") || list[0];
  const treatments = list.filter(v => v.variant_type !== "control");

  // Pick best treatment by conversion rate
  let best = treatments[0] || null;
  if (treatments.length > 0) {
    best = treatments.reduce((acc, v) => {
      const crAcc = calculateConversionRate(acc.visitor_count, acc.conversion_count);
      const crV = calculateConversionRate(v.visitor_count, v.conversion_count);
      return crV > crAcc ? v : acc;
    }, best);
  }

  const totalVisitors = list.reduce((s, v) => s + (v.visitor_count || 0), 0);

  // Confidence via z-test approximation: convert p to confidence
  const pToConf = (n1, x1, n2, x2) => {
    if (!n1 || !n2) return 0;
    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const pooled = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
    if (se === 0) return 0;
    const z = (p2 - p1) / se;
    const normalCdf = (z) => {
      const t = 1 / (1 + 0.2316419 * Math.abs(z));
      const d = 0.3989423 * Math.exp(-z * z / 2);
      let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
      if (z > 0) p = 1 - p;
      return p;
    };
    const pTwo = 2 * (1 - normalCdf(Math.abs(z)));
    return Math.max(0, Math.min(1, 1 - pTwo));
  };

  const controlCR = calculateConversionRate(control?.visitor_count || 0, control?.conversion_count || 0);
  const bestCR = calculateConversionRate(best?.visitor_count || 0, best?.conversion_count || 0);
  const upliftPct = controlCR === 0 ? (bestCR > 0 ? Infinity : 0) : ((bestCR - controlCR) / controlCR) * 100;
  const confidence = best && control ? pToConf(control.visitor_count, control.conversion_count, best.visitor_count, best.conversion_count) : 0;

  return { control, best, upliftPct, confidence, totalVisitors };
}

function buildSegmentData(controlId, visitors, conversions) {
  // Group by device and source; build control vs treatment counts
  const initBucket = () => ({ control: { n: 0, x: 0 }, treatment: { n: 0, x: 0 } });
  const byDevice = { mobile: initBucket(), desktop: initBucket(), tablet: initBucket() };
  const bySource = { direct: initBucket(), search: initBucket(), referral: initBucket() };

  const sourceType = (s) => {
    if (!s) return "direct";
    const low = String(s).toLowerCase();
    if (["google", "bing", "duckduckgo", "yahoo"].some(k => low.includes(k))) return "search";
    if (["direct", "(direct)"].some(k => low.includes(k))) return "direct";
    return "referral";
  };

  // Map variant assignment per visitorId for conversions lookup
  const assignMap = {};
  visitors.forEach(v => {
    const vid = v.visitor_id;
    const varId = v.assigned_variant_id || v.variant_id;
    const device = (v.device_type || "desktop").toLowerCase();
    const src = sourceType(v.referrer_source);
    const isControl = varId === controlId;

    const devBucket = byDevice[device] || byDevice.desktop;
    const srcBucket = bySource[src];

    if (isControl) {
      devBucket.control.n += 1;
      srcBucket.control.n += 1;
    } else {
      devBucket.treatment.n += 1;
      srcBucket.treatment.n += 1;
    }
    assignMap[vid] = { varId, device, src };
  });

  conversions.forEach(c => {
    // Prefer conversion.variant_id to decide control/treatment
    const isControl = c.variant_id === controlId;
    const meta = assignMap[c.visitor_id] || {};
    const device = meta.device || "desktop";
    const src = meta.src || "direct";
    const devBucket = byDevice[device] || byDevice.desktop;
    const srcBucket = bySource[src];

    if (isControl) {
      devBucket.control.x += 1;
      srcBucket.control.x += 1;
    } else {
      devBucket.treatment.x += 1;
      srcBucket.treatment.x += 1;
    }
  });

  return { device: byDevice, source: bySource };
}

export default function InterpretationsCard({ test, results }) {
  const [loading, setLoading] = useState(false);
  const [interpretation, setInterpretation] = useState(null);

  const testId = test?.id;

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);

      // If caller provided results, use them; else compute
      let computed = results;
      let visitors = results?.visitors;
      let conversions = results?.conversions;

      if (!computed || !computed.control || !computed.variant) {
        const [variants, rawVisitors, rawConversions] = await Promise.all([
          Variant.filter({ ab_test_id: testId }),
          Visitor.filter({ ab_test_id: testId }),
          Conversion.filter({ ab_test_id: testId })
        ]);

        visitors = rawVisitors;
        conversions = rawConversions;

        const { control, best, upliftPct, confidence, totalVisitors } =
          computeOverallStats(variants, rawVisitors, rawConversions);

        const segments = buildSegmentData(control?.id, rawVisitors, rawConversions);

        computed = {
          control: {
            visitor_count: control?.visitor_count || 0,
            conversion_count: control?.conversion_count || 0,
            conversion_rate: calculateConversionRate(control?.visitor_count || 0, control?.conversion_count || 0)
          },
          variant: {
            id: best?.id,
            variant_name: best?.variant_name || "Variant",
            visitor_count: best?.visitor_count || 0,
            conversion_count: best?.conversion_count || 0,
            conversion_rate: calculateConversionRate(best?.visitor_count || 0, best?.conversion_count || 0)
          },
          confidence,
          upliftPct,
          totalVisitors,
          startedAt: test?.started_date ? new Date(test.started_date) : null,
          segments
        };
      }

      const interp = AIInterpreter.generateInterpretation(test, computed);
      if (mounted) {
        setInterpretation(interp);
        setLoading(false);
      }
    };

    if (testId) run();

    return () => { mounted = false; };
  }, [testId, results, test]); // Added 'test' to the dependency array

  if (loading || !interpretation) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            {interpretation.meta.status === "winner" ? (
              <Trophy className="w-5 h-5 text-emerald-600" />
            ) : interpretation.meta.status === "no_diff" ? (
              <Equal className="w-5 h-5 text-slate-500" /> {/* Changed 'Equals' to 'Equal' */}
            ) : null}
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutiveSummary interpretation={interpretation} test={test} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Projected Business Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <BusinessImpactCalculator interpretation={interpretation} test={test} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfidenceExplainer confidencePct={interpretation.meta.confidencePct} totalVisitors={interpretation.meta.totalVisitors} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskAssessment risk={interpretation.riskAssessment} />
          {interpretation.segmentInsights && interpretation.segmentInsights.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <div className="text-sm font-medium mb-2">Segment Insights</div>
                <ul className="space-y-1">
                  {interpretation.segmentInsights.map((s, idx) => (
                    <li key={idx} className={`text-sm ${s.status === 'positive' ? 'text-emerald-700' : s.status === 'negative' ? 'text-red-700' : 'text-slate-700'}`}>
                      • {s.message}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
