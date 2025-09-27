
import React, { useEffect, useState } from "react";
import { User, Project } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Filter, Calendar } from "lucide-react";
import { ExportService } from "@/components/services/ExportService";

export default function ExportCenter() {
  const [me, setMe] = useState(null);
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("summary");
  const [projectId, setProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressNote, setProgressNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const user = await User.me();
        setMe(user);
        const list = await Project.filter({ organization_id: user.organization_id });
        setProjects(list || []);
      } catch {
        setProjects([]);
      }
    })();
  }, []);

  const handleExport = async () => {
    if (!me?.organization_id) return;
    setLoading(true);
    setProgressNote("Preparing export...");
    await ExportService.exportOrganizationData(me.organization_id, { dateFrom, dateTo, status, projectId: projectId || undefined, format });
    setProgressNote("Export ready.");
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Export Center</h1>
        <p className="text-slate-600">Export organization data in multiple formats for analysis and reporting.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm w-24">Status</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-24">Project</span>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All projects</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-24">From</span>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-24">To</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm w-24">Format</span>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue placeholder="Summary" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Consolidated Summary</SelectItem>
                  <SelectItem value="detailed">Detailed Breakdown</SelectItem>
                  <SelectItem value="timeseries">Time Series</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleExport} disabled={loading} className="gap-2">
              <Download className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} /> {loading ? "Exporting..." : "Generate Export"}
            </Button>
            {loading && <span className="text-sm text-slate-500">{progressNote}</span>}
          </div>
          {format === "timeseries" && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Time series export aggregates visitors and conversions by day per test.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-slate-500 mt-4">
        Note: Very large exports may take a while. Email scheduling and background processing are planned features.
      </div>
    </div>
  );
}
