import { ABTest } from "@/api/entities";

const ConflictDetectionService = {
  async findConflicts({ test_url, exclude_test_id, organization_id }) {
    if (!test_url || !organization_id) return [];
    const running = await ABTest.filter({ organization_id, test_status: "running", test_url });
    const conflicts = (running || []).filter(t => t.id !== exclude_test_id);
    return conflicts.map(t => ({
      id: t.id,
      test_name: t.test_name,
      severity: "high",
      reason: "Another running test on the same URL",
      url: t.test_url
    }));
  }
};

export default ConflictDetectionService;