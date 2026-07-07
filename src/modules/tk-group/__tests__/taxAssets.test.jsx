import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { assetNbv, assetDepreciation, assetBranchRow, assetsByCategory } from '../utils/assets';
import { calendarKpis, dueTone, filingBranchRows, prevMonth } from '../utils/taxDesk';

jest.mock('../../../core/api', () => ({ apiGet: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { AssetsCentral } from '../AssetsCentral';
// eslint-disable-next-line import/first
import { TaxDesk } from '../TaxDesk';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('assets utils', () => {
  test('assetNbv: Active uses wdv when set, else cost; Disposed → 0; never negative', () => {
    expect(assetNbv({ status: 'Active', cost: 1000, wdv: 600 })).toBe(600);
    expect(assetNbv({ status: 'Active', cost: 1000, wdv: 0 })).toBe(1000); // fresh, undepreciated
    expect(assetNbv({ status: 'Disposed', cost: 1000, wdv: 600 })).toBe(0);
    expect(assetNbv({ status: 'Active', cost: -50 })).toBe(0);
  });
  test('assetDepreciation = cost − NBV', () => {
    expect(assetDepreciation({ status: 'Active', cost: 1000, wdv: 600 })).toBe(400);
    expect(assetDepreciation({ status: 'Disposed', cost: 1000 })).toBe(1000); // fully written off
  });
  test('assetBranchRow folds a branch list; disposed counted separately, not in money', () => {
    const list = [
      { status: 'Active', cost: 1000, wdv: 600 },
      { status: 'Active', cost: 500, wdv: 0 },
      { status: 'Disposed', cost: 300, wdv: 100 },
    ];
    const r = assetBranchRow({ code: 'BOM', currency: 'INR' }, list);
    expect(r).toMatchObject({ code: 'BOM', cur: '₹', count: 2, disposed: 1, gross: 1500, depreciation: 400, nbv: 1100 });
  });
  test('assetBranchRow defensive to missing list', () => {
    expect(assetBranchRow({ code: 'X' }, null)).toMatchObject({ count: 0, gross: 0, nbv: 0, disposed: 0 });
  });
  test('assetsByCategory groups active assets by block code, richest NBV first', () => {
    const out = assetsByCategory([
      { status: 'Active', code: 'IT', cost: 200, wdv: 150 },
      { status: 'Active', code: 'FURN', cost: 1000, wdv: 900 },
      { status: 'Active', code: 'IT', cost: 100, wdv: 80 },
      { status: 'Disposed', code: 'IT', cost: 999 },
    ]);
    expect(out.map((g) => g.code)).toEqual(['FURN', 'IT']);
    expect(out[1]).toMatchObject({ code: 'IT', count: 2, gross: 300, nbv: 230 });
  });
});

describe('taxDesk utils', () => {
  test('calendarKpis maps totals, overdue first', () => {
    const k = calendarKpis({ overdue: 2, pending: 3, upcoming: 4, filed: 5 });
    expect(k.map((x) => x.key)).toEqual(['overdue', 'pending', 'upcoming', 'filed']);
    expect(k[0]).toMatchObject({ value: 2, tone: 'danger' });
  });
  test('dueTone maps statuses', () => {
    expect(dueTone('Overdue')).toBe('danger');
    expect(dueTone('Filed')).toBe('success');
    expect(dueTone('whatever')).toBe('neutral');
  });
  test('filingBranchRows filters to focus set and computes filed/pending/pct', () => {
    const board = { entities: [
      { entity: 'BOM', regime: 'GST', taxes: { gstr1: { status: 'Filed' }, gstr3b: { status: 'Pending' } } },
      { entity: 'NBO', regime: 'VAT', taxes: { vat: { status: 'Filed' } } },
    ] };
    const rows = filingBranchRows(board, ['BOM']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ code: 'BOM', filed: 1, pending: 1, total: 2, pct: 50 });
  });
  test('filingBranchRows with no focus → all entities; defensive to empty board', () => {
    expect(filingBranchRows({ entities: [{ entity: 'A', taxes: {} }] }, null)).toHaveLength(1);
    expect(filingBranchRows(null, ['BOM'])).toEqual([]);
  });
  test('prevMonth returns YYYY-MM of the previous month, with year rollover', () => {
    expect(prevMonth(new Date(2026, 6, 15))).toBe('2026-06'); // Jul → Jun
    expect(prevMonth(new Date(2026, 0, 10))).toBe('2025-12'); // Jan → Dec prev year
  });
});

describe('branchwise central screens render', () => {
  test('Assets Central renders branchwise, not consolidated', async () => {
    renderWith(<AssetsCentral />);
    const table = await screen.findByTestId('tk-assets');
    expect(table.textContent).toMatch(/BOM/);
    expect(screen.getAllByText(/never consolidated/i).length).toBeGreaterThan(0);
  });
  test('Tax Desk renders the calendar + branchwise filing board', async () => {
    renderWith(<TaxDesk />);
    expect(await screen.findByTestId('tk-tax-dues')).toBeInTheDocument();
    expect(screen.getByTestId('tk-filing-board')).toBeInTheDocument();
    expect(screen.getByText(/org-wide/i)).toBeInTheDocument();
  });
});
