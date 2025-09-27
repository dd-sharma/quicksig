import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

function Item({ item, positive = true }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-slate-900 mb-1">{item.name}</div>
            <div className="text-sm text-slate-500">
              {item.daysRunning} days • {item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "0%"} confidence
            </div>
          </div>
          <Badge className={`text-xs ${positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
            {positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {item.uplift >= 0 ? `+${item.uplift.toFixed(1)}%` : `${item.uplift.toFixed(1)}%`}
          </Badge>
        </div>
        {item.isWinner && positive && (
          <div className="mt-2 text-xs text-emerald-700 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Winner declared
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WinnersLosers({ winners = [], losers = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Performing Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {winners.length === 0 ? (
            <div className="text-sm text-slate-500">No completed tests with sufficient data yet.</div>
          ) : (
            winners.slice(0, 3).map((w) => <Item key={w.id} item={w} positive />)
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Underperforming Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {losers.length === 0 ? (
            <div className="text-sm text-slate-500">No underperforming tests to show.</div>
          ) : (
            losers.slice(0, 3).map((l) => <Item key={l.id} item={l} positive={false} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}