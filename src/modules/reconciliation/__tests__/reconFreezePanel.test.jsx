// ReconFreezePanel · tier support (daily / weekly / month).
// The revoke lock guard blocks on ANY frozen tier covering an entry's date — e.g.
// a weekly cert (2026-W28) frozen from the cadence hub — and its banner points the
// user here to un-freeze. The panel therefore must NOT be month-only: switching
// the tier picker re-seeds the period in that tier's key shape and threads `tier`
// through getLedgerFreeze / unfreezeLedger, so a weekly soft lock is releasable.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../api', () => ({
  getLedgerFreeze: jest.fn(),
  freezeLedger: jest.fn(),
  unfreezeLedger: jest.fn(),
  signCertificate: jest.fn(),
}));
// core/api uses import.meta (unparseable by jest) — mock the bits the panel touches.
jest.mock('../../../core/api', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: '', apiGet: jest.fn(), apiPost: jest.fn(), getAuthToken: jest.fn() }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn().mockResolvedValue({ confirmed: true }) }));
import { getLedgerFreeze, unfreezeLedger } from '../api';
import ReconFreezePanel from '../statement-matching/ReconFreezePanel';

const frozenState = { connected: true, frozen: true, certified: false, signatures: 0, nextSigner: null, canFreeze: false, unreconciled: { total: 0 } };

describe('ReconFreezePanel · tier picker', () => {
  beforeEach(() => jest.clearAllMocks());

  test('defaults to the month tier (original behaviour)', async () => {
    getLedgerFreeze.mockResolvedValue({ ...frozenState, frozen: false });
    render(<ReconFreezePanel branch="BOM" code="B1" name="ICICI Bank" ledgerLabel="ICICI Bank" defaultPeriod="2026-07" />);
    await waitFor(() => expect(getLedgerFreeze).toHaveBeenCalled());
    expect(getLedgerFreeze).toHaveBeenCalledWith(expect.objectContaining({ tier: 'month', period: '2026-07' }));
  });

  test('switching to Weekly re-seeds a YYYY-Www period and queries the weekly tier', async () => {
    getLedgerFreeze.mockResolvedValue(frozenState);
    render(<ReconFreezePanel branch="BOM" code="B1" name="ICICI Bank" ledgerLabel="ICICI Bank" defaultPeriod="2026-07" />);
    await waitFor(() => expect(getLedgerFreeze).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Freeze tier'), { target: { value: 'weekly' } });
    await waitFor(() => expect(getLedgerFreeze).toHaveBeenCalledWith(expect.objectContaining({ tier: 'weekly' })));
    const weekly = getLedgerFreeze.mock.calls.find((c) => c[0].tier === 'weekly')[0];
    expect(weekly.period).toMatch(/^\d{4}-W\d{2}$/); // month key against weekly tier would 400
  });

  test('un-freezing a frozen WEEKLY cert sends tier + the weekly period (the 2026-W28 release path)', async () => {
    getLedgerFreeze.mockResolvedValue(frozenState);
    unfreezeLedger.mockResolvedValue({});
    render(<ReconFreezePanel branch="BOM" code="B1" name="ICICI Bank" ledgerLabel="ICICI Bank" defaultPeriod="2026-07" />);
    await waitFor(() => expect(getLedgerFreeze).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Freeze tier'), { target: { value: 'weekly' } });
    await waitFor(() => expect(getLedgerFreeze).toHaveBeenCalledWith(expect.objectContaining({ tier: 'weekly' })));
    // Frozen → the "Un-Frozen" segment is the active release action.
    fireEvent.click(screen.getByRole('tab', { name: 'Un-Frozen' }));
    await waitFor(() => expect(unfreezeLedger).toHaveBeenCalled());
    expect(unfreezeLedger).toHaveBeenCalledWith(expect.objectContaining({
      branch: 'BOM', code: 'B1', tier: 'weekly', period: expect.stringMatching(/^\d{4}-W\d{2}$/),
    }));
  });
});
