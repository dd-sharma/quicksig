
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, Clock, Target } from "lucide-react";
import DecisionTrackingService from "@/components/services/DecisionTrackingService";

export default function DecisionAnalytics({ userId, organizationId }) {
  const [userStyle, setUserStyle] = useState(null);
  const [orgPatterns, setOrgPatterns] = useState(null);

  useEffect(() => {
    (async () => {
      if (userId) {
        const style = await DecisionTrackingService.getUserDecisionStyle(userId);
        setUserStyle(style);
        // eslint-disable-next-line no-console
        console.log("[Analytics] User patterns:", style);
      }
      if (organizationId) {
        const patterns = await DecisionTrackingService.getOrganizationPatterns(organizationId);
        setOrgPatterns(patterns);
        // eslint-disable-next-line no-console
        console.log("[Analytics] Org patterns:", patterns);
      }
    })();
  }, [userId, organizationId]);

  if (!userStyle && !orgPatterns) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {userStyle && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Decision Style</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" />
                <span className="text-2xl font-bold capitalize">{userStyle.style}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{userStyle.followRate}% follow rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Avg Decision Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-2xl font-bold">{(userStyle.avgDecisionTime || 0).toFixed(1)}h</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">From viewing to deciding</p>
            </CardContent>
          </Card>
        </>
      )}
      {orgPatterns && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Team Follow Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-2xl font-bold">
                  {orgPatterns.total_decisions > 0
                    ? Math.round((orgPatterns.recommendations_followed / orgPatterns.total_decisions) * 100)
                    : 0}%
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Recommendations followed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Decision Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-2xl font-bold">{(orgPatterns.avg_confidence_at_decision || 0).toFixed(1)}%</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Average when deciding</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
