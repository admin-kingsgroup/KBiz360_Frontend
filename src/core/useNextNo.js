import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';
import { useSaveRefresh } from './hooks';

// Live "next number" PREVIEW for an entry form, per (branch × voucher type). Auto-
// numbering is server-side and atomic; this shows the number the next save will most
// likely receive — advisory only, the guaranteed-unique number is assigned at save
// (and the save toast shows the confirmed one). Re-previews after every save (the
// useSaveRefresh tick) so the displayed number advances to the next. Falls back to
// 'Auto' until it loads, for a consolidated/unknown branch, or if the preview fails.
//   branch: a branch object or code string;  type: the voucher type/prefix (JV, RV…)
export function useVNo(branch, type) {
  const tick = useSaveRefresh();                                  // bump → re-preview
  const code = (branch && typeof branch === 'object') ? (branch.code || '') : (branch || '');
  const enabled = !!code && code !== 'ALL' && !!type;
  const { data } = useQuery({
    queryKey: ['nextVno', code, type, tick],
    queryFn: () => apiGet('/api/numbering-series/next', { branch: code, type }),
    enabled,
    staleTime: 0,
    retry: false,
  });
  return (data && data.next) || 'Auto';
}
