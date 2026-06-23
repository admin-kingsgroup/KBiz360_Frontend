import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { usePager, Pager } from '../pager';

const makeRows = (count) => Array.from({ length: count }, (_, i) => ({ id: i, name: `Row ${i}` }));

function Demo({ rows, pageSize }) {
  const pg = usePager(rows, pageSize);
  return (
    <div>
      <ul>{pg.pageRows.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
      <Pager pager={pg} />
    </div>
  );
}

describe('usePager / Pager', () => {
  it('renders all rows and hides the pager when the set fits one page', () => {
    render(<Demo rows={makeRows(40)} pageSize={100} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 39')).toBeInTheDocument();
    expect(screen.queryByText(/Page 1 \//)).toBeNull();
  });

  it('caps the DOM to one page and pages through with Next/Prev', () => {
    render(<Demo rows={makeRows(250)} pageSize={100} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 99')).toBeInTheDocument();
    expect(screen.queryByText('Row 100')).toBeNull();      // page 2 not in DOM
    expect(screen.getByText('1–100 of 250')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 \/ 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Row 100')).toBeInTheDocument();
    expect(screen.queryByText('Row 0')).toBeNull();
    expect(screen.getByText('101–200 of 250')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Prev'));
    expect(screen.getByText('Row 0')).toBeInTheDocument();
  });

  it('clamps the page when the set shrinks (no stranded empty page)', () => {
    const { rerender } = render(<Demo rows={makeRows(250)} pageSize={100} />);
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next')); // page 3
    expect(screen.getByText(/Page 3 \/ 3/)).toBeInTheDocument();
    // Filter shrinks the set to a single page — view must not be stuck on page 3.
    act(() => { rerender(<Demo rows={makeRows(20)} pageSize={100} />); });
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 19')).toBeInTheDocument();
    expect(screen.queryByText(/Page 3/)).toBeNull();
  });
});
