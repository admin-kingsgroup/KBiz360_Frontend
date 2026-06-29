// ③ Profit bridge — renders the Revenue→Net cascade with GP%/NP% and ties out
// to the same fields the Profitability dashboard uses.
jest.mock('../../../core/useAccounting', () => ({
  useProfitAndLoss: jest.fn(),
  useModulePL: jest.fn(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PnlWaterfallPanel } from '../components/shared/PnlWaterfallPanel';
import { useProfitAndLoss, useModulePL } from '../../../core/useAccounting';

afterEach(() => jest.clearAllMocks());

const money = (n) => `₹${Math.round(n)}`;

describe('PnlWaterfallPanel', () => {
  test('renders the bridge rows, margins and drill link', () => {
    useModulePL.mockReturnValue({ data: { totals: { sales: 1000, cogs: 600 } } });
    useProfitAndLoss.mockReturnValue({ data: { grossProfit: 400, indirect: { debitTotal: 150, creditTotal: 50 }, netProfit: 300 } });
    const onView = jest.fn();
    render(<PnlWaterfallPanel branch={'BOM'} range={{ label: 'CFY 2026', from: 'x', to: 'y' }} formatMoney={money} onViewFullReport={onView} />);

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('= Gross Profit')).toBeInTheDocument();
    expect(screen.getByText('= Net Profit')).toBeInTheDocument();
    expect(screen.getByText('₹400')).toBeInTheDocument();   // GP value
    expect(screen.getByText('₹300')).toBeInTheDocument();   // Net value
    expect(screen.getByText('GP 40.0%')).toBeInTheDocument();
    expect(screen.getByText('NP 30.0%')).toBeInTheDocument();

    fireEvent.click(screen.getByText('View →'));
    expect(onView).toHaveBeenCalled();
  });

  test('falls back to sales−cogs when grossProfit is absent', () => {
    useModulePL.mockReturnValue({ data: { totals: { sales: 800, cogs: 500 } } });
    useProfitAndLoss.mockReturnValue({ data: { netProfit: 0 } });
    render(<PnlWaterfallPanel branch={'BOM'} range={{ label: 'MTD' }} formatMoney={money} />);
    expect(screen.getByText('₹300')).toBeInTheDocument(); // GP = 800 − 500
  });
});
