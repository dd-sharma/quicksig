
import React, { useState, useEffect, useCallback } from 'react';
import { User, Organization, ActivityLog, ABTest, Variant } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import TestTemplateService from '@/components/services/TestTemplateService';
import TemplatePreview from '@/components/templates/TemplatePreview';
import { SendEmail } from "@/api/integrations";
import { ChevronRight, ChevronLeft, Copy, Download, Mail } from 'lucide-react';
import { dynamicizeTrackingCode } from "@/components/utils/trackingCode";
import { downloadFile } from "@/components/utils/download";

const steps = [
  { id: 1, title: 'Welcome & Goal' },
  { id: 2, title: 'Organization Setup' },
  { id: 3, title: 'Choose Your First Test' },
  { id: 4, title: 'Quick Setup & Launch' },
  { id: 5, title: 'Install Tracking Code' },
];

export default function Onboarding() {
  const navigate = useNavigate();

  // Step control
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Org + user inputs
  const [organizationName, setOrganizationName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [goal, setGoal] = useState('increase_conversions');
  const [industry, setIndustry] = useState('other');
  const [visitors, setVisitors] = useState('under_1k');

  // Template selection and quick setup
  const [templates, setTemplates] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [quickName, setQuickName] = useState('');
  const [quickUrl, setQuickUrl] = useState('');
  const [createdTest, setCreatedTest] = useState(null);

  // Misc
  const [orgId, setOrgId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devEmail, setDevEmail] = useState('');

  useEffect(() => {
    // Load user org and templates
    (async () => {
      const me = await User.me();
      if (me?.organization_id) setOrgId(me.organization_id);

      // Support either .listTemplates() or .templates for service API
      let list = [];
      if (TestTemplateService?.listTemplates) {
        list = await TestTemplateService.listTemplates();
      } else if (Array.isArray(TestTemplateService?.templates)) {
        list = TestTemplateService.templates;
      }
      setTemplates(list);
    })();
  }, []);

  const saveUserProgress = async (data) => {
    await User.updateMyUserData({ onboarding_step: currentStep, ...data });
  };

  const computeEta = () => {
    return Math.max(1, totalSteps - currentStep);
  };

  // Memoize recommendation logic to satisfy eslint exhaustive-deps and avoid unnecessary recalculations
  const recommendTemplates = useCallback(() => {
    if (!templates?.length) return [];
    const goalMap = {
      increase_conversions: ["cta_button", "pricing_page", "landing_headline"],
      improve_engagement: ["email_subject", "social_proof", "form_optimization"],
      test_new_ideas: ["cta_button", "landing_headline", "social_proof", "form_optimization"],
      learn_about_users: ["form_optimization", "landing_headline", "social_proof"]
    };
    const industryBoost = {
      ecommerce: ["product_description", "pricing_page", "social_proof"],
      saas: ["trial_vs_demo", "pricing_page", "landing_headline"],
      media: ["landing_headline", "social_proof", "cta_button"],
      services: ["form_optimization", "landing_headline", "cta_button"],
      other: ["cta_button", "landing_headline", "social_proof"]
    };
    const ids = new Set([...(goalMap[goal] || []), ...(industryBoost[industry] || [])]);
    let recs = templates.filter(t => ids.has(t.id));
    if (visitors === 'under_1k') {
      const quickIds = new Set(["cta_button", "landing_headline", "social_proof"]);
      recs = [...recs].sort((a, b) => (quickIds.has(b.id) - quickIds.has(a.id)) || (b.popularity - a.popularity));
    } else {
      recs = [...recs].sort((a, b) => (b.popularity - a.popularity));
    }
    return recs.slice(0, 4);
  }, [templates, goal, industry, visitors]);

  useEffect(() => {
    setRecommended(recommendTemplates());
  }, [recommendTemplates]);

  // Utility to map a template to test data (fallback if service helper missing)
  const mapTemplateToTest = (t) => {
    if (!t) return null;

    // If service provides a mapper
    if (TestTemplateService?.toTestData) {
      try {
        const mapped = TestTemplateService.toTestData(t, { industry, visitors });
        return mapped;
      } catch (_) {}
    }

    // Fallback mapping
    const defaultMetric = t?.successMetrics?.primary || { type: "click", selector: ".cta" };
    const variants = (t?.variants || []).map((v, idx) => ({
      variant_name: v.name || (idx === 0 ? "Control" : `Variant ${idx}`),
      variant_type: "copy",
      content: v.content || "",
      traffic_percentage: v.allocation ?? Math.round(100 / (t?.variants?.length || 2))
    }));

    return {
      test_name: t?.config?.test_name || `${t?.name || 'A/B Test'}`,
      description: t?.config?.description || t?.description || '',
      test_url: websiteUrl || '',
      success_metric: defaultMetric,
      variants,
      _smart: { estimatedDays: 7 }
    };
  };

  const handleTemplateSelect = async (tpl) => {
    const mapped = mapTemplateToTest(tpl);
    setSelectedTemplate(tpl);
    setQuickName(mapped?.test_name || tpl?.name || 'New A/B Test');
    setQuickUrl(mapped?.test_url || websiteUrl || '');
    await saveUserProgress({ onboarding_goal: goal });
    setCurrentStep(4);
  };

  const openPreview = (tpl) => {
    setPreviewTemplate(tpl);
    setPreviewOpen(true);
  };

  const createOrLaunchTest = async (status = 'running') => {
    if (!selectedTemplate) return;
    setIsLoading(true);
    try {
      const me = await User.me();
      const organizationId = me.organization_id || orgId;

      if (!organizationId) {
        alert("Please complete organization setup first.");
        setCurrentStep(2);
        setIsLoading(false);
        return;
      }

      const mapped = mapTemplateToTest(selectedTemplate);

      const payload = {
        test_name: quickName || mapped.test_name,
        description: mapped.description || '',
        test_url: quickUrl || websiteUrl || '',
        test_type: mapped.test_type,
        success_metric: mapped.success_metric,
        organization_id: organizationId,
        test_status: status,
        started_date: status === 'running' ? new Date().toISOString() : null,
        estimated_days: mapped?._smart?.estimatedDays || 7,
        created_via_onboarding: true
      };

      const test = await ABTest.create(payload);

      // Create variants (best-effort, based on common Variant schema)
      if (Array.isArray(mapped.variants) && mapped.variants.length) {
        for (const v of mapped.variants) {
          await Variant.create({
            ab_test_id: test.id,
            variant_name: v.variant_name,
            variant_type: v.variant_type,
            content: v.content,
            traffic_percentage: v.traffic_percentage
          });
        }
      }

      setCreatedTest(test);

      // Activity log
      await ActivityLog.create({
        user_id: me.id,
        organization_id: organizationId,
        action_description: status === 'running' ? `launched test "${test.test_name}"` : `created draft test "${test.test_name}"`,
        entity_type: 'ABTest',
        entity_id: test.id,
      });

      setCurrentStep(5);
    } finally {
      setIsLoading(false);
    }
  };

  const copySnippet = async () => {
    await navigator.clipboard.writeText(generateSnippet());
    alert("Tracking code copied to clipboard.");
  };

  const downloadSnippet = async () => {
    const js = generateSnippet();
    await downloadFile(js, "quicksig-tracking.js", "text/javascript");
  };

  const emailSnippet = async () => {
    if (!devEmail) return alert("Please enter a developer email first.");
    const me = await User.me();
    await SendEmail({
      to: devEmail,
      subject: "QuickSig Tracking Snippet",
      body: `Hi,\n\nHere is the tracking snippet for QuickSig.\n\n${generateSnippet()}\n\nThanks,\n${me.full_name || "QuickSig User"}`
    });
    alert("Email sent.");
  };

  const generateSnippet = () => {
    const org = orgId || "YOUR_ORG_ID";
    const testId = createdTest?.id || "YOUR_TEST_ID";
    const base = window.location.origin;
    const snippet = `<!-- QuickSig Tracking -->
<script>
  (function(){
    window.QUICKSIG = window.QUICKSIG || {};
    QUICKSIG.init = { orgId: "${org}", testId: "${testId}", baseOrigin: "${base}" };
    // Place your QuickSig loader here
    console.log("QuickSig initialized", QUICKSIG.init);
  })();
</script>`;
    return dynamicizeTrackingCode(snippet);
  };

  // UI
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingProgress step={currentStep} total={totalSteps} etaMinutes={computeEta()} />

      <div className="flex-1 flex items-start justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header: logo only */}
          <div className="flex items-center justify-center mb-8">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8706eb327a0a001504a4a/17d93696f_QuickSig_logo.png"
              alt="QuickSig Logo"
              className="w-[90px] h-[90px]"
            />
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle>Account Setup</CardTitle>
                <span className="text-sm text-slate-500">Step {currentStep} of {totalSteps}</span>
              </div>
              <div className="flex gap-2">
                {steps.map(step => (
                  <div key={step.id} className={`flex-1 h-1 rounded-full ${currentStep >= step.id ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* Step 1: Welcome & Goal */}
              {currentStep === 1 && (
                <div className="space-y-6 py-2">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-2">Welcome to QuickSig!</h2>
                    <p className="text-slate-600">Let's tailor your experience to hit your goals faster.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">What's your primary testing goal?</label>
                    <div className="grid md:grid-cols-2 gap-3">
                      {[
                        { value: 'increase_conversions', label: 'Increase conversions' },
                        { value: 'improve_engagement', label: 'Improve engagement' },
                        { value: 'test_new_ideas', label: 'Test new ideas' },
                        { value: 'learn_about_users', label: 'Learn about my users' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setGoal(opt.value)}
                          className={`p-4 border-2 rounded-lg text-left ${goal === opt.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        await saveUserProgress({ onboarding_goal: goal });
                        setCurrentStep(2);
                      }}
                      size="lg"
                    >
                      Continue <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Organization Setup (enhanced) */}
              {currentStep === 2 && (
                <div className="space-y-6 py-2">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-1">Tell us about your organization</h2>
                    <p className="text-slate-500">This helps us set smart defaults for your tests.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Organization Name</label>
                      <Input id="orgName" placeholder="e.g., Acme Inc." value={organizationName} onChange={e => setOrganizationName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-1">Website URL</label>
                      <Input id="webUrl" type="url" placeholder="https://example.com" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Industry (optional)</label>
                        <Select value={industry} onValueChange={setIndustry}>
                          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ecommerce">E-commerce</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="services">Services</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Monthly visitors (optional)</label>
                        <Select value={visitors} onValueChange={setVisitors}>
                          <SelectTrigger><SelectValue placeholder="Select traffic" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under_1k">Under 1K</SelectItem>
                            <SelectItem value="1k_10k">1K-10K</SelectItem>
                            <SelectItem value="10k_50k">10K-50K</SelectItem>
                            <SelectItem value="50k_plus">50K+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
                    <Button
                      onClick={async () => {
                        if (!organizationName || !websiteUrl) { alert("Please fill in organization name and website."); return; }
                        setIsLoading(true);
                        try {
                          const me = await User.me();
                          let orgCreatedId = orgId;
                          if (!orgCreatedId) {
                            const newOrg = await Organization.create({ name: organizationName, website_url: websiteUrl, owner_id: me.id });
                            orgCreatedId = newOrg.id;
                            setOrgId(orgCreatedId);
                            await ActivityLog.create({
                              user_id: me.id,
                              organization_id: orgCreatedId,
                              action_description: `created organization "${organizationName}"`,
                              entity_type: 'Organization',
                              entity_id: orgCreatedId,
                            });
                          }
                          await User.updateMyUserData({
                            onboarded: false,
                            organization_id: orgCreatedId,
                            onboarding_step: 3,
                            onboarding_goal: goal,
                            industry,
                            monthly_visitors: visitors
                          });
                          setCurrentStep(3);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : <>Continue <ChevronRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Choose Your First Test */}
              {currentStep === 3 && (
                <div className="space-y-6 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">Choose your first test</h2>
                      <p className="text-slate-500">Recommended for your goal and industry.</p>
                    </div>
                    <Button variant="ghost" onClick={() => navigate(createPageUrl('TestsNew'))}>Skip and explore on my own</Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recommended.map(t => (
                      <div key={t.id} className="border rounded-lg p-4 hover:shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{t.name}</div>
                          {(visitors === 'under_1k' && ['cta_button','landing_headline','social_proof'].includes(t.id)) && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Quick Win</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{t.description}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleTemplateSelect(t)}>Use Template</Button>
                          <Button size="sm" variant="outline" onClick={() => openPreview(t)}>Preview</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Quick Setup & Launch */}
              {currentStep === 4 && selectedTemplate && (
                <div className="space-y-6 py-2">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-1">Quick setup</h2>
                    <p className="text-slate-600">We’ve pre-filled the essentials. You can fine-tune later.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Test Name</label>
                      <Input value={quickName} onChange={(e) => setQuickName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Page URL to Test</label>
                      <Input type="url" value={quickUrl} onChange={(e) => setQuickUrl(e.target.value)} placeholder="https://example.com/landing" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="text-sm text-slate-500">
                      Your test will be ready in: <span className="font-medium text-slate-700">~{Math.max(1, 6 - (quickName ? 1 : 0) - (quickUrl ? 1 : 0))} minutes</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCurrentStep(3)}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
                      <Button variant="outline" onClick={() => createOrLaunchTest('draft')} disabled={isLoading}>
                        {isLoading ? 'Saving...' : "I'll add traffic later"}
                      </Button>
                      <Button onClick={() => createOrLaunchTest('running')} disabled={isLoading}>
                        {isLoading ? 'Launching...' : 'Launch test'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Install Tracking Code */}
              {currentStep === 5 && (
                <div className="space-y-6 py-2">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-1">Install the tracking code</h2>
                    <p className="text-slate-600">Add this snippet to your website to start collecting data.</p>
                  </div>

                  <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-xs">
{generateSnippet()}
                  </pre>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={copySnippet} className="gap-2"><Copy className="w-4 h-4" /> Copy</Button>
                    <Button variant="outline" onClick={downloadSnippet} className="gap-2"><Download className="w-4 h-4" /> Download</Button>
                    <div className="flex gap-2 items-center">
                      <Input type="email" placeholder="dev@company.com" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} className="w-56" />
                      <Button variant="outline" onClick={emailSnippet} className="gap-2"><Mail className="w-4 h-4" /> Email to developer</Button>
                    </div>
                    <Button variant="ghost" onClick={() => navigate(createPageUrl('Dashboard'))}>I’ll do this later</Button>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        const now = new Date().toISOString();
                        await User.updateMyUserData({
                          onboarded: true,
                          onboarding_step: 5,
                          onboarding_completed_at: now,
                          onboarding_goal: goal,
                          industry,
                          monthly_visitors: visitors
                        });
                        navigate(createPageUrl('Dashboard'));
                      }}
                    >
                      Finish <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Template Preview */}
      {previewOpen && previewTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-4">
            <TemplatePreview template={previewTemplate} onClose={() => setPreviewOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
