import { apiGet } from '../../../core/api';

// The current user's read-only role briefing (role, profile, live controls).
export async function getMyRole() {
  try {
    return (await apiGet('/api/tk/my-role')) || null;
  } catch {
    return null;
  }
}
