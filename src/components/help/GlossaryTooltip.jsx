import React from "react";
import HelpTooltip from "@/components/ui/HelpTooltip";

const TERMS = {
  control: "The current version of your page used as the baseline for comparison.",
  variant: "A changed version of your page tested against the control.",
  conversion: "Your goal action (e.g., signup, purchase, click).",
  significance: "Confidence that results are not due to random chance (commonly 95%).",
  mde: "Minimum Detectable Effect: the smallest change you want to be able to detect.",
  "sample size": "Number of visitors required to detect your chosen effect with your desired significance and power.",
  "confidence interval": "A range of values likely to contain the true effect.",
  "statistical power": "Probability your test detects a real effect (commonly 80%).",
  "type i error": "False positive: finding a difference when none exists.",
  "type ii error": "False negative: missing a real difference.",
  uplift: "Percentage improvement of a variant vs. control.",
  baseline: "Current performance used as a starting point.",
  hypothesis: "Your statement of what you expect to happen and why.",
  "null hypothesis": "Assumes no difference between control and variant.",
};

export default function GlossaryTooltip({ term, side = "top" }) {
  const key = String(term || "").toLowerCase();
  const content = TERMS[key] || "Definition not available.";
  return <HelpTooltip title={term} content={content} side={side} />;
}