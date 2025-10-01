
import React, { useEffect, useState } from "react";
import { ExportLog, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Clock, Calendar } from "lucide-react";
import { ExportService } from "@/components/services/ExportService";

export default function ExportManagement() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const me = await User.me();
      let list = await ExportLog.list("-created_date", 100);
      list = list.filter(l => !me.organization_id || l.organization_id === me.organization_id);
      setLogs(list);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rerun = async (log) => {
    // Best effort: re-run based on type; only org_* supported here
    const me = await User.me();
    if (log.export_type.startsWith("org_")) {
      await ExportService.exportOrganizationData(me.organization_id, {
        ...log.filters, format: log.export_type.replace("org_", "")
      });
    } else {
      alert("Re-run not supported for this export type in this version.");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Export Management</h1>
        <p className="text-slate-600">View history, re-run exports, and manage export preferences.</p>
      </div>

      <Card className="shadow-sm mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduled Exports (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Configure weekly/monthly automated exports and recipients. This is a roadmap feature; UI is provided here for awareness.
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Export History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No exports yet.</TableCell></TableRow>
                ) : logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-sm">{l.export_type}</TableCell>
                    <TableCell className="text-sm">{l.format}</TableCell>
                    <TableCell className="text-sm">{l.filename || "-"}</TableCell>
                    <TableCell className="text-sm">{l.row_count || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => rerun(l)} className="gap-2">
                          <RefreshCw className="w-4 h-4" /> Re-run
                        </Button>
                        <Button size="sm" variant="outline" disabled title="Direct downloads not stored; re-run export to regenerate.">
                          <Download className="w-4 h-4" /> Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Note: Files are not stored; use Re-run to regenerate. Auto-deletion and storage management are roadmap features.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
