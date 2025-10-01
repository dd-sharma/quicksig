
import React, { useEffect, useState } from "react";
import { ABTest, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { normalizeABTest } from "@/components/utils/abtestNormalize";

export default function RecentCompletedTests() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        if (!me?.organization_id) return;
        const list = await ABTest.filter({ organization_id: me.organization_id, test_status: "completed" }, "-ended_date", 5);
        const normalizedItems = (list || []).map(normalizeABTest);
        setItems(normalizedItems || []);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Recent Completed Tests</CardTitle>
        <Link to={createPageUrl("TestHistory")}><Button variant="outline" size="sm">View All History →</Button></Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-slate-500">No recently completed tests.</div>
        ) : (
          <ul className="space-y-3">
            {items.map(t => (
              <li key={t.id} className="flex items-center justify-between">
                <Link className="text-blue-600 hover:underline font-medium" to={createPageUrl(`TestDetail?id=${t.id}`)}>
                  {t.name}
                </Link>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t.ended_date ? format(new Date(t.ended_date), "MMM d, yyyy") : "-"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
