import { apiGet } from '../../../core/api';

// The current user's read-only role briefing (role, profile, live controls).
export async function getMyRole() {
  try {
    return (await apiGet('/api/tk/my-role')) || null;
  } catch {
    return null;
  }
}

// The whole org's roles & responsibilities (shareable) + which role is "you".
export async function getAllRoles() {
  try {
    return (await apiGet('/api/tk/my-role/all')) || { youAre: '', roles: [] };
  } catch {
    return { youAre: '', roles: [] };
  }
}
