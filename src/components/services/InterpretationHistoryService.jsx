import { AIInterpretation } from "@/api/entities";

const MIN_CONF_DELTA = 0.02; // 2%
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const lastSaved = new Map(); // testId -> { ts, confidence, visitors }

const InterpretationHistoryService = {
  async recordSnapshot(testId, interpretation, visitors, confidence) {
    const key = String(testId);
    const prev = lastSaved.get(key);
    const now = Date.now();

    const shouldSave =
      !prev ||
      (now - prev.ts) > MIN_INTERVAL_MS ||
      Math.abs((confidence || 0) - (prev.confidence || 0)) >= MIN_CONF_DELTA ||
      (visitors || 0) > (prev.visitors || 0);

    if (!shouldSave) return false;

    await AIInterpretation.create({
      ab_test_id: testId,
      interpretation_json: interpretation,
      confidence_at_time: confidence || 0,
      visitors_at_time: visitors || 0,
      created_at: new Date().toISOString()
    });

    lastSaved.set(key, { ts: now, confidence: confidence || 0, visitors: visitors || 0 });
    return true;
  },

  async getHistory(testId, limit = 50) {
    const rows = await AIInterpretation.filter({ ab_test_id: testId }, "-created_at", limit);
    return rows.slice().reverse(); // oldest -> newest
  }
};

export default InterpretationHistoryService;