// The Balance Sheet screen must expose EXACTLY three views — Fiori · Classic ·
// Vertical — after the Tally / TKF / Schedule III / Consolidated views were
// retired. It must default to Fiori and pin the chosen view onto ReportBSLive
// (forceView) with the internal switcher hidden.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Stub the heavy body — we only assert which view it is told to render.
jest.mock('../reportsFinancial', () => ({
  ReportBSLive: (props) => <div data-testid="bs-body" data-view={props.forceView} data-hide={String(!!props.hideSwitcher)} />,
  ReportPnLLive: () => <div data-testid="pnl-body" />,
}));
jest.mock('../pnlTally', () => ({ PnLTallyLive: () => <div /> }));
// Isolate from the live data/api stack (Vite `import.meta.env` chain).
jest.mock('../../core/styles', () => ({ bc: () => ({ cur: '₹' }) }));
jest.mock('../../core/format', () => ({ localeOf: () => 'en-IN' }));
jest.mock('../../core/ledgerUI', () => ({ LEDGER_CSS: '' }));
jest.mock('../../core/LedgerModalHost', () => ({ openLedgerModal: jest.fn() }));
jest.mock('../../core/ux/clickable', () => ({ clickable: () => ({}) }));
jest.mock('../../core/useAccounting', () => ({ useModulePL: () => ({ data: null, isLoading: false }) }));
jest.mock('../../core/data', () => ({ CONSOLIDATED_LABEL: 'All Branches' }));

// eslint-disable-next-line import/first
import { BalanceSheetUnified } from '../financialStatements';

describe('BalanceSheetUnified — three views only', () => {
  test('shows exactly Fiori, Classic, Vertical and none of the retired views', () => {
    render(<BalanceSheetUnified branch="BOM" />);
    expect(screen.getByText(/Fiori/)).toBeInTheDocument();
    expect(screen.getByText(/Classic/)).toBeInTheDocument();
    expect(screen.getByText(/Vertical/)).toBeInTheDocument();
    // Retired views must be gone.
    expect(screen.queryByText(/Tally/)).toBeNull();
    expect(screen.queryByText(/TKF/)).toBeNull();
    expect(screen.queryByText(/Schedule III/)).toBeNull();
    expect(screen.queryByText(/Consolidated/)).toBeNull();
  });

  test('defaults to Fiori and pins the view with the inner switcher hidden', () => {
    render(<BalanceSheetUnified branch="BOM" />);
    const body = screen.getByTestId('bs-body');
    expect(body).toHaveAttribute('data-view', 'fiori');
    expect(body).toHaveAttribute('data-hide', 'true');
  });

  test('switching to Vertical / Classic re-pins forceView', () => {
    render(<BalanceSheetUnified branch="BOM" />);
    fireEvent.click(screen.getByText(/Vertical/));
    expect(screen.getByTestId('bs-body')).toHaveAttribute('data-view', 'vertical');
    fireEvent.click(screen.getByText(/Classic/));
    expect(screen.getByTestId('bs-body')).toHaveAttribute('data-view', 'classic');
  });
});
