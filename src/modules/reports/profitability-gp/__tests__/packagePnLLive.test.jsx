// Pins Package P&L: in ALL scope it used to sum ₹ (India) + $ (Africa) revenue/cost per
// tour code into one merged table (single ₹). Now it splits bills BY BRANCH and renders one
// own-currency table each — a ₹ branch shows ₹, a $ branch shows $, never blended.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../core/styleTokens', () => ({ bc: (b) => ({ cur: b && b.code === 'DAR' ? '$' : '₹' }), inp: {}, btnGh: {}, card: {} }));
jest.mock('../../../../core/ux/Menu', () => ({ Menu: () => <div /> }));
jest.mock('../../../../core/business-logic', () => ({ exportToCSV: jest.fn() }));
jest.mock('../../../../core/hooks', () => ({ useMobile: () => false }));
jest.mock('../../../../shell/primitives', () => ({ Skeleton: () => <div /> }));
jest.mock('lucide-react', () => ({ ChevronDown: () => <span />, Download: () => <span /> }));
jest.mock('../../../../core/dates', () => ({ PERIOD_OPTIONS: [{ v: 'YTD', l: 'YTD' }], FY_YTD_MONTHS: ['2026-07'] }));
jest.mock('../../../../core/useAccounting', () => ({
  useGpBills: () => ({
    data: [
      { branch: 'BOM', mod: 'Holiday', date: '2026-07-15', tourCode: 'TC-1', dest: 'Goa', sell: 1000, cost: 600, pax: 2 },
      { branch: 'DAR', mod: 'Holiday', date: '2026-07-15', tourCode: 'TC-2', dest: 'Dar', sell: 500, cost: 300, pax: 2 },
    ],
    isLoading: false,
  }),
}));

// eslint-disable-next-line import/first
import { PackagePnL } from '../packagePnLLive';

describe('PackagePnL — per-branch currency, no ₹+$ merge', () => {
  test('ALL scope: BOM revenue in ₹, DAR revenue in $ (separate tables, no merged total)', () => {
    render(<PackagePnL branch="ALL" />);
    expect(screen.getAllByText('₹1,000').length).toBeGreaterThan(0); // BOM revenue (+ its TOTAL)
    expect(screen.getAllByText('$500').length).toBeGreaterThan(0);   // DAR revenue (+ its TOTAL)
  });

  test('single Africa branch renders revenue in $', () => {
    render(<PackagePnL branch={{ code: 'DAR' }} />);
    expect(screen.getAllByText('$500').length).toBeGreaterThan(0);
    expect(screen.queryByText('₹500')).toBeNull();
  });
});
