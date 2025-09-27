const DECISION_RULES = {
  stop_test: {
    winner_found: {
      conditionFn: (ctx) => (ctx.confidence || 0) >= 95 && (ctx.sample_size || ctx.visitors || 0) >= (ctx.calculated_minimum || 0),
      recommendation: "✅ Stop and implement winner",
      explanation: "You have statistical significance with adequate sample size."
    },
    insufficient_difference: {
      conditionFn: (ctx) => (ctx.test_duration || 0) > 28 && (Math.abs(ctx.uplift || 0) < 2),
      recommendation: "⏹️ Stop test - difference too small",
      explanation: "After 4 weeks, the observed difference is too small to be meaningful. Test bigger changes."
    },
    degrading_performance: {
      conditionFn: (ctx) => (ctx.variant_conversion || 0) < (ctx.control_conversion || 0) && (ctx.confidence || 0) >= 95,
      recommendation: "🚫 Stop immediately - variant is hurting performance",
      explanation: "Your variant is significantly worse. Revert to control."
    },
    reached_sample_size: {
      conditionFn: (ctx) => (ctx.visitors || 0) >= (ctx.sample_size_calculated || 0) && (ctx.confidence || 0) < 90,
      recommendation: "🤔 Consider stopping - unlikely to reach significance",
      explanation: "You've reached your calculated sample size but no clear winner emerged."
    }
  },

  next_test_suggestions: [
    {
      id: "after_winner",
      conditionFn: (ctx) => ctx.status === "completed" && ctx.winner_declared === true,
      title: "What to test next",
      steps: [
        "Test a bolder version of your winner",
        "Apply the winning concept to other pages",
        "Test the opposite hypothesis to understand boundaries"
      ]
    },
    {
      id: "after_no_difference",
      conditionFn: (ctx) => ctx.status === "completed" && ctx.no_significant_difference === true,
      title: "Bigger changes recommended",
      steps: [
        "Test a more dramatic change",
        "Try a different element (e.g., headline vs. button)",
        "Combine multiple small changes into one test"
      ]
    },
    {
      id: "after_negative",
      conditionFn: (ctx) => (ctx.variant_conversion || 0) < (ctx.control_conversion || 0),
      title: "Variant underperformed",
      steps: [
        "Test the inverse of your change",
        "Break down the change into smaller elements",
        "Research user feedback before next test"
      ]
    }
  ],

  significance_diagnostics: {
    low_traffic: {
      conditionFn: (ctx) => (ctx.daily_visitors || 0) < 100,
      issue: "Traffic too low",
      recommendation: "Increase traffic allocation to 50/50 or test on higher-traffic pages",
    },
    small_effect: {
      conditionFn: (ctx) => Math.abs(ctx.uplift || 0) < (ctx.mde || 5),
      issue: "Effect size smaller than MDE",
      recommendation: "Test bigger changes or accept that small effects need larger sample sizes",
    },
    high_variance: {
      conditionFn: (ctx) => (ctx.conversion_rate_variance || 0) > 0.3,
      issue: "High variance in conversion rates",
      recommendation: "Segment analysis or run longer to smooth variance",
    },
    multiple_variants: {
      conditionFn: (ctx) => (ctx.variant_count || 0) > 3,
      issue: "Too many variants splitting traffic",
      recommendation: "Reduce to 2-3 variants for faster results",
    }
  },

  improve_velocity: [
    {
      id: "increase_traffic",
      conditionFn: (ctx) => (ctx.daily_visitors || 0) < 300,
      title: "Improve test velocity",
      steps: [
        "Increase traffic allocation to variants equally",
        "Run the test on a higher-traffic page"
      ]
    },
    {
      id: "reduce_variants",
      conditionFn: (ctx) => (ctx.variant_count || 0) > 2,
      title: "Too many variants",
      steps: [
        "Reduce to two variants (Control vs Variant)",
        "Pause the weakest performers"
      ]
    }
  ],

  interpret_results: [
    {
      id: "early_stage",
      conditionFn: (ctx) => (ctx.visitors_per_variant || 0) < 100 || (ctx.test_duration || 0) < 2,
      title: "Results are preliminary",
      steps: [
        "Wait for more data to reduce noise",
        "Aim for at least 100 visitors per variant"
      ]
    },
    {
      id: "winner_found",
      conditionFn: (ctx) => (ctx.confidence || 0) >= 95 && (ctx.variant_conversion || 0) > (ctx.control_conversion || 0),
      title: "Winner detected",
      steps: [
        "Implement the winning variant",
        "Plan a follow-up test to iterate on the win"
      ]
    }
  ],

  implementation_guidance: [
    {
      id: "how_to_ship",
      conditionFn: (ctx) => ctx.status === "completed" && ctx.winner_declared,
      title: "Implementation guidance",
      steps: [
        "Deploy the winning changes to production",
        "Monitor post-implementation metrics for 1-2 weeks"
      ]
    }
  ]
};

export default DECISION_RULES;