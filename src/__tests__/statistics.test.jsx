/* Statistics screen: renders master + voucher counts and drills each voucher row
   to its register. Guards modules/statistics.jsx (Statistics + voucherRegister). */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// styles → useReference → api/crmApi use import.meta (no babel plugin under jest);
// useAccounting is mocked so its real api import never runs.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: () => 'open' }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

const SAMPLE = {
  branch: 'BOM',
  masters: {
    groups: { total: 84, primary: 16, primarySub: 12, erpGroup: 43, erpSub: 13 },
    ledgers: { total: 393, active: 376 },
    costCenters: 63, costCategories: 3, voucherTypes: 9, budgets: 0, scenarios: 0,
  },
  vouchers: [
    { category: 'sale', label: 'Sales', posted: 625, pending: 0, rejected: 0, deleted: 0, total: 625 },
    { category: 'receipt', label: 'Receipt', posted: 512, pending: 3, rejected: 0, deleted: 8, total: 523 },
  ],
  totals: { posted: 1137, pending: 3, rejected: 0, deleted: 8, total: 1148 },
};
jest.mock('../core/useAccounting', () => ({
  useStatistics: () => ({ data: SAMPLE, isLoading: false, isError: false, error: null }),
}));

import { Statistics, voucherRegister } from '../modules/statistics';

describe('voucherRegister', () => {
  test('maps each voucher category to its register route', () => {
    expect(voucherRegister('sale')).toBe('/reports/sreg');
    expect(voucherRegister('purchase')).toBe('/reports/preg');
    expect(voucherRegister('receipt')).toBe('/finance/receipt-register');
    expect(voucherRegister('journal')).toBe('/finance/journal-register');
    expect(voucherRegister('refund')).toBe('/finance/refund-register');
    expect(voucherRegister('reissue')).toBe('/finance/reissue-register');
    expect(voucherRegister('debit-note')).toBe('/finance/debit-note-register');
    expect(voucherRegister('purchase-expense')).toBe('/finance/purchase-expense-register');
    expect(voucherRegister('adm')).toBe(''); // no register → no drill
  });
});

describe('Statistics screen', () => {
  test('renders master counts (group tiers, ledgers) and voucher totals', () => {
    render(<Statistics branch="BOM" setRoute={() => {}} />);
    expect(screen.getByText('Primary Groups')).toBeInTheDocument();
    expect(screen.getByText('Primary Sub Groups')).toBeInTheDocument();
    expect(screen.getByText('376 / 393')).toBeInTheDocument(); // ledgers active/total
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
  });

  test('clicking a voucher row drills to its register', () => {
    const setRoute = jest.fn();
    render(<Statistics branch="BOM" setRoute={setRoute} />);
    fireEvent.click(screen.getByText('Sales'));
    expect(setRoute).toHaveBeenCalledWith('/reports/sreg');
  });

  test('clicking a master row drills to its master screen', () => {
    const setRoute = jest.fn();
    render(<Statistics branch="BOM" setRoute={setRoute} />);
    fireEvent.click(screen.getByText('Cost Centres'));
    expect(setRoute).toHaveBeenCalledWith('/masters/cost-centers');
  });
});
