import { apiGet, apiPost } from '../../../core/api';

// Break-Glass emergency access sessions. Fails soft to an empty list.
export async function getBreakglass() {
  try {
    return (await apiGet('/api/tk/breakglass')) || { items: [], activeCount: 0 };
  } catch {
    return { items: [], activeCount: 0 };
  }
}
export async function invokeBreakglass(body) { return apiPost('/api/tk/breakglass', body); }
export async function endBreakglass(id) { return apiPost(`/api/tk/breakglass/${id}/end`); }
