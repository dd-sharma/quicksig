import { User, Organization } from "@/api/entities";

// Centralized Test Templates + helper methods
// All templates map cleanly to the current ABTest schema (url_split or code_variant).
// Each template includes: config defaults, variants, success metrics, best practices, and smart defaults.

const iconMap = {
  Mail: "Mail",
  MousePointer: "MousePointer",
  DollarSign: "DollarSign",
  Type: "Type",
  ShoppingBag: "ShoppingBag",
  ClipboardList: "ClipboardList",
  PlayCircle: "PlayCircle",
  Users: "Users",
};

const templates = [
  {
    id: "email_subject",
    name: "Email Subject Line Test",
    category: "Email Marketing",
    icon: "Mail",
    popularity: 5,
    description: "Test subject line variations to boost email open rates.",
    estimatedImpact: "15-40% open rate improvement",
    recommendedDuration: "7-14 days",
    minTraffic: 1000,
    config: {
      test_name: "Email Subject Line A/B Test",
      test_type: "code_variant",
      description: "Testing subject lines to improve open rates.",
      hypothesis: "Personalized subject lines will increase opens by 20%."
    },
    variants: [
      { name: "Control", content: "Don't miss our September updates", allocation: 50 },
      { name: "Variant B", content: "{FirstName}, get 20% more from your site in 7 days", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "custom_event", event_name: "email_open" },
      secondary: [{ type: "custom_event", event_name: "email_click" }]
    },
    tips: [
      "Test one element at a time (personalization, urgency, length).",
      "Run at least 24 hours to cover time zones.",
      "Minimum sample size ~1,000 per variant."
    ],
    benchmarks: { openRate: "18-28%", ctr: "1.5-3.5%" }
  },
  {
    id: "cta_button",
    name: "CTA Button Optimization",
    category: "Conversion",
    icon: "MousePointer",
    popularity: 5,
    description: "Optimize button copy, color, and contrast for higher engagement.",
    estimatedImpact: "5-20% click-through improvement",
    recommendedDuration: "7-10 days",
    minTraffic: 3000,
    config: {
      test_name: "CTA Button Copy & Style",
      test_type: "code_variant",
      description: "Testing CTA copy and color for more clicks.",
      hypothesis: "Benefit-focused copy with high-contrast color will boost clicks."
    },
    variants: [
      { name: "Control", content: "Button: 'Learn More' (Gray, Medium)", allocation: 50 },
      { name: "Variant B", content: "Button: 'Get Started Free' (Blue, Large, High contrast)", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "click", selector: ".cta-button" },
      secondary: [{ type: "conversion", target_url: "/signup-success" }]
    },
    tips: [
      "Make the value explicit (Get Started Free vs Learn More).",
      "Ensure the button stands out with color and whitespace.",
      "Avoid multiple competing CTAs above the fold."
    ],
    benchmarks: { ctr: "3-8%" }
  },
  {
    id: "pricing_page",
    name: "Pricing Page Layout",
    category: "Revenue",
    icon: "DollarSign",
    popularity: 4,
    description: "Test pricing emphasis, highlights, and comparison layout.",
    estimatedImpact: "3-15% plan selection improvement",
    recommendedDuration: "10-14 days",
    minTraffic: 4000,
    config: {
      test_name: "Pricing Layout Emphasis",
      test_type: "code_variant",
      description: "Highlight most popular plan, reduce choice friction.",
      hypothesis: "Emphasizing the recommended plan increases conversions."
    },
    variants: [
      { name: "Control", content: "Standard grid with equal emphasis", allocation: 50 },
      { name: "Variant B", content: "Highlight 'Pro' plan, add badges, money-back guarantee", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "conversion", target_url: "/checkout" },
      secondary: [{ type: "click", selector: ".pricing .select-plan" }]
    },
    tips: [
      "Use a 'Most popular' badge for the mid-tier.",
      "Show reassurance ( guarantees, security, cancellation ).",
      "Minimize distractions near purchase CTAs."
    ],
    benchmarks: { checkoutCR: "0.8-2.5%" }
  },
  {
    id: "landing_headline",
    name: "Landing Page Headline",
    category: "Conversion",
    icon: "Type",
    popularity: 5,
    description: "Refine your hero headline for clarity and value communication.",
    estimatedImpact: "8-25% sign-up conversion lift",
    recommendedDuration: "7-10 days",
    minTraffic: 3000,
    config: {
      test_name: "Hero Headline Clarity",
      test_type: "code_variant",
      description: "Test concise, outcome-driven headlines.",
      hypothesis: "Outcome-driven headline improves engagement."
    },
    variants: [
      { name: "Control", content: "All-in-one analytics platform", allocation: 50 },
      { name: "Variant B", content: "See what grows revenue—run winning A/B tests in days", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "click", selector: ".hero .primary-cta" },
      secondary: [{ type: "page_visit", target_url: "/signup" }]
    },
    tips: [
      "Lead with outcome, then how it works.",
      "Avoid jargon. Make benefits explicit.",
      "Pair with supportive subheader and visual proof."
    ],
    benchmarks: { heroCTR: "3-10%" }
  },
  {
    id: "product_description",
    name: "Product Description Test",
    category: "E-commerce",
    icon: "ShoppingBag",
    popularity: 4,
    description: "Compare concise vs benefit-led descriptions to improve add-to-cart.",
    estimatedImpact: "5-18% add-to-cart improvement",
    recommendedDuration: "7-14 days",
    minTraffic: 5000,
    config: {
      test_name: "Product Description Style",
      test_type: "code_variant",
      description: "Benefit-focused bullets vs long-form spec sheet.",
      hypothesis: "Benefit-driven copy increases add-to-cart rate."
    },
    variants: [
      { name: "Control", content: "Long spec sheet; minimal benefits", allocation: 50 },
      { name: "Variant B", content: "5 bullet benefits + trust badges + shipping promise", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "click", selector: ".add-to-cart" },
      secondary: [{ type: "conversion", target_url: "/cart" }]
    },
    tips: [
      "Put the top 3 benefits above the fold.",
      "Add social proof near the CTA (ratings, reviews).",
      "Address objections (returns, warranty, delivery)."
    ],
    benchmarks: { atcRate: "3-7%" }
  },
  {
    id: "form_optimization",
    name: "Form Field Reduction",
    category: "Lead Generation",
    icon: "ClipboardList",
    popularity: 4,
    description: "Reduce friction by removing non-essential fields.",
    estimatedImpact: "10-30% form completion lift",
    recommendedDuration: "7-10 days",
    minTraffic: 2500,
    config: {
      test_name: "Lead Form Field Reduction",
      test_type: "code_variant",
      description: "Shorter form vs detailed data capture.",
      hypothesis: "Shorter forms increase completion rate."
    },
    variants: [
      { name: "Control", content: "10 fields incl. phone, company size", allocation: 50 },
      { name: "Variant B", content: "4 essential fields + progressive profiling later", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "conversion", target_url: "/thank-you" },
      secondary: [{ type: "click", selector: "form [type=submit]" }]
    },
    tips: [
      "Ask only what you need now; enrich later.",
      "Use clear error states and inline validation.",
      "Auto-format phone, credit card, dates."
    ],
    benchmarks: { completion: "12-25%" }
  },
  {
    id: "trial_vs_demo",
    name: "Free Trial vs Demo CTA",
    category: "SaaS",
    icon: "PlayCircle",
    popularity: 3,
    description: "Compare 'Start Free Trial' vs 'Request a Demo'.",
    estimatedImpact: "5-20% qualified lead rate change",
    recommendedDuration: "10-14 days",
    minTraffic: 3500,
    config: {
      test_name: "Trial vs Demo Primary CTA",
      test_type: "code_variant",
      description: "Match CTA to buying stage to lift signups.",
      hypothesis: "Offering a trial increases top-of-funnel signups."
    },
    variants: [
      { name: "Control", content: "Primary CTA: Request a Demo", allocation: 50 },
      { name: "Variant B", content: "Primary CTA: Start Free Trial (no credit card)", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "page_visit", target_url: "/signup" },
      secondary: [{ type: "conversion", target_url: "/thank-you" }]
    },
    tips: [
      "Add trust microcopy: 'No credit card required'.",
      "Keep demo as secondary CTA for evaluators.",
      "Align CTA language with positioning."
    ],
    benchmarks: { visitToSignup: "1.5-4.0%" }
  },
  {
    id: "social_proof",
    name: "Social Proof Elements",
    category: "Trust",
    icon: "Users",
    popularity: 4,
    description: "Surface logos, reviews, and numbers to reduce anxiety.",
    estimatedImpact: "5-15% conversion uplift",
    recommendedDuration: "7-10 days",
    minTraffic: 3000,
    config: {
      test_name: "Social Proof Placement",
      test_type: "code_variant",
      description: "Logos + testimonials vs sparse proof.",
      hypothesis: "Strategic proof near CTAs increases conversions."
    },
    variants: [
      { name: "Control", content: "Testimonials below the fold", allocation: 50 },
      { name: "Variant B", content: "Trusted-by logos + 2 bite-size quotes near primary CTA", allocation: 50 }
    ],
    successMetrics: {
      primary: { type: "click", selector: ".primary-cta" },
      secondary: [{ type: "conversion", target_url: "/checkout" }]
    },
    tips: [
      "Use recognizable logos and quantified results.",
      "Place near friction points (pricing, signup).",
      "Keep quotes short and skimmable."
    ],
    benchmarks: { uplift: "5-15%" }
  }
];

// Smart defaults generator
function computeSmartDefaults(template) {
  // significance: revenue -> 95%, engagement -> 90%
  const isRevenue = ["Revenue", "E-commerce"].includes(template.category);
  const significance = isRevenue ? 0.95 : 0.9;
  const minSamplePerVariant = Math.max(500, Math.floor((template.minTraffic || 2000) / 2));
  const estimatedDays = template.recommendedDuration?.includes("14") ? 14 : 7;

  return {
    significance,
    minSamplePerVariant,
    estimatedDays,
    earlyStopping: false
  };
}

// Map template to our TestsNew page state
function mapToTestData(template) {
  const smart = computeSmartDefaults(template);

  return {
    test_name: template.config.test_name,
    description: template.config.description,
    test_url: "https://example.com/page-to-test", // user can change in step 1
    test_type: template.config.test_type === "url_split" ? "url_split" : "code_variant",
    success_metric: template.successMetrics?.primary
      ? { ...template.successMetrics.primary }
      : { type: "click", selector: ".primary-cta" },
    variants: [
      {
        variant_name: "Original (Control)",
        variant_type: "control",
        content: template.variants?.[0]?.content || "",
        traffic_percentage: template.variants?.[0]?.allocation || 50
      },
      {
        variant_name: template.variants?.[1]?.name || "Variant B",
        variant_type: "treatment",
        content: template.variants?.[1]?.content || "",
        traffic_percentage: template.variants?.[1]?.allocation || 50
      }
    ],
    // smart hints we can apply later when saving:
    _smart: smart,
    _templateMeta: {
      id: template.id,
      name: template.name,
      category: template.category
    }
  };
}

const TestTemplateService = {
  async listTemplates() {
    return templates;
  },
  async getCategories() {
    const cats = Array.from(new Set(templates.map(t => t.category)));
    return ["All", ...cats];
  },
  async getById(id) {
    return templates.find(t => t.id === id);
  },
  toTestData: mapToTestData,
  smartDefaults: computeSmartDefaults,
  iconMap
};

export default TestTemplateService;