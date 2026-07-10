// Tally Reconciliation (whole-books tie-out) — the new top-level pill exists and
// carries the two tier tie-outs, its routes resolve, and the board renders the
// three side-by-side views from mocked tie-out data (incl. an only-in-Tally row).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    fireEvent.click(screen.getByText('Defects'));
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
});
