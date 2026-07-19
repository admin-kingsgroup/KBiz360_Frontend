// Pins Sales & GP Analytics: in ALL scope every tab summed ₹ (India) + $ (Africa) revenue/
// cost/GP into one ₹ figure. Now ALL renders the analysis PER BRANCH (invoices grouped by
// branch), each in its own currency; a single branch renders one analysis in its currency.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../core/useAccounting', () => ({
  useSalesRegister: () => ({ data: [
    { branch: 'BOM', subtotal: 1000, party: 'Cust1', linkNo: '', vno: 'SF1', date: '2026-07-15', status: 'saved', type: 'SF', consultant: 'A' },
    { branch: 'DAR', subtotal: 500, party: 'Cust2', linkNo: '', vno: 'SF2', date: '2026-07-15', status: 'saved', type: 'SF', consultant: 'B' },
  ], isLoading: false }),
  usePurchaseRegister: () => ({ data: [], isLoading: false }),
  useInvoiceGP: () => ({ data: { rows: [] }, isLoading: false }),
  useProfitAndLoss: () => ({ data: {}, isLoading: false }),
  useTrialBalance: () => ({ data: { rows: [] } }), useLedgerStatement: () => ({ data: { lines: [] } }),
}));
jest.mock('../../../core/useReference', () => ({ useLedgerRegistry: () => ({ data: [] }) }));
jest.mock('../../../core/period', () => ({ PeriodBar: () => <div /> }));
jest.mock('../../../core/data', () => ({ BRANCHES: [] }));
jest.mock('../../../core/format', () => ({ fmtINR: (n) => `₹${n}`, compactAmt: (n, o) => `${(o && o.currency) || '₹'}${n}` }));
jest.mock('../../../core/styleTokens', () => ({ bc: (b) => ({ cur: b && b.code === 'DAR' ? '$' : '₹' }) }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/LedgerModalHost', () => ({ openLedgerModal: jest.fn() }));
jest.mock('../../../core/dates', () => ({ CUR_FY: { startISO: '2026-04-01', endISO: '2027-03-31', label: 'FY26' }, CUR_QUARTER: { startISO: '', endISO: '' }, CUR_MONTH: '2026-07', ALL_TIME_FROM: '', todayISO: () => '2026-07-19', fmtDate: (d) => d, monthLabel: (k) => k, fyQuarterOf: () => ({ label: 'Q1' }) }));
jest.mock('../../../core/styles', () => ({ RPT_thStyle: {}, RPT_tdStyle: {} }));
jest.mock('../../../core/exportExcel', () => ({ exportToExcel: jest.fn() }));
jest.mock('../../../core/business-logic', () => ({ exportToCSV: jest.fn() }));
jest.mock('../../accountingLive', () => ({ VoucherEditor: () => <div /> }));
jest.mock('../../interbranch', () => ({ isInterBranch: () => false, brName: (b) => b }));
jest.mock('lucide-react', () => ({ Printer: () => <span />, FileSpreadsheet: () => <span />, FileText: () => <span /> }));
jest.mock('../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../shell/primitives', () => ({
  Button: (p) => <button>{p.children}</button>, Card: ({ children }) => <div>{children}</div>, ResponsiveGrid: ({ children }) => <div>{children}</div>,
  LoadingState: () => <div>loading</div>, EmptyState: () => <div>empty</div>, SkeletonTable: () => <div />,
}));
jest.mock('../../../core/ux/clickable', () => ({ clickable: () => ({}) }));
jest.mock('../../../core/BookingFolderHost', () => ({ openBookingFolder: jest.fn() }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));

// eslint-disable-next-line import/first
import { SalesGpAnalytics } from '../salesGpAnalytics';

describe('SalesGpAnalytics — per-branch currency, no ₹+$ merge', () => {
  test('ALL scope: BOM revenue in ₹, DAR revenue in $ (separate per-branch analyses)', () => {
    render(<SalesGpAnalytics branch="ALL" />);
    expect(screen.getAllByText(/₹1000/).length).toBeGreaterThan(0); // BOM revenue in ₹
    expect(screen.getAllByText(/\$500/).length).toBeGreaterThan(0);  // DAR revenue in $
    expect(screen.queryByText(/Select a specific branch to view Sales & GP Analytics/i)).toBeNull();
  });

  test('single branch does NOT show a pick-a-branch notice', () => {
    render(<SalesGpAnalytics branch={{ code: 'BOM' }} />);
    expect(screen.queryByText(/Select a specific branch to view Sales & GP Analytics/i)).toBeNull();
  });
});
