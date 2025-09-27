const HINT_RULES = [
  // BEGINNER
  {
    id: "first_test_template",
    category: "getting_started",
    priority: 100,
    dismissible: true,
    style: "banner",
    message: "Pro tip: Start with a template to launch your first test in under 5 minutes!",
    shouldShow: (ctx) => ctx.on_page === "TestsNew" && (ctx.tests_created || 0) === 0
  },
  {
    id: "understand_confidence",
    category: "getting_started",
    priority: 90,
    dismissible: true,
    style: "card",
    message: "Your test needs more data for reliable results. We'll notify you when it reaches 95% confidence.",
    shouldShow: (ctx) => ctx.on_page === "TestDetail" && ctx.first_test_has_results && (ctx.confidence || 0) < 0.95
  },
  {
    id: "enable_notifications",
    category: "optimization",
    priority: 85,
    dismissible: true,
    style: "banner",
    message: "Enable email notifications to know instantly when your tests reach significance.",
    shouldShow: (ctx) => (ctx.tests_completed || 0) >= 1 && ctx.notifications_disabled === true
  },

  // INTERMEDIATE
  {
    id: "try_segmentation",
    category: "advanced_features",
    priority: 70,
    dismissible: true,
    style: "card",
    message: "Did you know you can segment results by device and traffic source? Try it in the Segmentation tab!",
    shouldShow: (ctx) => (ctx.tests_created || 0) >= 3 && ctx.never_used_segmentation === true
  },
  {
    id: "use_hypothesis",
    category: "best_practices",
    priority: 60,
    dismissible: true,
    style: "banner",
    message: "Tests with clear hypotheses have better success rates. Add one to your next test!",
    shouldShow: (ctx) => (ctx.tests_without_hypothesis || 0) >= 2 && ctx.on_page === "TestsNew"
  },
  {
    id: "discover_ai_insights",
    category: "advanced_features",
    priority: 50,
    dismissible: true,
    style: "card",
    message: "Get personalized recommendations from AI Insights about why your test won.",
    shouldShow: (ctx) => (ctx.tests_with_winner || 0) >= 1 && ctx.never_viewed_ai_insights === true
  },

  // ADVANCED
  {
    id: "bulk_operations",
    category: "advanced_features",
    priority: 30,
    dismissible: true,
    style: "banner",
    message: "Save time with bulk operations: pause, archive, or export multiple tests at once.",
    shouldShow: (ctx) => (ctx.tests_created || 0) >= 10 && ctx.on_page === "Tests"
  },
  {
    id: "custom_confidence",
    category: "optimization",
    priority: 25,
    dismissible: true,
    style: "banner",
    message: "Consider adjusting confidence levels for different test types. Low-risk tests can use 90%.",
    shouldShow: (ctx) => (ctx.tests_created || 0) >= 15 && ctx.always_uses_95_confidence === true
  },
  {
    id: "test_velocity",
    category: "optimization",
    priority: 20,
    dismissible: true,
    style: "card",
    message: "Your tests are running long. Consider testing bigger changes or increasing traffic allocation.",
    shouldShow: (ctx) => (ctx.avg_test_duration_days || 0) > 30 && ctx.on_page === "Dashboard"
  }
];

export default HINT_RULES;