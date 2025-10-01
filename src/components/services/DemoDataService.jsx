import { ABTest, Variant, Visitor, Conversion, Organization } from "@/api/entities";

function randBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickWeighted(weights) {
  // weights: [{key, weight}]
  const total = weights.reduce((s,w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    if (r < w.weight) return w.key;
    r -= w.weight;
  }
  return weights[0].key;
}
function businessHourOffset() {
  // Returns minutes offset within a day, biased to 9am-5pm
  const work = randBetween(9*60, 17*60);
  const off = randBetween(0, 24*60);
  return Math.random() < 0.75 ? work : off;
}

async function createTestWithData(orgId, spec) {
  const now = new Date();
  const started = new Date(now.getTime() - spec.daysAgoStart * 24 * 60 * 60 * 1000);
  const ended = spec.status === "completed" ? new Date(now.getTime() - spec.daysAgoEnd * 24 * 60 * 60 * 1000) : null;

  const test = await ABTest.create({
    organization_id: orgId,
    test_name: spec.name,
    description: spec.description || "",
    test_url: spec.url || "https://example.com/",
    test_status: spec.status,
    test_type: spec.type || "code_variant",
    started_date: spec.status !== "draft" ? started.toISOString() : undefined,
    ended_date: ended ? ended.toISOString() : undefined,
    total_visitors: spec.totalVisitors || 0,
    is_demo_data: true,
    success_metric: { type: "conversion", description: "Primary conversion" },
  });

  const variantsInput = spec.variants.map(v => ({
    variant_name: v.name,
    ab_test_id: test.id,
    variant_type: v.type,
    content: v.content || "",
    traffic_percentage: v.traffic,
    visitor_count: v.visitors || 0,
    conversion_count: v.conversions || 0,
    conversion_rate: v.visitors ? (v.conversions / v.visitors) * 100 : 0,
    is_demo_data: true
  }));
  const variants = await Variant.bulkCreate(variantsInput);

  // Generate detailed records only for running/completed/paused
  if (["running", "completed", "paused"].includes(spec.status) && (spec.totalVisitors || 0) > 0) {
    const devWeights = [
      { key: "desktop", weight: 60 },
      { key: "mobile", weight: 30 },
      { key: "tablet", weight: 10 },
    ];
    const refWeights = [
      { key: "Google", weight: 40 },
      { key: "Direct", weight: 25 },
      { key: "Facebook", weight: 15 },
      { key: "Email", weight: 15 },
      { key: "Twitter", weight: 5 },
    ];

    const total = spec.totalVisitors;
    const visitors = [];
    const conversions = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const durationDays = Math.max(1, spec.durationDays || 14);

    // distribute per variant by traffic %
    for (const vSpec of spec.variants) {
      const v = variants.find(x => x.variant_name === vSpec.name);
      const count = Math.round((vSpec.traffic / 100) * total);
      const convRate = vSpec.convRate || 0.03; // 3% default
      const convCount = Math.round(count * convRate);

      for (let i = 0; i < count; i++) {
        const dayOffset = Math.random() * durationDays;
        const visitDate = new Date(started.getTime() + dayOffset * msPerDay);
        const minutes = businessHourOffset();
        visitDate.setHours(0, minutes, randBetween(0,59), 0);

        const visitor_id = `${test.id}-${v.id}-${i}`;
        visitors.push({
          visitor_id,
          ab_test_id: test.id,
          assigned_variant_id: v.id,
          first_seen_date: visitDate.toISOString(),
          last_seen_date: new Date(visitDate.getTime() + randBetween(5, 60) * 60000).toISOString(),
          device_type: pickWeighted(devWeights),
          browser: "Chrome",
          referrer_source: pickWeighted(refWeights),
          user_agent: "Mozilla/5.0",
          is_demo_data: true
        });

        // stochastic conversions until target convCount reached
        if (conversions.length < convCount) {
          const convDate = new Date(visitDate.getTime() + randBetween(10, 180) * 60000);
          conversions.push({
            visitor_id,
            ab_test_id: test.id,
            variant_id: v.id,
            conversion_date: convDate.toISOString(),
            goal_type: "primary",
            conversion_value: Math.random() < 0.3 ? Number((Math.random() * 200 + 20).toFixed(2)) : 0,
            referrer_source: pickWeighted(refWeights),
            is_demo_data: true
          });
        }
      }
    }

    if (visitors.length) await Visitor.bulkCreate(visitors);
    if (conversions.length) await Conversion.bulkCreate(conversions);
  }

  return test;
}

const DemoDataService = {
  async initializeDemoMode(orgId) {
    // Set org flag
    await Organization.update(orgId, { is_demo_mode: true, demo_mode_started: new Date().toISOString() });

    // Create 5 sample tests
    await createTestWithData(orgId, {
      name: "Homepage Hero CTA Test",
      description: "Testing button text variations",
      status: "completed",
      daysAgoStart: 32,
      daysAgoEnd: 2,
      durationDays: 30,
      totalVisitors: 8500,
      variants: [
        { name: "Control", type: "control", traffic: 50, convRate: 0.032 },
        { name: "Get Started Button", type: "treatment", traffic: 50, convRate: 0.048 }
      ]
    });

    await createTestWithData(orgId, {
      name: "Pricing Page Layout",
      description: "3-column vs 4-column pricing layout",
      status: "running",
      daysAgoStart: 14,
      durationDays: 14,
      totalVisitors: 3200,
      variants: [
        { name: "3-Column", type: "control", traffic: 50, convRate: 0.035 },
        { name: "4-Column", type: "treatment", traffic: 50, convRate: 0.038 }
      ]
    });

    await createTestWithData(orgId, {
      name: "Email Subject Line Test",
      description: "Different messaging approaches for email",
      status: "running",
      daysAgoStart: 7,
      durationDays: 7,
      totalVisitors: 12000,
      variants: [
        { name: "Curiosity", type: "control", traffic: 33, convRate: 0.12 },
        { name: "Benefit-led", type: "treatment", traffic: 34, convRate: 0.16 },
        { name: "Urgency", type: "treatment", traffic: 33, convRate: 0.14 }
      ]
    });

    await createTestWithData(orgId, {
      name: "Mobile App Onboarding",
      description: "Paused due to release freeze",
      status: "paused",
      daysAgoStart: 21,
      durationDays: 10,
      totalVisitors: 1800,
      variants: [
        { name: "Control", type: "control", traffic: 50, convRate: 0.045 },
        { name: "Streamlined", type: "treatment", traffic: 50, convRate: 0.05 }
      ]
    });

    await ABTest.create({
      organization_id: orgId,
      test_name: "Product Page Social Proof",
      description: "Planned - add testimonials carousel",
      test_url: "https://example.com/product",
      test_status: "draft",
      test_type: "code_variant",
      is_demo_data: true
    });
  },

  async exitDemoMode(orgId) {
    // Delete demo data
    const tests = await ABTest.filter({ organization_id: orgId, is_demo_data: true });
    for (const t of tests) {
      const variants = await Variant.filter({ ab_test_id: t.id, is_demo_data: true });
      for (const v of variants) { await Variant.delete(v.id); }
      const visitors = await Visitor.filter({ ab_test_id: t.id, is_demo_data: true });
      for (const vis of visitors) { await Visitor.delete(vis.id); }
      const conversions = await Conversion.filter({ ab_test_id: t.id, is_demo_data: true });
      for (const c of conversions) { await Conversion.delete(c.id); }
      await ABTest.delete(t.id);
    }
    await Organization.update(orgId, { is_demo_mode: false, demo_mode_started: null });
  }
};

export default DemoDataService;