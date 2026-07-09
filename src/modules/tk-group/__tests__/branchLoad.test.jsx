import { branchLoadState } from '../utils/branchLoad';

const VIEW = [{ code: 'BOM' }, { code: 'NBO' }, { code: 'DAR' }];
const ok = { isError: false, isLoading: false };
const err = { isError: true, isLoading: false };
const loading = { isError: false, isLoading: true };

describe('branchLoadState (single fan-out)', () => {
  test('all ok → no failures, not loading, not allFailed', () => {
    expect(branchLoadState([ok, ok, ok], VIEW)).toEqual({ loading: false, allFailed: false, failedCodes: [] });
  });
  test('one branch errored → named in failedCodes, allFailed false', () => {
    expect(branchLoadState([ok, err, ok], VIEW)).toEqual({ loading: false, allFailed: false, failedCodes: ['NBO'] });
  });
  test('every branch errored → allFailed true, all named', () => {
    expect(branchLoadState([err, err, err], VIEW)).toEqual({ loading: false, allFailed: true, failedCodes: ['BOM', 'NBO', 'DAR'] });
  });
  test('any loading → loading true (a not-yet-errored branch is not dropped)', () => {
    expect(branchLoadState([ok, loading, ok], VIEW)).toMatchObject({ loading: true, allFailed: false, failedCodes: [] });
  });
  test('empty roster → allFailed false (never a false error on no branches)', () => {
    expect(branchLoadState([], []).allFailed).toBe(false);
  });
});

describe('branchLoadState (dual fan-out — a branch fails if EITHER leg errors)', () => {
  test('one leg errors on one branch → that branch dropped/named; allFailed false', () => {
    expect(branchLoadState([ok, err, ok], VIEW, [ok, ok, ok]))
      .toEqual({ loading: false, allFailed: false, failedCodes: ['NBO'] });
  });
  test('allFailed = EVERY branch dropped, for any reason (covers one-endpoint-down)', () => {
    // both legs down everywhere → every branch dropped
    expect(branchLoadState([err, err, err], VIEW, [err, err, err]).allFailed).toBe(true);
    // ONE endpoint down for all branches, the other up → every row still drops → allFailed true
    // (this is the fix: the table shows a real error instead of a silently-empty table)
    expect(branchLoadState([err, err, err], VIEW, [ok, ok, ok]).allFailed).toBe(true);
    // a genuine survivor (both legs ok on DAR) → not allFailed
    expect(branchLoadState([err, err, ok], VIEW, [err, ok, ok]))
      .toMatchObject({ allFailed: false, failedCodes: ['BOM', 'NBO'] });
  });
});
