export function normalizeABTest(test) {
  if (!test || typeof test !== "object") return test;

  // Map common alias fields to the canonical schema used in entities/ABTest.json
  const normalized = {
    ...test,

    // Canonical fields (fallbacks from possible legacy/alias names)
    test_name: test.test_name ?? test.name ?? test.title,
    test_status: test.test_status ?? test.status,
    test_type: test.test_type ?? test.type,
    test_url: test.test_url ?? test.page_url ?? test.url,

    // In schema this is "description"
    description: test.description ?? test.test_description ?? test.hypothesis ?? test.test_hypothesis,

    // Dates in schema are started_date / ended_date
    started_date: test.started_date ?? test.test_start_date ?? test.start_date,
    ended_date: test.ended_date ?? test.test_end_date ?? test.end_date,

    // Visitors alias fallback
    total_visitors: test.total_visitors ?? test.visitors,

    // Tags passthrough
    tags: Array.isArray(test.tags) ? test.tags : (typeof test.tags === "string" ? test.tags.split(",").map(s => s.trim()).filter(Boolean) : test.tags),
  };

  // Normalize variants if present
  if (Array.isArray(test.variants)) {
    normalized.variants = test.variants.map(v => normalizeVariant(v));
  }

  return normalized;
}

export function normalizeVariant(variant) {
  if (!variant || typeof variant !== "object") return variant;

  return {
    ...variant,
    variant_name: variant.variant_name ?? variant.name ?? variant.label,
    // Canonical "variant_type" is either "control" or "treatment"
    variant_type: variant.variant_type ?? (variant.is_control === true ? "control" : (variant.type ?? "treatment")),
    is_control: variant.is_control ?? (variant.variant_type === "control"),
    content: variant.content ?? variant.url ?? variant.code ?? "",
    traffic_percentage: typeof variant.traffic_percentage === "number"
      ? variant.traffic_percentage
      : (typeof variant.traffic_allocation === "number" ? variant.traffic_allocation : undefined),
  };
}