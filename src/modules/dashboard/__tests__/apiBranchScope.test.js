// The branch-selector rule applied to dashboard data accessors: a branchCode →
// only that branch; null/undefined (Group / TK HO Group) → all branches.
// Previously these three hit /api/vouchers (or /api/branches) with NO branch
// filter, so the "by branch" tables showed every branch even when one was selected.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn() }));
import { apiGet } from '../../../core/api';
import { getTodayVouchersByBranch, getRecentActivity } from '../api/get-voucher-activity';
import { getPeriodClose } from '../api/get-finance-snapshot';

afterEach(() => jest.clearAllMocks());

describe("getTodayVouchersByBranch — forwards the selector's branch", () => {
  test('a branch code is sent to /api/vouchers', async () => {
    apiGet.mockResolvedValue([]);
    await getTodayVouchersByBranch('NBO');
    expect(apiGet).toHaveBeenCalledWith('/api/vouchers', expect.objectContaining({ branch: 'NBO' }));
  });

  test('Group (no branch) sends branch undefined ⇒ backend returns all', async () => {
    apiGet.mockResolvedValue([]);
    await getTodayVouchersByBranch(undefined);
    expect(apiGet).toHaveBeenCalledWith('/api/vouchers', expect.objectContaining({ branch: undefined }));
  });
});

describe('getRecentActivity — forwards the branch', () => {
  test('passes the branch through', async () => {
    apiGet.mockResolvedValue([]);
    await getRecentActivity('DAR');
    expect(apiGet).toHaveBeenCalledWith('/api/vouchers', expect.objectContaining({ branch: 'DAR' }));
  });
});

describe('getPeriodClose — table rows follow the selector', () => {
  const wireApi = () => apiGet.mockImplementation((url) => {
    if (url === '/api/branches') return Promise.resolve([
      { code: 'BOM', active: true }, { code: 'NBO', active: true }, { code: 'DAR', active: true },
    ]);
    return Promise.resolve([]); // /api/vouchers pending → none ⇒ all closed
  });

  test('Group (no branch) → a row per branch', async () => {
    wireApi();
    const rows = await getPeriodClose();
    expect(rows.map((r) => r.branch)).toEqual(['BOM', 'NBO', 'DAR']);
  });

  test('a specific branch → only that branch row', async () => {
    wireApi();
    const rows = await getPeriodClose('NBO');
    expect(rows.map((r) => r.branch)).toEqual(['NBO']);
    // and the pending-voucher query is scoped to that branch too
    expect(apiGet).toHaveBeenCalledWith('/api/vouchers', expect.objectContaining({ branch: 'NBO' }));
  });
});
