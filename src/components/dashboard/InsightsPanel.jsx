import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function InsightsPanel() {
  return (
    <Card className="shadow-sm bg-gradient-to-r from-slate-50 to-white border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          QuickSig Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-700">
          Your headline tests are showing 23% better performance than button color tests.
          Consider prioritizing copy optimization for faster wins this week.
        </p>
      </CardContent>
    </Card>
  );
}