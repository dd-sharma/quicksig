import React, { useEffect, useMemo, useState } from "react";
import { ABTest, User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Mail } from "lucide-react";

const platforms = [
  { value: "html", label: "Basic HTML / JavaScript" },
  { value: "wordpress", label: "WordPress" },
  { value: "shopify", label: "Shopify" },
  { value: "wix", label: "Wix" },
  { value: "squarespace", label: "Squarespace" },
];

const baseSnippet = (testId) => `<!-- QuickSig Tracking (Basic) -->
<script>
  window.quicksigConfig = {
    testId: "${testId || "YOUR_TEST_ID"}",
    apiEndpoint: "https://app.quicksig.com/api/track",
    debug: false
  };
</script>
<script async src="https://app.quicksig.com/track.js"></script>`;

const advancedSnippet = (testId) => `<!-- QuickSig Advanced Setup -->
<script>(function(){
  const testId = "${testId || "YOUR_TEST_ID"}";
  let assigned = localStorage.getItem('quicksig_variant_' + testId);
  function assignVariant(variants){
    if (assigned && variants[assigned]) return assigned;
    const r = Math.random() * 100; let cum = 0; let pick = Object.keys(variants)[0];
    for (const [id, cfg] of Object.entries(variants)) { cum += cfg.traffic || 0; if (r <= cum) { pick = id; break; } }
    localStorage.setItem('quicksig_variant_' + testId, pick);
    return pick;
  }
  window.addEventListener('DOMContentLoaded', function(){
    // Example variants object; replace with your own mapping
    const variants = {
      "control_id": { name: "Control", traffic: 50, changes: function(){} },
      "variant_a_id": { name: "Variant A", traffic: 50, changes: function(){
        // Example: document.querySelector('h1').textContent = 'New headline';
      } }
    };
    assigned = assignVariant(variants);
    if (variants[assigned] && typeof variants[assigned].changes === 'function') {
      variants[assigned].changes();
    }
    fetch('https://app.quicksig.com/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      testId, variantId: assigned, event:'variant_assigned', url: location.href, timestamp: new Date().toISOString()
    })}).catch(()=>{});
  });
})();</script>`;

export default function CodeGenerator({ defaultTestId }) {
  const [tests, setTests] = useState([]);
  const [platform, setPlatform] = useState(platforms[0].value);
  const [selectedTestId, setSelectedTestId] = useState(defaultTestId || "");
  const [advanced, setAdvanced] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        const list = await ABTest.filter({ organization_id: me.organization_id });
        const active = list.filter(t => ["running", "draft", "paused"].includes(t.test_status));
        setTests(active);
        if (!defaultTestId && active[0]) setSelectedTestId(active[0].id);
      } catch {
        setTests([]);
      }
    })();
  }, [defaultTestId]);

  const code = useMemo(() => {
    const id = selectedTestId || "YOUR_TEST_ID";
    const base = baseSnippet(id);
    const advancedCode = advancedSnippet(id);
    // Platform-specific wrappers currently share same snippet; can be extended later if needed
    return advanced ? advancedCode : base;
  }, [selectedTestId, advanced]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 1200);
  };

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("QuickSig tracking snippet");
    const body = encodeURIComponent(`Hi developer,

Please install this QuickSig snippet on our site.

Platform: ${platforms.find(p => p.value === platform)?.label}
Test ID: ${selectedTestId || "YOUR_TEST_ID"}

Code:
${code}

Thanks!`);
    return `mailto:support@quicksig.co?subject=${subject}&body=${body}`;
  }, [code, platform, selectedTestId]);

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Generate Your Tracking Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-slate-600 mb-1">Platform</div>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {platforms.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm text-slate-600 mb-1">Choose a Test</div>
            <Select value={selectedTestId} onValueChange={setSelectedTestId}>
              <SelectTrigger><SelectValue placeholder="Select test" /></SelectTrigger>
              <SelectContent>
                {tests.map(t => <SelectItem key={t.id} value={t.id}>{t.test_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <div className="text-sm">
              <div className="font-medium text-slate-800">Advanced Implementation</div>
              <div className="text-xs text-slate-500">Variant code + tracking</div>
            </div>
            <Switch checked={advanced} onCheckedChange={setAdvanced} />
          </div>
        </div>

        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-sm overflow-x-auto">
{code}
          </pre>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" /> {copyLabel}
            </Button>
            <a href={mailtoHref}>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" /> Email to Developer
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}