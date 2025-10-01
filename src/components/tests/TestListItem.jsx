
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye,
  MoreVertical,
  Play,
  Pause,
  Archive,
  AlertTriangle,
  Info,
  Users,
  TrendingUp,
  TestTube
} from "lucide-react";
import LongPressContextMenu from "@/components/mobile/LongPressContextMenu";
import { getStatusWarning } from "@/components/tests/TestStatusValidation";

const statusConfig = {
  draft: { color: 'bg-slate-100 text-slate-700 border-slate-200' },
  running: { color: 'bg-green-100 text-green-700 border-green-200' },
  paused: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completed: { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  archived: { color: 'bg-slate-100 text-slate-500 border-slate-200' }
};

export default function TestListItem({
  test,
  isSelected,
  onToggleSelect,
  isUpdating,
  onUpdateStatus,
  onOpenActions
}) {
  const warning = getStatusWarning(test, test.variants);
  const startedMs = test.started_date ? new Date(test.started_date).getTime() : null;
  const daysRunning = startedMs ? Math.floor((Date.now() - startedMs) / (1000 * 60 * 60 * 24)) : 0;
  const status = statusConfig[test.test_status] || statusConfig.draft;

  return (
    <LongPressContextMenu title={test.test_name} onOpen={() => onOpenActions?.(test)}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to={createPageUrl(`TestDetail?id=${test.id}`)}
                  className="text-xl font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {test.test_name}
                </Link>
                <Badge className={`${status.color} border text-xs`}>
                  {test.test_status.charAt(0).toUpperCase() + test.test_status.slice(1)}
                </Badge>
                {test.is_demo_data && (
                  <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs">
                    Demo Data
                  </Badge>
                )}
                {warning && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      warning.type === "warning"
                        ? "border-yellow-500 text-yellow-700"
                        : "border-blue-500 text-blue-700"
                    }`}
                  >
                    {warning.type === "warning" ? (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    ) : (
                      <Info className="w-3 h-3 mr-1" />
                    )}
                    {warning.message}
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 text-sm mb-3">{test.test_url}</p>

              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{test.totalVisitors}</span>
                  <span className="text-slate-500">visitors</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{test.conversionRate}%</span>
                  <span className="text-slate-500">conversion</span>
                </div>
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{test.variantCount}</span>
                  <span className="text-slate-500">variants</span>
                </div>
              </div>

              {test.test_status === "completed" && (
                <div className="mt-3 p-2 bg-emerald-100 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-800">
                      ✅ Ready for decision
                    </span>
                    <Link to={createPageUrl(`TestDetail?id=${test.id}`)}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-700 hover:text-emerald-900"
                      >
                        View & Decide →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {test.test_status === "running" && daysRunning > 30 && (
                <div className="mt-3 p-2 bg-amber-100 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-800">
                      ⏰ Time to decide (30+ days)
                    </span>
                    <Link to={createPageUrl(`TestDetail?id=${test.id}`)}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-700 hover:text-amber-900"
                      >
                        Review →
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link to={createPageUrl(`TestDetail?id=${test.id}`)}>
                <Button variant="outline" size="sm" disabled={test.test_status === "draft"}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Results
                </Button>
              </Link>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isUpdating}
                  onClick={() => onOpenActions?.(test)}
                  className="min-h-[36px] min-w-[36px]"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </LongPressContextMenu>
  );
}
