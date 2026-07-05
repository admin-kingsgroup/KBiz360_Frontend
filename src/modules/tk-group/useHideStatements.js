import { useQuery } from '@tanstack/react-query';
import { getMyRole } from './api/myRole';

// ─── TK GROUP · FE · resolve the hide-statements control for the caller ───────
// Only a Branch Accountant can be restricted, and only they query (everyone else
// short-circuits to false without a network call). The control state comes from
// /api/tk/my-role → activeControls (auth-only, so an accountant can read their own
// restriction). DORMANT-safe: flag off → activeControls empty → false → the menu is
// unchanged. The shell folds the result onto currentUser.hideStatements.
export function useHideStatements(currentUser) {
  const isAccountant = /accountant/i.test((currentUser && currentUser.role) || '');
  const q = useQuery({
    queryKey: ['tk', 'my-role'],
    queryFn: getMyRole,
    enabled: isAccountant,
    staleTime: 5 * 60_000,
  });
  if (!isAccountant) return false;
  const controls = (q.data && q.data.activeControls) || [];
  return controls.includes('branch.hide_statements');
}
