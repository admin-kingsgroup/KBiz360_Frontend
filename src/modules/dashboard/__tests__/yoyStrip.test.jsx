// Year-on-year strip — ▲/▼ % per headline line; hidden when no comparable data.
jest.mock('../../../core/useAccounting', () => ({ useYearOverYear: jest.fn() }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { YoyStrip } from '../components/shared/YoyStrip';
import { useYearOverYear } from '../../../core/useAccounting';

afterEach(() => jest.clearAllMocks());

describe('YoyStrip', () => {
  test('renders ▲/▼ deltas for revenue, GP and net profit', () => {
    useYearOverYear.mockReturnValue({
      data: {
        current: { label: 'CFY 2026' }, prior: { label: 'LFY 2025' },
        rows: [
          { line: 'Revenue', cy: 112, ly: 100 },     // +12%
          { line: 'Gross Profit', cy: 90, ly: 100 },  // -10%
          { line: 'Net Profit', cy: 105, ly: 100 },   // +5%
        ],
      },
    });
    render(<YoyStrip branch={'BOM'} range={{ from: '2025-04-01', to: '2026-03-31' }} />);
    expect(screen.getByText('▲ 12.0%')).toBeInTheDocument();
    expect(screen.getByText('▼ 10.0%')).toBeInTheDocument();
    expect(screen.getByText('▲ 5.0%')).toBeInTheDocument();
    expect(screen.getByText('(CFY 2026 vs LFY 2025)')).toBeInTheDocument();
  });

  test('renders nothing when there is no prior-year base', () => {
    useYearOverYear.mockReturnValue({ data: { rows: [{ line: 'Revenue', cy: 50, ly: 0 }] } });
    const { container } = render(<YoyStrip branch={'BOM'} range={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing while loading (no data)', () => {
    useYearOverYear.mockReturnValue({ data: undefined });
    const { container } = render(<YoyStrip branch={'BOM'} range={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
