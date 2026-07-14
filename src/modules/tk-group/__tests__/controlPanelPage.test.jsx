import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// master guard OFF (dormant) so people read Independent.
jest.mock('../api/flags', () => ({
  getFlagState: jest.fn().mockResolvedValue({ flags: { 'core.policy_guard': { enabled: false, label: 'Master' } } }),
  proposeFlags: jest.fn().mockResolvedValue({ ok: true }),
  setFlag: jest.fn().mockResolvedValue({ flags: { 'core.policy_guard': { enabled: true, label: 'Master control — engage the TK Group guard' } }, enabled: ['core.policy_guard'] }),
}));
jest.mock('../../../core/useAccounting', () => ({ useConfigValue: () => ({ data: {} }) }));
// BranchLimitsEditor (rendered on the Limits screen) pulls api/limits → core/api
// (import.meta) → mock the api layer so the panel imports cleanly under jest.
jest.mock('../api/limits', () => ({
  getLimits: jest.fn().mockResolvedValue({ store: { default: {}, branches: {} }, fields: [], defaults: {}, limits: {} }),
  setBranchLimits: jest.fn().mockResolvedValue({ store: { default: {}, branches: {} }, fields: [], defaults: {}, limits: {} }),
  proposeBranchLimits: jest.fn().mockResolvedValue({}),
}));
// EnforcementMatrix (rendered on the Matrix screen) pulls api/voucherPolicy → core/api.
jest.mock('../api/voucherPolicy', () => ({
  getVoucherPolicy: jest.fn().mockResolvedValue({ categories: [], defaults: {}, store: { default: {}, branches: {} }, effective: {} }),
  setVoucherPolicy: jest.fn().mockResolvedValue({ store: { default: {}, branches: {} }, effective: {} }),
  proposeVoucherPolicy: jest.fn().mockResolvedValue({}),
}));
// UserConfig (Users screen) pulls api/userLimits → core/api.
jest.mock('../api/userLimits', () => ({
  getUserLimits: jest.fn().mockResolvedValue({ store: {} }),
  getRoster: jest.fn().mockResolvedValue([]),
  setUserLimit: jest.fn().mockResolvedValue({ store: {} }),
  proposeUserLimit: jest.fn().mockResolvedValue({}),
}));
// ChangeLog + Daily Digest pull api/monitor → core/api.
jest.mock('../api/monitor', () => ({
  getAudit: jest.fn().mockResolvedValue({ items: [] }),
  getOverview: jest.fn().mockResolvedValue({ pendingTotal: 3, oldestPendingDays: 2, lockedPeriods: 0, streamPending: { governance: 2, decision: 1 } }),
  getIntegrity: jest.fn().mockResolvedValue({ fails: 0, branches: [{ branch: 'BOM', closeReady: true, fails: 0 }] }),
}));
// Daily Digest also pulls the inbox count.
jest.mock('../api/inbox', () => ({ getInbox: jest.fn().mockResolvedValue({ count: 0, items: [] }) }));
// Delegation + Break-Glass screens pull their api → core/api.
jest.mock('../api/delegation', () => ({ getDelegations: jest.fn().mockResolvedValue({ items: [], activeCount: 0 }), createDelegation: jest.fn().mockResolvedValue({}), revokeDelegation: jest.fn().mockResolvedValue({}) }));
jest.mock('../api/breakglass', () => ({ getBreakglass: jest.fn().mockResolvedValue({ items: [], activeCount: 0 }), invokeBreakglass: jest.fn().mockResolvedValue({}), endBreakglass: jest.fn().mockResolvedValue({}) }));
// Master-switch confirm — default to "confirmed" so the happy-path flip proceeds; a
// test overrides it to assert cancellation blocks the flip.
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn().mockResolvedValue({ confirmed: true }) }));
// eslint-disable-next-line import/first
import { ControlPanel } from '../control-configuration/ControlPanel';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// No kb360-user in localStorage → isOwner() is false → the propose-to-approve path.
afterEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

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
    expect(screen.getAllByText(/Independent · no approval/).length).toBe(5); // all 5 roles, master guard off
  });

  test('deadlock guardrail: cautions when the sole approver/verifier would be put under control', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Approval & Verification'));
    expect(await screen.findByText(/only approver/)).toBeInTheDocument();   // Faiz (sole approver) caution
    expect(screen.getByText(/only verifier/)).toBeInTheDocument();          // Sughra (sole verifier) caution
  });

  test('no SoD banner when Verify and Approve lists do not overlap (default config)', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Approval & Verification'));
    await screen.findByText(/only approver/); // wait for the screen to render
    expect(screen.queryByText(/Segregation-of-duties conflict/)).not.toBeInTheDocument();
  });

  test('Policy Tester screen renders a live verdict', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Policy Tester'));
    expect(await screen.findByTestId('policy-verdict')).toBeInTheDocument();
  });

  test('Active Controls screen renders the digest', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Active Controls'));
    expect(await screen.findByTestId('active-controls')).toBeInTheDocument();
  });

  test('Daily Digest screen renders live tiles', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Daily Digest'));
    expect(await screen.findByTestId('daily-digest')).toBeInTheDocument();
    expect(await screen.findByText('Pending approvals')).toBeInTheDocument();
    expect(screen.getByText('Close readiness')).toBeInTheDocument();
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

  test('honest states: SoD enforced by the guard; Security is Active + Owner-declined', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Segregation of Duties'));
    expect(await screen.findByText(/the maker is barred from its own approval/)).toBeInTheDocument();     // maker≠approver
    expect(screen.getAllByText(/engages with the master guard/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Via master guard').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText('Access & Security'));
    // single-session + password strength are really enforced; 2FA / hours / IP / rotation are Owner-declined
    expect((await screen.findAllByText('Active')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Not required').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Planned')).not.toBeInTheDocument(); // nothing on this screen is "Planned" anymore
  });

  test('OWNER: flipping the Master Switch confirms first, then applies it LIVE (self-approve)', async () => {
    const { setFlag, proposeFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setFlag.mockClear(); proposeFlags.mockClear();
    confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin', email: 'afshin@travkings.com' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByRole('switch', { name: /Engage the TK Group guard/ }));
    // confirmed → live flip: setFlag(key, turningOn=true, branch) — NOT the propose path
    expect(await screen.findByText(/is now ON/)).toBeInTheDocument();
    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(setFlag).toHaveBeenCalledWith('core.policy_guard', true, 'default');
    expect(proposeFlags).not.toHaveBeenCalled();
  });

  test('OWNER: cancelling the Master-Switch confirm blocks the flip (no change)', async () => {
    const { setFlag } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setFlag.mockClear();
    confirmDialog.mockClear().mockResolvedValue({ confirmed: false });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByRole('switch', { name: /Engage the TK Group guard/ }));
    // give the async handler a tick — nothing should be applied
    await Promise.resolve();
    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(setFlag).not.toHaveBeenCalled();
  });

  test('OWNER: a non-master control flips instantly with NO confirm', async () => {
    const { setFlag } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setFlag.mockClear();
    confirmDialog.mockClear();
    setFlag.mockResolvedValue({ flags: { 'branch.central_relocated': { enabled: true, label: 'Relocate' } }, enabled: ['branch.central_relocated'] });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Rights & Locks'));
    fireEvent.click(await screen.findByRole('switch', { name: /Relocate central screens/ }));
    expect(await screen.findByText(/is now ON/)).toBeInTheDocument();
    expect(setFlag).toHaveBeenCalledWith('branch.central_relocated', true, 'default');
    expect(confirmDialog).not.toHaveBeenCalled(); // only the master switch confirms
  });

  test('OWNER: branch scope — flipping a control targets the selected branch', async () => {
    const { setFlag } = require('../api/flags');
    setFlag.mockClear();
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    // scope the panel to BOM, then flip a rule on the Data-Entry screen
    fireEvent.click(await screen.findByRole('button', { name: /^BOM\b/ }));
    fireEvent.click(screen.getByText('Data-Entry & Compliance'));
    fireEvent.click(await screen.findByRole('switch', { name: /Mandatory documents/ }));
    await waitFor(() => expect(setFlag).toHaveBeenCalledWith('entry.mandatory_docs', true, 'BOM'));
  });

  test('OWNER: the status strip reflects the live guard state, not a hard-coded "OFF"', async () => {
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'super_admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    // guard is off in the mocked getFlagState → still dormant, but the owner is told it flips live
    expect(await screen.findByText(/applies immediately and is logged/)).toBeInTheDocument();
  });

  test('Data-Entry exposes the Integrity-before-close toggle (close.require_integrity)', async () => {
    const { setFlag } = require('../api/flags');
    setFlag.mockClear();
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Data-Entry & Compliance'));
    fireEvent.click(await screen.findByRole('switch', { name: /Integrity before close/ }));
    await waitFor(() => expect(setFlag).toHaveBeenCalledWith('close.require_integrity', true, 'default'));
  });

  test('Change Log screen is wired to the real audit trail', async () => {
    const { getAudit } = require('../api/monitor');
    getAudit.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Change Log / Audit'));
    await waitFor(() => expect(getAudit).toHaveBeenCalled());
    expect(await screen.findByTestId('control-change-log')).toBeInTheDocument();
  });

  test('a Rule Book link routes to /tk/rules', async () => {
    const nav = jest.fn();
    renderWith(<ControlPanel setRoute={nav} />);
    fireEvent.click(await screen.findByRole('button', { name: /Rule Book/ }));
    expect(nav).toHaveBeenCalledWith('/tk/rules');
  });
});
