import React from "react";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

const items = [
  { title: "Installing on WordPress", duration: "3 min" },
  { title: "Your First A/B Test", duration: "5 min" },
  { title: "Reading Your Results", duration: "4 min" },
];

export default function VideoCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => (
        <div key={it.title} className="border rounded-lg p-3 bg-white">
          <div className="aspect-video bg-slate-100 rounded-md flex items-center justify-center">
            <div className="h-12 w-12 rounded-full bg-slate-300 flex items-center justify-center">
              <Play className="w-6 h-6 text-slate-600" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="font-medium">{it.title}</div>
            <span className="text-xs text-slate-500">{it.duration}</span>
          </div>
          <Badge className="mt-2 bg-slate-200 text-slate-700">Coming Soon</Badge>
        </div>
      ))}
    </div>
  );
}