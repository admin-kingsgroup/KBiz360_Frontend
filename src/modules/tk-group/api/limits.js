import { apiGet, apiPost } from '../../../core/api';

// The live thresholds & limits + editor metadata. Editing files an Owner change-request
// (type 'config', key 'tklimits'); applied by the backend only on Owner approval.
export async function getLimits() {
  try {
    return (await apiGet('/api/tk/limits')) || { limits: {}, fields: [] };
  } catch {
    return { limits: {}, fields: [] };
  }
}

export async function proposeLimits(values) {
  return apiPost('/api/tk/change-requests', { type: 'config', payload: { after: { key: 'tklimits', value: values } } });
}
