
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { User } from "@/api/entities";
import QuotaService from "@/components/services/QuotaService";

export default function UsageBadge() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await User.me();
        if (!user?.organization_id) return;
        const s = await QuotaService.getUsageStats(user.organization_id);
        setStats(s);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  if (!stats) return null;

  const percent = Math.min(100, Math.round((stats.visitorsUsed / stats.visitorsQuota) * 100));
  const tone = percent < 70 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : percent < 90 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-red-100 text-red-700 border-red-200";

  return (
    <Badge className={`${tone} border`}>
      {stats.visitorsUsed.toLocaleString()}/{stats.visitorsQuota.toLocaleString()} visitors
    </Badge>
  );
}
