import { apiGet, apiPost } from '../../../core/api';

// Current period locks (oversight) + proposing a new lock. Reads fail soft to an
// empty list so the page can never break; setting a lock is a change-request
// (type 'period_lock', Farhan + Owner), never a direct write.
export async function getPeriodLocks() {
  try {
    return (await apiGet('/api/tk/period-locks')) || { items: [] };
  } catch {
    return { items: [] };
  }
}

export async function proposePeriodLock({ branch, period, status = 'hard', reason = '' }) {
  return apiPost('/api/tk/change-requests', {
    type: 'period_lock',
    branch,
    payload: { after: { branch, period, status, reason } },
  });
}
