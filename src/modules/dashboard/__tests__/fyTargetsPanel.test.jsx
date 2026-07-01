// FyTargetsPanel must render target amounts through the branch-aware `formatMoney` the
// dashboards pass in — so a USD branch reads "$500,000", not the old ₹-only "÷100000 + L"
// which mis-scaled USD as "$5L". When no formatter is passed it falls back to the legacy
// unit behaviour (kept for back-compat with callers that don't pass one).
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FyTargetsPanel } from '../components/shared/FyTargetsPanel';

afterEach(() => jest.clearAllMocks());

const TARGETS = [{ metric: 'Sales', actual: 500000, target: 1000000, unit: '$' }];

describe('FyTargetsPanel', () => {
  test('uses the passed branch-aware formatMoney for actual and target', () => {
    const fmt = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
    render(<FyTargetsPanel targets={TARGETS} formatMoney={fmt} />);
    expect(screen.getByText('$500,000')).toBeInTheDocument();        // actual via formatter
    expect(screen.getByText('/ $1,000,000')).toBeInTheDocument();    // target via formatter
    expect(screen.getByText(/50%/)).toBeInTheDocument();             // attainment unchanged
    // The buggy lakh scaling must NOT appear.
    expect(screen.queryByText(/\$5L/)).toBeNull();
  });

  test('falls back to legacy unit formatting when no formatMoney given', () => {
    // unit truthy → legacy "÷100000 + L" path still works for back-compat callers.
    render(<FyTargetsPanel targets={[{ metric: 'Sales', actual: 500000, target: 1000000, unit: '₹' }]} />);
    expect(screen.getByText('₹5L')).toBeInTheDocument();
  });
});
