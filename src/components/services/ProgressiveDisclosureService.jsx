
import { User } from "@/api/entities";

const LS_KEYS = {
  seen: "qs_hints_seen",
  dismissed: "qs_hints_dismissed",
  lastByCategory: "qs_hints_last_by_category",
  lastAny: "qs_last_hint_shown_at",
  features: "qs_features_used",
};

function nowIso() {
  return new Date().toISOString();
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getTime();
}

function getLocalJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);

    // If the caller expects an array, ensure we return an array
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    // If the caller expects an object, ensure we return a plain object
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    }

    // Otherwise return whatever was parsed
    return parsed;
  } catch {
    return fallback;
  }
}
function setLocalJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function frequencyToCooldown(freq) {
  // hours between hints
  switch (freq) {
    case "high": return 6;
    case "low": return 48;
    case "off": return Infinity;
    case "medium":
    default:
      return 24;
  }
}

const ProgressiveDisclosureService = {
  async loadUserPrefs() {
    try {
      const me = await User.me();
      return {
        id: me.id,
        hint_frequency: me.hint_frequency || "medium",
        hint_categories_hidden: me.hint_categories_hidden || [],
        experience_level: me.experience_level || "beginner",
        hints_seen: me.hints_seen || [],
        hints_dismissed: me.hints_dismissed || [],
        features_used: me.features_used || {},
        last_hint_shown_at: me.last_hint_shown_at || null,
        total_hints_shown: me.total_hints_shown || 0,
        onboarding_score: me.onboarding_score || 0,
      };
    } catch {
      return {
        hint_frequency: "medium",
        hint_categories_hidden: [],
        experience_level: "beginner",
        hints_seen: [],
        hints_dismissed: [],
        features_used: {},
        last_hint_shown_at: null,
        total_hints_shown: 0,
        onboarding_score: 0,
      };
    }
  },

  async saveUserPrefs(patch) {
    try {
      await User.updateMyUserData(patch);
    } catch {
      // ignore
    }
  },

  deriveExperienceLevel({ testsCreated = 0, advancedUsed = 0, totalWinners = 0 }) {
    if (testsCreated >= 25 || advancedUsed >= 5) return "expert";
    if (testsCreated >= 10) return "advanced";
    if (testsCreated >= 3) return "intermediate";
    return "beginner";
  },

  isEligibleToShow({ frequency = "medium", lastShownAt }) {
    const cooldownHrs = frequencyToCooldown(frequency);
    if (cooldownHrs === Infinity) return false;
    if (!lastShownAt) return true;
    const last = new Date(lastShownAt).getTime();
    return (Date.now() - last) >= cooldownHrs * 60 * 60 * 1000;
  },

  categoryCooldownOk(category) {
    const lastByCategory = getLocalJSON(LS_KEYS.lastByCategory, {});
    const last = lastByCategory[category] ? new Date(lastByCategory[category]).getTime() : 0;
    return Date.now() - last > 24 * 60 * 60 * 1000; // 24h per category
  },

  async getNextHint({ rules, context }) {
    const prefs = await this.loadUserPrefs();
    const seen = new Set([...(prefs.hints_seen || []), ...(getLocalJSON(LS_KEYS.seen, []))]);
    const dismissed = new Set([...(prefs.hints_dismissed || []), ...(getLocalJSON(LS_KEYS.dismissed, []))]);
    const hiddenCats = new Set(prefs.hint_categories_hidden || []);

    if (!this.isEligibleToShow({ frequency: prefs.hint_frequency, lastShownAt: prefs.last_hint_shown_at })) {
      return null;
    }

    // Evaluate rules in priority order
    const eligible = (rules || [])
      .filter(r => !seen.has(r.id) || r.repeatable)
      .filter(r => !dismissed.has(r.id))
      .filter(r => !hiddenCats.has(r.category))
      .filter(r => (typeof r.shouldShow === "function" ? r.shouldShow(context) : false))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const hint of eligible) {
      if (!this.categoryCooldownOk(hint.category)) continue;
      return hint;
    }
    return null;
  },

  async markShown(hint) {
    // Persist last shown timestamps
    const lastByCategory = getLocalJSON(LS_KEYS.lastByCategory, {});
    lastByCategory[hint.category] = nowIso();
    setLocalJSON(LS_KEYS.lastByCategory, lastByCategory);
    setLocalJSON(LS_KEYS.seen, Array.from(new Set([...(getLocalJSON(LS_KEYS.seen, [])), hint.id])));

    await this.saveUserPrefs({
      last_hint_shown_at: nowIso(),
      total_hints_shown: (await this.loadUserPrefs()).total_hints_shown + 1,
      hints_seen: Array.from(new Set([...(await this.loadUserPrefs()).hints_seen, hint.id])),
    });
  },

  async dismiss(hintId) {
    const dismissed = Array.from(new Set([...(getLocalJSON(LS_KEYS.dismissed, [])), hintId]));
    setLocalJSON(LS_KEYS.dismissed, dismissed);
    await this.saveUserPrefs({
      hints_dismissed: Array.from(new Set([...(await this.loadUserPrefs()).hints_dismissed, hintId])),
      last_hint_shown_at: nowIso(),
    });
  },

  async resetAll() {
    setLocalJSON(LS_KEYS.seen, []);
    setLocalJSON(LS_KEYS.dismissed, []);
    setLocalJSON(LS_KEYS.lastByCategory, {});
    await this.saveUserPrefs({
      hints_seen: [],
      hints_dismissed: [],
      last_hint_shown_at: null,
      total_hints_shown: 0,
    });
  },

  async recordFeatureUse(key) {
    const local = getLocalJSON(LS_KEYS.features, {});
    local[key] = (local[key] || 0) + 1;
    setLocalJSON(LS_KEYS.features, local);
    const prefs = await this.loadUserPrefs();
    const next = { ...(prefs.features_used || {}) };
    next[key] = (next[key] || 0) + 1;
    await this.saveUserPrefs({ features_used: next });
  }
};

export default ProgressiveDisclosureService;
