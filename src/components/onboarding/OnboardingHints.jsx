
import React from "react";
import { Button } from "@/components/ui/button";
import { Lightbulb, X } from "lucide-react";
import { ABTest, User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { normalizeABTest } from "@/components/utils/abtestNormalize";

export default function OnboardingHints() {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const dismissed = localStorage.getItem("qs_hints_dismissed");
        if (dismissed === "1") return;
        const me = await User.me();
        if (!me?.organization_id) return;
        const listRaw = await ABTest.filter({ organization_id: me.organization_id }, "-created_date", 10);
        const tests = (listRaw || []).map(normalizeABTest);
        const running = tests.filter(t => t.test_status === "running");
        const now = Date.now();

        if (tests.length === 0) {
          setMessage({
            text: "👋 Ready to start testing? Create your first A/B test in under 5 minutes",
            cta: "Create a Test",
            to: createPageUrl("TestsNew"),
          });
          setVisible(true);
          return;
        }

        if (running.length > 0) {
          const latest = running[0];
          const started = latest.started_date ? new Date(latest.started_date).getTime() : null;
          if (started && (now - started) < 24 * 60 * 60 * 1000) {
            setMessage({
              text: "⏰ New test! Results will be more reliable after 24 hours",
            });
            setVisible(true);
            return;
          }
        }

        const longRunning = running.find(t => t.started_date && (now - new Date(t.started_date).getTime()) > 30 * 24 * 60 * 60 * 1000);
        if (longRunning) {
          setMessage({
            text: "📅 Long-running test - consider ending it if you have enough data",
          });
          setVisible(true);
          return;
        }
      } catch {
        // ignore
      }
    })();
    // This hint loader should only run once on mount; dependencies intentionally omitted to avoid re-showing hints.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm">
      <div className="bg-slate-900 text-white rounded-lg shadow-xl p-4 flex items-start gap-3">
        <div className="shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-sm">
          <div>{message.text}</div>
          {message.cta && message.to && (
            <div className="mt-3">
              <Link to={message.to}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"> {message.cta} </Button>
              </Link>
            </div>
          )}
        </div>
        <button
          type="button"
          className="ml-auto text-slate-400 hover:text-white"
          onClick={() => { localStorage.setItem("qs_hints_dismissed", "1"); setVisible(false); }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
