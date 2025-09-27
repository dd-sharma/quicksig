
import React from "react";
import { HelpCircle, X, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function HelpWidget() {
  const [open, setOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);

  React.useEffect(() => {
    const m = localStorage.getItem("qs_help_min");
    setMinimized(m === "1");
  }, []);

  const toggleMinimize = () => {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem("qs_help_min", next ? "1" : "0");
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        title="Need Help?"
        className="fixed bottom-4 right-4 z-40 rounded-full bg-blue-600 hover:bg-blue-700 text-white p-3 shadow-lg"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="Need Help?"
        className="fixed bottom-4 right-4 z-40 rounded-full bg-blue-600 hover:bg-blue-700 text-white p-3 shadow-lg"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold text-slate-800">QuickSig Help</div>
            <div className="flex items-center gap-2">
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
              <button className="text-slate-400 hover:text-slate-600" onClick={toggleMinimize} title="Minimize">–</button>
            </div>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="text-slate-500 uppercase text-xs">Popular Articles</div>
            <Link to={createPageUrl("DocsInstallationGuide")} className="block text-blue-700 hover:underline">Installation Guide</Link>
            <Link to={createPageUrl("TestsNew")} className="block text-blue-700 hover:underline">Create Your First Test</Link>
            <Link to={createPageUrl("DocsFAQ")} className="block text-blue-700 hover:underline">Understanding Results</Link>
            <a href="mailto:support@quicksig.co">
              <Button size="sm" variant="outline" className="w-full mt-2">Contact Support</Button>
            </a>
            <Button
              size="sm"
              className="w-full mt-1 bg-slate-900 hover:bg-slate-800"
              onClick={() => window.dispatchEvent(new Event("qs:tour:restart"))}
            >
              <RotateCw className="w-4 h-4 mr-2" /> Restart Product Tour
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
