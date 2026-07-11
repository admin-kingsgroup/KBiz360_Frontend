// Tally Reconciliation (whole-books tie-out) — the new top-level pill exists and
// carries the two tier tie-outs, its routes resolve, and the board renders the
// three side-by-side views from mocked tie-out data (incl. an only-in-Tally row).
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getPeriods: jest.fn(() => Promise.resolve([{ period: '2026-07', tier: 'month', ledgers: 4 }])),
  getInception: jest.fn(() => Promise.resolve('2025-01-01')),
  importTB: jest.fn(),
  clearTB: jest.fn(),
  importDayBook: jest.fn(() => Promise.resolve({ inserted: 0, ledgers: 0 })),
  getDayBookStatus: jest.fn(() => Promise.resolve({ vouchers: 0, ledgers: 0 })),
  getDefects: jest.fn(() => Promise.resolve({
    branch: 'BOM', period: '2026-07', tier: 'month', offLedgers: 3,
    summary: { total: 1, byType: { 'missing-in-erp': 1 } },
    defects: [{ ledger: 'HDFC Bank A/c', date: '2026-07-09', ref: '', desc: 'Bank charge', type: 'missing-in-erp', label: 'In Tally, not ERP', amount: -5000, variance: 0, side: 'tally' }],
  })),
  getTallyCert: jest.fn(() => Promise.resolve({
    certificate: null,
    chain: [{ role: 'AE' }, { role: 'FM' }, { role: 'Director' }, { role: 'Owner' }],
    progress: { done: 0, total: 4, next: { role: 'AE' } },
    canSign: { ok: false, reason: 'freeze the tie-out first' },
  })),
  freezeTallyCert: jest.fn(),
  signTallyCert: jest.fn(),
  reopenTallyCert: jest.fn(() => Promise.resolve({ certificate: { status: 'open', signatures: [] } })),
  acceptVariance: jest.fn(() => Promise.resolve({ rows: [], counts: {} })),
  clearVariance: jest.fn(() => Promise.resolve({ rows: [], counts: {} })),
  getLedgerVouchers: jest.fn(() => Promise.resolve({
    ledger: 'HDFC Bank A/c', branch: 'BOM', period: '2026-07', tier: 'month', from: '2026-07-01', to: '2026-07-31',
    erpBalance: 810000, tallyImported: 2, summary: { total: 1 },
    lines: [
      { date: '2026-07-02', ref: 'PAY/0412', desc: 'BSP settlement', erp: -200000, tally: -200000, status: 'matched', variance: 0 },
      { date: '2026-07-09', ref: '', desc: 'Bank charge', erp: null, tally: -5000, status: 'only-tally', variance: 0 },
    ],
    defects: [{ ledger: 'HDFC Bank A/c', date: '2026-07-09', ref: '', desc: 'Bank charge', type: 'missing-in-erp', amount: -5000 }],
  })),
  getTieOut: jest.fn(() => Promise.resolve({
    branch: 'BOM', period: '2026-07', tier: 'month', periodEnd: '2026-07-31',
    counts: { total: 4, tied: 0, off: 3, onlyErp: 0, onlyTally: 1, absDiff: 138000, netProfitErp: -200000, netProfitTally: -324000 },
    erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 4 },
    rows: [
      { ledger: 'BSP / IATA', code: 'C1', group: 'Sundry Creditors', parentGroup: 'Sundry Creditors', statement: 'BS', nature: 'liability', erp: null, tally: -9000, diff: 9000, status: 'only-tally' },
      { ledger: 'HDFC Bank A/c', code: 'B2', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 810000, tally: 805000, diff: 5000, status: 'off' },
      { ledger: 'Air Ticket Sales', code: 'S1', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: -2000000, tally: -1885000, diff: -115000, status: 'off' },
      { ledger: 'Air Ticket Purchase', code: 'P1', group: 'Purchase Accounts', parentGroup: 'Purchase Accounts', statement: 'PL', nature: 'expense', erp: 2200000, tally: 2209000, diff: -9000, status: 'off' },
    ],
  })),
}));

import { TallyTieOutBoard } from '../TallyTieOutBoard';
import { CertifyPanel } from '../CertifyPanel';
import { TallyGuidePage } from '../TallyGuidePage';
import { tallyReconRoutes } from '../routes';
import { MENU_TALLY_RECON, getMenu } from '../../../core/menus';
import { crumbsFor } from '../../../core/routeMeta';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><React.Suspense fallback={<div>loading…</div>}>{ui}</React.Suspense></QueryClientProvider>);
};
const allHrefs = (n, out = []) => { if (!n) return out; if (n.href) out.push(n.href); (n.children || []).forEach((c) => allHrefs(c, out)); return out; };

describe('Tally Reconciliation · pill + routes', () => {
  test('the pill consolidates everything Tally — tie-outs, the Day Book matcher, and the guide', () => {
    expect(MENU_TALLY_RECON.label).toBe('Tally Reconciliation');
    expect(allHrefs(MENU_TALLY_RECON)).toEqual([
      '/tally-reconciliation/monthly', '/tally-reconciliation/yearly', // Tie-Out
      '/accounts/tally-reco',                                          // Vouchers · Day Book matcher (moved in)
      '/tally-reconciliation/guide',                                   // Help · staff guide
    ]);
  });
  test('appears in the full menu for a Super Admin', () => {
    const labels = getMenu('ALL', { role: 'Super Admin' }).map((m) => m.label);
    expect(labels).toContain('Tally Reconciliation');
  });
  test('every /tally-reconciliation pill href resolves to a route (+ bare path)', () => {
    const paths = tallyReconRoutes.map((r) => r.path);
    // The Ledger Matcher keeps its legacy /accounts/tally-reco route (App.jsx), so
    // only the module's own /tally-reconciliation/* hrefs live in this route table.
    allHrefs(MENU_TALLY_RECON).filter((h) => h.startsWith('/tally-reconciliation')).forEach((h) => expect(paths).toContain(h));
    expect(paths).toContain('/tally-reconciliation/guide');
    expect(paths).toContain('/tally-reconciliation');
  });
  test('breadcrumbs resolve the moved leaf + the guide under the Tally Reconciliation pill', () => {
    expect(crumbsFor('/accounts/tally-reco').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Vouchers', 'Ledger Matcher (Day Book)']);
    expect(crumbsFor('/tally-reconciliation/guide').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Help', 'Tally Reconciliation Guide']);
  });
  test('the staff Guide page renders', () => {
    wrap(<TallyGuidePage setRoute={() => {}} />);
    expect(screen.getByText('Tally Reconciliation Guide')).toBeInTheDocument();
    expect(screen.getByText(/What to export from Tally/i)).toBeInTheDocument();
  });
});

describe('Tally Reconciliation · tie-out board render', () => {
  test('monthly board: KPIs, the ledger rows, and tab switching', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('Tally Reconciliation · Monthly Tie-Out')).toBeInTheDocument();
    expect(screen.getByText('In scope')).toBeInTheDocument();
    // Trial Balance tab (default) — an off ledger and an only-in-Tally ledger both show.
    expect(await screen.findByText('HDFC Bank A/c')).toBeInTheDocument();
    expect(screen.getByText('BSP / IATA')).toBeInTheDocument();
    // Switch to the P&L view — income/expense ledgers appear.
    fireEvent.click(screen.getByText('Profit & Loss'));
    expect(await screen.findByText('Air Ticket Sales')).toBeInTheDocument();
    expect(screen.getByText('Air Ticket Purchase')).toBeInTheDocument();
    // The Bank ledger belongs to the Balance Sheet, not the P&L view.
    expect(screen.queryByText('HDFC Bank A/c')).not.toBeInTheDocument();
  });

  test('yearly board renders its own title', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="year" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('Tally Reconciliation · Yearly Tie-Out')).toBeInTheDocument();
  });

  test('Defects tab shows the classified Defect Register (Phase 2)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    fireEvent.click(screen.getByRole('button', { name: /Defects/ })); // the tab (word also appears in the certificate message)
    expect(await screen.findByText(/In Tally, not ERP: 1/)).toBeInTheDocument(); // summary chip
    expect(screen.getByText('3 off ledgers')).toBeInTheDocument();
  });

  test('clicking an off ledger opens the voucher drill drawer (Phase 2)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByText('HDFC Bank A/c')); // an off ledger row
    // Drawer opens with the voucher-by-voucher list.
    expect(await screen.findByText(/Voucher-by-voucher/)).toBeInTheDocument();
    expect(await screen.findByText('BSP settlement')).toBeInTheDocument();
    expect(screen.getByText('Bank charge')).toBeInTheDocument();
  });

  test('certificate panel gates the close — blocked while ledgers are off (Phase 3)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('Month-End Tally Certificate')).toBeInTheDocument();
    // Board mock has 4 off (3 off + 1 only-in-Tally) → not certifiable, no sign yet.
    expect(await screen.findByText(/Not certifiable yet/)).toBeInTheDocument();
    expect(screen.getByText(/close gate/)).toBeInTheDocument();
  });

  test('non-central role (Branch Accountant) is guarded from the board', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Branch Accountant' }} />);
    expect(await screen.findByText('Central control')).toBeInTheDocument();
    expect(screen.queryByText('HDFC Bank A/c')).not.toBeInTheDocument(); // no board leak
  });

  test('pre-upload: calm onboarding state, not the red certificate gate (U1)', async () => {
    const { getTieOut } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 1, tied: 0, off: 0, onlyErp: 1, offTotal: 1 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 0 },
      rows: [{ ledger: 'AD Capital', code: 'L1', group: 'Capital Account', parentGroup: 'Capital Account', statement: 'BS', nature: 'liability', erp: -50000, tally: null, diff: -50000, status: 'only-erp' }],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText(/No Tally Trial Balance uploaded/)).toBeInTheDocument();
    expect(screen.queryByText('Month-End Tally Certificate')).not.toBeInTheDocument(); // no red gate before upload
  });

  test('a page-visibility grant does NOT open the write board for a non-central role (M4)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Branch Accountant', granted: ['/tally-reconciliation/monthly'] }} />);
    expect(await screen.findByText('Central control')).toBeInTheDocument();
  });

  test('TB footer shows "Not balanced" when a side does not self-balance (no false all-clear)', async () => {
    const { getTieOut } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month', counts: { total: 1, tied: 1, off: 0 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: false }, imported: { count: 1 },
      rows: [{ ledger: 'ICICI Bank A/c', code: 'B1', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 100, tally: 100, diff: 0, status: 'tied' }],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText('Not balanced')).toBeInTheDocument();
    expect(screen.getByText('Dr ≠ Cr')).toBeInTheDocument();
  });

  test('accept an explained variance from the drill drawer (Phase 4)', async () => {
    const { acceptVariance } = require('../api');
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByText('HDFC Bank A/c')); // off ledger → drawer
    fireEvent.click(await screen.findByText('Accept variance'));
    await waitFor(() => expect(acceptVariance).toHaveBeenCalledWith(expect.objectContaining({ ledger: 'HDFC Bank A/c', period: '2026-07' })));
  });

  test('both upload buttons live on the board; Day Book panel opens a file picker', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    // Both full-upload buttons sit in the header (TB button also appears as onboarding CTA → getAllBy).
    expect(screen.getAllByText('Upload Tally TB').length).toBeGreaterThan(0);
    expect(screen.getByText('Upload Day Book')).toBeInTheDocument();
    // Opening the Day Book panel reveals the file input; the TB panel's stays hidden.
    fireEvent.click(screen.getByText('Upload Day Book'));
    expect(await screen.findByText('Upload Tally Day Book')).toBeInTheDocument();
    expect(screen.getByTestId('db-file')).toBeInTheDocument();
    expect(screen.queryByTestId('tb-file')).not.toBeInTheDocument(); // the two panels are mutually exclusive
  });

  test('TB upload panel offers a file picker alongside paste', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    fireEvent.click(screen.getAllByText('Upload Tally TB')[0]); // header button toggles the TB panel
    expect(await screen.findByTestId('tb-file')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ICICI Bank/)).toBeInTheDocument(); // the paste box is still offered
  });

  test('Day Book status line shows how many vouchers are loaded', async () => {
    const { getDayBookStatus } = require('../api');
    getDayBookStatus.mockResolvedValueOnce({ vouchers: 274, ledgers: 63 });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByText(/Day Book · 274 vouchers · 63 ledgers/)).toBeInTheDocument();
  });

  test('period selector spans back to the books inception, not just the current month', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    const sel = screen.getByLabelText('Tie-out period');
    const values = [...sel.querySelectorAll('option')].map((o) => o.value);
    // getInception mock → 2025-01-01, so every month from 2025-01 to now is offered.
    expect(values).toContain('2025-01');
    expect(values).toContain('2025-06');
    expect(values.some((v) => v.startsWith('2026'))).toBe(true);
    // newest first
    expect(values[0] >= values[values.length - 1]).toBe(true);
  });

  test('Refresh re-pulls the whole period — the Defects register too, not just the balance view', async () => {
    const { getDefects, getTieOut } = require('../api');
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    fireEvent.click(screen.getByRole('button', { name: /Defects/ })); // the tab
    await screen.findByText('3 off ledgers'); // the Defect Register loaded
    const defectsBefore = getDefects.mock.calls.length;
    const tieBefore = getTieOut.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }));
    // Refresh invalidates ALL tally-tieout queries → both the board AND the defects re-run.
    await waitFor(() => expect(getDefects.mock.calls.length).toBeGreaterThan(defectsBefore));
    expect(getTieOut.mock.calls.length).toBeGreaterThan(tieBefore);
  });

  test('yearly selector offers FY years back to inception (Indian branch)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="year" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('Tally Reconciliation · Yearly Tie-Out');
    const sel = screen.getByLabelText('Tie-out period');
    const values = [...sel.querySelectorAll('option')].map((o) => o.value);
    // 2025-01 inception → FY2024-25 (Jan–Mar 2025 belongs to the prior FY) through current.
    expect(values).toContain('FY2024-25');
    expect(values.every((v) => /^FY\d{4}-\d{2}$/.test(v))).toBe(true);
  });

  test('TB uploaded but no Day Book → out-of-sync warning', async () => {
    const { getDayBookStatus } = require('../api');
    getDayBookStatus.mockResolvedValue({ vouchers: 0, ledgers: 0 }); // board mock TB has imported.count 4
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    expect(await screen.findByTestId('db-sync-warning')).toHaveTextContent(/no Day Book/i);
    getDayBookStatus.mockResolvedValue({ vouchers: 0, ledgers: 0 }); // reset default
  });
});

describe('Tally Reconciliation · certificate re-open + stale acceptance', () => {
  const lockedCert = {
    certificate: { status: 'locked', signatures: [{ role: 'AE' }, { role: 'FM' }, { role: 'Director' }, { role: 'Owner' }], snapshot: { frozenAt: '2026-07-05' } },
    chain: [{ role: 'AE' }, { role: 'FM' }, { role: 'Director' }, { role: 'Owner' }],
    progress: { done: 4, total: 4, next: null },
    canSign: { ok: false, reason: 'certificate is locked' },
  };

  test('an approver (Owner) sees Re-open on a certified period; a reason is required to confirm', async () => {
    const { getTallyCert, reopenTallyCert } = require('../api');
    getTallyCert.mockResolvedValue(lockedCert);
    wrap(<CertifyPanel branch="BOM" period="2026-07" tier="month" offTotal={0} currentUser={{ role: 'Owner' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Re-open to correct/ }));
    const confirm = await screen.findByRole('button', { name: /Confirm re-open/ });
    expect(confirm).toBeDisabled(); // no reason yet
    fireEvent.change(screen.getByLabelText(/Reason for re-opening/), { target: { value: 'BSP closing was wrong in Tally' } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(reopenTallyCert).toHaveBeenCalledWith(expect.objectContaining({ branch: 'BOM', period: '2026-07', reason: 'BSP closing was wrong in Tally' })));
    getTallyCert.mockResolvedValue({ certificate: null, chain: lockedCert.chain, progress: { done: 0, total: 4, next: { role: 'AE' } }, canSign: { ok: false, reason: 'freeze the tie-out first' } });
  });

  test('a non-approver (AE) does NOT see Re-open on a certified period', async () => {
    const { getTallyCert } = require('../api');
    getTallyCert.mockResolvedValue(lockedCert);
    wrap(<CertifyPanel branch="BOM" period="2026-07" tier="month" offTotal={0} currentUser={{ role: 'AE' }} />);
    expect(await screen.findByText(/close gate is satisfied/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Re-open to correct/ })).not.toBeInTheDocument();
    getTallyCert.mockResolvedValue({ certificate: null, chain: lockedCert.chain, progress: { done: 0, total: 4, next: { role: 'AE' } }, canSign: { ok: false, reason: 'freeze the tie-out first' } });
  });

  test('stale accepted variances raise a re-review warning on the certificate', async () => {
    const { getTallyCert } = require('../api');
    getTallyCert.mockResolvedValue({ certificate: null, chain: lockedCert.chain, progress: { done: 0, total: 4, next: { role: 'AE' } }, canSign: { ok: false } });
    wrap(<CertifyPanel branch="BOM" period="2026-07" tier="month" offTotal={0} staleAccepted={2} currentUser={{ role: 'Owner' }} />);
    expect(await screen.findByText(/2 accepted variances changed/)).toBeInTheDocument();
  });
});
