import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User, ABTest } from "@/api/entities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import TourAnalytics from "@/components/services/TourAnalyticsService";
import {
  Rocket, LayoutDashboard, TrendingUp, PlusCircle, TestTube, Trophy, BarChart3,
  Brain, Lightbulb, Shield, CheckCircle2, ArrowRight, X
} from "lucide-react";

const STEPS = [
  {
    id: 1,
    title: "Welcome to QuickSig! 👋",
    icon: Rocket,
    content: "Let's take 2 minutes to show you how to run your first A/B test and start making data-driven decisions."
  },
  {
    id: 2,
    title: "Your Testing Command Center",
    icon: LayoutDashboard,
    content: "This is your dashboard. See all active tests, recent results, and quick insights at a glance. When you have tests running, you'll see real-time performance here."
  },
  {
    id: 3,
    title: "Creating Tests is Simple",
    icon: PlusCircle,
    content: "Click 'New Test' to start. Choose from templates (CTAs, headlines, pricing) or build custom tests. Our checks help you avoid common mistakes."
  },
  {
    id: 4,
    title: "Results That Make Sense",
    icon: Trophy,
    content: "No statistics degree needed! We translate complex data into clear recommendations: Continue, Stop, or Implement Winner."
  },
  {
    id: 5,
    title: "Your AI Testing Assistant",
    icon: Brain,
    content: "Get personalized recommendations on what to test next and why tests won or lost. Plain-English insights tailored to your data."
  },
  {
    id: 6,
    title: "Built-in Best Practices",
    icon: Shield,
    content: "QuickSig prevents common mistakes automatically: peeking protection, sample size checks, and conflict detection. Run tests with confidence!"
  },
  {
    id: 7,
    title: "Ready to Increase Conversions?",
    icon: CheckCircle2,
    content: "You're all set! Start with a template or create your own test. We're here to help with tooltips, guides, and support."
  }
];

function getStoredStep() {
  const raw = localStorage.getItem("qs_tour_step");
  return raw ? Math.min(Math.max(parseInt(raw, 10) || 1, 1), STEPS.length) : 1;
}
function setStoredStep(step) {
  localStorage.setItem("qs_tour_step", String(step));
}
function setSeen(val) {
  localStorage.setItem("qs_tour_seen", val ? "1" : "0");
}
function hasSeen() {
  return localStorage.getItem("qs_tour_seen") === "1";
}

export default function OnboardingTour() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(getStoredStep());
  const total = STEPS.length;

  const gotoStep = async (s) => {
    const clamped = Math.min(Math.max(s, 1), total);
    setStep(clamped);
    setStoredStep(clamped);
    TourAnalytics.track("tour_step_viewed", { step: clamped });
    try { await User.updateMyUserData({ currentOnboardingStep: clamped }); } catch {}
  };

  const closeTour = async (skipped = false) => {
    setOpen(false);
    if (skipped) {
      TourAnalytics.track("tour_skipped", { step });
      try {
        await User.updateMyUserData({
          hasSeenOnboardingTour: true,
          onboardingTourDismissedAt: new Date().toISOString()
        });
      } catch {}
    }
  };

  const completeTour = async () => {
    setOpen(false);
    setSeen(true);
    TourAnalytics.track("tour_completed");
    try {
      await User.updateMyUserData({
        hasSeenOnboardingTour: true,
        onboardingTourCompletedAt: new Date().toISOString(),
        currentOnboardingStep: total
      });
    } catch {}
  };

  const startTour = async (reset = false) => {
    if (reset) {
      setStoredStep(1);
      setStep(1);
      setSeen(false);
      TourAnalytics.track("tour_restarted");
    } else {
      TourAnalytics.track("tour_started");
    }
    setOpen(true);
    try { await User.updateMyUserData({ hasSeenOnboardingTour: false, currentOnboardingStep: 1 }); } catch {}
  };

  // Auto-show logic on first login if no tests and not seen
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await User.me();
        const tests = me?.organization_id ? await ABTest.filter({ organization_id: me.organization_id }, "-created_date", 1) : [];
        const hasTests = (tests || []).length > 0;
        const userSeen = me?.hasSeenOnboardingTour || hasSeen();
        if (mounted && !hasTests && !userSeen) {
          // delay up to 10s
          setTimeout(() => startTour(false), 800);
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Global triggers
  React.useEffect(() => {
    const handlerStart = () => startTour(false);
    const handlerRestart = () => startTour(true);
    window.addEventListener("qs:tour:start", handlerStart);
    window.addEventListener("qs:tour:restart", handlerRestart);
    return () => {
      window.removeEventListener("qs:tour:start", handlerStart);
      window.removeEventListener("qs:tour:restart", handlerRestart);
    };
  }, []);

  const current = STEPS[step - 1];
  const percent = Math.round((step / total) * 100);
  const Icon = current.icon || Lightbulb;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[640px] w-[95vw] rounded-2xl p-0 overflow-hidden md:p-0">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 w-full" style={{ width: "100%" }} />
        <div className="p-5 sm:p-7">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Icon className="w-5 h-5 text-blue-600" />
              {current.title}
            </DialogTitle>
          </DialogHeader>

          <div className="text-slate-600 mb-4">
            {current.content}
          </div>

          {/* Step visuals */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span>Step {step} of {total}</span>
              <div className="ml-auto">{percent}%</div>
            </div>
            <Progress value={percent} />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="ghost" onClick={() => gotoStep(step - 1)}>Previous</Button>
              )}
              <Button variant="ghost" onClick={() => { setSeen(true); closeTour(true); }}>Skip</Button>
            </div>
            <div className="flex gap-2">
              {step < total && (
                <Button onClick={() => gotoStep(step + 1)}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {step === total && (
                <>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => { completeTour(); navigate(createPageUrl("TestsNew")); }}
                  >
                    Create First Test
                  </Button>
                  <Button variant="outline" onClick={() => { completeTour(); navigate(createPageUrl("Dashboard")); }}>
                    Explore Dashboard
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick links on final step */}
          {step === total && (
            <div className="mt-3 text-xs text-slate-500">
              Prefer templates? Start from our gallery in the New Test flow.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}