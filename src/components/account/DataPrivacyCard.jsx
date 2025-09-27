import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityLog, ABTest, Variant, ConversionEvent, User } from "@/api/entities";

async function exportUserData(currentUser) {
  const orgId = currentUser.organization_id;
  const [tests, variants, conversions, logs] = await Promise.all([
    ABTest.filter({ organization_id: orgId }),
    Variant.filter({}),
    ConversionEvent.filter({}),
    ActivityLog.filter({ user_id: currentUser.id }, "-created_date", 1000)
  ]);

  const payload = {
    user: currentUser,
    tests,
    variants,
    conversions,
    activity: logs
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quicksig_data_export.json";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

export default function DataPrivacyCard({ user, onRequestDeletion }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Data & Privacy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportUserData(user)}>Export My Data</Button>
          <Button variant="destructive" onClick={onRequestDeletion}>Delete Account</Button>
        </div>
        <div className="text-xs text-slate-500">
          You can export all your personal data and request account deletion. Some data may be retained for legal and auditing purposes.
        </div>
      </CardContent>
    </Card>
  );
}