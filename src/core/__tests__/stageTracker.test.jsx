import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// StageTracker fetches BOTH /api/tk/limits (amount ceilings) and /api/tk/flags (whether
// the escalation sign-offs feature is engaged). The mock answers each URL accordingly.
jest.mock('../api', () => ({ apiGet: jest.fn(), getAuthToken: () => 'tok' }));
// eslint-disable-next-line import/first
import { apiGet } from '../api';
// eslint-disable-next-line import/first
import { StageTracker } from '../approvalChain';

const LIMITS = { limits: { voucherEscalate: 500000, voucherDual: 1500000 } };
const escalationOn = (url) => (String(url).includes('/flags')
  ? { flags: { 'approval.escalation_signoffs': { enabled: true } } }
  : LIMITS);
const escalationOff = (url) => (String(url).includes('/flags') ? { flags: {} } : LIMITS);

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockImplementation((url) => Promise.resolve(escalationOn(url))); // feature engaged by default
});

describe('StageTracker — per-row stage stepper', () => {
  test('renders nothing for a single-step / legacy entry (no reviewStage)', () => {
    const { container } = renderWith(<StageTracker e={{ reviewStage: '' }} />);
    expect(container.textContent).toBe(''); // branch view unchanged
  });

  test('a chain entry under the escalate ceiling shows Branch → AE → FM', () => {
    const { getByLabelText, queryByLabelText } = renderWith(<StageTracker e={{ reviewStage: 'verify', total: 100000, checkedBy: 'ap' }} />);
    expect(getByLabelText('Branch')).toBeInTheDocument();
    expect(getByLabelText('AE · Sughra')).toBeInTheDocument();
    expect(getByLabelText('FM · Faiz')).toBeInTheDocument();
    expect(queryByLabelText('Director · Farhan')).toBeNull(); // under ceiling → no escalation beads
  });

  test('engaged + over-dual entry extends the path to Director and Owner (FM stays last)', async () => {
    const { findByLabelText } = renderWith(<StageTracker e={{ reviewStage: 'owner', total: 2000000, checkedBy: 'ap', verifiedBy: 'sg' }} />);
    expect(await findByLabelText('Director · Farhan')).toBeInTheDocument();
    expect(await findByLabelText('Owner · Afshin')).toBeInTheDocument();
    expect(await findByLabelText('FM · Faiz')).toBeInTheDocument();
  });

  test('DORMANT (flag off): an over-dual entry shows NO Director/Owner — FM is the final step', async () => {
    apiGet.mockImplementation((url) => Promise.resolve(escalationOff(url)));
    const { findByLabelText, queryByLabelText } = renderWith(<StageTracker e={{ reviewStage: 'approve', total: 2000000, checkedBy: 'ap', verifiedBy: 'sg' }} />);
    expect(await findByLabelText('FM · Faiz')).toBeInTheDocument();
    expect(queryByLabelText('Director · Farhan')).toBeNull();
    expect(queryByLabelText('Owner · Afshin')).toBeNull();
  });
});
