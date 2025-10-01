import React, { useState, useEffect, useCallback } from 'react';
import { ABTest, Variant, Visitor, Conversion, User, ActivityLog, VisitorSession, ConversionEvent, Organization } from '@/api/entities';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import DateRangePicker from "@/components/ui/DateRangePicker";
import HelpTooltip from "@/components/ui/HelpTooltip";
import { dynamicizeTrackingCode } from "@/components/utils/trackingCode"; // Added import
import {
  ArrowLeft,
  Play,
  Pause,
  Archive,
  AlertCircle,
  Code,
  BarChart3,
  Zap,
  Trophy,
  AlertTriangle,
  Info,
  RefreshCw,
  Download,
  Brain,
  TrendingUp, // Added for 'approachingSig' case
  TrendingDown // Added for 'negativeCase' case
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from 'date-fns';
import { validateStatusTransition, getStatusWarning, logStatusChange } from '@/components/tests/TestStatusValidation';
import StatusConfirmationDialog from '@/components/tests/StatusConfirmationDialog';
import TestTimeline from '@/components/tests/TestTimeline';
import TestNotes from "@/components/tests/TestNotes";
import { toast } from 'sonner';
import {
  calculateConversionRate,
  calculateConfidenceLevel,
  determineWinner,
  calculateUplift,
} from '@/components/results/ResultsCalculator';
import ResultsSummaryCard from '@/components/results/ResultsSummaryCard';
import ResultsChart from '@/components/results/ResultsChart';
import StatisticalDetailsPanel from "@/components/results/StatisticalDetailsPanel";
import StatisticalSignificanceCalculator from "@/components/results/StatisticalSignificanceCalculator";
import SampleSizeCalculator from "@/components/results/SampleSizeCalculator";
import StatisticsGuide from "@/components/results/StatisticsGuide";
import VisitorTrackingTable from "@/components/tracking/VisitorTrackingTable";
import ConversionEventsTable from "@/components/tracking/ConversionEventsTable";
import ActivityFeed from "@/components/tracking/ActivityFeed";
import TrackingAnalytics from "@/components/tracking/TrackingAnalytics";
import SegmentationView from "@/components/results/SegmentationView";
import QuotaService from "@/components/services/QuotaService";
import UpgradePrompt from "@/components/quota/UpgradePrompt";
import InterpretationsCard from "@/components/ai/InterpretationsCard";
import EmailNotificationService from "@/components/services/EmailNotificationService";
import ExportService from '@/components/services/ExportService';
import ResultsLock from "@/components/testing/ResultsLock";
import SRMDetector from "@/components/monitoring/SRMDetector";
import TestHealthMonitor from "@/components/monitoring/TestHealthMonitor";
import SmartHint from "@/components/hints/SmartHint";
import ProgressiveDisclosureService from "@/components/services/ProgressiveDisclosureService";
import HINT_RULES from "@/components/hints/HintRules";
import DecisionTooltip from "@/components/decision/DecisionTooltip";
import DecisionTrackingService from "@/components/services/DecisionTrackingService";

export default function TestDetail() {
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [variants, setVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [isUpdating, setIsUpdating] = useState(false);
  const [activities, setActivities] = useState([]);
  const [user, setUser] = useState(null);
  const [results, setResults] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showUpgrade, setShowUpgrade] = React.useState(false);
  const [upgradeUsage, setUpgradeUsage] = React.useState(null);
  const [upgradeContext, setUpgradeContext] = React.useState("quota");
  const [dateRange, setDateRange] = React.useState({ start: null, end: null });
  const [hint, setHint] = useState(null);
  const [lastRecommendation, setLastRecommendation] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('id');

  const escapeJsString = useCallback((str) => {
    return str ? String(str).replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') : '';
  }, []);

  const fetchTestData = useCallback(async () => {
    if (!testId) return;
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const testData = await ABTest.get(testId);
      const variantData = await Variant.filter({ ab_test_id: testId });

      const visitors = await Visitor.filter({ 
        ab_test_id: testId,
        startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
        endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
      });
      const conversions = await Conversion.filter({ 
        ab_test_id: testId,
        startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
        endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
      });
      
      const variantsWithStats = variantData.map(variant => {
        const variantVisitors = visitors.filter(v => v.assigned_variant_id === variant.id);
        const variantConversions = conversions.filter(c => c.variant_id === variant.id);
        const conversion_rate = calculateConversionRate(variantVisitors.length, variantConversions.length);
        return {
          ...variant,
          visitor_count: variantVisitors.length,
          conversion_count: variantConversions.length,
          conversion_rate
        };
      });

      const testActivities = await ActivityLog.filter(
        { entity_type: 'ABTest', entity_id: testId },
        '-created_date',
        20
      );
      
      setTest(testData);
      setVariants(variantsWithStats);
      setActivities(testActivities);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch test data:', error);
      toast.error('Failed to fetch test data.');
    } finally {
      setIsLoading(false);
    }
  }, [testId, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchTestData();
  }, [fetchTestData]);
  
  useEffect(() => {
    if (!variants || variants.length === 0 || !test) return;

    const control = variants.find(v => v.variant_type === 'control');
    if (!control) {
      setResults(null);
      return;
    }
    
    const variantsWithCalcs = variants.map(v => {
      if (v.id === control.id) return { ...v, uplift: 0, confidence: 0.5 };
      return {
        ...v,
        uplift: calculateUplift(control, v),
        confidence: calculateConfidenceLevel(control, v)
      };
    });

    const winner = determineWinner(variantsWithCalcs);
    const totalVisitors = variants.reduce((sum, v) => sum + v.visitor_count, 0);
    const bestPerformer = variantsWithCalcs.reduce((best, v) => v.conversion_rate > best.conversion_rate ? v : best, variantsWithCalcs[0]);

    let recommendation = { type: 'continue', message: 'Not enough data yet. Aim for at least 100 visitors per variant.' };
    if (winner) {
      recommendation = { type: 'winner', message: `${winner.variant_name} is a clear winner with ${(winner.confidence * 100).toFixed(0)}% confidence.` };
    } else if (totalVisitors > 200 && bestPerformer.confidence < 0.95 && test.test_status === 'running') {
      recommendation = { type: 'inconclusive', message: 'No clear winner detected. Variants are performing similarly.' };
    } else if (totalVisitors > 100 && bestPerformer.conversion_rate > control.conversion_rate && !winner) {
      recommendation.message = `${bestPerformer.variant_name} is trending with a ${bestPerformer.uplift.toFixed(0)}% uplift, but more data is needed for statistical significance.`;
    } else if (test.test_status === 'completed' || test.test_status === 'archived') {
      if (winner) {
        recommendation = { type: 'winner', message: `${winner.variant_name} was the clear winner with ${(winner.confidence * 100).toFixed(0)}% confidence.` };
      } else {
        recommendation = { type: 'inconclusive', message: 'The test concluded without a clear winner. Variants performed similarly.' };
      }
    }

    setResults({
      summary: {
        duration: test.started_date ? differenceInDays(new Date(), new Date(test.started_date)) : 0,
        totalVisitors,
        bestPerformer,
        confidence: bestPerformer?.confidence || 0,
        isLive: test.test_status === 'running',
        recommendation,
      },
      variants: variantsWithCalcs,
      winner
    });

  }, [variants, test]);

  useEffect(() => {
    (async () => {
      if (!test) return;
      const context = {
        on_page: "TestDetail",
        first_test_has_results: true,
        confidence: results?.summary?.confidence || 0,
        never_used_segmentation: false
      };
      const next = await ProgressiveDisclosureService.getNextHint({ rules: HINT_RULES, context });
      if (next) { await ProgressiveDisclosureService.markShown(next); setHint(next); }
    })();
  }, [results?.summary?.confidence, test?.id]);

  const updateTestStatus = useCallback(async (newStatus, skipConfirmation = false) => {
    if (!test || isUpdating) return;

    // Restrict in demo mode
    if (test?.is_demo_data) {
      toast("Demo Mode", { description: "Demo tests cannot be modified. Create a real test to make changes." });
      return;
    }

    const validation = validateStatusTransition(test.test_status, newStatus, variants);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    if (newStatus === 'running') {
      const currentUser = await User.me();
      const org = await Organization.get(currentUser.organization_id);
      const [conc, vq] = await Promise.all([
        QuotaService.checkConcurrentTestLimit(org.id),
        QuotaService.checkVisitorQuota(org.id)
      ]);

      if (!conc.allowed) {
        setUpgradeContext("concurrent");
        setUpgradeUsage({ used: conc.current, total: conc.limit });
        setShowUpgrade(true);
        return;
      }
      if (!vq.allowed) {
        setUpgradeContext("quota");
        setUpgradeUsage(vq);
        setShowUpgrade(true);
        return;
      }
    }

    const needsConfirmation = ['completed', 'archived', 'running'].includes(newStatus);
    if (needsConfirmation && !skipConfirmation) {
      setConfirmDialog({
        isOpen: true,
        newStatus,
        oldStatus: test.test_status
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = { test_status: newStatus };
      if (newStatus === 'running') {
        updateData.started_date = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.ended_date = new Date().toISOString();
      } else if (newStatus === 'archived') {
        updateData.is_archived = true;
        updateData.archived_at = new Date().toISOString();
        updateData.archived_by = user?.id || null;
      }
      
      await ABTest.update(testId, updateData);
      
      if (user) {
        await logStatusChange(user, test, test.test_status, newStatus);
      }
      
      setTest(prev => ({ ...prev, ...updateData }));

      await EmailNotificationService.handleStatusChange({ ...test, ...updateData }, newStatus, user);

      const messages = {
        running: 'Test started successfully',
        paused: 'Test has been paused',
        completed: 'Test completed successfully', 
        archived: 'Test has been archived'
      };
      toast.success(messages[newStatus] || 'Test status updated');
      
      const updatedActivities = await ActivityLog.filter(
        { entity_type: 'ABTest', entity_id: testId },
        '-created_date',
        20
      );
      setActivities(updatedActivities);
      fetchTestData();

      const rec = lastRecommendation;
      let followed = null;
      if (rec?.title) {
        if (/implement|stop/i.test(rec.title)) {
          followed = (newStatus === 'completed' || newStatus === 'archived');
        } else if (/continue|gather/i.test(rec.title)) {
          followed = (newStatus === 'running' || newStatus === 'paused');
        }
      }
      await DecisionTrackingService.trackDecisionMade(testId, newStatus, rec, followed);

    } catch (error) {
      console.error('Failed to update test status:', error);
      toast.error('Failed to update test status');
    } finally {
      setIsUpdating(false);
      setConfirmDialog({ isOpen: false });
    }
  }, [test, variants, testId, user, isUpdating, fetchTestData, lastRecommendation]); 

  const implementWinner = useCallback(async () => {
    await updateTestStatus('completed');
    await DecisionTrackingService.trackDecisionMade(testId, 'completed', lastRecommendation, true);
  }, [updateTestStatus, testId, lastRecommendation]);

  const confidencePct = results?.summary?.confidence ? Math.round((results.summary.confidence || 0) * 100) : 0;
  const daysRunning = test?.started_date ? differenceInDays(new Date(), new Date(test.started_date)) : 0;
  const winnerName = results?.winner?.variant_name || null;
  const winnerUplift = (() => {
    if (!results?.variants || !results?.winner) return 0;
    const w = results.variants.find(v => v.id === results.winner.id);
    return w && typeof w.uplift === "number" ? Math.round(w.uplift) : 0;
  })();

  const totalVisitorsForContext = results?.summary?.totalVisitors != null
    ? results.summary.totalVisitors
    : variants.reduce((sum, v) => sum + (v.visitor_count || 0), 0);
  const daysRunningForContext = test?.started_date ? Math.max(1, differenceInDays(new Date(), new Date(test.started_date))) : 1;
  const dailyVisitors = Math.max(1, Math.round(totalVisitorsForContext / Math.max(1, daysRunningForContext)));
  const baselineCR = (() => {
    const control = variants.find(v => v.variant_type === "control");
    const rate = control?.conversion_rate;
    if (typeof rate === "number" && !Number.isNaN(rate)) return rate / 100;
    return 0.03;
  })();
  const defaultMDE = 0.05;

  const isWinnerPositive = winnerUplift > 0 && confidencePct >= 95 && test?.test_status === 'running';

  const negativeCase = (() => {
    if (!results?.variants) return { active: false, uplift: 0 };
    const control = results.variants.find(v => v.variant_type === "control");
    const worstTreatment = results.variants
      .filter(v => v.variant_type !== "control")
      .reduce((min, v) => (v.uplift < min.uplift ? v : min), { uplift: 0, confidence: 0 });
    
    const isNegative = worstTreatment && (worstTreatment?.uplift || 0) < 0 && (worstTreatment?.confidence || 0) >= 0.90 && results.summary?.isLive;
    return { active: !!isNegative, uplift: Math.round(worstTreatment?.uplift || 0) };
  })();

  const approachingSig = !isWinnerPositive && confidencePct >= 85 && confidencePct < 95 && results?.summary?.isLive;
  const stagnating = results?.summary?.isLive && (daysRunning > 30) && confidencePct < 85;

  const testContext = {
    test_id: testId,
    test_name: test?.test_name,
    status: test?.test_status,
    confidence: confidencePct,
    visitors: totalVisitorsForContext,
    test_duration: daysRunningForContext,
    variant_count: results?.variants?.length || 2,
    daily_visitors: dailyVisitors,
    baseline_cr: baselineCR,
    mde: defaultMDE,
    average_order_value: Number(test?.average_order_value || 50),
    monthly_visitors: dailyVisitors * 30,
    uplift: Number(winnerUplift || 0)
  };

  const resultsUnlocked = (results?.summary?.totalVisitors || 0) > 0 && test?.test_status !== 'completed' && test?.test_status !== 'archived';

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!test || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 's':
          if (test.test_status === 'draft' || test.test_status === 'paused') {
            e.preventDefault();
            updateTestStatus('running');
          }
          break;
        case 'p':
          if (test.test_status === 'running') {
            e.preventDefault();
            updateTestStatus('paused');
          }
          break;
        case 'e':
          if (test.test_status === 'running' || test.test_status === 'paused') {
            e.preventDefault();
            updateTestStatus('completed');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [test, updateTestStatus]);

  const copyToClipboard = async (text, label = 'Code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateBasicTrackingCode = () => {
    if (!test) return '';
    const code = `<!-- QuickSig A/B Test: ${test.test_name} -->
<script>
  window.quicksigConfig = {
    testId: "${test.id}",
    apiEndpoint: "https://app.quicksig.com/api/track",
    debug: false
  };
</script>
<script async src="https://app.quicksig.com/track.js"></script>`;
    return dynamicizeTrackingCode(code);
  };

  const generateURLSplitCode = () => {
    if (!test || variants.length === 0) return '';

    const controlVariant = variants.find(v => v.variant_type === 'control');
    const treatmentVariants = variants.filter(v => v.variant_type !== 'control');

    const code = `<!-- QuickSig URL Split Test: ${escapeJsString(test.test_name)} -->
<script>
(function() {
  const testConfig = {
    testId: "${escapeJsString(test.id)}",
    variants: {
      ${controlVariant ? `"${escapeJsString(controlVariant.id)}": {
        name: "${escapeJsString(controlVariant.variant_name)}",
        url: "${escapeJsString(controlVariant.content || test.test_url)}",
        traffic: ${controlVariant.traffic_percentage}
      }${treatmentVariants.length > 0 ? ',' : ''}` : ''}
      ${treatmentVariants.map(v => `"${escapeJsString(v.id)}": {
        name: "${escapeJsString(v.variant_name)}",
        url: "${escapeJsString(v.content)}",
        traffic: ${v.traffic_percentage}
      }`).join(',\n      ')}
    }
  };

  let assignedVariant = localStorage.getItem('quicksig_variant_' + testConfig.testId);

  if (!assignedVariant || !testConfig.variants[assignedVariant]) {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [variantId, config] of Object.entries(testConfig.variants)) {
      cumulative += config.traffic;
      if (random <= cumulative) {
        assignedVariant = variantId;
        break;
      }
    }

    if (!assignedVariant && Object.keys(testConfig.variants).length > 0) {
      assignedVariant = Object.keys(testConfig.variants)[0];
    }

    if (assignedVariant) {
      localStorage.setItem('quicksig_variant_' + testConfig.testId, assignedVariant);

      fetch('https://app.quicksig.com/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: testConfig.testId,
          variantId: assignedVariant,
          event: 'variant_assigned',
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(e => console.error("QuickSig tracking error:", e));
    }
  }

  const variantConfig = testConfig.variants[assignedVariant];
  if (variantConfig && window.location.href !== variantConfig.url) {
    window.location.href = variantConfig.url;
  }
})();
</script>`;
    return dynamicizeTrackingCode(code);
  };

  const generateVariantCode = (variant) => {
    if (variant.variant_type === 'control') {
      return '          // This is the control variant - no changes needed.';
    }

    if (variant.content && variant.content.toLowerCase().includes('button')) {
      return `          // Change button text or style
          const button = document.querySelector('.cta-button, button[type="submit"]');
          if (button) {
            button.textContent = '${escapeJsString(variant.content)}';
          }`;
    } else if (variant.content && (variant.content.toLowerCase().includes('headline') || variant.content.toLowerCase().includes('title'))) {
      return `          // Change headline text
          const headline = document.querySelector('h1, h2, .page-title');
          if (headline) {
            headline.textContent = '${escapeJsString(variant.content)}';
          }`;
    } else if (variant.content && variant.content.toLowerCase().includes('image')) {
      return `          // Change image source
          const img = document.querySelector('img.hero-image');
          if (img) {
            img.src = '${escapeJsString(variant.content)}';
          }`;
    }

    return `          // Custom changes for ${escapeJsString(variant.variant_name)}
          console.log('Applied variant: ${escapeJsString(variant.variant_name)} (ID: ${escapeJsString(variant.id)})');`;
  };

  const generateConversionTracking = () => {
    if (!test || !test.success_metric) return dynamicizeTrackingCode(`  // No specific conversion metric configured.`);

    const metric = test.success_metric;
    let code = '';

    switch (metric.type) {
      case 'click':
        code = `
  document.addEventListener('click', function(e) {
    const targetSelector = '${escapeJsString(metric.selector || '.cta-button, [type="submit"], a[href]')}';
    const target = e.target.closest(targetSelector);
    if (target) {
      fetch('https://app.quicksig.com/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: testConfig.testId,
          variantId: assignedVariant,
          event: 'conversion',
          metricType: 'click',
          metricSelector: targetSelector,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(e => console.error("QuickSig click tracking error:", e));
    }
  });`;
        break;
      case 'page_visit':
        code = `
  const targetUrl = '${escapeJsString(metric.target_url || '/thank-you')}';
  if (window.location.pathname.includes(targetUrl) || window.location.href.includes(targetUrl)) {
    fetch('https://app.quicksig.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: testConfig.testId,
        variantId: assignedVariant,
        event: 'conversion',
        metricType: 'page_visit',
        metricTargetUrl: targetUrl,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    ).catch(e => console.error("QuickSig page visit tracking error:", e));
  }`;
        break;
      case 'custom_event':
        code = `
  const eventName = '${escapeJsString(metric.event_name || 'quicksigCustomConversion')}';
  window.addEventListener(eventName, function(e) {
    fetch('https://app.quicksig.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: testConfig.testId,
        variantId: assignedVariant,
        event: 'conversion',
        metricType: 'custom_event',
        metricEventName: eventName,
        eventDetail: e.detail || null,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    ).catch(e => console.error("QuickSig custom event tracking error:", e));
  });`;
        break;
      default:
        code = `
  // No specific conversion metric configured.`;
        break;
    }
    return dynamicizeTrackingCode(code);
  };

  const generateAdvancedSetup = () => {
    if (!test || variants.length === 0) return '';

    const code = `<!-- QuickSig Code Variant Test: ${escapeJsString(test.test_name)} -->
<script>
(function() {
  const testConfig = {
    testId: "${escapeJsString(test.id)}",
    variants: {
      ${variants.map(v => `"${escapeJsString(v.id)}": {
        name: "${escapeJsString(v.variant_name)}",
        traffic: ${v.traffic_percentage},
        changes: function() {
          ${generateVariantCode(v)}
        }
      }`).join(',\n      ')}
    }
  };

  let assignedVariant = localStorage.getItem('quicksig_variant_' + testConfig.testId);

  if (!assignedVariant || !testConfig.variants[assignedVariant]) {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [variantId, config] of Object.entries(testConfig.variants)) {
      cumulative += config.traffic;
      if (random <= cumulative) {
        assignedVariant = variantId;
        break;
      }
    }

    if (!assignedVariant && Object.keys(testConfig.variants).length > 0) {
      assignedVariant = Object.keys(testConfig.variants)[0];
    }

    if (assignedVariant) {
      localStorage.setItem('quicksig_variant_' + testConfig.testId, assignedVariant);

      fetch('https://app.quicksig.com/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: testConfig.testId,
          variantId: assignedVariant,
          event: 'variant_assigned',
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(e => console.error("QuickSig tracking error:", e));
    }
  }

  if (assignedVariant && testConfig.variants[assignedVariant]) {
    testConfig.variants[assignedVariant].changes();
  }

  ${generateConversionTracking()}
})();
</script>`;
    return dynamicizeTrackingCode(code);
  };

  const exportSummary = async () => {
    if (!test) {
      toast.error("No test data available for summary export.");
      return;
    }
    await ExportService.exportTestSummary(test, { filenameBase: `${test.test_name}_summary`, dateRange });
  };
  const exportDetailed = async () => {
    if (!testId) {
      toast.error("Test ID not found for detailed export.");
      return;
    }
    await ExportService.exportTestDetailed(testId, { filenameBase: `${test?.test_name || "test"}_detailed`, dateRange });
  };
  const exportRaw = async () => {
    if (!testId) {
      toast.error("Test ID not found for raw data export.");
      return;
    }
    await ExportService.exportTestRaw(testId, { filenameBase: `${test?.test_name || "test"}_raw`, dateRange });
  };

  const totalVisitorsAI = (variants?.reduce?.((s, v) => s + (v.visitor_count || 0), 0)) || 0;
  const hasAIData = totalVisitorsAI > 100;

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!test) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Test Not Found</h3>
            <p className="text-slate-600 mb-4">The test you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate(createPageUrl('Tests'))}>
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalVisitors = variants.reduce((sum, v) => sum + v.visitor_count, 0);
  const warning = getStatusWarning(test, variants);
  const statusColor = {
    draft: 'bg-slate-100 text-slate-700',
    running: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-slate-100 text-slate-500'
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {hint && (
        <SmartHint
          hint={hint}
          onDismiss={() => { ProgressiveDisclosureService.dismiss(hint.id); setHint(null); }}
          style={hint.style || "banner"}
        />
      )}
      <div className="mb-8">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl('Tests'))}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{test.test_name}</h1>
              <Badge className={`${statusColor[test.test_status]} border`}>
                {test.test_status.charAt(0).toUpperCase() + test.test_status.slice(1)}
              </Badge>
              {test.is_demo_data && (
                <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                  Demo Data
                </Badge>
              )}
              {warning && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    warning.type === 'warning'
                      ? 'border-yellow-500 text-yellow-700'
                      : 'border-blue-500 text-blue-700'
                  }`}
                >
                  {warning.type === 'warning' ? (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  ) : (
                    <Info className="w-3 h-3 mr-1" />
                  )}
                  {warning.message}
                </Badge>
              )}
            </div>
            <p className="text-slate-600">{test.test_url}</p>
            {test.description && (
              <p className="text-slate-500 mt-2">{test.description}</p>
            )}

            {isWinnerPositive && (
              <div className="mt-4 mb-2 p-3 md:p-4 bg-emerald-50 border-emerald-200 rounded-lg border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <Trophy className="w-5 h-5 text-emerald-600 mt-1 sm:mt-0 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-900 text-sm sm:text-base">
                        ✅ Winner found! Ready to implement?
                      </div>
                      <div className="text-xs sm:text-sm text-emerald-700">
                        {winnerName} outperforms by {Math.abs(winnerUplift)}% with {confidencePct}% confidence
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-initial touch-manipulation min-h-[44px]"
                      onClick={() => navigate(createPageUrl('Tests'))}
                    >
                      Keep Testing
                    </Button>
                    <Button 
                      className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 touch-manipulation min-h-[44px]"
                      onClick={implementWinner}
                    >
                      Implement Winner
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!isWinnerPositive && approachingSig && (
              <div className="mt-4 mb-2 p-3 md:p-4 bg-blue-50 border-blue-200 rounded-lg border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-1 sm:mt-0 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-blue-900 text-sm sm:text-base">📊 Approaching significance - check back tomorrow</div>
                      <div className="text-xs sm:text-sm text-blue-700">Currently at {confidencePct}% confidence, need 95% to declare winner</div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => window.location.reload()} className="w-full sm:w-auto touch-manipulation min-h-[44px]">
                    Refresh Results
                  </Button>
                </div>
              </div>
            )}

            {!isWinnerPositive && stagnating && (
              <div className="mt-4 mb-2 p-3 md:p-4 bg-amber-50 border-amber-200 rounded-lg border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-1 sm:mt-0 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-900 text-sm sm:text-base">⚠️ Test stagnating - consider bigger changes</div>
                      <div className="text-xs sm:text-sm text-amber-700">After {daysRunning} days, unlikely to find significant difference</div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setConfirmDialog({ isOpen: true, newStatus: 'completed' })} className="flex-1 sm:flex-initial touch-manipulation min-h-[44px]">
                      End Test
                    </Button>
                    <DecisionTooltip type="what_to_test_next" context={testContext} style="floating" label="Get Advice" onRecommendation={setLastRecommendation} />
                  </div>
                </div>
              </div>
            )}

            {!isWinnerPositive && negativeCase.active && (
              <div className="mt-4 mb-2 p-3 md:p-4 bg-red-50 border-red-200 rounded-lg border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <TrendingDown className="w-5 h-5 text-red-600 mt-1 sm:mt-0 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-red-900 text-sm sm:text-base">🚫 Variant underperforming - keep original</div>
                      <div className="text-xs sm:text-sm text-red-700">Control performs {Math.abs(negativeCase.uplift)}% better</div>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setConfirmDialog({ isOpen: true, newStatus: 'completed' })} className="flex-1 sm:flex-initial touch-manipulation min-h-[44px]">
                      End Test
                    </Button>
                    <Button onClick={() => navigate(createPageUrl('TestsNew'))} className="flex-1 sm:flex-initial touch-manipulation min-h-[44px]">
                      Try New Test
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {test.test_status === 'paused' && (
              <div className="bg-yellow-50 border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-yellow-800 text-sm">
                  ⏸️ This test is paused. Resume to continue collecting data or complete to end the test.
                </p>
              </div>
            )}
            {test.test_status === 'draft' && (
              <div className="bg-blue-50 border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-blue-800 text-sm">
                  📝 This test is in draft mode. Launch it to start collecting visitor data.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {test.organization_id && <QuotaIndicator organizationId={test.organization_id} />}
            {test.test_status === 'draft' && (
              <Button 
                onClick={() => updateTestStatus('running')} 
                className="bg-green-600 hover:bg-green-700"
                disabled={isUpdating}
              >
                <Play className="w-4 h-4 mr-2" />
                Launch Test
              </Button>
            )}
            {test.test_status === 'running' && (
              <Button 
                variant="outline" 
                onClick={() => updateTestStatus('paused')}
                disabled={isUpdating}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Test
              </Button>
            )}
            {test.test_status === 'paused' && (
              <>
                <Button 
                  onClick={() => updateTestStatus('running')}
                  disabled={isUpdating}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume Test
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => updateTestStatus('completed')}
                  disabled={isUpdating}
                >
                  End Test
                </Button>
              </>
            )}
            {test.test_status === 'completed' && (
              <Button 
                variant="outline" 
                onClick={() => updateTestStatus('archived')}
                disabled={isUpdating}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
          <p className="text-slate-600 text-sm">
            💡 <strong>Keyboard shortcuts:</strong> 
            {(test.test_status === 'draft' || test.test_status === 'paused') && ' Press S to start/resume'}
            {test.test_status === 'running' && ' Press P to pause'}
            {(test.test_status === 'running' || test.test_status === 'paused') && ', E to end test'}
          </p>
        </div>
      </div>

      <TestTimeline test={test} activities={activities} />

      {results && <ResultsSummaryCard summary={results.summary} />}
      
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        {(dateRange.start || dateRange.end) && (
          <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Partial results: calculations reflect selected date range
          </span>
        )}
      </div>

      <TestHealthMonitor variants={variants} />
      <SRMDetector variants={variants} />
      <ResultsLock test={test} variants={variants} />

      {totalVisitors === 0 ? (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Data Yet</h3>
            <p className="text-slate-600 mb-4">
              This test hasn't received any visitors yet. Install the tracking code or use the simulator to test with sample data.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl("TestSimulator"))}>
                <Zap className="w-4 h-4 mr-2" />
                Use Simulator
              </Button>
              <Button variant="outline">
                <Code className="w-4 h-4 mr-2" />
                View Integration Code
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variant Performance</CardTitle>
            <div className="flex items-center gap-4">
              {lastUpdated && <span className="text-xs text-slate-500">Last updated: {format(lastUpdated, 'p')}</span>}
              <Button variant="outline" size="sm" onClick={fetchTestData}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportSummary}>Summary CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDetailed}>Detailed CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportRaw}>Raw Data CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {results && <ResultsChart data={results.variants || []} winner={results.winner} />}
            <Table className="mt-6">
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Visitors</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Conv. Rate</TableHead>
                  <TableHead>Uplift</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results?.variants.map((variant) => (
                  <TableRow key={variant.id} className={variant.id === results.winner?.id ? 'bg-green-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variant.variant_name}</span>
                        {variant.variant_type === 'control' && (
                          <Badge variant="outline" className="text-xs">Control</Badge>
                        )}
                        {variant.id === results.winner?.id && (
                           <Badge className="bg-green-100 text-green-700">Winner</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{variant.visitor_count.toLocaleString()}</TableCell>
                    <TableCell>{variant.conversion_count.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{variant.conversion_rate.toFixed(2)}%</TableCell>
                    <TableCell className={variant.uplift > 0 ? 'text-green-600' : (variant.uplift < 0 ? 'text-red-600' : '')}>
                      {variant.variant_type !== 'control' ? `${variant.uplift.toFixed(1)}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {variant.variant_type !== 'control' ? (
                        <div className="flex items-center gap-2">
                          <Progress value={variant.confidence * 100} className="w-24 h-2"/>
                          <span>{(variant.confidence * 100).toFixed(1)}%</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Statistical Details</h2>
          <Link to={createPageUrl("DocsFAQ")} className="text-sm text-blue-600 hover:underline">Understanding Statistics</Link>
        </div>
        <StatisticalDetailsPanel test={test} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatisticalSignificanceCalculator />
          <SampleSizeCalculator />
        </div>
        <StatisticsGuide />
      </div>

      <div className="grid md:grid-cols-1 gap-6 mt-8">
        <TestNotes testId={testId} />
      </div>

      <div className="mt-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Visitor Details</h2>
          <div className="text-xs text-slate-500">GDPR Notice: IPs are anonymized and no PII is stored.</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryStat testId={testId} dateRange={dateRange} />
        </div>
        
        <Tabs defaultValue="tracking" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tracking">Tracking Data</TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
            <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
          </TabsList>

          <TabsContent value="tracking">
            <div className="grid grid-cols-1 gap-6 mt-6">
              <VisitorTrackingTable testId={testId} dateRange={dateRange} />
              <ConversionEventsTable testId={testId} dateRange={dateRange} />
            </div>
            <TrackingAnalytics testId={testId} dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityFeed testId={testId} />
          </TabsContent>

          <TabsContent value="ai">
            {!hasAIData ? (
              <div className="p-6 text-sm text-slate-600">
                Not enough data yet. AI Insights will appear once this test has more than 100 visitors.
              </div>
            ) : (
              <div className="p-6">
                <InterpretationsCard test={test} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="segmentation">
            <div className="mt-6">
              <SegmentationView testId={testId} dateRange={dateRange} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <StatusConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={() => updateTestStatus(confirmDialog.newStatus, true)}
        newStatus={confirmDialog.newStatus}
        testName={test.test_name}
        isLoading={isUpdating}
      />

      <UpgradePrompt
        visible={showUpgrade}
        usage={upgradeUsage}
        context={upgradeContext}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => window.location.href = createPageUrl('PlanManagement')}
      />

      {resultsUnlocked && (
        <div className="fixed bottom-24 right-6 z-20 max-w-sm">
          <Card className="shadow-xl border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm mb-1">Decision Helper</div>
                  <div className="text-xs text-slate-600 mb-2">
                    {confidencePct >= 95 ? "You have enough data to make a confident decision." :
                     confidencePct >= 85 ? "Almost there! Another day or two should give you clarity." :
                     confidencePct >= 70 ? "Results are trending but need more data." :
                     "Still gathering data. Check back in a few days."}
                  </div>
                  <div className="flex gap-2">
                    <DecisionTooltip type="when_to_stop" context={testContext} style="floating" label="Get Advice" onRecommendation={setLastRecommendation} />
                    {confidencePct >= 95 && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => updateTestStatus('completed')}>
                        Make Decision
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-30">
        <details className="group">
          <summary className="list-none">
            <Button className="bg-slate-800 hover:bg-slate-700 text-white">Quick Help</Button>
          </summary>
          <div className="mt-3 w-[320px] sm:w-[380px] bg-white rounded-lg shadow-xl border border-slate-200 p-4">
            <div className="text-sm space-y-3">
              <div>
                <div className="font-semibold mb-1">Why are my results locked?</div>
                <p className="text-slate-600">To prevent peeking bias, results unlock after enough visitors and time have passed.</p>
                <a className="text-blue-600 text-xs hover:underline" href={createPageUrl("DocsFAQ")}>Learn more</a>
              </div>
              <div>
                <div className="font-semibold mb-1">When should I stop my test?</div>
                <p className="text-slate-600">When your primary metric is significant and you’ve met your minimum duration.</p>
              </div>
              <div>
                <div className="font-semibold mb-1">What do these metrics mean?</div>
                <p className="text-slate-600">Hover any info icon <HelpTooltip content="Tooltips explain each concept in plain language." /> to learn more.</p>
              </div>
              <div>
                <div className="font-semibold mb-1">How do I implement the winner?</div>
                <p className="text-slate-600">Choose the winning variation and ship those changes to your site or app.</p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

function SummaryStat({ testId, dateRange }) {
  const [stats, setStats] = React.useState({ uniqueVisitors: 0, sessions: 0, avgSessions: 0, device: { desktop: 0, mobile: 0, tablet: 0 }, topReferrers: [] });

  React.useEffect(() => {
    const load = async () => {
      const [sessions, conversions] = await Promise.all([
        VisitorSession.filter({ 
          ab_test_id: testId,
          startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
          endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
        }),
        ConversionEvent.filter({ 
          ab_test_id: testId,
          startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
          endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
        })
      ]);
      const unique = new Set(sessions.map(s => s.visitor_id)).size;
      const countsByVisitor = sessions.reduce((acc, s) => {
        acc[s.visitor_id] = (acc[s.visitor_id] || 0) + 1;
        return acc;
      }, {});
      const deviceCounts = sessions.reduce((acc, s) => {
        acc[s.device_type || "desktop"] = (acc[s.device_type || "desktop"] || 0) + 1;
        return acc;
      }, {});
      const referrers = sessions.reduce((acc, s) => {
        const k = s.referrer_source || "Direct";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      const topReferrers = Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 3);

      const sessionTotal = sessions.length;
      const avgSessions = unique ? sessionTotal / unique : 0;

      setStats({
        uniqueVisitors: unique,
        sessions: sessionTotal,
        avgSessions,
        device: { desktop: deviceCounts.desktop || 0, mobile: deviceCounts.mobile || 0, tablet: deviceCounts.tablet || 0 },
        topReferrers
      });
    };
    if (testId) load();
  }, [testId, dateRange.start, dateRange.end]);

  return (
    <>
      <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Unique Visitors</div><div className="text-xl font-bold">{stats.uniqueVisitors.toLocaleString()}</div></CardContent></Card>
      <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Total Sessions</div><div className="text-xl font-bold">{stats.sessions.toLocaleString()}</div></CardContent></Card>
      <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Avg Sessions / Visitor</div><div className="text-xl font-bold">{stats.avgSessions.toFixed(2)}</div></CardContent></Card>
      <Card className="border-slate-200"><CardContent className="p-4"><div className="text-xs text-slate-500">Top Referrers</div><div className="text-sm">{stats.topReferrers.map(([k,v]) => `${k} (${v})`).join(", ") || "-"}</div></CardContent></Card>
    </>
  );
}

function QuotaIndicator({ organizationId }) {
  const [stats, setStats] = React.useState(null);
  React.useEffect(() => {
    const load = async () => {
      const s = await QuotaService.getUsageStats(organizationId);
      setStats(s);
    };
    if (organizationId) load();
  }, [organizationId]);
  if (!stats) return null;
  const percent = Math.min(100, Math.round((stats.visitorsUsed / stats.visitorsQuota) * 100));
  const tone = percent < 70 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : percent < 90 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-red-100 text-red-700 border-red-200";
  return <Badge className={`${tone} border`}>{percent}% of monthly visitors}</Badge>;
}