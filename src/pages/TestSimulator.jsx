
import React, { useState, useEffect, useCallback } from 'react';
import { ABTest, Variant, Visitor, Conversion, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress'; // New import for Progress bar
import QuotaService from "@/components/services/QuotaService"; // New import for QuotaService
import {
  Play,
  Users,
  Target,
  TrendingUp,
  Zap,
  AlertCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useResponsive } from "@/components/hooks/useResponsive";

const deviceTypes = ['desktop', 'mobile', 'tablet'];
const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
const referrerSources = ['Google', 'Direct', 'Facebook', 'Twitter', 'LinkedIn'];

const userAgents = {
  desktop: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ],
  mobile: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36'
  ],
  tablet: [
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  ]
};

const variantColors = ['bg-blue-400', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700', 'bg-blue-800'];

export default function TestSimulator() {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [variants, setVariants] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [bulkCount, setBulkCount] = useState(50);
  const [quota, setQuota] = useState(null); // New state for quota information
  const { isMobile } = useResponsive();
  const [streamMode, setStreamMode] = useState(false);
  const [speed, setSpeed] = useState(3); // 1(slowest) - 5(fastest)

  useEffect(() => {
    loadTests();
    // Load quota
    (async () => {
      try {
        const user = await User.me();
        if (user?.organization_id) {
          const s = await QuotaService.getUsageStats(user.organization_id);
          setQuota(s);
        }
      } catch (error) {
        console.error('Failed to load quota:', error);
      }
    })();
  }, []);

  const loadTests = async () => {
    try {
      const user = await User.me();
      // Load all tests to correctly check status, not just 'running' ones
      const allTests = await ABTest.filter({
        organization_id: user.organization_id,
      });
      setTests(allTests);
    } catch (error) {
      console.error('Failed to load tests:', error);
      toast.error('Failed to load tests.');
    }
  };

  // Memoize calculateStats to ensure its reference is stable for other hooks/callbacks
  const calculateStats = useCallback(async (testId, testVariants) => {
    try {
      const visitors = await Visitor.filter({ ab_test_id: testId });
      const conversions = await Conversion.filter({ ab_test_id: testId });

      const variantStats = {};

      for (const variant of testVariants) {
        const variantVisitors = visitors.filter(v => v.assigned_variant_id === variant.id);
        const variantConversions = conversions.filter(c => c.id && c.variant_id === variant.id); // Ensure c.id exists

        variantStats[variant.id] = {
          ...variant,
          visitor_count: variantVisitors.length,
          conversion_count: variantConversions.length,
          conversion_rate: variantVisitors.length > 0 ?
            (variantConversions.length / variantVisitors.length * 100).toFixed(2) : 0
        };
      }

      setStats(variantStats);
    } catch (error) {
      console.error('Failed to calculate stats:', error);
      toast.error('Failed to calculate stats.');
    }
  }, [setStats]);

  // Memoize loadTestDetails to ensure its reference is stable for the useEffect hook
  const loadTestDetails = useCallback(async () => {
    try {
      const testVariants = await Variant.filter({ ab_test_id: selectedTest });
      setVariants(testVariants);
      await calculateStats(selectedTest, testVariants);
    } catch (error) {
      console.error('Failed to load test details:', error);
      toast.error('Failed to load test details.');
    }
  }, [selectedTest, setVariants, calculateStats]);

  // New useCallback to refresh quota
  const refreshQuota = useCallback(async () => {
    try {
      const user = await User.me();
      if (user?.organization_id) {
        const s = await QuotaService.getUsageStats(user.organization_id);
        setQuota(s);
      }
    } catch (error) {
      console.error('Failed to refresh quota:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadTestDetails();
    }
  }, [selectedTest, loadTestDetails]);

  const generateVisitorId = () => {
    return 'vis_' + Math.random().toString(36).substr(2, 16);
  };

  const getRandomElement = (array) => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const assignVariant = () => {
    if (variants.length === 0) return null;

    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.traffic_percentage;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[0]; // Fallback
  };

  const addVisitor = async () => {
    if (!selectedTest) return;

    // Check if test allows new visitors
    const test = tests.find(t => t.id === selectedTest);
    if (test && ['completed', 'archived'].includes(test.test_status)) {
      toast.error(`Cannot add visitors to a ${test.test_status} test.`);
      return;
    }

    // NEW: proactive guard for missing variants
    if (noAssignableVariants) {
      console.error('Cannot add visitor: No variants available or all variants have 0% traffic.');
      toast.error('Cannot add visitor: No variants configured for this test (or all at 0% traffic).');
      return;
    }

    // Quota check
    const user = await User.me();
    if (!user?.organization_id) {
      toast.error("Could not determine organization for quota check.");
      return;
    }
    const q = await QuotaService.checkVisitorQuota(user.organization_id);
    if (!q.allowed) {
      toast.error(`Monthly visitor quota exceeded. Remaining: ${q.remaining}. Upgrade to add more visitors.`);
      return;
    }

    setIsLoading(true);
    try {
      const variant = assignVariant();
      if (!variant) {
        // This case should ideally be caught by noAssignableVariants, but kept as a fallback.
        console.error('Failed to assign variant: No variants available.');
        toast.error('No variants available for assignment.');
        setIsLoading(false);
        return;
      }

      const deviceType = getRandomElement(deviceTypes);
      const visitorData = {
        visitor_id: generateVisitorId(),
        ab_test_id: selectedTest,
        assigned_variant_id: variant.id,
        first_seen_date: new Date().toISOString(),
        last_seen_date: new Date().toISOString(),
        device_type: deviceType,
        browser: getRandomElement(browsers),
        referrer_source: getRandomElement(referrerSources),
        user_agent: getRandomElement(userAgents[deviceType])
      };

      await Visitor.create(visitorData);

      // Increment usage by 1 and refresh quota
      await QuotaService.incrementVisitorCount(user.organization_id, 1);
      await Promise.all([calculateStats(selectedTest, variants), refreshQuota()]);
      toast.success('Visitor added successfully');
    } catch (error) {
      console.error('Failed to add visitor:', error);
      toast.error('Failed to add visitor');
    } finally {
      setIsLoading(false);
    }
  };

  const addConversion = async () => {
    if (!selectedTest) return;

    // Check if test allows new conversions
    const test = tests.find(t => t.id === selectedTest);
    if (test && ['completed', 'archived'].includes(test.test_status)) {
      toast.error(`Cannot add conversions to a ${test.test_status} test.`);
      return;
    }

    setIsLoading(true);
    try {
      // Get visitors who haven't converted yet
      const visitors = await Visitor.filter({ ab_test_id: selectedTest });
      const conversions = await Conversion.filter({ ab_test_id: selectedTest });
      const convertedVisitorIds = new Set(conversions.map(c => c.visitor_id));
      const unconvertedVisitors = visitors.filter(v => !convertedVisitorIds.has(v.visitor_id));

      if (unconvertedVisitors.length === 0) {
        toast.error('No unconverted visitors available');
        setIsLoading(false);
        return;
      }

      const visitor = getRandomElement(unconvertedVisitors);
      const conversionData = {
        visitor_id: visitor.visitor_id,
        ab_test_id: selectedTest,
        variant_id: visitor.assigned_variant_id,
        conversion_date: new Date().toISOString(),
        goal_type: 'click',
        conversion_value: Math.random() * 100 + 10,
        referrer_source: visitor.referrer_source
      };

      await Conversion.create(conversionData);
      await calculateStats(selectedTest, variants); // No quota increment for conversions
      toast.success('Conversion added successfully');
    } catch (error) {
      console.error('Failed to add conversion:', error);
      toast.error('Failed to add conversion');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkAddVisitors = async () => {
    if (!selectedTest || !bulkCount) return;

    const test = tests.find(t => t.id === selectedTest);
    if (test && ['completed', 'archived'].includes(test.test_status)) {
      toast.error(`Cannot bulk add visitors to a ${test.test_status} test.`);
      return;
    }

    // NEW: proactive guard for missing variants
    if (noAssignableVariants) {
      console.error('Cannot bulk add visitors: No variants available or all variants have 0% traffic.');
      toast.error('Cannot generate visitors: No variants configured for this test (or all at 0% traffic).');
      return;
    }

    // Quota check for bulk
    const user = await User.me();
    if (!user?.organization_id) {
      toast.error("Could not determine organization for quota check.");
      return;
    }
    const q = await QuotaService.checkVisitorQuota(user.organization_id);
    if (!q.allowed || q.remaining < bulkCount) {
      toast.error(`Not enough remaining quota. Remaining: ${q.remaining}. Please reduce bulk count or upgrade.`);
      return;
    }

    setIsLoading(true);
    try {
      if (streamMode) {
        let createdVisitorsCount = 0;
        let i = 0;
        let notified = false; // NEW: prevent toast spam
        while (i < bulkCount) {
          const batchSize = Math.min(bulkCount - i, speed * 5); // larger batches at higher speeds
          const promises = [];
          for (let j = 0; j < batchSize; j++) {
            const variant = assignVariant();
            if (!variant) {
              if (!notified) {
                console.error('Skipping visitor creation: No variant assignment in stream mode.');
                toast.error('Could not assign a variant. Check that variants exist and have traffic > 0%.');
                notified = true;
              }
              continue;
            }

            const deviceType = getRandomElement(deviceTypes);
            const visitorData = {
              visitor_id: generateVisitorId(),
              ab_test_id: selectedTest,
              assigned_variant_id: variant.id,
              first_seen_date: new Date().toISOString(),
              last_seen_date: new Date().toISOString(),
              device_type: deviceType,
              browser: getRandomElement(browsers),
              referrer_source: getRandomElement(referrerSources),
              user_agent: getRandomElement(userAgents[deviceType])
            };
            promises.push(Visitor.create(visitorData));
          }
          await Promise.all(promises);
          createdVisitorsCount += batchSize;
          i += batchSize;

          // short pause between batches (faster when speed is higher)
          const delay = Math.max(60, 260 - speed * 40);
          await new Promise(r => setTimeout(r, delay));
        }

        if (createdVisitorsCount > 0) {
          await QuotaService.incrementVisitorCount(user.organization_id, createdVisitorsCount);
        }
      } else {
        const promises = [];
        let createdVisitorsCount = 0;
        let notified = false; // NEW: prevent toast spam
        for (let i = 0; i < bulkCount; i++) {
          const variant = assignVariant();
          if (!variant) {
            if (!notified) {
              console.error('Skipping visitor creation: No variant assignment.');
              toast.error('Could not assign a variant. Check that variants exist and have traffic > 0%.');
              notified = true;
            }
            continue;
          }

          const deviceType = getRandomElement(deviceTypes);
          const visitorData = {
            visitor_id: generateVisitorId(),
            ab_test_id: selectedTest,
            assigned_variant_id: variant.id,
            first_seen_date: new Date().toISOString(),
            last_seen_date: new Date().toISOString(),
            device_type: deviceType,
            browser: getRandomElement(browsers),
            referrer_source: getRandomElement(referrerSources),
            user_agent: getRandomElement(userAgents[deviceType])
          };
          promises.push(Visitor.create(visitorData));
          createdVisitorsCount++;
        }
        await Promise.all(promises);
        if (createdVisitorsCount > 0) {
          await QuotaService.incrementVisitorCount(user.organization_id, createdVisitorsCount);
        }
      }

      await Promise.all([calculateStats(selectedTest, variants), refreshQuota()]);
      toast.success(`${bulkCount} visitors added successfully`);
    } catch (error) {
      console.error('Failed to bulk add visitors:', error);
      toast.error('Failed to bulk add visitors');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRealisticData = async () => {
    if (!selectedTest) return;

    const test = tests.find(t => t.id === selectedTest);
    if (test && ['completed', 'archived'].includes(test.test_status)) {
      toast.error(`Cannot generate realistic data for a ${test.test_status} test.`);
      return;
    }

    // NEW: proactive guard for missing variants
    if (noAssignableVariants) {
      console.error('Cannot generate realistic data: No variants available or all variants have 0% traffic.');
      toast.error('Cannot generate data: No variants configured for this test (or all at 0% traffic).');
      return;
    }

    setIsLoading(true);
    try {
      const baseVisitorCount = 200 + Math.floor(Math.random() * 500);

      // Quota check
      const user = await User.me();
      if (!user?.organization_id) {
        toast.error("Could not determine organization for quota check.");
        setIsLoading(false);
        return;
      }
      const q = await QuotaService.checkVisitorQuota(user.organization_id);
      if (!q.allowed || q.remaining < baseVisitorCount) {
        toast.error(`Not enough remaining quota. Remaining: ${q.remaining}. Cannot generate ${baseVisitorCount} visitors.`);
        setIsLoading(false);
        return;
      }

      const deviceDistribution = { desktop: 0.6, mobile: 0.3, tablet: 0.1 };
      const conversionRates = { desktop: 0.04, mobile: 0.025, tablet: 0.035 };

      // Generate visitors
      const visitorCreationPromises = [];
      const generatedVisitors = [];
      let actualGeneratedVisitorsCount = 0;
      for (let i = 0; i < baseVisitorCount; i++) {
        const variant = assignVariant();
        if (!variant) {
          console.error('Skipping realistic data visitor creation: No variant assignment.');
          // show one-time toast to avoid noise
          if (i === 0) toast.error('Could not assign a variant. Check that variants exist and have traffic > 0%.');
          continue;
        }

        // Determine device based on distribution
        const rand = Math.random();
        let deviceType;
        if (rand < deviceDistribution.desktop) deviceType = 'desktop';
        else if (rand < deviceDistribution.desktop + deviceDistribution.mobile) deviceType = 'mobile';
        else deviceType = 'tablet';

        const daysAgo = Math.floor(Math.random() * 14); // Spread over 14 days
        const hoursAgo = Math.floor(Math.random() * 24);
        const visitDate = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));

        const visitorData = {
          visitor_id: generateVisitorId(),
          ab_test_id: selectedTest,
          assigned_variant_id: variant.id,
          first_seen_date: visitDate.toISOString(),
          last_seen_date: visitDate.toISOString(),
          device_type: deviceType,
          browser: getRandomElement(browsers),
          referrer_source: getRandomElement(referrerSources),
          user_agent: getRandomElement(userAgents[deviceType])
        };

        generatedVisitors.push(visitorData);
        visitorCreationPromises.push(Visitor.create(visitorData));
        actualGeneratedVisitorsCount++;
      }

      // Create all visitors
      await Promise.all(visitorCreationPromises);

      // Increment usage by the actual count of created visitors
      if (actualGeneratedVisitorsCount > 0) {
        await QuotaService.incrementVisitorCount(user.organization_id, actualGeneratedVisitorsCount);
      }

      // Generate conversions
      const conversionPromises = [];
      for (const visitorData of generatedVisitors) {
        const shouldConvert = Math.random() < conversionRates[visitorData.device_type];

        if (shouldConvert) {
          const conversionData = {
            visitor_id: visitorData.visitor_id,
            ab_test_id: selectedTest,
            variant_id: visitorData.assigned_variant_id,
            conversion_date: new Date(new Date(visitorData.first_seen_date).getTime() + Math.random() * 60 * 60 * 1000).toISOString(),
            goal_type: 'click',
            conversion_value: Math.random() * 200 + 20,
            referrer_source: visitorData.referrer_source
          };

          conversionPromises.push(Conversion.create(conversionData));
        }
      }

      await Promise.all(conversionPromises);
      await Promise.all([calculateStats(selectedTest, variants), refreshQuota()]);
      toast.success(`Generated ${actualGeneratedVisitorsCount} visitors with realistic conversion data`);
    } catch (error) {
      console.error('Failed to generate realistic data:', error);
      toast.error('Failed to generate realistic data');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTestStatus = tests.find(t => t.id === selectedTest)?.test_status;
  const isTestCompletedOrArchived = selectedTestStatus && ['completed', 'archived'].includes(selectedTestStatus);

  // NEW: computed guard for assignable variants (none or all traffic at 0%)
  const noAssignableVariants = variants.length === 0 || !variants.some(v => (v.traffic_percentage || 0) > 0);

  // Quota display calculations
  const percentUsed = quota ? Math.min(100, Math.round(((quota.visitorsUsed || 0) / (quota.visitorsQuota || 1)) * 100)) : 0;
  const remainingVisitors = quota ? Math.max(0, (quota.visitorsQuota || 0) - (quota.visitorsUsed || 0)) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Quota Status Display Card */}
      {quota && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-900">Monthly Quota Status</p>
                <p className="text-xs text-orange-700 mt-1">
                  {(quota.visitorsUsed || 0).toLocaleString()} / {(quota.visitorsQuota || 0).toLocaleString()} visitors used ({percentUsed}%)
                </p>
              </div>
              <Progress value={percentUsed} className="w-32 h-2" />
            </div>
            {remainingVisitors < 100 && (
              <div className="mt-2 text-xs text-red-700">
                Only {remainingVisitors} visitors remaining this month!
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Test Data Simulator</h1>
        <p className="text-slate-600">
          Simulate visitor and conversion events for your A/B tests. This helps you test your analysis and reporting without waiting for real traffic.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Simulation Mode</h3>
          </div>
          <p className="text-blue-800 text-sm">
            This is a simulation environment for testing purposes. Real tracking requires installing the QuickSig tracking code on your website.
          </p>
        </div>
      </div>

      {/* NEW: No variants warning */}
      {noAssignableVariants && selectedTest && !isTestCompletedOrArchived && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">
            ⚠️ No variants are configured with traffic allocation. Add at least one variant with traffic &gt; 0% before simulating visitors.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Test Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Select Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test to simulate" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.test_name} ({test.test_status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tests.length === 0 && (
                <p className="text-sm text-slate-500 mt-2">
                  No tests found. Create a test first.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Simulation Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-medium">Stream mode</div>
                  <div className="text-slate-500">Add visitors in batches for a live feed effect</div>
                </div>
                <Switch checked={streamMode} onCheckedChange={setStreamMode} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Speed</div>
                  <div className="text-xs text-slate-500">{speed}x</div>
                </div>
                <Slider value={[speed]} min={1} max={5} step={1} onValueChange={(v) => setSpeed(v[0])} />
              </div>

              <Button
                onClick={addVisitor}
                disabled={!selectedTest || isLoading || isTestCompletedOrArchived || noAssignableVariants}
                className="w-full"
              >
                <Users className="w-4 h-4 mr-2" />
                {isLoading ? 'Adding...' : 'Add 1 Visitor'}
              </Button>

              <Button
                onClick={addConversion}
                disabled={!selectedTest || isLoading || isTestCompletedOrArchived || noAssignableVariants}
                variant="outline"
                className="w-full"
              >
                <Target className="w-4 h-4 mr-2" />
                {isLoading ? 'Adding...' : 'Add 1 Conversion'}
              </Button>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bulk Add Visitors</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(parseInt(e.target.value) || 0)}
                    min="1"
                    max="1000"
                    className="flex-1"
                    disabled={isLoading || isTestCompletedOrArchived || noAssignableVariants}
                  />
                  <Button
                    onClick={bulkAddVisitors}
                    disabled={!selectedTest || isLoading || !bulkCount || isTestCompletedOrArchived || noAssignableVariants}
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
              </div>

              <Button
                onClick={generateRealisticData}
                disabled={!selectedTest || isLoading || isTestCompletedOrArchived || noAssignableVariants}
                variant="secondary"
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Generate Realistic Data'}
              </Button>

              <Button
                onClick={loadTestDetails}
                disabled={!selectedTest || isLoading}
                variant="ghost"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Stats
              </Button>

              {selectedTest && isTestCompletedOrArchived && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ This test is <span className="font-semibold">{selectedTestStatus}</span>.
                    Data simulation is disabled.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Variant Performance (replaces old Statistics Display) */}
          <Card>
            <CardHeader>
              <CardTitle>Variant Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTest && variants.length > 0 && Object.keys(stats).length > 0 ? (
                <div className="space-y-4">
                  <div className="flex h-8 rounded-lg overflow-hidden border border-slate-200">
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id}
                        style={{ width: `${variant.traffic_percentage}%` }}
                        className={`${index === 0 ? 'bg-slate-600' : 'bg-blue-500'} flex items-center justify-center text-white text-xs font-medium transition-all duration-300`}
                      >
                        {variant.traffic_percentage}%
                      </div>
                    ))}
                  </div>

                  {isMobile ? (
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
                      {Object.values(stats).map(variant => (
                        <div key={variant.id} className="min-w-[260px] snap-start">
                          <div className="p-4 bg-slate-50 rounded-lg border">
                            <h4 className="font-medium text-slate-900">{variant.variant_name}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                              <span>Traffic {variant.traffic_percentage}%</span>
                              <Badge variant="outline">
                                {variant.variant_type === 'control' ? 'Control' : 'Treatment'}
                              </Badge>
                            </div>
                            <div className="mt-3">
                              <div className="text-2xl font-bold text-slate-900">{variant.visitor_count}</div>
                              <div className="text-sm text-slate-500">visitors</div>
                              <div className="text-lg font-semibold text-green-600 mt-1">
                                {variant.conversion_rate}%
                              </div>
                              <div className="text-xs text-slate-500">{variant.conversion_count} conversions</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    Object.values(stats).map(variant => (
                      <div key={variant.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-slate-900">{variant.variant_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            <span>Traffic: {variant.traffic_percentage}%</span>
                            <Badge variant="outline">
                              {variant.variant_type === 'control' ? 'Control' : 'Treatment'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900">{variant.visitor_count}</div>
                          <div className="text-sm text-slate-500">visitors</div>
                          <div className="text-lg font-semibold text-green-600 mt-1">
                            {variant.conversion_rate}%
                          </div>
                          <div className="text-xs text-slate-500">{variant.conversion_count} conversions</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Select a test to see variant performance.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Simulation Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>• Use "Add 1 Visitor" to manually test visitor assignment</p>
              <p>• "Add 1 Conversion" converts an existing visitor</p>
              <p>• "Bulk Add" creates many visitors quickly</p>
              <p>• "Realistic Data" generates visitors with natural patterns and conversion rates</p>
              <p>• Data is distributed based on traffic allocation percentages</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
