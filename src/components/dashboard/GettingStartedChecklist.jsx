
import React, { useEffect, useState } from "react";
import { ABTest, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function GettingStartedChecklist() {
  const [testCount, setTestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const me = await User.me();
        if (me?.organization_id) {
          const tests = await ABTest.filter({ organization_id: me.organization_id });
          setTestCount(tests.length || 0);
        } else {
          setTestCount(0);
        }
      } catch {
        setTestCount(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || testCount >= 3) return null;

  const steps = [
    { label: "Account created", done: true },
    { label: "Install tracking code", done: false },
    { label: "Create first test", done: testCount > 0 },
    { label: "Invite team member", done: false },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Complete Your Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={percent} className="mb-4" />
        <ul className="space-y-2 mb-4">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
              <span className={s.done ? "text-slate-700" : "text-slate-600"}>{s.label}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Link to={createPageUrl("TestsNew")}><Button size="sm">Create First Test</Button></Link>
          <Link to={createPageUrl("SettingsTeam")}><Button size="sm" variant="outline">Invite Team</Button></Link>
          <Link to={createPageUrl("DocsInstallationGuide")}><Button size="sm" variant="outline">Get Started Guide</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}
