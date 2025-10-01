import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function StatisticsGuide() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Statistics Guide</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="sig">
            <AccordionTrigger>What is statistical significance?</AccordionTrigger>
            <AccordionContent>
              It indicates whether observed differences are likely due to chance. We typically use 95% confidence for standard product decisions.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="pvalue">
            <AccordionTrigger>What is a p-value?</AccordionTrigger>
            <AccordionContent>
              The probability of observing results at least as extreme as yours, assuming there is no real difference. Lower is stronger evidence.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="errors">
            <AccordionTrigger>Type I and Type II errors</AccordionTrigger>
            <AccordionContent>
              Type I (false positive): claiming a difference when none exists. Type II (false negative): missing a real difference. Alpha and power balance these.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="samples">
            <AccordionTrigger>Why we need minimum sample sizes</AccordionTrigger>
            <AccordionContent>
              Small samples lead to noisy estimates and unreliable conclusions. Power analysis helps ensure enough data to detect meaningful effects.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="peeking">
            <AccordionTrigger>The danger of peeking at results</AccordionTrigger>
            <AccordionContent>
              Checking results too often inflates false positives. If early stopping is enabled, we adjust thresholds using an alpha spending rule.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="mt-4 text-sm">
          Confidence Level Helper:
          <ul className="list-disc pl-5 mt-2">
            <li>90%: exploration/low-risk tests</li>
            <li>95%: standard business decisions</li>
            <li>99%: critical/high-risk changes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}