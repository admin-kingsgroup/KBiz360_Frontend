import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Dormant flag state (nothing engaged).
jest.mock('../api/flags', () => ({
  getFlagState: jest.fn().mockResolvedValue({ flags: {}, enabled: [] }),
  proposeFlags: jest.fn().mockResolvedValue({ ok: true }),
  setFlag: jest.fn().mockResolvedValue({ flags: { 'branch.central_relocated': { enabled: true, label: 'Relocate' } }, enabled: ['branch.central_relocated'] }),
  setManyFlags: jest.fn().mockResolvedValue({ flags: {}, enabled: [] }),
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

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// No kb360-user in localStorage → isOwner() false → the propose-to-approve path.
afterEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

describe('Control Panel · two-screen model', () => {
  test('opens on Default Rules, dormant, with the two rule screens + tools in the nav', async () => {
    renderWith(<ControlPanel setRoute={() => {}} />);
    expect(await screen.findByText(/Control Panel/)).toBeInTheDocument();
    expect(screen.getByText(/Everything OFF/)).toBeInTheDocument();
    // rule screens + a few tools across the groups ("Default Rules" is both the nav item
    // and the active screen heading, so it appears twice)
    expect(screen.getAllByText('Default Rules').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Configurable Rules')).toBeInTheDocument();
    expect(screen.getByText('Enforcement Matrix')).toBeInTheDocument();
    expect(screen.getByText('User Configuration')).toBeInTheDocument();
    expect(screen.getByText('Break-Glass Access')).toBeInTheDocument();
    // the master switch is gone
    expect(screen.queryByText('Master Switch')).not.toBeInTheDocument();
  });

  test('Default Rules screen lists always-on foundation locks (read-only)', async () => {
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
    expect(changes).toHaveLength(21);                            // all configurable flags
    expect(changes.every((c) => c.enabled === true && c.branch === 'default')).toBe(true);
    expect(confirmDialog).toHaveBeenCalledTimes(1);
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

  test('a Rule Book link routes to /tk/rules', async () => {
    const nav = jest.fn();
    renderWith(<ControlPanel setRoute={nav} />);
    fireEvent.click(await screen.findByRole('button', { name: /Rule Book/ }));
    expect(nav).toHaveBeenCalledWith('/tk/rules');
  });
});
