
import React, { useEffect, useMemo, useState } from "react";
import { ABTest, Variant, Visitor, Conversion, User } from "@/api/entities";
import { useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download } from "lucide-react";

function useQuery() { return new URLSearchParams(window.location.search); }

export default function CompareTests() {
  const [tests, setTests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [metrics, setMetrics] = useState({});
  const query = useQuery();

  useEffect(() => {
    (async () => {
      const me = await User.me();
      const list = await ABTest.filter({ organization_id: me.organization_id }, "-created_date");
      setTests(list);
      const ids = (query.get("ids") || "").split(",").filter(Boolean);
      if (ids.length) setSelected(ids.slice(0,3));
    })();
  }, [query]);

  useEffect(() => {
    (async () => {
      const m = {};
      for (const id of selected) {
        const [variants, visitors, conversions] = await Promise.all([
          Variant.filter({ ab_test_id: id }),
          Visitor.filter({ ab_test_id: id }),
          Conversion.filter({ ab_test_id: id })
        ]);
        const totalVisitors = visitors.length;
        const control = variants.find(v => v.variant_type === "control");
        const stats = variants.map(v => {
          const vVisitors = visitors.filter(vi => vi.assigned_variant_id === v.id).length;
          const vConversions = conversions.filter(c => c.variant_id === v.id).length;
          const cr = totalVisitors > 0 ? (vConversions / (vVisitors || 1)) * 100 : 0;
          return { name: v.variant_name, cr: Number(cr.toFixed(2)) };
        });
        m[id] = { totalVisitors, stats };
      }
      setMetrics(m);
    })();
  }, [selected]);

  const chartData = useMemo(() => {
    // Build combined data per variant label across tests
    const labels = new Set();
    selected.forEach(id => (metrics[id]?.stats || []).forEach(s => labels.add(s.name)));
    return Array.from(labels).map(label => {
      const row = { variant: label };
      selected.forEach((id, idx) => {
        const s = (metrics[id]?.stats || []).find(x => x.name === label);
        row[`Test ${idx+1}`] = s ? s.cr : 0;
      });
      return row;
    });
  }, [selected, metrics]);

  const exportCSV = () => {
    const rows = [];
    selected.forEach((id, idx) => {
      const t = tests.find(x => x.id === id);
      rows.push({ Section: `Test ${idx+1}`, Name: t?.test_name || id });
      (metrics[id]?.stats || []).forEach(s => rows.push({ Variant: s.name, "Conversion Rate (%)": s.cr }));
      rows.push({});
    });
    if (rows.length === 0) return;
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g,'""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compare_tests.csv";
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Compare Tests</h1>
        <p className="text-slate-600">Select up to 3 tests to compare side-by-side.</p>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Select tests</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          {[0,1,2].map((i) => (
            <Select
              key={i}
              value={selected[i] || ""}
              onValueChange={(v) => {
                const next = [...selected];
                next[i] = v;
                setSelected(next.filter(Boolean));
              }}
            >
              <SelectTrigger><SelectValue placeholder={`Test ${i+1}`} /></SelectTrigger>
              <SelectContent>
                {tests.map(t => <SelectItem key={t.id} value={t.id}>{t.test_name}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          <div className="flex justify-end sm:col-span-3">
            <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Variant conversion rate comparison</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="variant" />
              <YAxis unit="%" />
              <Tooltip />
              <Legend />
              {selected.map((id, idx) => (
                <Bar key={id} dataKey={`Test ${idx+1}`} fill={["#3b82f6","#10b981","#f59e0b"][idx % 3]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
