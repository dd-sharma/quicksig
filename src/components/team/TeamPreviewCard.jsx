import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User as UserEntity } from "@/api/entities";

export default function TeamPreviewCard({ organization, isAdmin }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      if (!isAdmin || !organization?.id) return;
      try {
        const team = await UserEntity.filter({ organization_id: organization.id });
        setCount(team.length || 0);
      } catch {
        setCount(0);
      }
    })();
  }, [organization?.id, isAdmin]);

  if (!isAdmin) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Team Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-slate-600">Team members: <span className="font-medium">{count}</span> / {organization?.member_limit || 3}</div>
        <Link to={createPageUrl("SettingsTeam")}><Button variant="outline">Manage Team</Button></Link>
      </CardContent>
    </Card>
  );
}