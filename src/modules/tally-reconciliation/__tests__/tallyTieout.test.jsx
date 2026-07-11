// Tally Reconciliation (whole-books tie-out) — the new top-level pill exists and
// carries the two tier tie-outs, its routes resolve, and the board renders the
// three side-by-side views from mocked tie-out data (incl. an only-in-Tally row).
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getPeriods: jest.fn(() => Promise.resolve([{ period: '2026-07', tier: 'month', ledgers: 4 }])),
  importTB: jest.fn(),
  clearTB: jest.fn(),
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
import { tallyReconRoutes } from '../routes';
import { MENU_TALLY_RECON, getMenu } from '../../../core/menus';

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><React.Suspense fallback={<div>loading…</div>}>{ui}</React.Suspense></QueryClientProvider>);
};
const allHrefs = (n, out = []) => { if (!n) return out; if (n.href) out.push(n.href); (n.children || []).forEach((c) => allHrefs(c, out)); return out; };

describe('Tally Reconciliation · pill + routes', () => {
  test('the pill carries the monthly + yearly tie-outs', () => {
    expect(MENU_TALLY_RECON.label).toBe('Tally Reconciliation');
    expect(allHrefs(MENU_TALLY_RECON)).toEqual(['/tally-reconciliation/monthly', '/tally-reconciliation/yearly']);
  });
  test('appears in the full menu for a Super Admin', () => {
    const labels = getMenu('ALL', { role: 'Super Admin' }).map((m) => m.label);
    expect(labels).toContain('Tally Reconciliation');
  });
  test('every pill href resolves to a route (+ bare path)', () => {
    const paths = tallyReconRoutes.map((r) => r.path);
    allHrefs(MENU_TALLY_RECON).forEach((h) => expect(paths).toContain(h));
    expect(paths).toContain('/tally-reconciliation');
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
});
