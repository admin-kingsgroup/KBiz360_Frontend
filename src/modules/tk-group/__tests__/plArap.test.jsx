import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { profitabilityRow } from '../utils/profitability';
import { arapRow } from '../utils/arap';

jest.mock('../../../core/api', () => ({ apiGet: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { Profitability } from '../performance-oversight/Profitability';
// eslint-disable-next-line import/first
import { ReceivablesPayables } from '../performance-oversight/ReceivablesPayables';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('profitability util', () => {
  test('pulls rev/cost/GP/exp/NP from P&L shape, computes GP% + NP%', () => {
    const r = profitabilityRow({ code: 'BOM', currency: 'INR' }, {
      trading: { creditTotal: 10000, debitTotal: 7000 }, grossProfit: 3000, indirect: { debitTotal: 1000 }, netProfit: 2000,
    });
    expect(r).toMatchObject({ rev: 10000, cost: 7000, gp: 3000, exp: 1000, np: 2000, gpPct: 30, npPct: 20 });
  });
  test('empty P&L → zeros, no divide-by-zero', () => {
    expect(profitabilityRow({ code: 'X' }, {})).toMatchObject({ rev: 0, gp: 0, np: 0, gpPct: 0, npPct: 0 });
  });
});

describe('arap util', () => {
  test('pulls receivables/payables totals + net branchwise', () => {
    const r = arapRow({ code: 'BOM', currency: 'INR' }, {
      receivables: { totals: { total: 5000, d90: 1000 }, rows: [{}, {}] },
      payables: { totals: { total: 2000 }, rows: [{}] },
    });
    expect(r).toMatchObject({ receivables: 5000, over90: 1000, payables: 2000, net: 3000, debtors: 2, creditors: 1 });
  });
  test('missing ageing → zeros', () => {
    expect(arapRow({ code: 'X' }, null)).toMatchObject({ receivables: 0, payables: 0, net: 0 });
  });
});

describe('branchwise P&L / AR-AP dashboards render', () => {
  test('Profitability renders branchwise', async () => {
    renderWith(<Profitability />);
    const t = await screen.findByTestId('tk-profitability');
    expect(t.textContent).toMatch(/BOM/);
    expect(screen.getAllByText(/never consolidated/i).length).toBeGreaterThan(0);
  });
  test('Receivables & Payables renders branchwise', async () => {
    renderWith(<ReceivablesPayables />);
    const t = await screen.findByTestId('tk-arap');
    expect(t.textContent).toMatch(/BOM/);
    expect(screen.getAllByText(/never consolidated/i).length).toBeGreaterThan(0);
  });
});
