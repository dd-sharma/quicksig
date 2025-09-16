
import React, { useState, useEffect, useCallback } from 'react';
import { ABTest, Variant, Visitor, Conversion, User, ActivityLog, VisitorSession, ConversionEvent, Organization } from '@/api/entities'; // Added User, ActivityLog, VisitorSession, ConversionEvent, Organization
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Play,
  Pause,
  Archive,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Code,
  Globe,
  Settings,
  BarChart3,
  Zap,
  AlertTriangle,
  Info,
  RefreshCw,
  Download
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays } from 'date-fns';
import { validateStatusTransition, getStatusWarning, logStatusChange } from '@/components/tests/TestStatusValidation';
import StatusConfirmationDialog from '@/components/tests/StatusConfirmationDialog';
import TestTimeline from '@/components/tests/TestTimeline';
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
import QuotaService from "@/components/services/QuotaService";
import UpgradePrompt from "@/components/quota/UpgradePrompt";
import InterpretationsCard from "@/components/ai/InterpretationsCard";


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


  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('id');

  // Helper to safely escape strings for embedding in JavaScript code snippets
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

      // Fetch real stats
      const visitors = await Visitor.filter({ ab_test_id: testId });
      const conversions = await Conversion.filter({ ab_test_id: testId });
      
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

      // Get activity history
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
  }, [testId]);

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
    
    // Calculate results for all variants
    const variantsWithCalcs = variants.map(v => {
      if (v.id === control.id) return { ...v, uplift: 0, confidence: 0.5 }; // Confidence for control can be anything, not relevant for comparison
      return {
        ...v,
        uplift: calculateUplift(control, v),
        confidence: calculateConfidenceLevel(control, v)
      };
    });

    const winner = determineWinner(variantsWithCalcs);
    const totalVisitors = variants.reduce((sum, v) => sum + v.visitor_count, 0);
    const bestPerformer = variantsWithCalcs.reduce((best, v) => v.conversion_rate > best.conversion_rate ? v : best, variantsWithCalcs[0]);

    // Generate recommendation message
    let recommendation = { type: 'continue', message: 'Not enough data yet. Aim for at least 100 visitors per variant.' };
    if (winner) {
      recommendation = { type: 'winner', message: `${winner.variant_name} is a clear winner with ${(winner.confidence * 100).toFixed(0)}% confidence.` };
    } else if (totalVisitors > 200 && bestPerformer.confidence < 0.95 && test.test_status === 'running') {
      recommendation = { type: 'inconclusive', message: 'No clear winner detected. Variants are performing similarly.' };
    } else if (totalVisitors > 100 && bestPerformer.conversion_rate > control.conversion_rate && !winner) {
      recommendation.message = `${bestPerformer.variant_name} is trending with a ${bestPerformer.uplift.toFixed(0)}% uplift, but more data is needed for statistical significance.`
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
        confidence: bestPerformer?.confidence || 0, // This confidence is for the best performer against control
        isLive: test.test_status === 'running',
        recommendation,
      },
      variants: variantsWithCalcs,
      winner
    });

  }, [variants, test]);

  const updateTestStatus = useCallback(async (newStatus, skipConfirmation = false) => {
    if (!test || isUpdating) return;

    // Validate transition
    const validation = validateStatusTransition(test.test_status, newStatus, variants);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Quota checks when moving to running
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

    // Show confirmation for important changes
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
      }
      
      await ABTest.update(testId, updateData);
      
      // Log the status change
      if (user) {
        await logStatusChange(user, test, test.test_status, newStatus);
      }
      
      setTest(prev => ({ ...prev, ...updateData }));

      // Success messages
      const messages = {
        running: 'Test started successfully',
        paused: 'Test has been paused',
        completed: 'Test completed successfully', 
        archived: 'Test has been archived'
      };
      toast.success(messages[newStatus] || 'Test status updated');
      
      // Re-fetch activities after successful update to show the new log entry
      const updatedActivities = await ActivityLog.filter(
        { entity_type: 'ABTest', entity_id: testId },
        '-created_date',
        20
      );
      setActivities(updatedActivities);
      fetchTestData(); // Re-fetch all data to refresh stats and results

    } catch (error) {
      console.error('Failed to update test status:', error);
      toast.error('Failed to update test status');
    } finally {
      setIsUpdating(false);
      setConfirmDialog({ isOpen: false });
    }
  }, [test, variants, testId, user, isUpdating, fetchTestData]); 

  // Add keyboard shortcuts
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
      // Optional: set a failed state
      // setCopySuccess('Failed');
      // setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const generateBasicTrackingCode = () => {
    if (!test) return '';
    return `<!-- QuickSig A/B Test: ${test.test_name} -->
<script>
  window.quicksigConfig = {
    testId: "${test.id}",
    apiEndpoint: "https://app.quicksig.com/api/track",
    debug: false // Set to true for console logging
  };
</script>
<script async src="https://app.quicksig.com/track.js"></script>`;
  };

  const generateAdvancedSetup = () => {
    if (!test) return '';
    if (test.test_type === 'url_split') {
      return generateURLSplitCode();
    } else {
      return generateCodeVariantSetup();
    }
  };

  const generateURLSplitCode = () => {
    if (!test || variants.length === 0) return '';

    const controlVariant = variants.find(v => v.variant_type === 'control');
    const treatmentVariants = variants.filter(v => v.variant_type === 'treatment');

    return `<!-- QuickSig URL Split Test: ${escapeJsString(test.test_name)} -->
<script>
(function() {
  // Configuration
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

  // Check if user has existing variant assignment
  let assignedVariant = localStorage.getItem('quicksig_variant_' + testConfig.testId);

  if (!assignedVariant || !testConfig.variants[assignedVariant]) { // Reassign if no assignment or variant no longer exists
    // Assign variant based on traffic allocation
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [variantId, config] of Object.entries(testConfig.variants)) {
      cumulative += config.traffic;
      if (random <= cumulative) {
        assignedVariant = variantId;
        break;
      }
    }

    // Fallback if no variant is assigned (e.g., due to traffic % not adding to 100)
    if (!assignedVariant && Object.keys(testConfig.variants).length > 0) {
      assignedVariant = Object.keys(testConfig.variants)[0]; // Default to first variant
    }

    if (assignedVariant) {
      // Store assignment
      localStorage.setItem('quicksig_variant_' + testConfig.testId, assignedVariant);

      // Track visitor assignment
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

  // Redirect if not on correct URL
  const variantConfig = testConfig.variants[assignedVariant];
  if (variantConfig && window.location.href !== variantConfig.url) {
    window.location.href = variantConfig.url;
  }
})();
</script>`;
  };

  const generateCodeVariantSetup = () => {
    if (!test || variants.length === 0) return '';

    return `<!-- QuickSig Code Variant Test: ${escapeJsString(test.test_name)} -->
<script>
(function() {
  // Configuration
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

  // Check for existing assignment
  let assignedVariant = localStorage.getItem('quicksig_variant_' + testConfig.testId);

  if (!assignedVariant || !testConfig.variants[assignedVariant]) { // Reassign if no assignment or variant no longer exists
    // Assign variant based on traffic allocation
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const [variantId, config] of Object.entries(testConfig.variants)) {
      cumulative += config.traffic;
      if (random <= cumulative) {
        assignedVariant = variantId;
        break;
      }
    }

    // Fallback if no variant is assigned (e.g., due to traffic % not adding to 100)
    if (!assignedVariant && Object.keys(testConfig.variants).length > 0) {
      assignedVariant = Object.keys(testConfig.variants)[0]; // Default to first variant
    }

    if (assignedVariant) {
      localStorage.setItem('quicksig_variant_' + testConfig.testId, assignedVariant);

      // Track assignment
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

  // Apply variant changes
  if (assignedVariant && testConfig.variants[assignedVariant]) {
    testConfig.variants[assignedVariant].changes();
  }

  // Track conversions based on success metric
  ${generateConversionTracking()}
})();
</script>`;
  };

  const generateVariantCode = (variant) => {
    if (variant.variant_type === 'control') {
      return '          // This is the control variant - no changes needed.';
    }

    // Generate sample code based on variant content
    if (variant.content && variant.content.toLowerCase().includes('button')) {
      return `          // Change button text or style
          const button = document.querySelector('.cta-button, button[type="submit"]');
          if (button) {
            button.textContent = '${escapeJsString(variant.content)}';
            // button.style.backgroundColor = 'purple';
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
            img.src = '${escapeJsString(variant.content)}'; // Assuming content is a URL
          }`;
    }

    // Default or custom changes
    return `          // Custom changes for ${escapeJsString(variant.variant_name)}
          // Example: Change text content of a generic element
          // const targetElement = document.querySelector('.some-element-class');
          // if (targetElement) {
          //   targetElement.textContent = '${escapeJsString(variant.content || "New Text")}';
          // }

          // Example: Change styling of an element
          // const anotherElement = document.querySelector('#some-id');
          // if (anotherElement) {
          //   anotherElement.style.color = '#FF4500'; // OrangeRed
          // }

          console.log('Applied variant: ${escapeJsString(variant.variant_name)} (ID: ${escapeJsString(variant.id)})');`;
  };

  const generateConversionTracking = () => {
    if (!test || !test.success_metric) return `  // No specific conversion metric configured.
  // Add your custom conversion tracking code here.
  // Example: Track form submissions
  // document.querySelector('form').addEventListener('submit', function() {
  //   fetch('https://app.quicksig.com/api/track', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       testId: testConfig.testId,
  //       variantId: assignedVariant,
  //       event: 'conversion',
  //       url: window.location.href,
  //       timestamp: new Date().toISOString()
  //     })
  //   }).catch(e => console.error("QuickSig conversion tracking error:", e));
  // });`;

    const metric = test.success_metric;

    switch (metric.type) {
      case 'click':
        return `
  // Track clicks on target element (${escapeJsString(metric.description || 'Button/Link Click')})
  document.addEventListener('click', function(e) {
    const targetSelector = '${escapeJsString(metric.selector || '.cta-button, [type="submit"], a[href]')}';
    const target = e.target.closest(targetSelector);
    if (target) {
      console.log('QuickSig: Click conversion detected on element:', targetSelector);
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

      case 'page_visit':
        return `
  // Track page visits to success page (${escapeJsString(metric.description || 'Page Visit Conversion')})
  const targetUrl = '${escapeJsString(metric.target_url || '/thank-you')}';
  if (window.location.pathname.includes(targetUrl) || window.location.href.includes(targetUrl)) {
    console.log('QuickSig: Page visit conversion detected on URL:', targetUrl);
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
    }).catch(e => console.error("QuickSig page visit tracking error:", e));
  }`;

      case 'custom_event':
        return `
  // Listen for custom events (${escapeJsString(metric.description || 'Custom Event Conversion')})
  const eventName = '${escapeJsString(metric.event_name || 'quicksigCustomConversion')}';
  window.addEventListener(eventName, function(e) {
    console.log('QuickSig: Custom event conversion detected:', eventName);
    fetch('https://app.quicksig.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId: testConfig.testId,
        variantId: assignedVariant,
        event: 'conversion',
        metricType: 'custom_event',
        metricEventName: eventName,
        eventDetail: e.detail || null, // Include event detail if available
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(e => console.error("QuickSig custom event tracking error:", e));
  });

  // Example of triggering this custom event:
  // window.dispatchEvent(new CustomEvent('${escapeJsString(metric.event_name || 'quicksigCustomConversion')}', { detail: { productId: 123 } }));`;

      default:
        return `
  // No specific conversion metric configured.
  // Add your custom conversion tracking code here.
  // Example: Track form submissions
  // document.querySelector('form').addEventListener('submit', function() {
  //   fetch('https://app.quicksig.com/api/track', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       testId: testConfig.testId,
  //       variantId: assignedVariant,
  //       event: 'conversion',
  //       url: window.location.href,
  //       timestamp: new Date().toISOString()
  //     })
  //   }).catch(e => console.error("QuickSig conversion tracking error:", e));
  // });`;
    }
  };

  const exportResults = () => {
    if (!results || !results.variants || results.variants.length === 0) {
      toast.error("No results to export.");
      return;
    }
    
    const csvData = results.variants.map(v => ({
      'Variant': v.variant_name,
      'Visitors': v.visitor_count,
      'Conversions': v.conversion_count,
      'Conversion Rate (%)': v.conversion_rate.toFixed(2),
      'Uplift vs Control (%)': v.variant_type !== 'control' ? v.uplift.toFixed(2) : '-',
      'Confidence': v.variant_type !== 'control' ? `${(v.confidence * 100).toFixed(1)}%` : '-',
      'Status': v.id === results.winner?.id ? 'Winner' : (v.variant_type === 'control' ? 'Control' : 'Treatment')
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test.test_name}_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url); // Clean up the URL object
    toast.success('Results exported successfully!');
  };

  // AI insights availability based on total visitors across variants
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
              {warning && (
                <Badge variant="outline" className={`text-xs ${
                  warning.type === 'warning' ? 'border-yellow-500 text-yellow-700' : 'border-blue-500 text-blue-700'
                }`}>
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
            
            {/* Status-specific helper text */}
            {test.test_status === 'paused' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-yellow-800 text-sm">
                  ⏸️ This test is paused. Resume to continue collecting data or complete to end the test.
                </p>
              </div>
            )}
            {test.test_status === 'draft' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-blue-800 text-sm">
                  📝 This test is in draft mode. Launch it to start collecting visitor data.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {/* Quota indicator */}
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

        {/* Keyboard shortcuts hint */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
          <p className="text-slate-600 text-sm">
            💡 <strong>Keyboard shortcuts:</strong> 
            {(test.test_status === 'draft' || test.test_status === 'paused') && ' Press S to start/resume'}
            {test.test_status === 'running' && ' Press P to pause'}
            {(test.test_status === 'running' || test.test_status === 'paused') && ', E to end test'}
          </p>
        </div>
      </div>

      {/* Test Timeline */}
      <TestTimeline test={test} activities={activities} />

      {/* Results Summary Card */}
      {results && <ResultsSummaryCard summary={results.summary} />}
      

      {/* Results Table or Empty State */}
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
              <Button onClick={() => navigate(createPageUrl('TestSimulator'))}>
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
              <Button variant="outline" size="sm" onClick={exportResults}><Download className="w-4 h-4 mr-2"/>Export CSV</Button>
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
                {results?.variants.map(variant => (
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

      {/* Statistical Details */}
      <div className="mt-8 space-y-6">
        <StatisticalDetailsPanel test={test} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatisticalSignificanceCalculator />
          <SampleSizeCalculator />
        </div>
        <StatisticsGuide />
      </div>

      {/* Test Details and Integration Code */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Test Type</label>
              <p className="text-slate-900 capitalize">
                {test.test_type?.replace('_', ' ')} Test
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Success Metric</label>
              <p className="text-slate-900 capitalize">
                {test.success_metric?.type?.replace('_', ' ')}
              </p>
              {test.success_metric?.description && (
                <p className="text-sm text-slate-500 mt-1">{test.success_metric.description}</p>
              )}
            </div>
            {test.started_date && (
              <div>
                <label className="text-sm font-medium text-slate-600">Started</label>
                <p className="text-slate-900">
                  {format(new Date(test.started_date), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-600">Test ID</label>
              <p className="text-slate-900 font-mono text-sm">{test.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Integration Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Installation</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Setup</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Add this code to the &lt;head&gt; section of your website:
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                    <pre>{generateBasicTrackingCode()}</pre>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generateBasicTrackingCode(), 'Basic code')}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copySuccess === 'Basic code' ? 'Copied!' : 'Copy Code'}
                    </Button>
                    <a
                      href="https://docs.quicksig.com/installation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Installation Guide
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Setup Tips:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Place the code in your website's &lt;head&gt; section</li>
                    <li>• The code will automatically assign visitors to variants</li>
                    <li>• Test in incognito mode to see different variants</li>
                    <li>• Check browser console for debug messages</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Complete implementation with variant logic and conversion tracking:
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto max-h-96">
                    <pre>{generateAdvancedSetup()}</pre>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generateAdvancedSetup(), 'Advanced code')}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copySuccess === 'Advanced code' ? 'Copied!' : 'Copy Code'}
                    </Button>
                  </div>
                </div>

                {/* Variant-specific code - only for 'code_variant' tests */}
                {test.test_type === 'code_variant' && variants.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h4 className="font-medium text-slate-900">Variant-Specific Code Examples:</h4>
                    <Tabs defaultValue={variants[0]?.id} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        {variants.map(variant => (
                          <TabsTrigger key={variant.id} value={variant.id}>
                            {variant.variant_name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {variants.map(variant => (
                        <TabsContent key={variant.id} value={variant.id}>
                          <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                            <pre>{generateVariantCode(variant)}</pre>
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                )}

                <div className="bg-yellow-50 p-4 rounded-lg mt-6">
                  <h4 className="font-medium text-yellow-900 mb-2">⚠️ Advanced Setup Notes:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Customize the variant changes in each function</li>
                    <li>• Update selectors to match your HTML elements</li>
                    <li>• Test thoroughly before deploying to production</li>
                    <li>• Monitor browser console for any JavaScript errors</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Details Section */}
      <div className="mt-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Visitor Details</h2>
          <div className="text-xs text-slate-500">GDPR Notice: IPs are anonymized and no PII is stored.</div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryStat testId={testId} />
        </div>
        
        <Tabs defaultValue="tracking" className="w-full">
          <TabsList className="grid w-full grid-cols-3"> {/* Adjusted grid-cols to fit 3 tabs */}
            <TabsTrigger value="tracking">Tracking Data</TabsTrigger>
            <TabsTrigger value="activity">Activity Feed</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="tracking">
            {/* Tables */}
            <div className="grid grid-cols-1 gap-6 mt-6">
              <VisitorTrackingTable testId={testId} />
              <ConversionEventsTable testId={testId} />
            </div>
            {/* Analytics */}
            <TrackingAnalytics testId={testId} />
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
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <StatusConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={() => updateTestStatus(confirmDialog.newStatus, true)}
        newStatus={confirmDialog.newStatus}
        testName={test.test_name}
        isLoading={isUpdating}
      />

      {/* Render upgrade prompt */}
      <UpgradePrompt
        visible={showUpgrade}
        usage={upgradeUsage}
        context={upgradeContext}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => window.location.href = createPageUrl('PlanManagement')}
      />
    </div>
  );
}

// Small helper component to compute and render summary stats
function SummaryStat({ testId }) {
  const [stats, setStats] = React.useState({ uniqueVisitors: 0, sessions: 0, avgSessions: 0, device: { desktop: 0, mobile: 0, tablet: 0 }, topReferrers: [] });

  React.useEffect(() => {
    const load = async () => {
      const [sessions, conversions] = await Promise.all([
        VisitorSession.filter({ ab_test_id: testId }), // Changed to ab_test_id for consistency
        ConversionEvent.filter({ ab_test_id: testId }) // Changed to ab_test_id for consistency
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
    load();
  }, [testId]);

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
  return <Badge className={`${tone} border`}>{percent}% of monthly visitors</Badge>;
}
