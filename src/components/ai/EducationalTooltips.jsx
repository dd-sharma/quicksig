import React from "react";
import { Info } from "lucide-react";

export default function EducationalTooltips({ topic = "confidence" }) {
  const content = {
    confidence: {
      title: "What does confidence mean?",
      body: "Statistical confidence estimates how likely it is that the observed difference is real and not due to chance. 95%+ is commonly used as a threshold for 'significant' results."
    },
    sampleSize: {
      title: "Sample size and significance",
      body: "Larger sample sizes reduce uncertainty. Doubling your sample size reduces the confidence interval width by about 29%."
    },
    bestPractices: {
      title: "A/B testing best practices",
      body: "Run tests for full business cycles, define a clear primary metric, avoid peeking too often, and ensure randomization is working as expected."
    }
  }[topic] || { title: "Info", body: "Details not available." };

  return (
    <div className="inline-flex items-center gap-1 text-slate-600 text-xs">
      <Info className="w-3.5 h-3.5" />
      <span className="underline decoration-dotted" title={`${content.title}\n\n${content.body}`}>Learn more</span>
    </div>
  );
}