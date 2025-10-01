import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight } from "lucide-react";

export default function Breadcrumbs({ items }) {
  // items: [{ label, to }] where last item is current page (to optional)
  const rendered = items.map((it, idx) => {
    const isLast = idx === items.length - 1;
    return (
      <span key={idx} className="flex items-center text-sm text-slate-600">
        {isLast || !it.to ? (
          <span className="font-medium text-slate-800">{it.label}</span>
        ) : (
          <Link className="hover:text-blue-600" to={it.to}>{it.label}</Link>
        )}
        {!isLast && <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />}
      </span>
    );
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <div className="flex items-center flex-wrap gap-y-1">{rendered}</div>
    </nav>
  );
}