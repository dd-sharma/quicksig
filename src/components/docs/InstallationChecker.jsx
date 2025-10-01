import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function InstallationChecker() {
  const [url, setUrl] = useState("");
  const [checked, setChecked] = useState(false);

  const onCheck = () => {
    // Mock check
    setChecked(true);
  };

  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <div className="font-medium mb-2">Installation Checker (Mock)</div>
      <div className="flex gap-2 mb-3">
        <Input placeholder="https://yourwebsite.com" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={onCheck}>Check Installation</Button>
      </div>
      {checked && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> QuickSig detected</div>
          <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Test ID found: test_ABC123</div>
          <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Variant allocation active</div>
          <div className="text-xs text-slate-500">Note: Actual verification requires server-side checking.</div>
        </div>
      )}
    </div>
  );
}