import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from "@/utils";

export default function Unsubscribe() {
  const [status, setStatus] = useState("Processing your request...");
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("u");
    const reason = urlParams.get("reason") || "one-click";
    const emailLogId = urlParams.get("e") || null;

    const go = async () => {
      try {
        // Call backend function to unsubscribe using service role
        const { unsubscribe } = await import("@/api/functions");
        await unsubscribe({ userId, reason, emailLogId });
        setStatus("You're unsubscribed from non-essential emails. You can manage preferences anytime in your profile.");
      } catch {
        setStatus("We couldn't process your request automatically. Please log in and manage preferences in your profile.");
      }
    };
    go();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700">{status}</p>
          <a href={createPageUrl("Profile")} className="text-blue-600 mt-3 inline-block">Go to Profile</a>
        </CardContent>
      </Card>
    </div>
  );
}