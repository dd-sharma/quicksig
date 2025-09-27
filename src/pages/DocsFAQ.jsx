
import React from "react";
import Breadcrumbs from "@/components/docs/Breadcrumbs";
import { createPageUrl } from "@/utils";

export default function DocsFAQ() {
  const faqs = [
    { q: "How long before I see data?", a: "Usually within 5–10 minutes after installation and traffic starts flowing." },
    { q: "Does it work with SPAs?", a: "Yes. For single‑page apps, trigger page view events on route changes or re-run variant code on navigation." },
    { q: "Can I run multiple tests?", a: "Yes, up to your plan limits. Ensure tests don't target the same elements concurrently." },
    { q: "Is it GDPR compliant?", a: "Yes. QuickSig does not collect PII and anonymizes tracking data." },
    { q: "Does it slow down my site?", a: "No. The script loads asynchronously and is optimized for performance." },
    { q: "What browsers are supported?", a: "All modern browsers including Chrome, Edge, Firefox, and Safari." },
    { q: "Can I test on staging sites?", a: "Yes. Use test mode or separate tests for staging domains." },
    { q: "How do I remove the code?", a: "Delete the snippet from your template or plugin and publish the change." }
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto text-base">
      <Breadcrumbs items={[
        { label: "Home", to: createPageUrl("Dashboard") },
        { label: "Documentation", to: createPageUrl("Documentation") },
        { label: "FAQ" }
      ]} />
      <h1 className="text-3xl font-bold text-slate-900 mb-6">FAQ</h1>
      <div className="space-y-6">
        {faqs.map((item, idx) => (
          <div key={idx}>
            <h3 className="font-semibold text-slate-900">{item.q}</h3>
            <p className="text-slate-700 mt-1">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
