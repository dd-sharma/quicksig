
import React, { useState, useEffect } from 'react';
import { ABTest, Variant, User, Organization } from '@/api/entities';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Plus,
  Trash2,
  Target,
  MousePointer,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QuotaService from "@/components/services/QuotaService";
import UpgradePrompt from "@/components/quota/UpgradePrompt";

import TestTemplateService from "@/components/services/TestTemplateService";
import TemplateGallery from "@/components/templates/TemplateGallery";
import TemplatePreview from "@/components/templates/TemplatePreview";
import TemplateAnalytics from "@/components/services/TemplateAnalyticsService";

import PreFlightChecklist from "@/components/testing/PreFlightChecklist";
import TestQualityScore from "@/components/testing/TestQualityScore";
import LaunchConfirmationDialog from "@/components/dialogs/LaunchConfirmationDialog";
import SampleSizeCalculator from "@/components/calculators/SampleSizeCalculator";
import HelpTooltip from "@/components/ui/HelpTooltip";

import SmartHint from "@/components/hints/SmartHint";
import ProgressiveDisclosureService from "@/components/services/ProgressiveDisclosureService";
import HINT_RULES from "@/components/hints/HintRules";


const steps = [
  { id: 1, title: "What do you want to test?", icon: Target },
  { id: 2, title: "Create your variations", icon: Plus },
  { id: 3, title: "What does success look like?", icon: CheckCircle },
  { id: 4, title: "Ready to launch?", icon: BarChart3 }
];

const testTemplates = [ // This array will be replaced by data from TestTemplateService, but kept as a fallback/example if service fails
  {
    id: 'headline',
    name: 'Headline A/B Test',
    description: 'Test different headlines to see which converts better',
    icon: FileText,
    defaults: {
      test_name: 'Homepage Headline Test',
      description: 'A more compelling headline will increase conversions',
      test_type: 'code_variant',
      success_metric: { type: 'click', description: 'When someone clicks the main CTA button' }
    }
  },
  {
    id: 'button',
    name: 'Button Color Test',
    description: 'Test different button colors and styles',
    icon: MousePointer,
    defaults: {
      test_name: 'CTA Button Color Test',
      description: 'A different button color will improve click rates',
      test_type: 'code_variant',
      success_metric: { type: 'click', description: 'When someone clicks the button' }
    }
  },
  {
    id: 'pricing',
    name: 'Pricing Test',
    description: 'Test different pricing structures or presentations',
    icon: Target,
    defaults: {
      test_name: 'Pricing Page Test',
      description: 'Different pricing presentation will increase conversions',
      test_type: 'url_split',
      success_metric: { type: 'conversion', description: 'When someone completes a purchase' }
    }
  },
  {
    id: 'scratch',
    name: 'Start from Scratch',
    description: 'Create a custom test from the beginning',
    icon: Zap,
    defaults: {}
  }
];

const variantColors = ['bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800'];

export default function TestsNew() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [showTemplates, setShowTemplates] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [testData, setTestData] = useState({
    test_name: '',
    description: '',
    test_url: '',
    test_type: 'url_split',
    success_metric: {
      type: 'click',
      selector: '',
      target_url: '',
      event_name: '',
      description: ''
    },
    variants: [
      { variant_name: 'Original (Control)', variant_type: 'control', content: '', traffic_percentage: 50 }
    ],
    _templateMeta: null // To store info about the template used
  });
  const [errors, setErrors] = useState({});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeUsage, setUpgradeUsage] = useState(null);
  const [upgradeContext, setUpgradeContext] = useState("quota");

  const [canLaunch, setCanLaunch] = useState(false);
  const [preflight, setPreflight] = useState({ requiredIssues: [], recommendedIssues: [], estDurationDays: null });
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [org, setOrg] = useState(null);
  const [hint, setHint] = useState(null);

  useEffect(() => {
    const loadTemplates = async () => {
      const list = await TestTemplateService.listTemplates();
      setTemplates(list);
      setCategories(await TestTemplateService.getCategories());
    };
    loadTemplates();
    // Run only once on mount to fetch static templates; changes handled by user actions afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const me = await User.me();
      if (me?.organization_id) {
        const o = await Organization.get(me.organization_id);
        setOrg(o);
      }
    })();
    // Fetch org once on mount; downstream mutations happen via explicit actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const context = {
          on_page: "TestsNew",
          tests_created: 0,
          tests_without_hypothesis: testData?.description?.trim() ? 0 : 1
        };
        const next = await ProgressiveDisclosureService.getNextHint({ rules: HINT_RULES, context });
        if (next) { await ProgressiveDisclosureService.markShown(next); setHint(next); }
      } catch (error) {
        console.error("Failed to fetch progressive disclosure hint:", error);
      }
    })();
    // Runs when inputs influencing hint eligibility change.
    // currentStep removed to avoid unnecessary hint recalculation as it doesn't directly influence the hint context in a way that needs re-evaluation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testData.description]);

  const applyTemplate = async (template) => {
    // Map to testData structure with smart defaults
    const mapped = TestTemplateService.toTestData(template);
    setTestData(prev => ({
      ...prev,
      ...mapped,
      _templateMeta: { id: template.id, name: template.name, category: template.category }
    }));
    setShowTemplates(false);
    setCurrentStep(1);
    await TemplateAnalytics.track("selected", template, { category: template.category });
  };

  const previewTemplateHandler = async (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
    await TemplateAnalytics.track("viewed", template);
  };

  const addVariant = () => {
    const variantLetter = String.fromCharCode(65 + testData.variants.length - 1); // A, B, C...
    const newVariant = {
      variant_name: `Variant ${variantLetter}`,
      variant_type: 'treatment',
      content: '',
      traffic_percentage: 0
    };
    setTestData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
    redistributeTraffic();
  };

  const removeVariant = (index) => {
    if (testData.variants.length <= 2) return; // Keep at least control + 1 variant
    setTestData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
    redistributeTraffic();
  };

  const updateVariant = (index, field, value) => {
    setTestData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const redistributeTraffic = () => {
    const variantCount = testData.variants.length;
    const equalPercent = Math.floor(100 / variantCount);
    const remainder = 100 - (equalPercent * variantCount);

    setTestData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => ({
        ...variant,
        traffic_percentage: i === 0 ? equalPercent + remainder : equalPercent
      }))
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch(step) {
      case 1:
        if (!testData.test_name) newErrors.test_name = 'Test name is required';
        if (!testData.test_url) newErrors.test_url = 'URL is required';
        break;
      case 2:
        const totalTraffic = testData.variants.reduce((sum, v) => sum + v.traffic_percentage, 0);
        if (Math.abs(totalTraffic - 100) > 0.1) newErrors.traffic = 'Traffic allocation must total 100%';
        break;
      case 3:
        if (!testData.success_metric.type) newErrors.success_metric = 'Please select a success metric';
        // Add specific validation for success metric fields
        if (testData.success_metric.type === 'click' && !testData.success_metric.selector) {
          newErrors.success_metric_selector = 'Click selector is required';
        }
        if ((testData.success_metric.type === 'conversion' || testData.success_metric.type === 'page_visit') && !testData.success_metric.target_url) {
          newErrors.success_metric_target_url = 'Target URL is required';
        }
        if (testData.success_metric.type === 'custom_event' && !testData.success_metric.event_name) {
          newErrors.success_metric_event_name = 'Event name is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // The original saveTest logic, now wrapped
  const _originalSaveTest = async (status = 'draft') => {
    if (!validateStep(currentStep)) return false; // Return false if validation fails

    try {
      const user = await User.me();
      const orgData = await Organization.get(user.organization_id); // Use orgData for quota checks

      if (status === 'running') {
        // Concurrent limit
        const conc = await QuotaService.checkConcurrentTestLimit(orgData.id);
        if (!conc.allowed) {
          const usage = await QuotaService.getUsageStats(orgData.id);
          setUpgradeContext("concurrent");
          setUpgradeUsage({ used: conc.current, total: conc.limit });
          setShowUpgrade(true);
          return false;
        }
        // Visitor quota
        const vq = await QuotaService.checkVisitorQuota(orgData.id);
        if (!vq.allowed) {
          setUpgradeContext("quota");
          setUpgradeUsage(vq);
          setShowUpgrade(true);
          return false;
        }
      }

      const newTest = await ABTest.create({
        ...testData,
        organization_id: orgData.id,
        test_status: status,
        started_date: status === 'running' ? new Date().toISOString() : null,
        estimated_days: preflight.estDurationDays || 7 // Use estimated duration from preflight, fallback to 7
      });

      // Create variants
      for (const variant of testData.variants) {
        await Variant.create({
          ...variant,
          ab_test_id: newTest.id
        });
      }

      navigate(createPageUrl('Tests'));
      return true; // Indicate successful save
    } catch (error) {
      console.error('Failed to save test:', error);
      alert('Failed to save test. Please try again.');
      return false; // Indicate failed save
    }
  };

  // Wrapped saveTest function for analytics
  const handleSaveTest = async (status = 'draft') => {
    const tMeta = testData?._templateMeta;
    let modifiedFields = [];

    // Execute the original save logic first
    const saveSuccessful = await _originalSaveTest(status);

    // Only track analytics if the save was successful AND a template was used
    if (saveSuccessful && tMeta) {
      const tpl = (await TestTemplateService.getById(tMeta.id)) || {};
      const mappedOriginalTemplateData = TestTemplateService.toTestData(tpl);

      if (Object.keys(mappedOriginalTemplateData).length > 0) { // Ensure template data was successfully loaded
        if (testData.test_name !== mappedOriginalTemplateData.test_name) modifiedFields.push("test_name");
        if (testData.test_type !== mappedOriginalTemplateData.test_type) modifiedFields.push("test_type");
        if (JSON.stringify(testData.success_metric) !== JSON.stringify(mappedOriginalTemplateData.success_metric)) modifiedFields.push("success_metric");
        if (testData.variants?.length !== mappedOriginalTemplateData.variants?.length) modifiedFields.push("variants_count");
        else {
          for (let i = 0; i < testData.variants.length; i++) {
            // Compare content of variants, ensuring both exist and match type
            const currentVariantContent = testData.variants[i]?.content;
            const originalVariantContent = mappedOriginalTemplateData.variants?.[i]?.content;
            if (currentVariantContent !== originalVariantContent) {
              modifiedFields.push(`variant_${i+1}_content`);
              break;
            }
          }
        }
      }

      await TemplateAnalytics.track(
        status === 'running' ? 'launched' : 'modified',
        { id: tMeta.id, name: tMeta.name, category: tMeta.category },
        { modified_fields: modifiedFields }
      );
    }
  };

  if (showTemplates) {
    return (
      <>
        <TemplateGallery
          templates={templates}
          categories={categories}
          onQuickStart={applyTemplate}
          onPreview={previewTemplateHandler}
          onRequest={TemplateAnalytics.requestTemplate}
        />
        <TemplatePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          template={previewTemplate}
          onUse={(t) => { setPreviewOpen(false); applyTemplate(t); }}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          {hint && (
            <SmartHint
              hint={hint}
              onDismiss={() => { ProgressiveDisclosureService.dismiss(hint.id); setHint(null); }}
              style={hint.style || "banner"}
            />
          )}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-slate-900">Create A/B Test</h1>
              <Button variant="outline" onClick={() => navigate(createPageUrl('Tests'))}>
                Cancel
              </Button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    currentStep === index + 1
                      ? 'bg-blue-100 text-blue-700'
                      : currentStep > index + 1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <step.icon className="w-4 h-4" />
                    <span className="hidden md:block">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-400 mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-8">
              <TooltipProvider>
                {/* Step 1: What do you want to test? */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-semibold text-slate-900 mb-2">What do you want to test?</h2>
                      <p className="text-slate-600">Let's start with the basics of your A/B test</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Test Name
                          <HelpTooltip side="right" content="Give your test a memorable name so you can find it later" />
                        </label>
                        <Input
                          placeholder="e.g., Homepage Headline Test"
                          value={testData.test_name}
                          onChange={(e) => setTestData(prev => ({ ...prev, test_name: e.target.value }))}
                          className={errors.test_name ? 'border-red-500' : ''}
                        />
                        {errors.test_name && <p className="text-red-500 text-sm mt-1">{errors.test_name}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Hypothesis (Optional)
                          <HelpTooltip side="right" content="What do you think will happen? This helps you learn from every test" />
                        </label>
                        <Textarea
                          placeholder="What do you think will happen? e.g., 'A shorter headline will increase signups'"
                          value={testData.description}
                          onChange={(e) => setTestData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Page URL to Test
                          <HelpTooltip side="right" content="The exact page where your test will run. Must match exactly." />
                          <Link to={createPageUrl("DocsInstallationGuide")} className="ml-2 inline-flex items-center text-blue-600 hover:underline">
                            <HelpCircle className="w-3.5 h-3.5 mr-1" /> Help
                          </Link>
                        </label>
                        <Input
                          type="url"
                          placeholder="https://yoursite.com/page-to-test"
                          value={testData.test_url}
                          onChange={(e) => setTestData(prev => ({ ...prev, test_url: e.target.value }))}
                          className={errors.test_url ? 'border-red-500' : ''}
                        />
                        {errors.test_url && <p className="text-red-500 text-sm mt-1">{errors.test_url}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Test Type</label>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              testData.test_type === 'url_split' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => setTestData(prev => ({ ...prev, test_type: 'url_split' }))}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <div>
                                <h3 className="font-medium">Test Different URLs</h3>
                                <p className="text-sm text-slate-600">Compare completely different pages</p>
                              </div>
                            </div>
                          </div>
                          <div
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              testData.test_type === 'code_variant' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => setTestData(prev => ({ ...prev, test_type: 'code_variant' }))}
                          >
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5 text-blue-600" />
                              <div>
                                <h3 className="font-medium">Test Page Changes</h3>
                                <p className="text-sm text-slate-600">Test variations on the same page</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={nextStep} size="lg">
                        Continue <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Create your variations */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-semibold text-slate-900 mb-2">Create your variations</h2>
                      <p className="text-slate-600">Set up the different versions you want to test</p>
                    </div>

                    <div className="space-y-4">
                      {testData.variants.map((variant, index) => (
                        <Card key={index} className="bg-slate-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <Input
                                value={variant.variant_name}
                                onChange={(e) => updateVariant(index, 'variant_name', e.target.value)}
                                className="font-medium bg-white"
                              />
                              {index > 0 && (
                                <Button variant="ghost" size="icon" onClick={() => removeVariant(index)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                  {testData.test_type === 'url_split' ? 'URL' : 'Content/Code'}
                                  <HelpTooltip side="right" content={testData.test_type === 'url_split' ? "The URL for this version of the page" : "Describe changes or paste a code snippet to apply"} />
                                </label>
                                {testData.test_type === 'url_split' ? (
                                  <Input
                                    type="url"
                                    placeholder="https://yoursite.com/variant-page"
                                    value={variant.content}
                                    onChange={(e) => updateVariant(index, 'content', e.target.value)}
                                  />
                                ) : (
                                  <Textarea
                                    placeholder="Describe the changes or paste code snippet"
                                    value={variant.content}
                                    onChange={(e) => updateVariant(index, 'content', e.target.value)}
                                    rows={3}
                                  />
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                  Traffic %
                                  <HelpTooltip side="right" content="What percentage of visitors see this version? 50/50 is standard." />
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={variant.traffic_percentage}
                                  onChange={(e) => updateVariant(index, 'traffic_percentage', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Traffic Distribution Visual */}
                    <Card className="bg-blue-50">
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-3">Traffic Distribution</h3>
                        <div className="flex h-6 rounded-lg overflow-hidden">
                          {testData.variants.map((variant, index) => (
                            <div
                              key={index}
                              style={{ width: `${variant.traffic_percentage}%` }}
                              className={`${
                                index === 0 ? 'bg-slate-600' : variantColors[Math.min(index - 1, variantColors.length - 1)]
                              } flex items-center justify-center text-white text-xs font-medium`}
                            >
                              {variant.traffic_percentage}%
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-600">
                          {testData.variants.map((variant, index) => (
                            <span key={index}>{variant.variant_name}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {errors.traffic && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600 text-sm">{errors.traffic}</span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={addVariant}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variation
                      </Button>
                      <Button variant="outline" onClick={redistributeTraffic}>
                        Split Traffic Evenly
                      </Button>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button onClick={nextStep} size="lg">
                        Continue <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Success Metrics */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-semibold text-slate-900 mb-2">What does success look like?</h2>
                      <p className="text-slate-600">Define what you want to measure and improve</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {[
                        { type: 'click', icon: MousePointer, title: 'Someone clicks something', desc: 'Track button or link clicks', tooltip: "Track button clicks, link clicks, or any clickable element" },
                        { type: 'conversion', icon: Target, title: 'Someone completes an action', desc: 'Track form submissions or purchases', tooltip: "Track when visitors reach a specific page (like a thank you page)" },
                        { type: 'page_visit', icon: FileText, title: 'Someone visits a page', desc: 'Track thank you or success pages', tooltip: "Track when visitors reach a specific page (like a thank you page)" },
                        { type: 'custom_event', icon: Zap, title: 'Something custom happens', desc: 'Track custom events (advanced)', tooltip: "Track any custom action you’ve programmed (requires implementation)" }
                      ].map((goal) => (
                        <div
                          key={goal.type}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            testData.success_metric.type === goal.type ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => {
                            setTestData(prev => ({
                              ...prev,
                              success_metric: { ...prev.success_metric, type: goal.type, selector: '', target_url: '', event_name: '' }
                            }));
                            setErrors(prev => ({ ...prev, success_metric: '', success_metric_selector: '', success_metric_target_url: '', success_metric_event_name: '' }));
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <goal.icon className="w-5 h-5 text-blue-600" />
                            <div>
                              <h3 className="font-medium">{goal.title}</h3>
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                {goal.desc}
                                <HelpTooltip side="right" content={goal.tooltip} />
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.success_metric && <p className="text-red-500 text-sm mt-1">{errors.success_metric}</p>}

                    {/* Goal Configuration */}
                    {testData.success_metric.type === 'click' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">What should they click?</label>
                        <Input
                          placeholder="e.g., .buy-button, #signup-btn, or 'Buy Now' button"
                          value={testData.success_metric.selector}
                          onChange={(e) => setTestData(prev => ({
                            ...prev,
                            success_metric: { ...prev.success_metric, selector: e.target.value }
                          }))}
                          className={errors.success_metric_selector ? 'border-red-500' : ''}
                        />
                        <p className="text-xs text-slate-500 mt-1">Use CSS selectors or describe the element</p>
                        {errors.success_metric_selector && <p className="text-red-500 text-sm mt-1">{errors.success_metric_selector}</p>}
                      </div>
                    )}

                    {(testData.success_metric.type === 'conversion' || testData.success_metric.type === 'page_visit') && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          {testData.success_metric.type === 'conversion' ? 'What page shows success?' : 'What page means success?'}
                        </label>
                        <Input
                          type="url"
                          placeholder="https://yoursite.com/thank-you"
                          value={testData.success_metric.target_url}
                          onChange={(e) => setTestData(prev => ({
                            ...prev,
                            success_metric: { ...prev.success_metric, target_url: e.target.value }
                          }))}
                          className={errors.success_metric_target_url ? 'border-red-500' : ''}
                        />
                        {errors.success_metric_target_url && <p className="text-red-500 text-sm mt-1">{errors.success_metric_target_url}</p>}
                      </div>
                    )}

                    {testData.success_metric.type === 'custom_event' && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Event name to track</label>
                        <Input
                          placeholder="e.g., purchase_completed, signup_started"
                          value={testData.success_metric.event_name}
                          onChange={(e) => setTestData(prev => ({
                            ...prev,
                            success_metric: { ...prev.success_metric, event_name: e.target.value }
                          }))}
                          className={errors.success_metric_event_name ? 'border-red-500' : ''}
                        />
                        {errors.success_metric_event_name && <p className="text-red-500 text-sm mt-1">{errors.success_metric_event_name}</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-1 mt-6">
                      <SampleSizeCalculator />
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button onClick={nextStep} size="lg">
                        Continue <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Ready to Launch */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-semibold text-slate-900 mb-2">Ready to launch?</h2>
                      <p className="text-slate-600">Review your test setup before going live</p>
                    </div>

                    {/* Test Summary */}
                    <Card className="bg-blue-50">
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4">Test Summary</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Testing:</span> {testData.test_name}</p>
                          <p><span className="font-medium">URL:</span> {testData.test_url}</p>
                          <p><span className="font-medium">Variations:</span> {testData.variants.length} versions</p>
                          <p><span className="font-medium">Success metric:</span> {testData.success_metric.type}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <PreFlightChecklist
                      testData={testData}
                      variants={testData.variants}
                      organizationId={org?.id}
                      excludeTestId={null}
                      onValidationChange={(res) => {
                        setCanLaunch(res.requiredPass);
                        setPreflight(res);
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <TestQualityScore
                        testData={testData}
                        variants={testData.variants}
                        conflicts={[]}
                        estDurationDays={preflight.estDurationDays}
                        hypothesisPresent={(testData?.description || "").trim().length > 0}
                      />
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Quality score</span>
                        <HelpTooltip side="right" content="Based on hypothesis clarity, naming, sample size, conflicts, documentation, and metric clarity" />
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Estimated duration</span>
                        <HelpTooltip side="right" content="Depends on your traffic, baseline conversion rate, and minimum detectable effect" />
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Tip: 50/50 split often yields faster significance.
                      </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={prevStep}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => handleSaveTest('draft')}>
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => setShowLaunchConfirm(true)}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!canLaunch && org?.strict_mode_enabled}
                          title={!canLaunch && org?.strict_mode_enabled ? "Resolve required issues to launch (strict mode)" : ""}
                        >
                          Launch Test 🚀
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>
      </div>
      <UpgradePrompt
        visible={showUpgrade}
        usage={upgradeUsage}
        context={upgradeContext}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => navigate(createPageUrl('PlanManagement'))}
      />
      <LaunchConfirmationDialog
        open={showLaunchConfirm}
        onOpenChange={setShowLaunchConfirm}
        summary={{ ...testData, estDurationDays: preflight.estDurationDays }}
        canLaunch={canLaunch || !org?.strict_mode_enabled}
        onLaunch={async () => {
          setShowLaunchConfirm(false);
          await handleSaveTest('running');
        }}
        onDraft={async () => {
          setShowLaunchConfirm(false);
          await handleSaveTest('draft');
        }}
      />
    </>
  );
}
