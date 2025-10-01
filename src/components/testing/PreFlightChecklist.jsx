import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ConflictDetectionService from "@/components/services/ConflictDetectionService";
import { requiredSampleSizeTwoProportions } from "@/components/results/ResultsCalculator";

function isMeaningfulName(name) {
  if (!name) return false;
  const s = name.trim().toLowerCase();
  const bad = ["test", "test 1", "untitled", "new test", "ab test"];
  return !bad.includes(s) && s.length >= 4;
}

function isValidUrl(u) {
  try { const url = new URL(u); return !!url.protocol && !!url.host; } catch { return false; }
}

export default function PreFlightChecklist({
  testData,
  variants = [],
  organizationId,
  excludeTestId,
  estimatedDailyVisitors = 1000,
  baselineCR = 0.03,
  mdeRelative = 0.1,
  onValidationChange
}) {
  const [conflicts, setConflicts] = React.useState([]);
  React.useEffect(() => {
    (async () => {
      if (!testData?.test_url || !organizationId) return setConflicts([]);
      const list = await ConflictDetectionService.findConflicts({
        test_url: testData.test_url,
        exclude_test_id: excludeTestId,
        organization_id: organizationId
      });
      setConflicts(list);
    })();
  }, [testData?.test_url, organizationId, excludeTestId]);

  const trafficSum = variants.reduce((s, v) => s + (Number(v.traffic_percentage) || 0), 0);
  const hasTwoVariants = variants.length >= 2;
  const hasDuplicateVariantNames = (() => {
    const names = variants.map(v => (v.variant_name || "").trim().toLowerCase());
    return new Set(names).size !== names.length;
  })();
  const successMetricConfigured = !!testData?.success_metric?.type;
  const urlValid = isValidUrl(testData?.test_url || "");
  const variantNamesMeaningful = variants.every(v => (v.variant_name || "").trim().length >= 2 && !/variant [a-z]$/i.test(v.variant_name || ""));
  const hypothesisPresent = (testData?.description || "").trim().length > 0;

  // Sample size feasibility (simplified)
  const mdeAbs = baselineCR * mdeRelative;
  const nPerGroup = requiredSampleSizeTwoProportions({ baseline: baselineCR, mdeAbs, alpha: 0.05, power: 0.8 });
  const estDurationDays = Math.ceil((nPerGroup * variants.length) / Math.max(1, estimatedDailyVisitors));

  const requiredIssues = [];
  if (!hasTwoVariants) requiredIssues.push("At least 2 variants are required.");
  if (Math.abs(trafficSum - 100) > 0.1) requiredIssues.push("Traffic allocation must total 100%.");
  if (!successMetricConfigured) requiredIssues.push("Select a success metric.");
  if (!urlValid) requiredIssues.push("Provide a valid test URL.");
  if (hasDuplicateVariantNames) requiredIssues.push("Variant names must be unique.");
  if (conflicts.length > 0) requiredIssues.push("Conflicting running test on the same URL.");

  const recommendedIssues = [];
  if (!hypothesisPresent) recommendedIssues.push("Add a hypothesis to guide interpretation.");
  if (!variantNamesMeaningful) recommendedIssues.push("Use descriptive variant names (not defaults).");
  if (estDurationDays > 30) recommendedIssues.push("Expected duration exceeds 30 days. Consider increasing traffic or MDE.");

  const bestPracticeTips = [
    "Avoid launching around major holidays/weekends for B2B audiences.",
    "Complete a QA checklist before launch.",
    "Notify stakeholders of launch timeline."
  ];

  React.useEffect(() => {
    onValidationChange?.({
      requiredPass: requiredIssues.length === 0,
      requiredIssues,
      recommendedIssues,
      estDurationDays
    });
  }, [requiredIssues.length, recommendedIssues.length, estDurationDays]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Pre-flight Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold mb-1">Required</div>
          {requiredIssues.length === 0 ? (
            <div className="flex items-center text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4 mr-2" /> All required checks passed
            </div>
          ) : (
            requiredIssues.map((msg, i) => (
              <div key={i} className="flex items-center text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" /> {msg}
              </div>
            ))
          )}
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold mb-1">Recommended</div>
          {recommendedIssues.length === 0 ? (
            <div className="flex items-center text-slate-600 text-sm">
              <Info className="w-4 h-4 mr-2" /> Looks good
            </div>
          ) : (
            recommendedIssues.map((msg, i) => (
              <div key={i} className="flex items-center text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" /> {msg}
              </div>
            ))
          )}
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold mb-1">Best Practices</div>
          {bestPracticeTips.map((tip, i) => (
            <div key={i} className="text-slate-600 text-sm">• {tip}</div>
          ))}
        </div>

        <div className="pt-2 text-xs text-slate-500">
          Estimated duration: <Badge variant="outline">{estDurationDays} days</Badge> with current assumptions. Adjust MDE or increase traffic to shorten.
        </div>
        {conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 text-sm">
            Conflict detected with {conflicts[0].test_name}. We recommend pausing or completing it before launching.
          </div>
        )}
      </CardContent>
    </Card>
  );
}