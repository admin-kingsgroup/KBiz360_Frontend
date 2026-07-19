// Pins Notes to Financial Statements: in ALL scope note totals combined ₹ (India) + $
// (Africa) into one ₹ figure. Now ALL renders one notes set PER BRANCH from the byBranch
// slices, each in its own currency; a single branch renders one set in its currency.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => ({ FileSpreadsheet: () => <span />, Printer: () => <span /> }));
jest.mock('../../../core/styles', () => ({ bc: (b) => ({ cur: b && b.code === 'DAR' ? '$' : '₹' }), RPT_thStyle: {}, RPT_tdStyle: {} }));
jest.mock('../../../core/format', () => ({ fmtINR: (n) => `₹${n}`, localeOf: () => 'en-IN', compactAmt: (n, o) => `${(o && o.currency) || '₹'}${n}` }));
jest.mock('../../../core/dates', () => ({ CUR_FY: { startISO: '2026-04-01', label: '26' }, CUR_QUARTER: { startISO: '', endISO: '', label: 'Q1' }, CUR_MONTH: '2026-07', MONTH_OPTIONS: [], todayISO: () => '2026-07-19', monthLabel: (k) => k, fyOptions: () => [], fyRange: () => ({ from: '', to: '' }), fmtDate: (d) => d }));
jest.mock('../../../core/useAccounting', () => ({
  useBalanceSheet: () => ({ data: { byBranch: [{ branch: 'BOM' }, { branch: 'DAR' }] }, isLoading: false }),
  useProfitAndLoss: () => ({ data: {}, isLoading: false }), useTrialBalance: () => ({ data: {}, isLoading: false }),
  useAgeing: () => ({ data: {} }), useLedgerStatement: () => ({ data: { lines: [] } }),
}));
jest.mock('../../accountingLive', () => ({ VoucherEditor: () => <div /> }));
jest.mock('../../../core/exportExcel', () => ({ exportToExcel: jest.fn() }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../notesEngine', () => ({
  buildNotes: () => ({
    notes: [{ no: 1, title: 'Cash & Bank', section: 'Assets', total: 1000, side: 'Dr', reconcilesTo: 'TB', narrative: 'live', groups: [] }],
    recon: { assets: { ok: true }, liabilities: { ok: true }, income: { ok: true }, expenses: { ok: true }, balanced: true, hasBs: false, hasPl: false, netProfit: { notes: 0, plStatement: 0, bsStatement: 0 } },
  }),
}));
jest.mock('../../../core/period', () => ({ PeriodBar: () => <div />, periodRange: () => ({ from: '', to: '', label: 'All' }) }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({
  Modal: ({ children }) => <div>{children}</div>, Button: (p) => <button>{p.children}</button>,
  LoadingState: () => <div>loading</div>, ErrorState: () => <div>error</div>, EmptyState: ({ title }) => <div>{title}</div>,
}));
jest.mock('../../../core/ux/clickable', () => ({ clickable: () => ({}) }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));

// eslint-disable-next-line import/first
import { NotesToFinancials } from '../reportsNotes';

describe('NotesToFinancials — per-branch currency, no ₹+$ merge', () => {
  test('ALL scope: one notes set per branch (BOM note in ₹, DAR note in $)', () => {
    render(<NotesToFinancials branch="ALL" />);
    expect(screen.getAllByText(/₹1000/).length).toBeGreaterThan(0); // BOM note total in ₹
    expect(screen.getAllByText(/\$1000/).length).toBeGreaterThan(0); // DAR note total in $
    expect(screen.queryByText(/Select a specific branch to view Notes/i)).toBeNull();
  });

  test('single Africa branch renders notes in $', () => {
    render(<NotesToFinancials branch={{ code: 'DAR' }} />);
    expect(screen.getAllByText(/\$1000/).length).toBeGreaterThan(0);
  });
});
