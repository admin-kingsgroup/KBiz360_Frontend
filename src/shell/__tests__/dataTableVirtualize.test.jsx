import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../DataTable';

const COLS = [{ key: 'n', header: 'N' }, { key: 'name', header: 'Name' }];
const makeRows = (count) => Array.from({ length: count }, (_, i) => ({ n: i, name: `Row ${i}` }));

// DataTable renders a growing WINDOW (infinite scroll): the first `pageSize` rows
// (default 20) paint immediately, then more load as the bottom sentinel scrolls into
// view. jsdom has no IntersectionObserver, so here we exercise the window + the
// "Load more" fallback. (In a real browser the sentinel auto-fills the viewport.)
describe('DataTable infinite scroll (windowed rendering)', () => {
  it('renders ALL rows when the set fits the first window', () => {
    render(<DataTable columns={COLS} rows={makeRows(15)} getRowKey={(r) => r.n} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 14')).toBeInTheDocument();
    expect(screen.queryByText('Load more')).toBeNull(); // nothing more → no sentinel
  });

  it('caps the DOM to the first window for a large list', () => {
    render(<DataTable columns={COLS} rows={makeRows(350)} getRowKey={(r) => r.n} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 19')).toBeInTheDocument();
    expect(screen.queryByText('Row 20')).toBeNull();   // beyond the first window
    expect(screen.queryByText('Row 349')).toBeNull();
    expect(screen.getByText('Showing 20 of 350')).toBeInTheDocument();
  });

  it('grows the window via Load more (rows accumulate, not replaced)', () => {
    render(<DataTable columns={COLS} rows={makeRows(350)} getRowKey={(r) => r.n} />);
    fireEvent.click(screen.getByText('Load more'));
    expect(screen.getByText('Row 0')).toBeInTheDocument();  // earlier rows stay
    expect(screen.getByText('Row 39')).toBeInTheDocument();  // window grew
    expect(screen.queryByText('Row 40')).toBeNull();
    expect(screen.getByText('Showing 40 of 350')).toBeInTheDocument();
  });

  it('respects an explicit pageSize as the window step', () => {
    render(<DataTable columns={COLS} rows={makeRows(120)} pageSize={50} getRowKey={(r) => r.n} />);
    expect(screen.getByText('Row 49')).toBeInTheDocument();
    expect(screen.queryByText('Row 50')).toBeNull();
    expect(screen.getByText('Showing 50 of 120')).toBeInTheDocument();
  });
});
