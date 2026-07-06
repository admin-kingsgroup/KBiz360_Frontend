import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// master guard OFF (dormant) so people read Independent.
jest.mock('../api/flags', () => ({
  getFlagState: jest.fn().mockResolvedValue({ flags: { 'core.policy_guard': { enabled: false, label: 'Master' } } }),
  proposeFlags: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock('../../../core/useAccounting', () => ({ useConfigValue: () => ({ data: {} }) }));
// eslint-disable-next-line import/first
import { ControlPanel } from '../ControlPanel';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('Control Panel · Power Console', () => {
  test('opens on the Master Switch, dormant, with the 17-screen nav', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    expect(await screen.findByText(/Power Console/)).toBeInTheDocument();
    expect(screen.getByText(/Everything OFF/)).toBeInTheDocument();
    // a few nav entries across the groups (incl. the three added screens)
    expect(screen.getByText('Enforcement Matrix')).toBeInTheDocument();
    expect(screen.getByText('User Configuration')).toBeInTheDocument();
    expect(screen.getByText('Segregation of Duties')).toBeInTheDocument();
    expect(screen.getByText('Notifications & SLA')).toBeInTheDocument();
    expect(screen.getByText('Break-Glass Access')).toBeInTheDocument();
    expect(screen.getByText('Report & Export Controls')).toBeInTheDocument();
  });

  test('navigating to Approval shows the real chain + Independent per person', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Approval & Verification'));
    expect(await screen.findByText(/sughra@travkings.com/)).toBeInTheDocument();
    expect(screen.getByText(/faiz@travkings.com/)).toBeInTheDocument();
    expect(screen.getAllByText(/Independent · no approval/).length).toBe(2); // Sughra + Faiz
  });

  test('navigating to ERP Config shows the readiness + security gauges', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('ERP Config & Security'));
    expect(await screen.findByText(/Controls engaged/)).toBeInTheDocument();
    expect(screen.getByText(/Secure & under verification/)).toBeInTheDocument();
  });

  test('flipping the Master Switch PROPOSES a change (Owner-approved), never a live flip', async () => {
    const { proposeFlags } = require('../api/flags');
    proposeFlags.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    const sw = (await screen.findAllByRole('switch'))[0]; // the master toggle
    fireEvent.click(sw);
    expect(await screen.findByText(/submitted for the Owner/)).toBeInTheDocument();
    expect(proposeFlags).toHaveBeenCalledTimes(1);
  });

  test('AE-approve on the Approval screen proposes it (elevate Sughra to approve)', async () => {
    const { proposeFlags } = require('../api/flags');
    proposeFlags.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Approval & Verification'));
    const sw = (await screen.findAllByRole('switch'))[0]; // AE-approve is the only switch here
    fireEvent.click(sw);
    expect(await screen.findByText(/submitted for the Owner/)).toBeInTheDocument();
    expect(proposeFlags).toHaveBeenCalledTimes(1);
  });
});
