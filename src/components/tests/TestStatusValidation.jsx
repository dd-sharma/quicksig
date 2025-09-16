import { ActivityLog } from '@/api/entities';

export const validateStatusTransition = (currentStatus, newStatus, variants = []) => {
  const validTransitions = {
    draft: ['running'],
    running: ['paused', 'completed'],
    paused: ['running', 'completed'],
    completed: ['archived'],
    archived: []
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot change status from ${currentStatus} to ${newStatus}`
    };
  }

  // Additional validation for draft → running
  if (currentStatus === 'draft' && newStatus === 'running') {
    if (variants.length < 2) {
      return {
        valid: false,
        error: 'Test must have at least 2 variants to launch'
      };
    }

    const totalTraffic = variants.reduce((sum, v) => sum + v.traffic_percentage, 0);
    if (Math.abs(totalTraffic - 100) > 0.1) {
      return {
        valid: false,
        error: 'Traffic allocation must total 100% to launch'
      };
    }
  }

  return { valid: true };
};

export const getStatusWarning = (test, variants = []) => {
  const now = new Date();
  const createdDate = new Date(test.created_date);
  const startedDate = test.started_date ? new Date(test.started_date) : null;
  
  const daysSinceCreated = (now - createdDate) / (1000 * 60 * 60 * 24);
  const daysSinceStarted = startedDate ? (now - startedDate) / (1000 * 60 * 60 * 24) : 0;

  if (test.test_status === 'draft' && daysSinceCreated > 3) {
    return {
      type: 'warning',
      message: 'This draft has been sitting for 3+ days. Ready to launch?'
    };
  }

  if (test.test_status === 'running' && daysSinceStarted > 30) {
    return {
      type: 'info',
      message: 'This test has been running for 30+ days. Consider completing it.'
    };
  }

  if (test.test_status === 'paused' && daysSinceStarted > 7) {
    return {
      type: 'warning',
      message: 'This test has been paused for over 7 days. Resume or complete it?'
    };
  }

  return null;
};

export const logStatusChange = async (user, test, oldStatus, newStatus) => {
  try {
    await ActivityLog.create({
      user_id: user.id,
      organization_id: test.organization_id,
      action_description: `changed test "${test.test_name}" status from ${oldStatus} to ${newStatus}`,
      entity_type: 'ABTest',
      entity_id: test.id
    });
  } catch (error) {
    console.error('Failed to log status change:', error);
  }
};