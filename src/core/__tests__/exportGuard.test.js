import {
  readExportPolicy, canExport, guardExport, configureExportGuard, setExportPolicy, _resetExportGuard, EXPORT_FLAGS,
} from '../exportGuard';

afterEach(() => _resetExportGuard());

describe('readExportPolicy', () => {
  test('all OFF by default (dormant)', () => {
    expect(readExportPolicy({ flags: {} })).toEqual({ restrict: false, blockBranchGroupExport: false, logAll: false });
    expect(readExportPolicy(null)).toEqual({ restrict: false, blockBranchGroupExport: false, logAll: false });
  });
  test('reads enabled + foundation flags', () => {
    const state = { flags: {
      [EXPORT_FLAGS.restrict]: { enabled: true },
      [EXPORT_FLAGS.blockBranchGroup]: { foundation: true },
      [EXPORT_FLAGS.logAll]: { enabled: false },
    } };
    expect(readExportPolicy(state)).toEqual({ restrict: true, blockBranchGroupExport: true, logAll: false });
  });
});

describe('canExport', () => {
  test('dormant policy → always allowed', () => {
    expect(canExport({ user: null, meta: { scope: 'group' }, policy: {} }).allowed).toBe(true);
  });
  test('restrict blocks a view-only user and unknown roles, allows permitted roles', () => {
    const policy = { restrict: true };
    expect(canExport({ user: { role: 'Finance Manager' }, policy }).allowed).toBe(true);
    expect(canExport({ user: { role: 'Branch Accountant' }, policy }).allowed).toBe(false);
    expect(canExport({ user: { role: 'Finance Manager', viewOnly: true }, policy }).allowed).toBe(false);
  });
  test('blockBranchGroupExport blocks a branch user from a group report, not a central user', () => {
    const policy = { blockBranchGroupExport: true };
    expect(canExport({ user: { branches: ['BOM'] }, meta: { scope: 'group' }, policy }).allowed).toBe(false);
    expect(canExport({ user: { branches: 'ALL' }, meta: { scope: 'group' }, policy }).allowed).toBe(true);
    expect(canExport({ user: { branches: ['BOM'] }, meta: { scope: 'branch' }, policy }).allowed).toBe(true); // branch report is fine
  });
});

describe('guardExport', () => {
  test('dormant (unconfigured) → runs the export and returns its result', () => {
    const run = jest.fn(() => 'done');
    expect(guardExport({ report: 'Ledger' }, run)).toBe('done');
    expect(run).toHaveBeenCalledTimes(1);
  });

  test('blocked → does NOT run, notifies, returns false', () => {
    const notify = jest.fn();
    configureExportGuard({ getUser: () => ({ role: 'Branch Accountant' }), notify });
    setExportPolicy({ restrict: true });
    const run = jest.fn();
    expect(guardExport({ report: 'P&L' }, run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/blocked/i));
  });

  test('logAll → logs allowed AND blocked exports with actor + verdict', () => {
    const log = jest.fn();
    configureExportGuard({ getUser: () => ({ role: 'Finance Manager', email: 'faiz@x.com' }), log });
    setExportPolicy({ logAll: true });
    guardExport({ report: 'Ledger', scope: 'branch', rowCount: 5 }, () => {});
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ report: 'Ledger', allowed: true, email: 'faiz@x.com', role: 'Finance Manager' }));

    log.mockClear();
    setExportPolicy({ logAll: true, restrict: true });
    configureExportGuard({ getUser: () => ({ role: 'Branch Accountant' }) });
    guardExport({ report: 'P&L' }, () => {});
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ allowed: false }));
  });

  test('does not log when logAll is off (no network in dormant mode)', () => {
    const log = jest.fn();
    configureExportGuard({ log });
    setExportPolicy({ restrict: false });
    guardExport({ report: 'Ledger' }, () => {});
    expect(log).not.toHaveBeenCalled();
  });
});
