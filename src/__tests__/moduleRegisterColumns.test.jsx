// Module Sales/Purchase Register — column order + default sort scenario test.
// The business asked for: Date ▸ Sales Type ▸ Ledger Name ▸ Invoice Value ▸ Link No
// ▸ Sales Invoice No ▸ Purchase Invoice No, then the rest, sorted by Date ascending
// by default. The component pulls live data + builds invoices, so those side modules
// are mocked and the real DataTable does the actual ordering/sorting we assert on.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModuleRegister } from '../modules/moduleRegister';

const BOOKINGS = [
  { id: 'b1', bookingNo: 'SF0002', linkNo: 'LK-2', date: '2026-06-20', module: 'SF', status: 'approved',
    customer: { name: 'Bravo Corp' }, supplier: { name: 'TBO' }, rows: [],
    so: { total: 5000, gst: 200, otherTaxesGst: 50 }, po: { total: 4000, gst: 150 }, gp: { total: 1000, pct: 20 },
    saleVno: 'SF/2', purchaseVno: 'PB/2' },
  { id: 'b2', bookingNo: 'SF0001', linkNo: 'LK-1', date: '2026-06-10', module: 'SF', status: 'approved',
    customer: { name: 'Alpha Travels' }, supplier: { name: 'Akbar' }, rows: [],
    so: { total: 3000, gst: 100, otherTaxesGst: 25 }, po: { total: 2500, gst: 90 }, gp: { total: 500, pct: 16 },
    saleVno: 'SF/1', purchaseVno: 'PB/1' },
];

// useQuery is used for bookings + customers + suppliers — answer by query key.
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }) => {
    const k = queryKey[0];
    if (k === 'booking-orders') return { data: BOOKINGS, isLoading: false };
    if (k === 'customers' || k === 'suppliers') return { data: [], isLoading: false };
    return { data: undefined, isLoading: false };
  },
}));
jest.mock('../core/api', () => ({ apiGet: jest.fn() }));
jest.mock('../core/reportExportContext', () => ({ useReportExport: () => {} }));
jest.mock('../core/period', () => ({
  PeriodBar: () => null,
  periodRange: () => ({ from: '2026-06-01', to: '2026-06-30' }),
}));
jest.mock('../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../core/useAccounting', () => ({ branchCode: (b) => b || 'ALL' }));
jest.mock('../core/registerNav', () => ({ consumePendingRegisterSearch: () => '' }));
jest.mock('../core/PrintPreview', () => ({ openPrintPreview: () => {} }));
jest.mock('../core/invoiceHtml', () => ({ buildBookingInvoice: () => '' }));
jest.mock('../core/referenceCache', () => ({ companyProfile: () => ({}) }));
// Keep PageLayout thin so we test the table, not the shell chrome.
jest.mock('../shell/PageLayout', () => ({
  PageLayout: ({ filters, children }) => <div>{filters}{children}</div>,
}));

const headerTexts = () => screen.getAllByRole('columnheader').map((th) => th.textContent.trim());
const bodyRowFirstCells = () =>
  Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.querySelector('td')?.textContent.trim());

describe('Module Register column order + default sort', () => {
  test('sales view: requested column order, Date sorted ascending', () => {
    render(<ModuleRegister branch="BOM" mode="sales" />);
    const heads = headerTexts();
    // First seven columns must match the business-requested order exactly.
    expect(heads.slice(0, 7)).toEqual([
      'Date', 'Sales Type', 'Ledger Name', 'Invoice Value', 'Link No', 'Sales Invoice No', 'Purchase Invoice No',
    ]);
    // Default sort = Date ascending → the 10-Jun booking lands above the 20-Jun one.
    expect(bodyRowFirstCells()).toEqual(['2026-06-10', '2026-06-20']);
  });

  test('sales view: Ledger Name shows the customer (debtor)', () => {
    render(<ModuleRegister branch="BOM" mode="sales" />);
    const firstRow = document.querySelector('tbody tr');
    // Ledger Name is the 3rd column.
    const ledgerCell = firstRow.querySelectorAll('td')[2];
    expect(ledgerCell.textContent).toContain('Alpha Travels');
  });

  test('purchase view: Ledger Name shows the vendor (creditor)', () => {
    render(<ModuleRegister branch="BOM" mode="purchase" />);
    const heads = headerTexts();
    expect(heads.slice(0, 7)).toEqual([
      'Date', 'Sales Type', 'Ledger Name', 'Invoice Value', 'Link No', 'Sales Invoice No', 'Purchase Invoice No',
    ]);
    const firstRow = document.querySelector('tbody tr');
    const ledgerCell = firstRow.querySelectorAll('td')[2];
    // 10-Jun booking sorts first; its supplier is Akbar.
    expect(ledgerCell.textContent).toContain('Akbar');
  });
});
