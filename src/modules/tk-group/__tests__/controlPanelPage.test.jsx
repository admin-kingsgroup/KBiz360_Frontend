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
    fireEvent.click(await screen.findByRole('switch', { name: /Engage the TK Group guard/ }));
    expect(await screen.findByText(/submitted for the Owner/)).toBeInTheDocument();
    expect(proposeFlags).toHaveBeenCalledTimes(1);
  });

  test('AE-approve on the Approval screen proposes it (elevate Sughra to approve)', async () => {
    const { proposeFlags } = require('../api/flags');
    proposeFlags.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Approval & Verification'));
    fireEvent.click(await screen.findByRole('switch', { name: /Let Sughra also Approve/ }));
    expect(await screen.findByText(/submitted for the Owner/)).toBeInTheDocument();
    expect(proposeFlags).toHaveBeenCalledTimes(1);
  });

  test('Rights & Locks toggles (relocate / hide-statements) propose too', async () => {
    const { proposeFlags } = require('../api/flags');
    proposeFlags.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Rights & Locks'));
    fireEvent.click(await screen.findByRole('switch', { name: /Relocate central screens/ }));
    expect(await screen.findByText(/submitted for the Owner/)).toBeInTheDocument();
    expect(proposeFlags).toHaveBeenCalledTimes(1);
    // hide-statements is also a live switch on this screen
    expect(screen.getByRole('switch', { name: /Hide branch statements/ })).toBeInTheDocument();
    // guard-governed locks are shown honestly (not fake toggles)
    expect(screen.getAllByText(/Via master guard/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1); // numbering / wired already applied
  });

  test('honest states: SoD enforced by the guard, Security still Planned', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Segregation of Duties'));
    expect(await screen.findByText(/enforced by the guard/)).toBeInTheDocument();     // maker≠approver
    expect(screen.getAllByText('Via master guard').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText('Access & Security'));
    expect((await screen.findAllByText('Planned')).length).toBeGreaterThanOrEqual(3); // 2FA / IP / session… not built
  });
});
