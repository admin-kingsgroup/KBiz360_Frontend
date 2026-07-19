// Pins Invoice-wise Gross Profit: in ALL scope rows + TOTAL summed ₹ (India) + $ (Africa)
// into one ₹ figure. Now ALL groups GP rows BY BRANCH and renders one table each in its own
// currency (each GP row carries its branch from the backend); a single branch renders one table.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../core/exportExcel', () => ({ exportToExcel: jest.fn(), vouchersToSheet: () => ({ columns: [], rows: [] }) }));
jest.mock('../../../../core/useAccounting', () => ({
  useSalesRegister: () => ({ data: [], isLoading: false }), usePurchaseRegister: () => ({ data: [], isLoading: false }),
  useInvoiceGP: () => ({ data: { rows: [
    { ref: 'F1', branch: 'BOM', sale: 1000, cost: 600, gp: 400, gpPct: 40, status: 'matched', linked: false, vnos: ['SF1'] },
    { ref: 'F2', branch: 'DAR', sale: 500, cost: 300, gp: 200, gpPct: 40, status: 'matched', linked: false, vnos: ['SF2'] },
  ] }, isLoading: false }),
}));
jest.mock('../../../../core/styles', () => ({ inp: {} }));
jest.mock('../../../../core/ux/clickable', () => ({ clickable: () => ({}) }));
jest.mock('../../../../core/BookingFolderHost', () => ({ openBookingFolder: jest.fn() }));
jest.mock('../../../../shell/primitives', () => ({ SkeletonTable: () => <div />, Skeleton: () => <div /> }));
jest.mock('../../../accountingLive/legacy.jsx', () => ({ VoucherLines: () => <div /> }));
jest.mock('../../../accountingLive/shared', () => ({
  DARK: '#000', GOLD: '#c2a04a', DIM: '#5b616e', BLUE: '#2563eb', RED: '#dc2626', GREEN: '#16a34a',
  curOf: (b) => (b && b.code === 'DAR' ? '$' : '₹'), money: (c, n) => `${c}${n}`, branchLabel: (b) => String(b && b.code ? b.code : b),
  Page: ({ children, right }) => <div>{right}{children}</div>, Banner: ({ children }) => <div>{children}</div>, State: ({ children }) => <div>{children}</div>,
  ExportBtn: () => <button />, Table: ({ children }) => <table>{children}</table>, Th: ({ children }) => <th>{children}</th>,
  headRow: {}, rowBg: () => ({ background: '' }), num: {}, DetailedTable: () => <div />, RangeBar: () => <div />,
  dateInRange: () => true, todayISO: '2026-07-19', monthStartISO: '2026-07-01',
}));

// eslint-disable-next-line import/first
import { InvoiceGPLive } from '../invoiceGPLive';

describe('InvoiceGPLive — per-branch currency, no ₹+$ merge', () => {
  test('ALL scope: BOM GP in ₹, DAR GP in $ (separate branch tables, no cross-currency total)', () => {
    render(<InvoiceGPLive branch="ALL" />);
    expect(screen.getAllByText('₹1000').length).toBeGreaterThan(0); // BOM sale (+ its TOTAL)
    expect(screen.getAllByText('$500').length).toBeGreaterThan(0);  // DAR sale (+ its TOTAL)
    expect(screen.queryByText(/Select a specific branch to view Invoice-wise Gross Profit/i)).toBeNull();
  });

  test('single Africa branch renders in $', () => {
    render(<InvoiceGPLive branch={{ code: 'DAR' }} />);
    expect(screen.getAllByText('$1000').length).toBeGreaterThan(0); // single-branch cur = $
  });
});
