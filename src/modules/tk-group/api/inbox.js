import { apiGet } from '../../../core/api';

// Pending change-requests waiting on the current user → drives the app-bar badge and
// the inbox panel. Fails soft to an empty inbox so it can never break the shell.
export async function getInbox() {
  try {
    return (await apiGet('/api/tk/inbox')) || { count: 0, items: [] };
  } catch {
    return { count: 0, items: [] };
  }
}
