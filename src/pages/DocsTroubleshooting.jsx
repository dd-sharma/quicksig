
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Breadcrumbs from "@/components/docs/Breadcrumbs";
import InstallationChecker from "@/components/docs/InstallationChecker";

// Placeholder for createPageUrl function. In a real application, this would
// typically be imported from a utility file or a routing context.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case "Dashboard":
      return "/dashboard";
    case "Documentation":
      return "/documentation"; // Assuming /documentation for the docs main page
    case "Troubleshooting":
      return "/documentation/troubleshooting";
    default:
      return `/${pageName.toLowerCase().replace(/\s/g, '-')}`;
  }
};

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-slate-700">{children}</CardContent>
    </Card>
  );
}

export default function DocsTroubleshooting() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 text-base">
      <Breadcrumbs items={[
        { label: "Home", to: createPageUrl("Dashboard") },
        { label: "Documentation", to: createPageUrl("Documentation") },
        { label: "Troubleshooting" }
      ]} />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Troubleshooting</h1>
        <p className="text-slate-600 mt-1">Common issues and how to resolve them.</p>
      </div>

      <Section title="Tracking code not firing">
        <ul className="list-disc pl-6 space-y-1">
          <li>Open the browser console and look for QuickSig errors.</li>
          <li>Verify the snippet is before the closing &lt;/head&gt; tag.</li>
          <li>Test in an incognito window to avoid cached scripts.</li>
          <li>Disable ad blockers or allowlist your domain.</li>
        </ul>
      </Section>

      <Section title="No data showing in QuickSig">
        <ul className="list-disc pl-6 space-y-1">
          <li>Allow 5–10 minutes for first data to appear.</li>
          <li>Ensure your test status is <strong>Running</strong>.</li>
          <li>Confirm the test URL matches the page you’re testing.</li>
          <li>Check that traffic allocation percentages are set correctly.</li>
        </ul>
      </Section>

      <Section title="Performance issues">
        <ul className="list-disc pl-6 space-y-1">
          <li>The loader is async and non‑blocking.</li>
          <li>Place the snippet in the head for best reliability.</li>
          <li>Avoid duplicate snippets across apps/themes.</li>
        </ul>
      </Section>

      <Section title="Verify Installation">
        <ul className="list-disc pl-6 space-y-1">
          <li>Open your site and the browser console.</li>
          <li>Run: <code className="px-1 py-0.5 rounded bg-slate-100">typeof quicksig !== 'undefined'</code></li>
          <li>Success means QuickSig is loaded and ready.</li>
          <li>Find your Test ID in the app on the test detail page.</li>
        </ul>
      </Section>

      <InstallationChecker />
    </div>
  );
}
