import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../core/api', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.', apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
// Dormant flag state (nothing engaged).
jest.mock('../api/flags', () => ({
  getFlagState: jest.fn().mockResolvedValue({ flags: {}, enabled: [] }),
  proposeFlags: jest.fn().mockResolvedValue({ ok: true }),
  setFlag: jest.fn().mockResolvedValue({ flags: { 'branch.central_relocated': { enabled: true, label: 'Relocate' } }, enabled: ['branch.central_relocated'] }),
  setManyFlags: jest.fn().mockResolvedValue({ flags: {}, enabled: [] }),
  flagImpact: jest.fn().mockResolvedValue({ impact: { days: 90, branch: null, measurable: true, count: 12, amount: 340000, examples: ['V1', 'V2'], note: '' } }),
}));
jest.mock('../../../core/useAccounting', () => ({ useConfigValue: () => ({ data: {} }) }));
jest.mock('../api/limits', () => ({
  getLimits: jest.fn().mockResolvedValue({ store: { default: {}, branches: {} }, fields: [], defaults: {}, limits: {} }),
  setBranchLimits: jest.fn().mockResolvedValue({ store: { default: {}, branches: {} }, fields: [], defaults: {}, limits: {} }),
  proposeBranchLimits: jest.fn().mockResolvedValue({}),
}));
jest.mock('../api/voucherPolicy', () => ({
  getVoucherPolicy: jest.fn().mockResolvedValue({ categories: [], defaults: {}, store: { default: {}, branches: {} }, effective: {} }),
  setVoucherPolicy: jest.fn().mockResolvedValue({ store: { default: {}, branches: {} }, effective: {} }),
  proposeVoucherPolicy: jest.fn().mockResolvedValue({}),
}));
jest.mock('../api/userLimits', () => ({
  getUserLimits: jest.fn().mockResolvedValue({ store: {} }),
  getRoster: jest.fn().mockResolvedValue([]),
  setUserLimit: jest.fn().mockResolvedValue({ store: {} }),
  proposeUserLimit: jest.fn().mockResolvedValue({}),
}));
jest.mock('../api/monitor', () => ({
  getAudit: jest.fn().mockResolvedValue({ items: [] }),
  getOverview: jest.fn().mockResolvedValue({ pendingTotal: 3, oldestPendingDays: 2, lockedPeriods: 0, streamPending: { governance: 2, decision: 1 } }),
  getIntegrity: jest.fn().mockResolvedValue({ fails: 0, branches: [{ branch: 'BOM', closeReady: true, fails: 0 }] }),
}));
jest.mock('../api/inbox', () => ({ getInbox: jest.fn().mockResolvedValue({ count: 0, items: [] }) }));
jest.mock('../api/delegation', () => ({ getDelegations: jest.fn().mockResolvedValue({ items: [], activeCount: 0 }), createDelegation: jest.fn().mockResolvedValue({}), revokeDelegation: jest.fn().mockResolvedValue({}) }));
jest.mock('../api/breakglass', () => ({ getBreakglass: jest.fn().mockResolvedValue({ items: [], activeCount: 0 }), invokeBreakglass: jest.fn().mockResolvedValue({}), endBreakglass: jest.fn().mockResolvedValue({}) }));
// Bulk confirm — default to "confirmed" so Enable-all / Disable-all proceed.
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn().mockResolvedValue({ confirmed: true }) }));
// eslint-disable-next-line import/first
import { ControlPanel } from '../control-configuration/ControlPanel';
import { CONFIGURABLE_FLAGS } from '../utils/controlPanel';
const N_FLAGS = CONFIGURABLE_FLAGS.length; // every configurable rule

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// No kb360-user in localStorage → isOwner() false → the propose-to-approve path.
afterEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('Control Panel · three-plane model', () => {
  test('opens on ERP Rules › By Domain (Accounts), dormant, with the four heads + Monitoring in the nav', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    expect(await screen.findByText(/Control Panel/)).toBeInTheDocument();
    expect(await screen.findByText(/Everything OFF/)).toBeInTheDocument();   // resolves after the brief loading strip
    // "By Domain" is a nav item under each law head + the active screen heading
    expect(screen.getAllByText('By Domain').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Configurable Rules')).toBeInTheDocument();
    expect(screen.getByText('Enforcement Matrix')).toBeInTheDocument();
    expect(screen.getByText('User Ceilings')).toBeInTheDocument();
    expect(screen.getByText('Rates & Values')).toBeInTheDocument();
    expect(screen.getByText('Break-Glass Access')).toBeInTheDocument();
    // the four governance heads + Monitoring are the nav groups
    expect(screen.getByText('ERP Rules')).toBeInTheDocument();
    expect(screen.getAllByText('Operational Rules').length).toBeGreaterThanOrEqual(1); // nav header + the law-erp intro link
    expect(screen.getByText('Owner Rules')).toBeInTheDocument();
    expect(screen.getByText('Approval Chain')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Approval Authority')).toBeInTheDocument();
    // the ERP Rules head opens on the Accounts law band + the foundation locks
    expect(screen.getByText(/Accounts — financial law/)).toBeInTheDocument();
    expect(screen.getByText('Day-one foundation locks')).toBeInTheDocument();
    // the master switch is gone
    expect(screen.queryByText('Master Switch')).not.toBeInTheDocument();
  });

  test('the mandatory law splits into two heads — ERP Rules = Accounts, Operational Rules = Ops', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    await screen.findByText(/Accounts — financial law/);          // ERP Rules head (default)
    // the Operations band is NOT on the ERP Rules screen — it's the other law head
    expect(screen.queryByText(/Operations — process & control law/)).not.toBeInTheDocument();
    // open Operational Rules › By Domain (the 2nd "By Domain" nav item)
    fireEvent.click(screen.getAllByText('By Domain')[1]);
    expect(await screen.findByText(/Operations — process & control law/)).toBeInTheDocument();
    expect(screen.queryByText(/Accounts — financial law/)).not.toBeInTheDocument();
  });

  test('a failed flag load shows a distinct error state, NOT a false “Everything OFF · dormant”', async () => {
    const { getFlagState } = require('../api/flags');
    getFlagState.mockResolvedValueOnce({ flags: {}, enabled: [], _error: 'Network error' });
    renderWith(<ControlPanel setRoute={() => {}} />);
    expect(await screen.findByText(/Control state didn.t load/i)).toBeInTheDocument();
    expect(screen.queryByText(/Everything OFF/)).not.toBeInTheDocument();   // must not masquerade as dormant
  });

  test('ERP Rules head lists always-on foundation locks (read-only)', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    expect(await screen.findByText('Negative-GP block')).toBeInTheDocument();
    expect(screen.getByText(/Maker cannot approve their own routed/)).toBeInTheDocument();
    expect(screen.getAllByText(/Always on/).length).toBeGreaterThanOrEqual(5);
  });

  test('Configurable Rules screen shows grouped switches + declined footnote', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    expect(await screen.findByText('Approval & Verification')).toBeInTheDocument();
    expect(screen.getByText('Masters & Locks')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Master-creation lock/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Verifier ≠ Approver/ })).toBeInTheDocument();
    // declined footnote (not adopted)
    expect(screen.getByText(/Considered & declined/)).toBeInTheDocument();
    expect(screen.getByText(/Require 2-factor authentication/)).toBeInTheDocument();
  });

  test('non-Owner: flipping a configurable switch PROPOSES the change', async () => {
    const { proposeFlags } = require('../api/flags');
    proposeFlags.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('switch', { name: /Relocate central screens/ }));
    expect(await screen.findByText(/submitted for the Owner/)).toBeInTheDocument();
    expect(proposeFlags).toHaveBeenCalledTimes(1);
  });

  test('OWNER: a configurable switch flips LIVE with NO confirm', async () => {
    const { setFlag } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setFlag.mockClear(); confirmDialog.mockClear();
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('switch', { name: /Relocate central screens/ }));
    expect(await screen.findByText(/is now ON/)).toBeInTheDocument();
    expect(setFlag).toHaveBeenCalledWith('branch.central_relocated', true, 'default');
    expect(confirmDialog).not.toHaveBeenCalled();   // no master switch → no per-flip confirm
  });

  test('OWNER: branch scope — flipping a control targets the selected branch', async () => {
    const { setFlag } = require('../api/flags');
    setFlag.mockClear();
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: /^BOM\b/ }));
    fireEvent.click(await screen.findByRole('switch', { name: /Mandatory documents/ }));
    await waitFor(() => expect(setFlag).toHaveBeenCalledWith('entry.mandatory_docs', true, 'BOM'));
  });

  test('OWNER: Enable all → confirms, then bulk-flips every configurable rule in one call', async () => {
    const { setManyFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setManyFlags.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: 'Enable all' }));
    await waitFor(() => expect(setManyFlags).toHaveBeenCalledTimes(1));
    const changes = setManyFlags.mock.calls[0][0];
    expect(changes).toHaveLength(N_FLAGS);                            // all configurable flags
    expect(changes.every((c) => c.enabled === true && c.branch === 'default')).toBe(true);
    expect(confirmDialog).toHaveBeenCalledTimes(1);
  });

  test('OWNER: Enable all confirm NAMES the FM/AE deadlock + Branch-Accountant refund caution', async () => {
    const { setManyFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setManyFlags.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: 'Enable all' }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    const msg = confirmDialog.mock.calls[0][0].message;
    expect(msg).toMatch(/only approver/);   // FM sole-approver deadlock
    expect(msg).toMatch(/refund/i);          // Branch-Accountant CRM lock
    await waitFor(() => expect(setManyFlags).toHaveBeenCalledTimes(1));
  });

  test('OWNER: the Strict preset confirm carries the refund caution', async () => {
    const { confirmDialog } = require('../../../core/ux/confirm');
    confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: 'Strict' }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    expect(confirmDialog.mock.calls[0][0].message).toMatch(/refund/i);
  });

  test('OWNER: turning FM under control (sole approver) PREVIEWS the deadlock and confirms before going live', async () => {
    const { setFlag } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setFlag.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('switch', { name: /Senior Finance Manager \(Faiz\) under control/ }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    expect(confirmDialog.mock.calls[0][0].message).toMatch(/only approver/);
    await waitFor(() => expect(setFlag).toHaveBeenCalledWith('control.role.fm', true, 'default'));
  });

  test('OWNER: cancelling the FM deadlock preview leaves the flag untouched (no setFlag)', async () => {
    const { setFlag } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setFlag.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: false });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('switch', { name: /Senior Finance Manager \(Faiz\) under control/ }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    expect(setFlag).not.toHaveBeenCalled();
    expect(await screen.findByText(/Left unchanged/)).toBeInTheDocument();
  });

  test('OWNER: Disable all confirms and bulk-flips OFF', async () => {
    const { setManyFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setManyFlags.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'super_admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: 'Disable all' }));
    await waitFor(() => expect(setManyFlags).toHaveBeenCalledTimes(1));
    expect(setManyFlags.mock.calls[0][0].every((c) => c.enabled === false)).toBe(true);
  });

  test('non-Owner sees no bulk buttons (Owner-only action)', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    await screen.findByText('Approval & Verification');
    expect(screen.queryByRole('button', { name: 'Enable all' })).not.toBeInTheDocument();
  });

  test('Preview impact: fetches and shows the "would have caught" summary per rule', async () => {
    const { flagImpact } = require('../api/flags');
    flagImpact.mockClear();
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    const buttons = await screen.findAllByRole('button', { name: /Preview impact/ });
    expect(buttons.length).toBe(N_FLAGS);   // one per configurable rule
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(flagImpact).toHaveBeenCalled());
    expect(await screen.findByText(/12 vouchers/)).toBeInTheDocument();
  });

  test('Preview impact shows the reason note on a measurable-but-zero result (no ceiling set)', async () => {
    const { flagImpact } = require('../api/flags');
    flagImpact.mockClear().mockResolvedValue({ impact: { days: 90, branch: 'BOM', measurable: true, count: 0, amount: 0, examples: [], note: 'No escalate ceiling is configured (Limits & Thresholds) — engaging this would escalate nothing yet.' } });
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    const buttons = await screen.findAllByRole('button', { name: /Preview impact/ });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(flagImpact).toHaveBeenCalled());
    expect(await screen.findByText(/No escalate ceiling is configured/)).toBeInTheDocument();
  });

  test('Owner: Reset to inherit clears a branch’s overrides (enabled:null)', async () => {
    const { setManyFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setManyFlags.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: /^BOM\b/ }));                 // scope to BOM → reset button appears
    fireEvent.click(await screen.findByRole('button', { name: /Reset to inherit/ }));
    await waitFor(() => expect(setManyFlags).toHaveBeenCalledTimes(1));
    const changes = setManyFlags.mock.calls[0][0];
    expect(changes).toHaveLength(N_FLAGS);
    expect(changes.every((c) => c.enabled === null && c.branch === 'BOM')).toBe(true);
  });

  test('Owner: applying a preset bulk-sets all configurable rules (preset ON, rest OFF)', async () => {
    const { setManyFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setManyFlags.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: 'Standard' }));
    await waitFor(() => expect(setManyFlags).toHaveBeenCalledTimes(1));
    const changes = setManyFlags.mock.calls[0][0];
    expect(changes).toHaveLength(N_FLAGS);
    expect(changes.find((c) => c.key === 'entry.mandatory_docs').enabled).toBe(true);   // Standard includes docs
  });

  test('Owner: copy-to-all-branches copies the source (a real branch) to the other 5 branches', async () => {
    const { setManyFlags } = require('../api/flags');
    const { confirmDialog } = require('../../../core/ux/confirm');
    setManyFlags.mockClear(); confirmDialog.mockClear().mockResolvedValue({ confirmed: true });
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'super_admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(screen.getByText('Configurable Rules'));
    fireEvent.click(await screen.findByRole('button', { name: /Copy to all other branches/ }));
    await waitFor(() => expect(setManyFlags).toHaveBeenCalledTimes(1));
    const changes = setManyFlags.mock.calls[0][0];
    expect(changes.length).toBe(5 * N_FLAGS);   // source is a real branch (default excluded) → 5 target branches × N_FLAGS
    expect(changes.every((c) => c.branch !== 'default' && typeof c.enabled === 'boolean')).toBe(true);
  });

  test('All-Branches Grid: renders a cell per rule × branch; an Owner cell-flip targets that scope', async () => {
    const { setFlag } = require('../api/flags');
    setFlag.mockClear();
    localStorage.setItem('kb360-user', JSON.stringify({ role: 'Super Admin' }));
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('All-Branches Grid'));
    expect(await screen.findByText('Group default')).toBeInTheDocument();   // branch column header
    const cells = await screen.findAllByRole('button', { name: /Relocate central screens/ });
    expect(cells.length).toBe(7);                                           // Group default + 6 branches
    fireEvent.click(cells[0]);                                              // the Group-default column cell
    await waitFor(() => expect(setFlag).toHaveBeenCalledWith('branch.central_relocated', true, 'default'));
  });

  test('Policy Tester tool renders a live verdict', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Policy Tester'));
    expect(await screen.findByTestId('policy-verdict')).toBeInTheDocument();
  });

  test('Active Controls + Daily Digest + Change Log tools render', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    fireEvent.click(await screen.findByText('Active Controls'));
    expect(await screen.findByTestId('active-controls')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Daily Digest'));
    expect(await screen.findByTestId('daily-digest')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Change Log / Audit'));
    expect(await screen.findByTestId('control-change-log')).toBeInTheDocument();
  });

  test('a Rule Book link routes to the Rule Book (status strip + the law-band deep-link)', async () => {
    const nav = jest.fn();
    renderWith(<ControlPanel setRoute={nav} />);
    // Two affordances now: the status-strip "📖 Rule Book" (→ /tk/rules) and the plane-①
    // band link (→ /tk/rules?tab=book). Either routes to the Rule Book.
    const links = await screen.findAllByRole('button', { name: /Rule Book/ });
    fireEvent.click(links[0]);
    expect(nav).toHaveBeenCalledWith(expect.stringContaining('/tk/rules'));
  });
});
