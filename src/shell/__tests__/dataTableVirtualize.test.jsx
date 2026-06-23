import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataTable } from '../DataTable';

const COLS = [{ key: 'n', header: 'N' }, { key: 'name', header: 'Name' }];
const makeRows = (count) => Array.from({ length: count }, (_, i) => ({ n: i, name: `Row ${i}` }));

describe('DataTable virtualization-lite (auto-paginate large unpaginated lists)', () => {
  it('renders ALL rows when small and no pageSize set', () => {
    render(<DataTable columns={COLS} rows={makeRows(50)} getRowKey={(r) => r.n} />);
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 49')).toBeInTheDocument();
    expect(screen.queryByText(/Page 1 \//)).toBeNull(); // no pager
  });

  it('auto-paginates when the list crosses the threshold (caps the DOM)', () => {
    render(<DataTable columns={COLS} rows={makeRows(350)} getRowKey={(r) => r.n} />);
    // First page visible…
    expect(screen.getByText('Row 0')).toBeInTheDocument();
    expect(screen.getByText('Row 99')).toBeInTheDocument();
    // …but rows beyond the first page are NOT in the DOM.
    expect(screen.queryByText('Row 100')).toBeNull();
    expect(screen.queryByText('Row 349')).toBeNull();
    // Pager shows up.
    expect(screen.getByText(/Page 1 \/ 4/)).toBeInTheDocument();
  });
});
