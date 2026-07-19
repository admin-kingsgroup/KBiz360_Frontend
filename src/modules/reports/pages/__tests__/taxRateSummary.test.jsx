// Pins the consolidated GST/VAT Rate-Wise report: in ALL scope it used to render one merged
// section set with a single ₹ symbol. Now it renders each branch separately in its own
// currency AND its own regime (India GST ₹ / Africa VAT $) from d.byBranch — never merged.
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../../core/styles', () => ({
  bc: (b) => (b && b.code === 'DAR' ? { cur: '$', taxType: 'VAT' } : { cur: '₹', taxType: 'GST' }),
}));
jest.mock('../../../../core/data', () => ({ CONSOLIDATED_LABEL: 'All Branches' }));
jest.mock('../../../../core/business-logic', () => ({ exportToCSV: jest.fn() }));
jest.mock('../../../../core/reportDateBar', () => ({ ReportDateBar: () => <div />, resolveReportRange: () => ({ from: '', to: '' }) }));
jest.mock('../../../../shell/PageLayout', () => ({ PageLayout: ({ children }) => <div>{children}</div> }));
jest.mock('../../../../shell/DataTable', () => ({ DataTable: ({ title }) => <div data-testid="dt">{title}</div> }));
jest.mock('../../../../shell/primitives', () => ({
  ResponsiveGrid: ({ children }) => <div>{children}</div>,
  Button: (p) => <button>{p.children}</button>,
  Badge: ({ children }) => <span>{children}</span>,
  LoadingState: () => <div>loading</div>,
  ErrorState: () => <div>error</div>,
}));
jest.mock('lucide-react', () => ({ Download: () => <span /> }));

jest.mock('../../../../core/useAccounting', () => {
  const S = { output: { rows: [], total: { total: 0 } }, input: { rows: [], total: { total: 0 } }, svc2: { rows: [], total: { total: 0 } } };
  const DATA = {
    byBranch: [
      { branch: 'BOM', regime: 'GST', sections: S, control: { reportOutput: 1000, reportInput: 200, ledgerOutput: 1000, ledgerInput: 200, outputDelta: 0, inputDelta: 0, tallies: true } },
      { branch: 'DAR', regime: 'VAT', sections: S, control: { reportOutput: 500, reportInput: 100, ledgerOutput: 500, ledgerInput: 100, outputDelta: 0, inputDelta: 0, tallies: true } },
    ],
  };
  return { useTaxRateSummary: () => ({ data: DATA, isLoading: false, isError: false }) };
});

// eslint-disable-next-line import/first
import { RPT_TaxRateSummary } from '../tax-rate-summary';

describe('RPT_TaxRateSummary — per-branch currency + regime, no merge', () => {
  test('ALL scope: BOM Output GST in ₹, DAR Output VAT in $ (both regimes, no cross-currency total)', () => {
    render(<RPT_TaxRateSummary branch="ALL" />);
    // BOM GST output KPI in ₹, DAR VAT output KPI in $ — proves per-branch currency+regime
    expect(screen.getByText('₹ 1,000')).toBeInTheDocument();
    expect(screen.getByText('$ 500')).toBeInTheDocument();
    // both regime labels rendered as section headings
    expect(screen.getByText(/· ₹ · GST/)).toBeInTheDocument();
    expect(screen.getByText(/· \$ · VAT/)).toBeInTheDocument();
  });
});
