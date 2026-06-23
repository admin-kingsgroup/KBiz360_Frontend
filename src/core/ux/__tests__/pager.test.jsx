import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { usePager, Pager } from '../pager';

const makeRows = (count) => Array.from({ length: count }, (_, i) => ({ id: i, name: `Row ${i}` }));

function Demo({ rows, step }) {
  const pg = usePager(rows, step);
  return (
    <div>
      <ul>{pg.pageRows.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
      <Pager pager={pg} />
    </div>
  );
}

// jsdom has no IntersectionObserver, so auto-load-on-scroll can't fire here — these
// tests cover the windowing logic, the "Load more" fallback and reset-on-change.
describe('usePager / Pager — infinite scroll', () => {
  it('renders all rows and hides the sentinel when the set fits the first window', () => {
    render(<Demo rows={makeRows(15)} step={20} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 14')).toBeInTheDocument();
    expect(screen.queryByText('Load more')).toBeNull(); // nothing more → no sentinel
  });

  it('caps the DOM to the first window and grows it via Load more', () => {
    render(<Demo rows={makeRows(250)} step={20} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 19')).toBeInTheDocument();
    expect(screen.queryByText('Row 20')).toBeNull();       // beyond the first window
    expect(screen.getByText('Showing 20 of 250')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Load more'));
    expect(screen.getByText('Row 20')).toBeInTheDocument(); // window grew
    expect(screen.getByText('Row 39')).toBeInTheDocument();
    expect(screen.queryByText('Row 40')).toBeNull();
    expect(screen.getByText('Showing 40 of 250')).toBeInTheDocument();
    expect(screen.getByText('Row 0')).toBeInTheDocument();  // earlier rows stay (infinite scroll, not paging)
  });

  it('resets the window to the top when the set size changes (filter/search)', () => {
    const { rerender } = render(<Demo rows={makeRows(250)} step={20} />);
    fireEvent.click(screen.getByText('Load more'));
    fireEvent.click(screen.getByText('Load more'));
    expect(screen.getByText('Showing 60 of 250')).toBeInTheDocument();
    // A filter shrinks the set — window must re-bound (not keep a 60-row DOM).
    act(() => { rerender(<Demo rows={makeRows(10)} step={20} />); });
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 9')).toBeInTheDocument();
    expect(screen.queryByText('Load more')).toBeNull(); // all 10 fit the first window
  });
});
