import React, { useEffect, useState, useCallback } from "react";
import { VisitorSession, ConversionEvent } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Pause, Play, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed({ testId }) {
  const [items, setItems] = useState([]);
  const [paused, setPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [sessions, conversions] = await Promise.all([
        VisitorSession.filter({ test_id: testId }, "-created_date", 50),
        ConversionEvent.filter({ test_id: testId }, "-created_date", 50),
      ]);

      const sessionItems = sessions.map(s => ({
        type: "session",
        time: new Date(s.created_at || s.created_date),
        text: `Visitor ${String(s.visitor_id).slice(0,8)} viewed ${s.variant_id}`,
        source: s.referrer_source || "Direct"
      }));
      const conversionItems = conversions.map(c => ({
        type: "conversion",
        time: new Date(c.created_at || c.created_date),
        text: `Visitor ${String(c.visitor_id).slice(0,8)} converted on ${c.goal_name} (${c.conversion_value ? `$${c.conversion_value}` : "no value"})`,
        source: ""
      }));

      const merged = [...sessionItems, ...conversionItems]
        .sort((a, b) => b.time - a.time)
        .slice(0, 50);

      setItems(merged);
    } finally {
      setIsRefreshing(false);
    }
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, [paused, load]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Activity Feed</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1" disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPaused(p => !p)}>
            {paused ? <><Play className="w-4 h-4 mr-1" /> Resume</> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className={`p-3 rounded-lg border ${it.type === "conversion" ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm">{it.text}{it.source ? ` • ${it.source}` : ""}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(it.time, { addSuffix: true })}</div>
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-slate-500">No recent activity.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}