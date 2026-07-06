import { useQuery } from '@tanstack/react-query';
import { getMyRole } from './api/myRole';

// ─── TK GROUP · FE · resolve the central-relocate control for the caller ──────
// When 'branch.central_relocated' is ON, the Branch Accountant's central screens
// (masters, approval authority, money-out release, period-close) are stripped from
// their menu — they live in TK Group Central instead. Mirrors useHideStatements:
// only a Branch Accountant queries (everyone else short-circuits to false, no call),
// shares the same ['tk','my-role'] query (deduped), and is DORMANT-safe — flag off →
// activeControls empty → false → the menu is unchanged. The shell folds the result
// onto currentUser.relocateCentral, which getVisibleMenu reads.
export function useRelocateCentral(currentUser) {
  const isAccountant = /accountant/i.test((currentUser && currentUser.role) || '');
  const q = useQuery({
    queryKey: ['tk', 'my-role'],
    queryFn: getMyRole,
    enabled: isAccountant,
    staleTime: 5 * 60_000,
  });
  if (!isAccountant) return false;
  const controls = (q.data && q.data.activeControls) || [];
  return controls.includes('branch.central_relocated');
}
