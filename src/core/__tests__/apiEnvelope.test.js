// Regression: apiGet's envelope unwrap must PRESERVE top-level siblings (gp-bills
// returns a bare-array `data` + a `byBranch` sibling; dropping it broke the
// consolidated GP report which read `GP_DATA.byBranch`).
import { unwrapEnvelope } from '../apiEnvelope';

describe('unwrapEnvelope', () => {
  test('unwraps a plain { success, data } envelope', () => {
    expect(unwrapEnvelope({ success: true, data: { a: 1 } })).toEqual({ a: 1 });
  });

  test('preserves a top-level sibling (byBranch) on a bare-array data', () => {
    const byBranch = [{ branch: 'BOM', rows: [] }, { branch: 'NBO', rows: [] }];
    const out = unwrapEnvelope({ success: true, data: [{ id: 1 }], byBranch });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBe(1);
    expect(out.byBranch).toBe(byBranch); // ← rides along, not dropped
  });

  test('does not clobber a key that already exists on data', () => {
    const out = unwrapEnvelope({ success: true, data: { byBranch: 'own' }, byBranch: 'sibling' });
    expect(out.byBranch).toBe('own');
  });

  test('ignores success/message siblings', () => {
    const out = unwrapEnvelope({ success: true, message: 'ok', data: [] });
    expect(out.success).toBeUndefined();
    expect(out.message).toBeUndefined();
  });

  test('passes through a non-envelope value unchanged', () => {
    expect(unwrapEnvelope([1, 2, 3])).toEqual([1, 2, 3]);
    expect(unwrapEnvelope(null)).toBeNull();
    expect(unwrapEnvelope('x')).toBe('x');
  });
});
