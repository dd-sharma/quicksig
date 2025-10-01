
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Breadcrumbs from "@/components/docs/Breadcrumbs";
import CodeGenerator from "@/components/docs/CodeGenerator";
import { Button } from "@/components/ui/button";

const BasicSnippet = `<!-- QuickSig Tracking (Basic) -->
<script>
  window.quicksigConfig = {
    testId: "YOUR_TEST_ID",
    apiEndpoint: "https://app.quicksig.com/api/track",
    debug: false
  };
</script>
<script async src="https://app.quicksig.com/track.js"></script>`;

const WordPressSnippet = BasicSnippet;
const ShopifySnippet = BasicSnippet;
const WixSnippet = BasicSnippet;
const SquarespaceSnippet = BasicSnippet;

function Code({ children }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(String(children));
  };
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>Copy</Button>
      </div>
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}

export default function DocsInstallationGuide() {
  // A placeholder function for createPageUrl, assuming it generates paths.
  // In a real application, this would likely be imported from a utility file or context.
  const createPageUrl = (name) => {
    switch (name) {
      case "Dashboard":
        return "/dashboard";
      case "Documentation":
        return "/documentation";
      default:
        return "#"; // Fallback for undefined pages
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto text-base">
      <Breadcrumbs items={[
        { label: "Home", to: createPageUrl("Dashboard") },
        { label: "Documentation", to: createPageUrl("Documentation") },
        { label: "Installation Guide" }
      ]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Installation Guides</h1>
        <p className="text-slate-600 mt-1">Choose your platform and follow the steps below.</p>
      </div>

      {/* Generator */}
      <div className="mb-6">
        <CodeGenerator />
      </div>

      <div className="space-y-10">
        <Card>
          <CardHeader><CardTitle>Basic HTML / JavaScript</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal pl-6 space-y-2 text-slate-700">
              <li>Open your site's HTML template.</li>
              <li>Paste the snippet just before the closing <code className="font-mono">&lt;/head&gt;</code> tag.</li>
              <li>Replace <code className="font-mono">YOUR_TEST_ID</code> with your test's ID.</li>
              <li>Publish/deploy your changes.</li>
            </ol>
            <Code>{BasicSnippet}</Code>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Verify installation</h4>
              <ul className="list-disc pl-6 text-slate-700 space-y-1">
                <li>Open your site and your browser console.</li>
                <li>Run: <code className="px-1 py-0.5 rounded bg-slate-100">typeof quicksig !== 'undefined'</code></li>
                <li>You should see <strong>true</strong>, and variant assignment logs when debug is true.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Common mistakes</h4>
              <ul className="list-disc pl-6 text-slate-700 space-y-1">
                <li>Snippet added after <code className="font-mono">&lt;/head&gt;</code> instead of before it.</li>
                <li>Ad blockers or script blockers preventing the loader from running.</li>
                <li>Using the wrong Test ID or wrong site URL.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>WordPress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal pl-6 space-y-2 text-slate-700">
              <li>Install a header injection plugin like “Insert Headers and Footers” or “WPCode”.</li>
              <li>Open the plugin settings and paste the snippet into the <strong>Header</strong> area.</li>
              <li>Alternatively, add directly to your theme’s <code className="font-mono">header.php</code> before <code className="font-mono">&lt;/head&gt;</code>.</li>
              <li>Save and clear caches if any.</li>
            </ol>
            <Code>{WordPressSnippet}</Code>
            <div className="text-sm text-slate-700">
              <strong>Notes:</strong> Some caching/optimization plugins defer scripts—ensure the loader is not blocked.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Shopify</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal pl-6 space-y-2 text-slate-700">
              <li>Go to Online Store → Themes → Actions → Edit Code.</li>
              <li>Open <code className="font-mono">layout/theme.liquid</code>.</li>
              <li>Paste the snippet just before the closing <code className="font-mono">&lt;/head&gt;</code> tag.</li>
              <li>Save and publish your theme changes.</li>
            </ol>
            <Code>{ShopifySnippet}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Wix</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal pl-6 space-y-2 text-slate-700">
              <li>Go to Settings → Tracking & Analytics → New Tool.</li>
              <li>Select “Custom Code” and paste the snippet.</li>
              <li>Choose “All pages”, “Load code on each new page”, and place it in the <strong>Head</strong>.</li>
              <li>Publish. Note: custom code requires a Premium plan.</li>
            </ol>
            <Code>{WixSnippet}</Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Squarespace</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal pl-6 space-y-2 text-slate-700">
              <li>Go to Settings → Advanced → Code Injection.</li>
              <li>Paste the snippet into the <strong>HEADER</strong> injection area.</li>
              <li>Save. Note: Code Injection is available on Business plans and above.</li>
            </ol>
            <Code>{SquarespaceSnippet}</Code>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
