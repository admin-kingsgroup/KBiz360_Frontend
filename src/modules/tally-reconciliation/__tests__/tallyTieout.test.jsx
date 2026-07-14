// Tally Reconciliation (whole-books tie-out) — the new top-level pill exists and
// carries the two tier tie-outs, its routes resolve, and the board renders the
// three side-by-side views from mocked tie-out data (incl. an only-in-Tally row).
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api', () => ({
  getPeriods: jest.fn(() => Promise.resolve([
    { period: '2026-07', tier: 'month', ledgers: 4, certStatus: 'none' },
    { period: '2025-09', tier: 'month', ledgers: 63, certStatus: 'locked' }, // certified → 🔒 in the selector
  ])),
  getInception: jest.fn(() => Promise.resolve('2025-01-01')),
  getRegister: jest.fn(() => Promise.resolve([
    { period: '2025-09', tier: 'month', ledgers: 63, cert: { status: 'locked', signatures: [{ role: 'AE' }, { role: 'FM' }, { role: 'Director' }, { role: 'Owner' }], snapshot: { offTotal: 0, absDiff: 0, netProfitErp: -500, netProfitTally: -500, frozenAt: '2025-09-30' }, reopened: 0 } },
    { period: '2026-07', tier: 'month', ledgers: 4, cert: null }, // uploaded, not yet certified
  ])),
  importTB: jest.fn(),
  clearTB: jest.fn(() => Promise.resolve({ deleted: 0 })),
  clearDayBook: jest.fn(() => Promise.resolve({ deleted: 0 })),
  importDayBook: jest.fn(() => Promise.resolve({ inserted: 0, ledgers: 0 })),
  getDayBookStatus: jest.fn(() => Promise.resolve({ vouchers: 0, ledgers: 0 })),
  getDefects: jest.fn(() => Promise.resolve({
    branch: 'BOM', period: '2026-07', tier: 'month', offLedgers: 3,
    summary: { total: 1, byType: { 'missing-in-erp': 1 } },
    defects: [{ ledger: 'HDFC Bank A/c', date: '2026-07-09', ref: '', desc: 'Bank charge', type: 'missing-in-erp', label: 'In Tally, not ERP', amount: -5000, variance: 0, side: 'tally' }],
  })),
  getModuleBreakdown: jest.fn(() => Promise.resolve({ rows: [] })),
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
      { date: '2026-07-02', ref: 'PAY/0412', tallyRef: 'BP/88', desc: 'BSP settlement', narration: 'Weekly BSP payout', sourceRef: 'BSP/W27', vtype: 'PV', voucherId: 'v123', erp: -200000, tally: -200000, status: 'matched', variance: 0, particulars: [{ ledger: 'IATA Clearing A/c', side: 'Dr', amount: 200000 }, { ledger: 'HDFC Bank A/c', side: 'Cr', amount: 200000 }] },
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
import { TallyCertRegister } from '../TallyCertRegister';
import { TallyReconReport } from '../TallyReconReport';
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
  test('the pill consolidates everything Tally — tie-outs, certification, reports, the matcher, and the guide', () => {
    expect(MENU_TALLY_RECON.label).toBe('Tally Reconciliation');
    expect(allHrefs(MENU_TALLY_RECON)).toEqual([
      '/tally-reconciliation/monthly', '/tally-reconciliation/yearly',                     // Tie-Out
      '/tally-reconciliation/certification/monthly', '/tally-reconciliation/certification/yearly', // Certification
      '/tally-reconciliation/reports/monthly', '/tally-reconciliation/reports/yearly',     // Reports
      '/accounts/tally-reco',                                                              // Vouchers · Day Book matcher
      '/tally-reconciliation/guide',                                                       // Help · staff guide
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
  test('breadcrumbs resolve the new Certification + Reports pages', () => {
    expect(crumbsFor('/tally-reconciliation/certification/monthly').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Certification', 'Monthly Certification']);
    expect(crumbsFor('/tally-reconciliation/reports/yearly').map((c) => c.label)).toEqual(['Tally Reconciliation', 'Reports', 'Yearly Report']);
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

  test('chart sub-group nesting + the ERP module drill (toggle ONLY where a real split exists)', async () => {
    const { getTieOut, getModuleBreakdown } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 4, tied: 4, off: 0, onlyErp: 0, onlyTally: 0, offTotal: 0, netProfitErp: 60500, netProfitTally: 60500 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 4 },
      rows: [
        { ledger: 'TRIP JACK Pvt Ltd', code: 'C1', group: 'Sundry Creditors', subGroup: 'Supplier B2B', parentGroup: 'Sundry Creditors', statement: 'BS', nature: 'liability', erp: -1000, tally: -1000, diff: 0, status: 'tied' },
        { ledger: 'Iconic Signage', code: 'C2', group: 'Sundry Creditors', subGroup: 'Supplier Others', parentGroup: 'Sundry Creditors', statement: 'BS', nature: 'liability', erp: -500, tally: -500, diff: 0, status: 'tied' },
        // A trading ledger WITH a real multi-module split → gets the drill toggle.
        { ledger: 'Commission A/c', code: 'S1', group: 'Direct Income', subGroup: 'Commission', parentGroup: 'Direct Income', statement: 'PL', nature: 'income', erp: -60000, tally: -60000, diff: 0, status: 'tied', hasModules: true },
        // A trading ledger with NO real split → NO toggle (the hasModules gate).
        { ledger: 'Discount Received', code: 'S2', group: 'Direct Income', subGroup: 'Other Operating Income', parentGroup: 'Direct Income', statement: 'PL', nature: 'income', erp: -500, tally: -500, diff: 0, status: 'tied', hasModules: false },
      ],
    });
    getModuleBreakdown.mockResolvedValueOnce({ rows: [
      { module: 'International Flights', costCenter: 'FLT-INT', erp: -40000 },
      { module: 'Hotel', costCenter: 'HOT', erp: -20000 },
    ] });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    // Chart sub-group sub-headers nest under the primary head (mirrors the ERP CoA).
    expect(await screen.findByText(/Supplier B2B/)).toBeInTheDocument();
    expect(screen.getByText(/Supplier Others/)).toBeInTheDocument();
    expect(screen.getByText(/Other Operating Income/)).toBeInTheDocument();   // Direct Income ▸ sub-group
    // The module-drill toggle appears ONLY on the row flagged with a real split.
    const toggles = screen.getAllByText(/modules \(ERP split\)/);
    expect(toggles).toHaveLength(1);                                          // Commission only, NOT Discount Received
    // Clicking it fetches + shows the ERP cost-centre split, scoped to that ledger.
    fireEvent.click(toggles[0]);
    expect(await screen.findByText(/International Flights/)).toBeInTheDocument();
    expect(screen.getByText(/Hotel/)).toBeInTheDocument();
    expect(getModuleBreakdown).toHaveBeenCalledWith(expect.objectContaining({ ledger: 'Commission A/c' }));
  });

  test('Chart of Accounts view toggle renders the ERP CoA tree (group subtotals + leaves, drill intact) and is remembered', async () => {
    window.localStorage.removeItem('tally.coaView'); // deterministic: start with the tick off
    const { getTieOut } = require('../api');
    // Two Bank leaves that sum to a group subtotal (9,00,000) which appears ONLY on the tree's
    // group header — never on any leaf — so it uniquely proves the tree (not the flat table) rendered.
    const hdfc = { ledger: 'HDFC Bank A/c', code: 'B2', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 810000, tally: 805000, diff: 5000, status: 'off' };
    const icici = { ledger: 'ICICI Bank A/c', code: 'B1', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 90000, tally: 90000, diff: 0, status: 'tied' };
    const comm = { ledger: 'Commission A/c', code: 'S1', group: 'Direct Income', parentGroup: 'Direct Income', statement: 'PL', nature: 'income', erp: -60000, tally: -60000, diff: 0, status: 'tied', hasModules: true };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 3, tied: 2, off: 1, offTotal: 5000 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 3 },
      rows: [hdfc, icici, comm],
      tree: [
        { id: 'bank', name: 'Bank Accounts', level: 0, statement: 'BS', erp: 900000, tally: 895000, diff: 5000, status: 'off', rows: [hdfc, icici], children: [] },
        { id: 'direct-income', name: 'Direct Income', level: 0, statement: 'PL', erp: -60000, tally: -60000, diff: 0, status: 'tied', rows: [comm], children: [] },
      ],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    // Default = the flat Tally-order table; the CoA tick is present and OFF, and the
    // group subtotal 9,00,000 (which lives only on a tree header) is NOT shown yet.
    const tick = await screen.findByLabelText(/Chart of Accounts view/);
    expect(tick).not.toBeChecked();
    expect(screen.queryByText(/9,00,000/)).not.toBeInTheDocument();
    // Tick on → the CoA tree renders, fully expanded: the group SUBTOTAL header now shows 9,00,000…
    fireEvent.click(tick);
    expect(await screen.findByText(/9,00,000/)).toBeInTheDocument();
    // …leaf ledgers still render under their group, with the ERP module drill intact…
    expect(screen.getByText('HDFC Bank A/c')).toBeInTheDocument();
    expect(screen.getByText('Commission A/c')).toBeInTheDocument();
    expect(screen.getByText(/modules \(ERP split\)/)).toBeInTheDocument();
    // …and the choice is remembered per user.
    expect(window.localStorage.getItem('tally.coaView')).toBe('1');
  });

  test('By Module view pivots the TB by cost centre (ERP-only) with a no-cost-centre bucket; mutually exclusive with CoA', async () => {
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
    const { getTieOut } = require('../api');
    const sale = { ledger: 'Air Ticket Sales', code: 'S1', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: -40000, tally: -40000, diff: 0, status: 'tied' };
    const purch = { ledger: 'Air Ticket Purchase', code: 'P1', group: 'Purchase Accounts', parentGroup: 'Purchase Accounts', statement: 'PL', nature: 'expense', erp: 38500, tally: 38500, diff: 0, status: 'tied' };
    const bank = { ledger: 'HDFC Bank A/c', code: 'B2', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 1500, tally: 1500, diff: 0, status: 'tied' };
    // A Sales ledger present in Tally but NOT ERP (erp=null) — a trading head with no ERP slice, so
    // it's not in the module pivot. It MUST still surface in the trailing no-cost-centre bucket.
    const onlyTallySale = { ledger: 'Ferry Sales', code: 'S9', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: null, tally: -3000, diff: 3000, status: 'only-tally' };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 4, tied: 3, off: 1, offTotal: 0 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 4 },
      rows: [sale, purch, bank, onlyTallySale],
      tree: [{ id: 'bank', name: 'Bank Accounts', level: 0, statement: 'BS', erp: 1500, tally: 1500, diff: 0, status: 'tied', rows: [bank], children: [] }],
      moduleTree: {
        modules: [
          { code: 'FLT-INT', label: 'International Flights', erp: -1500, tally: -1500, diff: 0,
            sales: -40000, cogs: 38500, salesTally: -40000, cogsTally: 38500,
            gp: 1500, gpTally: 1500, gpDiff: 0, status: 'tied', unmatched: 0, shared: 0, rows: [
              { ledger: 'Air Ticket Sales', code: 'S1', head: 'Sales Accounts', erp: -40000, tally: -40000, diff: 0, status: 'tied', shared: false },
              { ledger: 'Air Ticket Purchase', code: 'P1', head: 'Purchase Accounts', erp: 38500, tally: 38500, diff: 0, status: 'tied', shared: false },
            ] },
        ],
        totals: { erp: -1500, tally: -1500, sales: -40000, cogs: 38500, salesTally: -40000, cogsTally: 38500, gp: 1500, gpTally: 1500 },
      },
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    const modTick = await screen.findByLabelText(/By Module/);
    expect(modTick).not.toBeChecked();
    // Tick By Module → the module header (label + GP), its ledger slices WITH the Tally column now
    // populated (no more "ERP only" note), and the trailing "no cost centre" bucket carrying the
    // Balance-Sheet ledger all render.
    fireEvent.click(modTick);
    expect(await screen.findByText('International Flights')).toBeInTheDocument();
    expect(screen.getByText(/GP 1,500/)).toBeInTheDocument();
    expect(screen.queryByText(/ERP only/)).not.toBeInTheDocument();     // Tally is shown now, not suppressed
    expect(screen.getAllByText('Tied').length).toBeGreaterThan(0);      // slice/module tie-out status
    expect(screen.getByText('Air Ticket Purchase')).toBeInTheDocument();
    // On the TB tab the module now splits into Sales / Purchase sub-headers (with subtotals) too.
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Purchase')).toBeInTheDocument();
    expect(screen.getByText(/no cost centre/i)).toBeInTheDocument();
    expect(screen.getByText('HDFC Bank A/c')).toBeInTheDocument();        // BS ledger in the trailing bucket
    expect(screen.getByText('Ferry Sales')).toBeInTheDocument();          // Tally-only trading ledger must NOT vanish
    expect(window.localStorage.getItem('tally.moduleView')).toBe('1');
    // Mutually exclusive: ticking Chart of Accounts turns By Module off (module pivot gone).
    fireEvent.click(screen.getByLabelText(/Chart of Accounts view/));
    await waitFor(() => expect(screen.queryByText('International Flights')).not.toBeInTheDocument());
    expect(screen.getByLabelText(/By Module/)).not.toBeChecked();
    expect(window.localStorage.getItem('tally.moduleView')).toBe('0');
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
  });

  test('By Module bucket groups the no-cost-centre ledgers as the Chart of Accounts (group header + subtotal, ledgers nested)', async () => {
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
    const { getTieOut } = require('../api');
    const adCap = { ledger: 'AD Capital', code: 'L1044', group: 'Capital Account', parentGroup: 'Capital Account', statement: 'BS', nature: 'liability', erp: -50000, tally: -50000, diff: 0, status: 'tied' };
    const ndCap = { ledger: 'ND Capital', code: 'L1045', group: 'Capital Account', parentGroup: 'Capital Account', statement: 'BS', nature: 'liability', erp: -100000, tally: -100000, diff: 0, status: 'tied' };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 2, tied: 2, off: 0, offTotal: 0 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 2 },
      rows: [adCap, ndCap], tree: [],
      moduleTree: {
        modules: [],
        totals: { erp: 0, sales: 0, cogs: 0, gp: 0 },
        // The BE ships the bucket pre-grouped as the CoA (group node with a subtotal + its ledgers).
        bucketTree: [
          { id: 'capital', name: 'Capital Account', level: 0, statement: 'BS', erp: -150000, tally: -150000, diff: 0, status: 'tied', rows: [adCap, ndCap], children: [] },
        ],
        bucketTreePL: [],
      },
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByLabelText(/By Module/));
    // The bucket now nests its ledgers under their CoA group (with a per-group subtotal row).
    expect(await screen.findByText('Capital Account')).toBeInTheDocument();
    expect(screen.getByText('AD Capital')).toBeInTheDocument();
    expect(screen.getByText('ND Capital')).toBeInTheDocument();
    window.localStorage.removeItem('tally.moduleView');
  });

  test('P&L · By Module shows the per-module GP tie-out (ERP vs Tally) with Sales/COGS subtotals + a P&L bucket', async () => {
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
    const { getTieOut } = require('../api');
    const sale = { ledger: 'IT-Base Fare', code: 'S1', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: -100000, tally: -110000, diff: 10000, status: 'off' };
    const purch = { ledger: 'IT-Base Fare [Pur]', code: 'P1', group: 'Purchase Accounts', parentGroup: 'Purchase Accounts', statement: 'PL', nature: 'expense', erp: 90000, tally: 99000, diff: -9000, status: 'off' };
    // An indirect expense (no cost centre) — must land in the P&L bucket, never a module.
    const bankChg = { ledger: 'Bank Charges', code: 'E9', group: 'Indirect Expenses', parentGroup: 'Indirect Expenses', statement: 'PL', nature: 'expense', erp: 500, tally: 500, diff: 0, status: 'tied' };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 3, tied: 1, off: 2, offTotal: 2, netProfitErp: 9500, netProfitTally: 10500 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 3 },
      rows: [sale, purch, bankChg],
      tree: [],
      moduleTree: {
        modules: [
          { code: 'FLT-INT', label: 'International Flights', erp: -10000, tally: -11000, diff: 1000,
            sales: -100000, cogs: 90000, salesTally: -110000, cogsTally: 99000,
            gp: 10000, gpTally: 11000, gpDiff: -1000, status: 'off', unmatched: 0, shared: 0, rows: [
              { ledger: 'IT-Base Fare', code: 'S1', head: 'Sales Accounts', erp: -100000, tally: -110000, diff: 10000, status: 'off', shared: false },
              { ledger: 'IT-Base Fare [Pur]', code: 'P1', head: 'Purchase Accounts', erp: 90000, tally: 99000, diff: -9000, status: 'off', shared: false },
            ] },
        ],
        totals: { erp: -10000, tally: -11000, sales: -100000, cogs: 90000, salesTally: -110000, cogsTally: 99000, gp: 10000, gpTally: 11000 },
      },
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    // Switch to the P&L tab, then tick By Module.
    fireEvent.click(await screen.findByRole('button', { name: /Profit & Loss/i }));
    const modTick = await screen.findByLabelText(/By Module/);
    fireEvent.click(modTick);
    expect(await screen.findByText('International Flights')).toBeInTheDocument();
    // Per-module GP tie-out on the header: GP ERP 10,000 · Tally 11,000.
    expect(screen.getByText(/GP 10,000.*Tally 11,000/)).toBeInTheDocument();
    // Mini-P&L subtotals present.
    expect(screen.getByText(/Sales \(income\)/)).toBeInTheDocument();
    expect(screen.getByText(/Less: COGS/)).toBeInTheDocument();
    // Indirect expense drops into the P&L bucket (not the module), which is P&L-scoped.
    expect(screen.getByText(/Other P&L · no cost centre/i)).toBeInTheDocument();
    expect(screen.getByText('Bank Charges')).toBeInTheDocument();
    window.localStorage.removeItem('tally.moduleView');
  });

  test("P&L · By Module: a module whose comparable ledgers tie but has one absent from Tally reads 'Partial' + a transparency note, not red 'Off'", async () => {
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
    const { getTieOut } = require('../api');
    const sale = { ledger: 'HOT Sales', code: 'H1', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: -8000, tally: -8000, diff: 0, status: 'tied' };
    const purch = { ledger: 'HOT Purchase', code: 'H2', group: 'Purchase Accounts', parentGroup: 'Purchase Accounts', statement: 'PL', nature: 'expense', erp: 5000, tally: null, diff: 5000, status: 'only-erp' };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 2, tied: 1, off: 1, offTotal: 1 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 2 },
      rows: [sale, purch], tree: [],
      moduleTree: {
        modules: [
          { code: 'HOT', label: 'Hotel', erp: -3000, tally: -8000, diff: 5000,
            sales: -8000, cogs: 5000, salesTally: -8000, cogsTally: null,
            gp: 3000, gpTally: 8000, gpDiff: -5000, status: 'partial', unmatched: 1, shared: 0, rows: [
              { ledger: 'HOT Sales', code: 'H1', head: 'Sales Accounts', erp: -8000, tally: -8000, diff: 0, status: 'tied', shared: false },
              { ledger: 'HOT Purchase', code: 'H2', head: 'Purchase Accounts', erp: 5000, tally: null, diff: null, status: 'unmatched', shared: false },
            ] },
        ],
        totals: { erp: -3000, tally: -8000, sales: -8000, cogs: 5000, salesTally: -8000, cogsTally: null, gp: 3000, gpTally: 8000 },
      },
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Profit & Loss/i }));
    fireEvent.click(await screen.findByLabelText(/By Module/));
    expect(await screen.findByText('Hotel')).toBeInTheDocument();
    // Comparable ledger ties → module is 'Partial', with a transparency note, not a scary red 'Off'.
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText(/1 not in Tally/)).toBeInTheDocument();
    expect(screen.getByText(/Less: COGS/)).toBeInTheDocument();   // subtotal present (its Tally renders as —, not 0)
    window.localStorage.removeItem('tally.moduleView');
  });

  test('By Module: clicking an off module slice drills to its vouchers (same drawer as the flat view)', async () => {
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
    const { getTieOut } = require('../api');
    const sale = { ledger: 'IT-Base Fare', code: 'S1', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: -100000, tally: -110000, diff: 10000, status: 'off' };
    const bank = { ledger: 'HDFC Bank A/c', code: 'B2', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 1500, tally: 1500, diff: 0, status: 'tied' };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 2, tied: 1, off: 1, offTotal: 1 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 2 },
      rows: [sale, bank], tree: [],
      moduleTree: {
        modules: [
          { code: 'FLT-INT', label: 'International Flights', erp: -100000, tally: -110000, diff: 10000,
            sales: -100000, cogs: 0, salesTally: -110000, cogsTally: null,
            gp: 100000, gpTally: 110000, gpDiff: -10000, status: 'off', unmatched: 0, shared: 0, rows: [
              { ledger: 'IT-Base Fare', code: 'S1', head: 'Sales Accounts', erp: -100000, tally: -110000, diff: 10000, status: 'off', shared: false },
            ] },
        ],
        totals: { erp: -100000, tally: -110000, sales: -100000, cogs: 0, salesTally: -110000, cogsTally: null, gp: 100000, gpTally: 110000 },
        bucketTree: [], bucketTreePL: [],
      },
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByLabelText(/By Module/));
    const slice = await screen.findByText('IT-Base Fare');
    expect(screen.getByText('▸ drill vouchers')).toBeInTheDocument();   // affordance appears on the off slice
    fireEvent.click(slice);
    // The SAME voucher-by-voucher drawer the flat/CoA rows open.
    expect(await screen.findByText(/Voucher-by-voucher/)).toBeInTheDocument();
    window.localStorage.removeItem('tally.moduleView');
  });

  test('By Module: a shared slice whose ledger reconciles at ledger level (tied full row) is NOT drillable (no accept-variance on a tied ledger)', async () => {
    window.localStorage.removeItem('tally.coaView');
    window.localStorage.removeItem('tally.moduleView');
    const { getTieOut } = require('../api');
    // The FULL ledger row is TIED (reconciles at ledger level); per-module it only reads 'shared'.
    const shared = { ledger: 'DT-Base Fare [IB]', code: 'S9', group: 'Sales Accounts', parentGroup: 'Sales Accounts', statement: 'PL', nature: 'income', erp: -5000, tally: -5000, diff: 0, status: 'tied' };
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 1, tied: 1, off: 0, offTotal: 0 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 1 },
      rows: [shared], tree: [],
      moduleTree: {
        modules: [
          { code: 'INB-FLT-DOM', label: 'Inter-Branch · Domestic Flights', erp: -5000, tally: null, diff: null,
            sales: -5000, cogs: 0, salesTally: null, cogsTally: null,
            gp: 5000, gpTally: null, gpDiff: null, status: 'shared', unmatched: 0, shared: 1, rows: [
              { ledger: 'DT-Base Fare [IB]', code: 'S9', head: 'Sales Accounts', erp: -5000, tally: null, diff: null, status: 'shared', shared: true },
            ] },
        ],
        totals: { erp: -5000, tally: null, sales: -5000, cogs: 0, salesTally: null, cogsTally: null, gp: 5000, gpTally: null },
        bucketTree: [], bucketTreePL: [],
      },
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByLabelText(/By Module/));
    const slice = await screen.findByText('DT-Base Fare [IB]');
    expect(screen.getAllByText('At ledger').length).toBeGreaterThan(0);           // module + slice badge
    expect(screen.queryByText('▸ drill vouchers')).not.toBeInTheDocument();       // NOT a drill target
    fireEvent.click(slice);
    expect(screen.queryByText(/Voucher-by-voucher/)).not.toBeInTheDocument();     // drawer does not open on a tied ledger
    window.localStorage.removeItem('tally.moduleView');
  });

  test('name/group mismatch drives the "fix in Tally" workflow (rename hint, badge, KPI, punch-list filter)', async () => {
    const { getTieOut } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 2, tied: 2, off: 0, onlyErp: 0, onlyTally: 0, nameMismatch: 1, groupMismatch: 1, fixTotal: 2, blocking: 1, offTotal: 0 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 2 },
      rows: [
        // Amount ties, but the Tally name lacks the [BOM] tag AND the group differs
        // (Tally: Duties & Taxes, ERP: Provisions) → both must be fixed in Tally.
        { ledger: 'Professional Tax [M] [BOM]', erpLedger: 'Professional Tax [M] [BOM]', tallyLedger: 'Professional Tax [M]', code: 'BOM-L1049', group: 'Provisions', parentGroup: 'Provisions', statement: 'BS', nature: 'liability', erpGroup: 'Provisions', tallyGroup: 'Duties & Taxes', nameMatch: false, groupMatch: false, needsRename: true, needsRegroup: true, blocking: true, erp: -800, tally: -800, diff: 0, status: 'tied' },
        { ledger: 'Salary Payable', erpLedger: 'Salary Payable', tallyLedger: 'Salary Payable', code: 'L1118', group: 'Provisions', parentGroup: 'Provisions', statement: 'BS', nature: 'liability', nameMatch: true, groupMatch: true, needsRename: false, needsRegroup: false, blocking: false, erp: -306667, tally: -306667, diff: 0, status: 'tied' },
      ],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    // The rename hint states the exact ERP name to rename the Tally ledger to.
    expect(await screen.findByText(/rename to/)).toBeInTheDocument();
    // The group-fix hint points at the ERP group.
    expect(screen.getByText(/should be/)).toBeInTheDocument();
    // "Fix in Tally" appears as both the KPI label and the row badge (amount ties, but
    // it still blocks) — never a green "Tied" on a row that needs a Tally correction.
    expect(screen.getAllByText('Fix in Tally').length).toBeGreaterThanOrEqual(2);
    // The punch-list filter hides the fully-tied Salary row, keeping the one to fix.
    fireEvent.click(screen.getByLabelText(/Show only items to fix/));
    await waitFor(() => expect(screen.queryByText('Salary Payable')).not.toBeInTheDocument());
    expect(screen.getByText('Professional Tax [M] [BOM]')).toBeInTheDocument();
  });

  test('grouped-upload subtotals that did not reconcile surface a review banner', async () => {
    const { getTieOut } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month',
      counts: { total: 1, tied: 1, off: 0, offTotal: 0 },
      erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 1 },
      // A group subtotal whose upload total (900 Cr) ≠ the sum of its ledgers (400 Cr) —
      // kept for review, not counted as a ledger mismatch.
      reviewGroups: [{ ledger: 'Odd Group', group: 'Provisions', parentGroup: 'Provisions', amount: -900, childSum: -400, diff: -500 }],
      rows: [{ ledger: 'ICICI Bank A/c', code: 'B1', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 100, tally: 100, diff: 0, status: 'tied' }],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    const banner = await screen.findByTestId('group-review-warning');
    expect(banner).toHaveTextContent(/Odd Group/);
    expect(banner).toHaveTextContent(/reconcile/);
  });

  test('the net-profit line reads Profit / (Loss) — a loss is parenthesised, not a positive Dr', async () => {
    // Mock: netProfitTally -3,24,000 (a LOSS). It must NEVER read as a positive "3,24,000 Dr".
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    // P&L view: footer relabelled + the loss shown parenthesised.
    fireEvent.click(screen.getByText('Profit & Loss'));
    expect(await screen.findByText('Net Profit / (Loss)')).toBeInTheDocument();
    expect(screen.getByText('(3,24,000)')).toBeInTheDocument();
    // Balance Sheet view: same loss on the Capital line — parenthesised, and the old
    // misleading "3,24,000 Dr" (a loss shown as a positive Dr) is gone.
    fireEvent.click(screen.getByText('Balance Sheet'));
    expect(await screen.findByText('Profit / (Loss) for the period')).toBeInTheDocument();
    expect(screen.getByText('(3,24,000)')).toBeInTheDocument();
    expect(screen.queryByText('3,24,000 Dr')).not.toBeInTheDocument();
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

  test('Defect Register — tier segment + type chips filter the table, Clear resets', async () => {
    const { getDefects } = require('../api');
    getDefects.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month', offLedgers: 5,
      summary: { total: 4, byType: { 'missing-in-tally': 1, 'missing-in-erp': 1, 'ledger-missing-tally': 1, 'ledger-missing-erp': 1 } },
      defects: [
        { ledger: 'Alpha Ledger', date: '2026-07-01', ref: 'V1', desc: 'only in erp', type: 'missing-in-tally', label: 'In ERP, not Tally', amount: 100, variance: 0, side: 'erp' },
        { ledger: 'Beta Ledger', date: '2026-07-02', ref: 'V2', desc: 'only in tally', type: 'missing-in-erp', label: 'In Tally, not ERP', amount: 200, variance: 0, side: 'tally' },
        { ledger: 'Gamma Master', date: '', ref: '', desc: 'no daybook', type: 'ledger-missing-tally', label: 'Ledger absent in Tally', amount: 300, variance: 300, side: 'balance' },
        { ledger: 'Delta Master', date: '', ref: '', desc: 'no erp side', type: 'ledger-missing-erp', label: 'Ledger absent in ERP', amount: -400, variance: -400, side: 'balance' },
      ],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    fireEvent.click(screen.getByRole('button', { name: /Defects/ })); // the tab
    // All four defect rows visible before any filter.
    expect(await screen.findByText('Alpha Ledger')).toBeInTheDocument();
    expect(screen.getByText('Beta Ledger')).toBeInTheDocument();
    expect(screen.getByText('Gamma Master')).toBeInTheDocument();
    expect(screen.getByText('Delta Master')).toBeInTheDocument();

    // Master tier → only the two ledger-absent (structural) rows survive.
    fireEvent.click(screen.getByRole('button', { name: /Master mismatches/ }));
    expect(screen.getByText('Gamma Master')).toBeInTheDocument();
    expect(screen.getByText('Delta Master')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Ledger')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta Ledger')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 4 defects')).toBeInTheDocument();

    // Toggle the "Ledger absent in Tally" chip → narrows to just Gamma.
    fireEvent.click(screen.getByRole('button', { name: /Ledger absent in Tally: 1/ }));
    expect(screen.getByText('Gamma Master')).toBeInTheDocument();
    expect(screen.queryByText('Delta Master')).not.toBeInTheDocument();

    // Clear → every row returns and the "Showing X of Y" line is gone.
    fireEvent.click(screen.getByRole('button', { name: /^Clear$/ }));
    expect(screen.getByText('Alpha Ledger')).toBeInTheDocument();
    expect(screen.getByText('Delta Master')).toBeInTheDocument();
    expect(screen.queryByText(/Showing \d+ of \d+ defects/)).not.toBeInTheDocument();
  });

  test('Defect Register — master and voucher defects render as two separate stacked panels', async () => {
    const { getDefects } = require('../api');
    getDefects.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month', offLedgers: 5,
      summary: { total: 3, byType: { 'missing-in-tally': 1, 'ledger-missing-tally': 1, 'amount-mismatch': 1 } },
      defects: [
        { ledger: 'Alpha Ledger', date: '2026-07-01', ref: 'V1', desc: 'only in erp', type: 'missing-in-tally', label: 'In ERP, not Tally', amount: 100, variance: 0, side: 'erp' },
        { ledger: 'Gamma Master', date: '', ref: '', desc: 'no Tally Day Book imported for this ledger', type: 'ledger-missing-tally', label: 'Ledger absent in Tally', amount: 300, variance: 300, side: 'balance' },
        { ledger: 'Zeta Ledger', date: '2026-07-03', ref: 'V3', desc: 'amount off', type: 'amount-mismatch', label: 'Amount differs', amount: 50, variance: 10, side: 'both' },
      ],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    fireEvent.click(screen.getByRole('button', { name: /Defects/ })); // the tab
    // Under "All" both panels render, each with its own header — never one merged list.
    expect(await screen.findByText('Master defects')).toBeInTheDocument();
    expect(screen.getByText('Voucher defects')).toBeInTheDocument();
    // The ledger-level defect lives under the master panel; the two posting defects under voucher.
    expect(screen.getByText('Gamma Master')).toBeInTheDocument();
    expect(screen.getByText('Alpha Ledger')).toBeInTheDocument();
    expect(screen.getByText('Zeta Ledger')).toBeInTheDocument();
    // Selecting the Voucher tier drops the master panel entirely.
    fireEvent.click(screen.getByRole('button', { name: /Voucher mismatches/ }));
    expect(screen.queryByText('Master defects')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Master')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha Ledger')).toBeInTheDocument();
  });

  test('Defect Register — master panel shows the rename hint, stranded count and the collapsed-pairs badge', async () => {
    const { getDefects } = require('../api');
    getDefects.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month', offLedgers: 4, pairedRenames: 1,
      summary: { total: 2, byType: { 'ledger-missing-tally': 2 } },
      defects: [
        { ledger: 'Round Off', date: '', ref: '', desc: 'no Tally Day Book imported for this ledger', type: 'ledger-missing-tally', label: 'Ledger absent in Tally', amount: 0.1, variance: 0.1, side: 'balance', suggest: { ledger: 'Rounded Off', code: '', score: 0.88, side: 'tally' } },
        { ledger: 'Consultancy Fees', date: '', ref: '', desc: 'no Tally Day Book imported for this ledger', type: 'ledger-missing-tally', label: 'Ledger absent in Tally', amount: 5000, variance: 5000, side: 'balance', strandedCount: 7 },
      ],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    fireEvent.click(screen.getByRole('button', { name: /Defects/ })); // the tab
    expect(await screen.findByText(/Did you mean Tally “Rounded Off”/)).toBeInTheDocument(); // fuzzy rename hint
    expect(screen.getByText(/7 ERP entries have no Tally match/)).toBeInTheDocument();       // stranded-entry blast radius
    expect(screen.getByText(/1 rename pair collapsed/)).toBeInTheDocument();                 // de-dup badge
  });

  test('clicking an off ledger opens the voucher drill drawer (Phase 2)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByText('HDFC Bank A/c')); // an off ledger row
    // Drawer opens with the voucher-by-voucher list.
    expect(await screen.findByText(/Voucher-by-voucher/)).toBeInTheDocument();
    expect(await screen.findByText('BSP settlement')).toBeInTheDocument();
    expect(screen.getByText('Bank charge')).toBeInTheDocument();
  });

  test('voucher drill: a voucher shows its detail (type · source ref) and expands to its entries (particulars)', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByText('HDFC Bank A/c'));            // drill an off ledger
    await screen.findByText('BSP settlement');                           // wait for the voucher lines to load
    expect(screen.getByText('PV')).toBeInTheDocument();                  // voucher type shown
    expect(screen.getByText(/BSP\/W27/)).toBeInTheDocument();            // source / booking ref shown (within the meta line)
    // Expand the voucher → its double-entry legs appear.
    fireEvent.click(screen.getByText(/2 entries/));
    expect(screen.getByText('Entries in this voucher')).toBeInTheDocument();
    expect(screen.getByText(/IATA Clearing/)).toBeInTheDocument();             // a contra leg of the voucher
    expect(screen.getAllByText(/HDFC Bank A\/c/).length).toBeGreaterThan(0);   // the other leg (board + drawer header also show it)
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

  test('Clear Upload removes THIS month’s TB + Day Book after confirm (period-scoped)', async () => {
    const { clearTB, clearDayBook } = require('../api');
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    // The default tie-out mock has imported.count = 4 → the Clear button is offered.
    fireEvent.click(await screen.findByText('Clear Upload'));
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // board defaults to the current month
    await waitFor(() => expect(clearTB).toHaveBeenCalledWith(expect.objectContaining({ branch: 'BOM', period: cur, tier: 'month' })));
    expect(clearDayBook).toHaveBeenCalledWith(expect.objectContaining({ branch: 'BOM', period: cur, tier: 'month' }));
    confirmSpy.mockRestore();
  });

  test('Clear Upload does nothing when the confirm is declined', async () => {
    const { clearTB, clearDayBook } = require('../api');
    clearTB.mockClear(); clearDayBook.mockClear();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    fireEvent.click(await screen.findByText('Clear Upload'));
    expect(clearTB).not.toHaveBeenCalled();
    expect(clearDayBook).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('Clear Upload is disabled on a certified (locked) period', async () => {
    const { getTieOut } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2025-09', tier: 'month', certStatus: 'locked',
      counts: { total: 1, tied: 1, off: 0 }, erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 63 },
      rows: [{ ledger: 'ICICI Bank A/c', code: 'B1', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 100, tally: 100, diff: 0, status: 'tied' }],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    const btn = await screen.findByText('Clear Upload');
    expect(btn.closest('button')).toBeDisabled();
  });

  test('the period selector shows a human month label (Sep 25) while keeping the machine key', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    const sel = screen.getByLabelText('Tie-out period');
    const sept = [...sel.querySelectorAll('option')].find((o) => o.value === '2025-09');
    expect(sept).toBeTruthy();
    expect(sept.textContent).toMatch(/Sep 25/);   // human label shown to the user
    expect(sept.value).toBe('2025-09');           // machine key (unchanged — this is what the API receives)
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

  test('a stale accepted variance BLOCKS Freeze/Sign (the flag is not toothless)', async () => {
    const { getTallyCert } = require('../api');
    // Clean gate + tied, but a stale acceptance → the buttons must still be disabled.
    getTallyCert.mockResolvedValue({ certificate: { status: 'reconciled', snapshot: { frozenAt: '2026-07-05' }, signatures: [] }, chain: lockedCert.chain, progress: { done: 0, total: 4, next: { role: 'AE' } }, canSign: { ok: true, step: { role: 'AE' } } });
    wrap(<CertifyPanel branch="BOM" period="2026-07" tier="month" offTotal={0} staleAccepted={2} currentUser={{ role: 'Owner' }} />);
    expect(await screen.findByText(/2 accepted variances changed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Freeze|Re-freeze/ })).toBeDisabled();
    getTallyCert.mockResolvedValue({ certificate: null, chain: lockedCert.chain, progress: { done: 0, total: 4, next: { role: 'AE' } }, canSign: { ok: false } });
  });

  test('a certified period disables the Upload buttons (re-open first)', async () => {
    const { getTieOut } = require('../api');
    getTieOut.mockResolvedValueOnce({
      branch: 'BOM', period: '2026-07', tier: 'month', certStatus: 'locked',
      counts: { total: 1, tied: 1, off: 0, offTotal: 0 }, erpTotals: { balanced: true }, tallyTotals: { balanced: true }, imported: { count: 1 },
      rows: [{ ledger: 'ICICI Bank A/c', code: 'B1', group: 'Bank Accounts', parentGroup: 'Bank Accounts', statement: 'BS', nature: 'asset', erp: 100, tally: 100, diff: 0, status: 'tied' }],
    });
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('ICICI Bank A/c');
    expect(screen.getAllByText('Upload Tally TB')[0].closest('button')).toBeDisabled();
    expect(screen.getByText('Upload Day Book').closest('button')).toBeDisabled();
    expect(screen.getByText(/Certified · re-open to change/)).toBeInTheDocument();
  });
});

describe('Tally Reconciliation · Certification Register + Report + selector lock', () => {
  test('the period selector marks a certified month with a lock', async () => {
    wrap(<TallyTieOutBoard branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} />);
    await screen.findByText('HDFC Bank A/c');
    const sel = screen.getByLabelText('Tie-out period');
    const opts = [...sel.querySelectorAll('option')];
    const sept = opts.find((o) => o.value === '2025-09');
    expect(sept).toBeTruthy();
    expect(sept.textContent).toMatch(/🔒 Certified/);
  });

  test('Certification Register lists periods with their status + certified summary', async () => {
    wrap(<TallyCertRegister branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} setRoute={() => {}} />);
    expect(await screen.findByText('Tally Certification Register · Monthly')).toBeInTheDocument();
    // The certified Sept row shows the Certified badge; the summary counts 1 certified.
    expect(await screen.findByText('2025-09')).toBeInTheDocument();
    // Both the "🔒 Certified" KPI chip and the certified row badge carry the label.
    expect(screen.getAllByText('🔒 Certified').length).toBeGreaterThan(0);
  });

  test('Certification Register self-guards a non-central role', async () => {
    wrap(<TallyCertRegister branch="BOM" tier="month" currentUser={{ role: 'Branch Accountant' }} setRoute={() => {}} />);
    expect(await screen.findByText('Central control')).toBeInTheDocument();
    expect(screen.queryByText('2025-09')).not.toBeInTheDocument();
  });

  test('Report splits Pending Closings, Certificate Register and Open Items', async () => {
    wrap(<TallyReconReport branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} setRoute={() => {}} />);
    expect(await screen.findByText('Tally Reconciliation Report · Monthly')).toBeInTheDocument();
    // Sections render after the register query resolves.
    expect(await screen.findByText('Pending Closings')).toBeInTheDocument();
    expect(screen.getByText('Certificate Register')).toBeInTheDocument();
    expect(screen.getByText('Open Items')).toBeInTheDocument();
    // 2026-07 is uploaded but not certified → appears as pending + an open blocker.
    expect(await screen.findByText(/TB uploaded — no certificate started/)).toBeInTheDocument();
  });

  test('Report lists a re-opened (not-tied) period as an Open Item, never a locked one', async () => {
    const { getRegister } = require('../api');
    getRegister.mockResolvedValueOnce([
      { period: '2025-09', tier: 'month', ledgers: 63, cert: { status: 'locked', signatures: [{ role: 'AE' }, { role: 'FM' }, { role: 'Director' }, { role: 'Owner' }], snapshot: { offTotal: 0, staleAccepted: 0, frozenAt: '2025-09-30' }, reopened: 0 } },
      { period: '2026-06', tier: 'month', ledgers: 10, cert: { status: 'open', signatures: [], snapshot: { frozenAt: null }, reopened: 1 } }, // re-opened → not tied
    ]);
    wrap(<TallyReconReport branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} setRoute={() => {}} />);
    expect(await screen.findByText(/not tied — clear the off ledgers/)).toBeInTheDocument();
  });

  test('Report Open Items surfaces pending Tally name/group fixes (fixTotal blocker)', async () => {
    const { getRegister } = require('../api');
    getRegister.mockResolvedValueOnce([
      // Frozen but not clean: amounts tie (offTotal 0) yet 2 Tally names/groups still
      // differ from ERP → an Open Item with the name/group reason (blocks certifying).
      { period: '2026-05', tier: 'month', ledgers: 40, cert: { status: 'open', signatures: [], snapshot: { offTotal: 0, fixTotal: 2, staleAccepted: 0, frozenAt: '2026-05-31' }, reopened: 0 } },
    ]);
    wrap(<TallyReconReport branch="BOM" tier="month" currentUser={{ role: 'Super Admin' }} setRoute={() => {}} />);
    expect(await screen.findByText(/2 name\/group fix\(es\) owed in Tally/)).toBeInTheDocument();
  });

  test('every /tally-reconciliation certification + reports href resolves to a route', () => {
    const paths = tallyReconRoutes.map((r) => r.path);
    ['/tally-reconciliation/certification/monthly', '/tally-reconciliation/certification/yearly',
      '/tally-reconciliation/reports/monthly', '/tally-reconciliation/reports/yearly'].forEach((h) => expect(paths).toContain(h));
  });
});
