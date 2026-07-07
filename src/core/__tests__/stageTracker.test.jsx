import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// limits drive the escalation to Director / Owner.
jest.mock('../api', () => ({
  apiGet: jest.fn().mockResolvedValue({ limits: { voucherEscalate: 500000, voucherDual: 1500000 } }),
  getAuthToken: () => 'tok',
}));
// eslint-disable-next-line import/first
import { StageTracker } from '../approvalChain';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('StageTracker — per-row 5-node stage stepper', () => {
  test('renders nothing for a single-step / legacy entry (no reviewStage)', () => {
    const { container } = renderWith(<StageTracker e={{ reviewStage: '' }} />);
    expect(container.textContent).toBe(''); // branch view unchanged
  });

  test('a chain entry shows the Branch → AE → FM path (amount under escalate)', () => {
    const { getByLabelText } = renderWith(<StageTracker e={{ reviewStage: 'verify', total: 100000, checkedBy: 'ap' }} />);
    expect(getByLabelText('Branch')).toBeInTheDocument();
    expect(getByLabelText('AE · Sughra')).toBeInTheDocument();
    expect(getByLabelText('FM · Faiz')).toBeInTheDocument();
  });

  test('an over-dual entry extends the path to Director and Owner', async () => {
    const { findByLabelText } = renderWith(<StageTracker e={{ reviewStage: 'approve', total: 2000000, checkedBy: 'ap', verifiedBy: 'sg' }} />);
    expect(await findByLabelText('Director · Farhan')).toBeInTheDocument();
    expect(await findByLabelText('Owner · Afshin')).toBeInTheDocument();
  });
});
