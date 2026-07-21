// Pins the Reconciliation Status screen to the top-right branch selector. It used to
// hardcode useState('BOM'), so an AMD accountant saw/ticked BOM's reconciliation rows
// (which feed the Control Tower close gate). Now: a specific shell branch scopes the
// query to THAT branch and pins the dropdown; ALL scope shows a "pick a branch" notice
// and fires no query.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetReconList = jest.fn(() => Promise.resolve([]));
jest.mock('../api', () => ({
  getReconList: (...a) => mockGetReconList(...a),
  saveRecon: jest.fn(() => Promise.resolve({})),
  deleteRecon: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../../shell/primitives', () => ({
  PageSection: ({ children }) => <div>{children}</div>,
  ResponsiveGrid: ({ children }) => <div>{children}</div>,
  Badge: ({ children }) => <span>{children}</span>,
  Button: ({ children, write, loading, ...p }) => <button {...p}>{children}</button>,
  Input: (p) => <input {...p} />,
  Select: ({ children, ...p }) => <select {...p}>{children}</select>,
  FormField: ({ label, children }) => <label>{label}{children}</label>,
  isViewOnly: () => false,
}));
jest.mock('../../dashboard/components/cards/KpiTile', () => ({ KpiTile: ({ label, value }) => <div>{label}:{value}</div> }));
jest.mock('../../../shell/DataTable', () => ({ DataTable: ({ title }) => <div>{title}</div> }));

// eslint-disable-next-line import/first
import { ReconStatusPage } from '../ReconStatusPage';

const renderWith = (branch) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><ReconStatusPage branch={branch} /></QueryClientProvider>);
};

beforeEach(() => mockGetReconList.mockClear());

describe('ReconStatusPage — follows the top-right branch, no BOM default', () => {
  test('shell branch AMD → query scoped to AMD, never BOM', async () => {
    renderWith({ code: 'AMD' });
    await waitFor(() => expect(mockGetReconList).toHaveBeenCalledWith(expect.objectContaining({ branch: 'AMD' })));
    expect(mockGetReconList).not.toHaveBeenCalledWith(expect.objectContaining({ branch: 'BOM' }));
    // branch dropdown reflects AMD and is pinned (there is also an accountType select)
    expect(screen.getByDisplayValue('AMD')).toBeDisabled();
  });

  test('ALL scope → shows the pick-a-branch notice and fires no query', async () => {
    renderWith('ALL');
    expect(screen.getByText(/Pick a branch above/i)).toBeInTheDocument();
    await waitFor(() => {}, { timeout: 50 });
    expect(mockGetReconList).not.toHaveBeenCalled();
  });
});
