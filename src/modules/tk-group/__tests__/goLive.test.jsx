import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { masterIsOn, goLiveStatus, goLiveSteps } from '../utils/goLive';

// GoLive pulls api/flags + api/governance (core/api import.meta) → mock both.
jest.mock('../api/flags', () => ({ getFlagState: jest.fn() }));
jest.mock('../api/governance', () => ({ getPendingByType: jest.fn().mockResolvedValue([]) }));
// eslint-disable-next-line import/first
import { GoLive } from '../setup-roles/GoLive';
// eslint-disable-next-line import/first
import { getFlagState } from '../api/flags';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('go-live utils', () => {
  test('masterIsOn / goLiveStatus reflect core.policy_guard', () => {
    expect(masterIsOn({ flags: { 'core.policy_guard': { enabled: true } } })).toBe(true);
    expect(masterIsOn({ flags: { 'core.policy_guard': { enabled: false } } })).toBe(false);
    expect(goLiveStatus({ flags: {} })).toBe('dormant');
  });
  test('steps: dormant → propose/approve/live not done; a pending flag marks "proposed" done', () => {
    const dormant = goLiveSteps({ flags: { x: {} } }, 0);
    expect(dormant.find((s) => s.key === 'live').done).toBe(false);
    expect(dormant.find((s) => s.key === 'propose').done).toBe(false);
    const proposed = goLiveSteps({ flags: { x: {} } }, 1);
    expect(proposed.find((s) => s.key === 'propose').done).toBe(true);
    const live = goLiveSteps({ flags: { 'core.policy_guard': { enabled: true } } }, 0);
    expect(live.every((s) => s.done)).toBe(true);
  });
});

describe('GoLive container', () => {
  beforeEach(() => jest.clearAllMocks());
  test('shows DORMANT when the guard is off', async () => {
    getFlagState.mockResolvedValue({ flags: { 'core.policy_guard': { enabled: false } } });
    renderWith(<GoLive setRoute={() => {}} />);
    expect(await screen.findByText(/controls are built but not enforcing/)).toBeInTheDocument();
  });
  test('shows LIVE when the guard is engaged', async () => {
    getFlagState.mockResolvedValue({ flags: { 'core.policy_guard': { enabled: true } } });
    renderWith(<GoLive setRoute={() => {}} />);
    // wait for the async flag query to flip the banner to LIVE
    expect(await screen.findByText(/the control guard is engaged/)).toBeInTheDocument();
  });
});
