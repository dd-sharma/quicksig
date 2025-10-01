
import React, { useState, useEffect } from 'react';
import { User, ABTest, ActivityLog, Organization, BillingInvoice } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, User as UserIcon, Activity, TestTube, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmailNotificationService from "@/components/services/EmailNotificationService";
import DecisionAnalytics from "@/components/analytics/DecisionAnalytics";
import SubscriptionCard from "@/components/billing/SubscriptionCard";
import PaymentMethodModal from "@/components/billing/PaymentMethodModal";
import BillingHistoryModal from "@/components/billing/BillingHistoryModal";
import PlanComparisonModal from "@/components/billing/PlanComparisonModal";
import APIKeyCard from "@/components/billing/APIKeyCard";
import DataPrivacyCard from "@/components/account/DataPrivacyCard";
import TeamPreviewCard from "@/components/team/TeamPreviewCard";
import QuotaService from "@/components/services/QuotaService";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({ created: 0, active: 0, completed: 0 });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiPrefs, setAiPrefs] = useState({ projections: true, high_conf_threshold: 95, verbosity: "normal", alerts_enabled: true });
  const [hintPrefs, setHintPrefs] = useState({
    hint_frequency: 'medium',
    categories_hidden: []
  });

  // New state variables for billing and organization
  const [organization, setOrganization] = useState(null);
  const [usage, setUsage] = useState({});
  const [showPayment, setShowPayment] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showPlans, setShowPlans] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        
        // Initialize user preferences with defaults if not set
        setUser({
          ...currentUser,
          timezone: currentUser.timezone || "UTC",
          currency_preference: currentUser.currency_preference || "USD",
          language_preference: currentUser.language_preference || "en",
          user_api_key: currentUser.user_api_key || null,
          notification_prefs: currentUser.notification_prefs || {} // Ensure notification_prefs is initialized
        });
        setFullName(currentUser.full_name);

        const userTests = await ABTest.filter({ created_by: currentUser.email });
        setStats({
          created: userTests.length,
          active: userTests.filter(t => t.test_status === 'running').length,
          completed: userTests.filter(t => t.test_status === 'completed').length
        });
        
        const userActivities = await ActivityLog.filter({ user_id: currentUser.id }, '-created_date', 5);
        setActivities(userActivities);

        // init AI prefs safely
        const prefs = currentUser.ai_insights_prefs || {};
        setAiPrefs({
          projections: prefs.projections !== false, // Default to true if not set
          high_conf_threshold: prefs.high_conf_threshold || 95,
          verbosity: prefs.verbosity || "normal",
          alerts_enabled: prefs.alerts_enabled !== false // Default to true if not set
        });

        // initialize hint prefs from user if present
        setHintPrefs({
          hint_frequency: currentUser.hint_frequency || 'medium',
          categories_hidden: currentUser.hint_categories_hidden || []
        });

        // Fetch organization data if user has an organization_id
        if (currentUser.organization_id) {
          const org = await Organization.get(currentUser.organization_id);
          setOrganization(org);
          // FIX: use existing QuotaService method
          const quotas = await QuotaService.getUsageStats(currentUser.organization_id);
          setUsage(quotas);
        }


      } catch (error) {
        console.error("Failed to fetch user data:", error);
        toast.error("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.id]); // Depend on user.id to re-fetch/re-initialize if user changes, e.g., after login/logout


  const handleNameUpdate = async () => {
    if(user.full_name === fullName) return;
    try {
      await User.updateMyUserData({ full_name: fullName });
      setUser(prev => ({ ...prev, full_name: fullName }));
      toast.success("Name updated successfully!");
    } catch (error) {
      console.error("Failed to update name:", error);
      toast.error("Failed to update name.");
    }
  };
  
  const handleNotificationChange = async (pref, value) => {
    try {
      const updatedPrefs = { ...user.notification_prefs, [pref]: value };
      await User.updateMyUserData({ notification_prefs: updatedPrefs });
      setUser(prev => ({...prev, notification_prefs: updatedPrefs}));
      toast.success("Notification preferences updated.");
    } catch (error) {
      console.error("Failed to update notification prefs:", error);
      toast.error("Failed to update notification preferences.");
    }
  };

  const saveAIPrefs = async () => {
    try {
      await User.updateMyUserData({ ai_insights_prefs: aiPrefs });
      toast.success("AI Insights settings saved.");
    } catch (error) {
      console.error("Failed to save AI prefs:", error);
      toast.error("Failed to save AI settings.");
      throw error; // Re-throw to allow Promise.allSettled to catch rejection
    }
  };

  const saveHintPrefs = async () => {
    try {
      await User.updateMyUserData({
        hint_frequency: hintPrefs.hint_frequency,
        hint_categories_hidden: hintPrefs.categories_hidden
      });
      toast.success("Hint preferences saved.");
    } catch (error) {
      console.error("Failed to save hint prefs:", error);
      toast.error("Failed to save hint preferences.");
      throw error; // Re-throw to allow Promise.allSettled to catch rejection
    }
  };

  const resetHints = async () => {
    try {
      await User.updateMyUserData({
        hints_seen: [],
        hints_dismissed: [],
        last_hint_shown_at: null,
        total_hints_shown: 0
      });
      // Assuming these are local storage keys used by a separate hints service
      localStorage.removeItem("qs_hints_seen");
      localStorage.removeItem("qs_hints_dismissed");
      localStorage.removeItem("qs_hints_last_by_category");
      toast.success("Hints reset. You'll start seeing them again.");
    } catch (error) {
      console.error("Failed to reset hints:", error);
      toast.error("Failed to reset hints.");
    }
  };

  const sendTestWeekly = async () => {
    if (!user || !user.organization_id) return;
    try {
      const org = await Organization.get(user.organization_id);
      await EmailNotificationService.sendWeeklySummaryToUser(user, org);
      toast.success("Sent a test weekly summary to your email.");
    } catch (error) {
      console.error("Failed to send test weekly summary:", error);
      toast.error("Failed to send test weekly summary.");
    }
  };

  if (isLoading || !user) { // Ensure user is loaded before rendering UI
    return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500">Manage your account settings and preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-blue-600" />Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-slate-700 p-2 bg-slate-100 rounded-md">{user.email}</p>
            </div>
             <Button onClick={handleNameUpdate}>Update Name</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" />Your Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex justify-between items-center"><span className="text-slate-600">Tests Created</span> <span className="font-bold">{stats.created}</span></div>
             <div className="flex justify-between items-center"><span className="text-slate-600">Active Tests</span> <span className="font-bold">{stats.active}</span></div>
             <div className="flex justify-between items-center"><span className="text-slate-600">Completed Tests</span> <span className="font-bold">{stats.completed}</span></div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
            <CardTitle className="flex items-center gap-2">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label>Test Completions</label>
              <Switch checked={user.notification_prefs?.test_completion ?? false} onCheckedChange={val => handleNotificationChange('test_completion', val)} />
            </div>
            <div className="flex items-center justify-between">
              <label>Statistical Significance Alerts</label>
              <Switch checked={user.notification_prefs?.significance_alerts ?? false} onCheckedChange={val => handleNotificationChange('significance_alerts', val)} />
            </div>
            <div className="flex items-center justify-between">
              <label>Status Changes (pause/resume/archive)</label>
              <Switch checked={user.notification_prefs?.status_changes ?? false} onCheckedChange={val => handleNotificationChange('status_changes', val)} />
            </div>
            <div className="flex items-center justify-between">
              <label>Weekly Summaries</label>
              <Switch checked={user.notification_prefs?.weekly_summary ?? false} onCheckedChange={val => handleNotificationChange('weekly_summary', val)} />
            </div>
            <div className="flex items-center justify-between">
              <label>Team Invitations</label>
              <Switch checked={user.notification_prefs?.team_invitations ?? false} onCheckedChange={val => handleNotificationChange('team_invitations', val)} />
            </div>
            <div className="pt-2">
              <button onClick={sendTestWeekly} className="text-xs text-blue-600 hover:underline">
                Send me a test weekly summary
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>AI Insights Settings</CardTitle>
          <CardDescription>Configure how AI insights are presented.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projections-switch">Show monetary projections</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Enable AI to project potential monetary gains.</span>
              <Switch id="projections-switch" checked={aiPrefs.projections} onCheckedChange={(v) => setAiPrefs(prev => ({ ...prev, projections: v }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confidence-threshold">High confidence threshold</Label>
            <Select value={String(aiPrefs.high_conf_threshold)} onValueChange={(v) => setAiPrefs(prev => ({ ...prev, high_conf_threshold: Number(v) }))}>
              <SelectTrigger id="confidence-threshold" className="w-40"><SelectValue placeholder="Threshold" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90%</SelectItem>
                <SelectItem value="95">95%</SelectItem>
                <SelectItem value="99">99%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">Insights with confidence above this threshold will be highlighted.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbosity-select">Verbosity</Label>
            <Select value={aiPrefs.verbosity} onValueChange={(v) => setAiPrefs(prev => ({ ...prev, verbosity: v }))}>
              <SelectTrigger id="verbosity-select" className="w-40"><SelectValue placeholder="Verbosity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">Control the level of detail in AI-generated insights.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alerts-switch">Alerts enabled</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Receive proactive alerts for significant test outcomes.</span>
              <Switch id="alerts-switch" checked={aiPrefs.alerts_enabled} onCheckedChange={(v) => setAiPrefs(prev => ({ ...prev, alerts_enabled: v }))} />
            </div>
          </div>
          <Button onClick={saveAIPrefs}>Save AI Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hints & Guidance Preferences</CardTitle>
          <CardDescription>Control how often and which categories of hints you see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Hint frequency</label>
              <select
                value={hintPrefs.hint_frequency}
                onChange={(e) => setHintPrefs(prev => ({ ...prev, hint_frequency: e.target.value }))}
                className="mt-1 w-full border rounded-md p-2"
              >
                <option value="high">High</option>
                <option value="medium">Medium (default)</option>
                <option value="low">Low</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Hidden categories</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {["getting_started", "optimization", "advanced_features", "best_practices"].map(cat => {
                  const active = hintPrefs.categories_hidden.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setHintPrefs(prev => ({
                          ...prev,
                          categories_hidden: active
                            ? prev.categories_hidden.filter(c => c !== cat)
                            : [...prev.categories_hidden, cat]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-xs border ${active ? "bg-slate-200" : "bg-white"}`}
                    >
                      {active ? "Hide: " : "Show: "}{cat.replace("_", " ")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={saveHintPrefs}>Save Preferences</button>
            <button className="px-4 py-2 rounded border" onClick={resetHints}>Reset All Hints</button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Testing Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <DecisionAnalytics userId={user?.id} organizationId={user?.organization_id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your last 5 actions in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="space-y-3">
                {activities.map(activity => (
                    <li key={activity.id} className="flex items-center gap-3 text-sm">
                       <div className="p-1.5 bg-slate-100 rounded-full"><Activity className="w-4 h-4 text-slate-500" /></div>
                       <span className="text-slate-700">{activity.action_description}</span>
                       <span className="ml-auto text-slate-400">{format(new Date(activity.created_date), "MMM d, p")}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {organization && (
            <SubscriptionCard
              organization={organization}
              usageStats={usage}
              onManageSubscription={() => setShowPlans(true)}
              onViewBillingHistory={() => setShowBilling(true)}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Timezone</label>
                  <Input value={user.timezone || "UTC"} onChange={(e) => setUser(prev => ({ ...prev, timezone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <Select value={user.currency_preference || "USD"} onValueChange={(v) => setUser(prev => ({ ...prev, currency_preference: v }))}>
                    <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <Select value={user.language_preference || "en"} onValueChange={(v) => setUser(prev => ({ ...prev, language_preference: v }))}>
                    <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={async () => {
                try {
                  await User.updateMyUserData({
                    timezone: user.timezone,
                    currency_preference: user.currency_preference,
                    language_preference: user.language_preference
                  });
                  toast.success("Preferences saved");
                  await ActivityLog.create({
                    user_id: user.id,
                    organization_id: user.organization_id,
                    entity_type: "user",
                    action: "prefs_updated",
                    action_description: "Updated account preferences"
                  });
                } catch (error) {
                  console.error("Failed to save account preferences:", error);
                  toast.error("Failed to save account preferences.");
                }
              }}>Save Preferences</Button>
            </CardContent>
          </Card>

          <DataPrivacyCard
            user={user}
            onRequestDeletion={async () => {
              const ok = confirm("Are you sure? This will request account deletion.");
              if (!ok) return;
              try {
                await User.updateMyUserData({ deletion_requested: true });
                toast.success("Deletion requested. We'll be in touch.");
                await ActivityLog.create({
                  user_id: user.id,
                  organization_id: user.organization_id,
                  entity_type: "user",
                  action: "deletion_requested",
                  action_description: "Requested account deletion"
                });
              } catch (error) {
                console.error("Failed to request deletion:", error);
                toast.error("Failed to request account deletion.");
              }
            }}
          />
        </div>
        <div className="space-y-6">
          <APIKeyCard
            user={user}
            onRegenerate={async () => {
              try {
                const bytes = new Uint8Array(24);
                crypto.getRandomValues(bytes);
                const key = btoa(String.fromCharCode(...bytes)); // This creates a base64 encoded key
                await User.updateMyUserData({ user_api_key: key });
                setUser(prev => ({ ...prev, user_api_key: key }));
                toast.success("API key regenerated");
                await ActivityLog.create({
                  user_id: user.id,
                  organization_id: user.organization_id,
                  entity_type: "user",
                  action: "api_key_regenerated",
                  action_description: "Regenerated API key"
                });
              } catch (error) {
                console.error("Failed to regenerate API key:", error);
                toast.error("Failed to regenerate API key.");
              }
            }}
          />
          {organization && <TeamPreviewCard organization={organization} isAdmin={user?.role === "admin"} />}
          
          {organization && (
            <Card>
              <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-slate-600">
                  {organization?.payment_method?.last4 ? (
                    <>
                      {(organization.payment_method.brand || "Card")} •••• {organization.payment_method.last4} &nbsp;
                      exp {String(organization.payment_method.exp_month || "").padStart(2,"0")}/{organization.payment_method.exp_year || "—"}
                    </>
                  ) : "No payment method on file"}
                </div>
                <Button variant="outline" onClick={() => setShowPayment(true)}>
                  {organization?.payment_method?.last4 ? "Update Card" : "Add Card"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {organization && (
        <>
          <PaymentMethodModal
            open={showPayment}
            onOpenChange={setShowPayment}
            organization={organization}
            onSave={async (pm) => {
              try {
                await Organization.update(organization.id, { payment_method: pm });
                setOrganization(prev => ({ ...prev, payment_method: pm }));
                setShowPayment(false);
                toast.success("Payment method saved");
                await ActivityLog.create({
                  user_id: user.id,
                  organization_id: organization.id,
                  entity_type: "billing",
                  action: "payment_method_updated",
                  action_description: "Updated payment method"
                });
              } catch (error) {
                console.error("Failed to save payment method:", error);
                toast.error("Failed to save payment method.");
              }
            }}
          />

          <BillingHistoryModal
            open={showBilling}
            onOpenChange={setShowBilling}
            organizationId={organization?.id}
          />

          <PlanComparisonModal
            open={showPlans}
            onOpenChange={setShowPlans}
            currentPlan={(organization?.plan_type || organization?.subscription_tier)}
            onSelectPlan={async (p) => {
              try {
                await Organization.update(organization.id, {
                  plan_type: p.key,
                  subscription_tier: p.key,
                  monthly_visitor_quota: p.limits.monthly_visitor_quota,
                  concurrent_test_limit: p.limits.concurrent_test_limit,
                  billing_status: organization.billing_status || "active"
                });
                setOrganization(prev => ({
                  ...prev,
                  plan_type: p.key,
                  subscription_tier: p.key,
                  monthly_visitor_quota: p.limits.monthly_visitor_quota,
                  concurrent_test_limit: p.limits.concurrent_test_limit,
                  billing_status: prev.billing_status || "active"
                }));
                setShowPlans(false);
                toast.success(`Switched to ${p.name}`);
                await ActivityLog.create({
                  user_id: user.id,
                  organization_id: organization.id,
                  entity_type: "billing",
                  action: "plan_changed",
                  action_description: `Changed plan to ${p.name}`
                });
              } catch (error) {
                console.error("Failed to switch plan:", error);
                toast.error("Failed to switch plan.");
              }
            }}
            onStartTrial={async (p) => {
              try {
                const start = new Date();
                const end = new Date(Date.now() + 14*24*60*60*1000); // 14 days from now
                await Organization.update(organization.id, {
                  plan_type: p.key,
                  subscription_tier: p.key,
                  monthly_visitor_quota: p.limits.monthly_visitor_quota,
                  concurrent_test_limit: p.limits.concurrent_test_limit,
                  billing_status: "trial",
                  trial_start_date: start.toISOString(),
                  trial_end_date: end.toISOString(),
                  next_billing_date: end.toISOString()
                });
                setOrganization(prev => ({
                  ...prev,
                  plan_type: p.key,
                  subscription_tier: p.key,
                  monthly_visitor_quota: p.limits.monthly_visitor_quota,
                  concurrent_test_limit: p.limits.concurrent_test_limit,
                  billing_status: "trial",
                  trial_start_date: start.toISOString(),
                  trial_end_date: end.toISOString(),
                  next_billing_date: end.toISOString()
                }));
                setShowPlans(false);
                toast.success(`Started ${p.name} trial`);
                await ActivityLog.create({
                  user_id: user.id,
                  organization_id: organization.id,
                  entity_type: "billing",
                  action: "trial_started",
                  action_description: `Started ${p.name} trial`
                });
              } catch (error) {
                console.error("Failed to start trial:", error);
                toast.error("Failed to start trial.");
              }
            }}
          />
        </>
      )}

      {/* Sticky mobile save bar */}
      <div className="sticky bottom-0 bg-white border-t p-4 md:hidden">
        <Button className="w-full" onClick={async () => {
          // Save multiple preference sections quickly
          // Using Promise.allSettled to ensure all promises are attempted and we can handle individual outcomes
          const results = await Promise.allSettled([
            saveAIPrefs(),
            saveHintPrefs(),
            // Add other save functions here if they become relevant for a global save
          ]);

          // You can add more detailed feedback here based on results if needed
          // For example, if all failed, show a generic error. If some passed and some failed, a mixed message.
          const allSuccessful = results.every(result => result.status === 'fulfilled');
          if (allSuccessful) {
            // toast.success("All preferences saved successfully!"); // Already handled by individual saves
          } else {
            // A toast.error message is already shown by individual save functions,
            // so we might not need an additional generic error here unless we want to consolidate.
            console.warn("Some preferences failed to save.", results);
          }
        }}>
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
