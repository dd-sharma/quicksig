import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function generateKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export default function APIKeyCard({ user, onRegenerate }) {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>API Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-slate-600">Your personal API key</div>
        <div className="p-2 bg-slate-100 rounded font-mono text-sm break-all">
          {revealed ? (user?.user_api_key || "No key") : "••••••••••••••••••••••••••••••••"}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRevealed(v => !v)}>{revealed ? "Hide" : "Reveal"}</Button>
          <Button onClick={onRegenerate}>Regenerate</Button>
        </div>
        <div className="text-xs text-slate-500">View API documentation in the Docs section.</div>
      </CardContent>
    </Card>
  );
}