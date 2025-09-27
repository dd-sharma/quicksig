import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, MousePointer, DollarSign, Type, ShoppingBag, ClipboardList, PlayCircle, Users, Star, Flame, Search } from "lucide-react";

const iconComponents = { Mail, MousePointer, DollarSign, Type, ShoppingBag, ClipboardList, PlayCircle, Users };

export default function TemplateGallery({ templates = [], categories = [], onPreview, onQuickStart, onRequest, defaultCategory = "All" }) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(defaultCategory);

  const filtered = templates.filter(t => {
    const matchesCategory = category === "All" || t.category === category;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end gap-3 mb-6">
          <div className="flex-1">
            <label className="text-sm text-slate-600">Search templates</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" placeholder="Subject lines, pricing, CTA..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="w-full md:w-56">
            <label className="text-sm text-slate-600">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Request a Template</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Template</DialogTitle>
              </DialogHeader>
              <RequestTemplateForm onSubmit={onRequest} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(t => {
            const Icon = iconComponents[t.icon] || Flame;
            return (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Icon className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: t.popularity || 3 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-amber-500" />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm text-slate-600">{t.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Impact: {t.estimatedImpact}</Badge>
                    <Badge variant="outline" className="text-xs">Duration: {t.recommendedDuration}</Badge>
                    <Badge variant="outline" className="text-xs">Min traffic: {t.minTraffic?.toLocaleString()}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => onQuickStart?.(t)}>Quick Start</Button>
                    <Button variant="outline" className="flex-1" onClick={() => onPreview?.(t)}>Preview</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RequestTemplateForm({ onSubmit }) {
  const [value, setValue] = React.useState("");
  return (
    <div className="space-y-3">
      <textarea className="w-full border rounded-md p-2 text-sm" rows={4} placeholder="Describe the scenario you want a template for..." value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex justify-end">
        <Button onClick={() => onSubmit?.(value)} disabled={!value.trim()}>Submit Request</Button>
      </div>
    </div>
  );
}