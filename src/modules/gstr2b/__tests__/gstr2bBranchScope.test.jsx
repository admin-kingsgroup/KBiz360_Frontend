// Pins the GSTR-2B Import & ITC screen to the top-right branch selector. It used to
// hardcode useState('BOM') and ignore the shell branch, so an AMD accountant opened it
// and read/mutated BOM's input credit (and could pick any branch from an unfiltered
// dropdown). Now: a specific shell branch scopes the query to THAT branch and pins the
// dropdown; ALL scope shows a "pick a branch" notice and fires no query.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetGstr2bList = jest.fn(() => Promise.resolve([]));
jest.mock('../api', () => ({
  getGstr2bList: (...a) => mockGetGstr2bList(...a),
  importGstr2b: jest.fn(() => Promise.resolve({})),
  setGstr2bStatus: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../../shell/primitives', () => ({
  PageSection: ({ children }) => <div>{children}</div>,
  ResponsiveGrid: ({ children }) => <div>{children}</div>,
  Badge: ({ children }) => <span>{children}</span>,
  Button: ({ children, write, loading, ...p }) => <button {...p}>{children}</button>,
  Input: (p) => <input {...p} />,
  Select: ({ children, ...p }) => <select {...p}>{children}</select>,
  Textarea: (p) => <textarea {...p} />,
  FormField: ({ label, children }) => <label>{label}{children}</label>,
}));
jest.mock('../../dashboard/components/cards/KpiTile', () => ({ KpiTile: ({ label, value }) => <div>{label}:{value}</div> }));
jest.mock('../../../shell/DataTable', () => ({ DataTable: ({ title }) => <div>{title}</div> }));

// eslint-disable-next-line import/first
import { Gstr2bPage } from '../Gstr2bPage';

const renderWith = (branch) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><Gstr2bPage branch={branch} /></QueryClientProvider>);
};

beforeEach(() => mockGetGstr2bList.mockClear());

describe('Gstr2bPage — follows the top-right branch, no BOM default', () => {
  test('shell branch AMD → query scoped to AMD, never BOM; dropdown pinned to AMD', async () => {
    renderWith({ code: 'AMD' });
    await waitFor(() => expect(mockGetGstr2bList).toHaveBeenCalledWith(expect.objectContaining({ branch: 'AMD' })));
    expect(mockGetGstr2bList).not.toHaveBeenCalledWith(expect.objectContaining({ branch: 'BOM' }));
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();          // pinned — can't diverge from the top-bar branch
    expect(select.value).toBe('AMD');
  });

  test('ALL scope → shows the pick-a-branch notice and fires no query (no silent BOM load)', async () => {
    renderWith('ALL');
    expect(screen.getByText(/Pick a branch above/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toBeDisabled();  // full-scope user may choose
    await waitFor(() => {}, { timeout: 50 });
    expect(mockGetGstr2bList).not.toHaveBeenCalled();
  });
});
