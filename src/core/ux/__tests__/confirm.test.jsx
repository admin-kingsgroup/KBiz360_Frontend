// Promise-based confirmDialog + ConfirmHost (the accessible replacement for
// window.confirm/prompt). Tests the pure resolution rule, the promise plumbing, and
// one full render interaction (required reason blocks confirm until filled).
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { confirmDialog, ConfirmHost, _resolveConfirm, _setConfirmSink } from '../confirm.jsx';

describe('_resolveConfirm — pure rule', () => {
  test('cancel always resolves (confirmed:false), trims reason', () => {
    expect(_resolveConfirm({}, '  hi ', false)).toEqual({ confirmed: false, reason: 'hi' });
  });
  test('confirm with no required reason passes', () => {
    expect(_resolveConfirm({}, '', true)).toEqual({ confirmed: true, reason: '' });
  });
  test('confirm is BLOCKED (null) when a required reason is empty/whitespace', () => {
    expect(_resolveConfirm({ reasonRequired: true }, '   ', true)).toBeNull();
  });
  test('confirm passes once the required reason is non-empty', () => {
    expect(_resolveConfirm({ reasonRequired: true }, 'duplicate', true)).toEqual({ confirmed: true, reason: 'duplicate' });
  });
});

describe('confirmDialog — promise plumbing', () => {
  test('resolves cancelled when no host is mounted (fail-safe)', async () => {
    await expect(confirmDialog({ title: 'x' })).resolves.toEqual({ confirmed: false, reason: '' });
  });

  test('resolves with the sink-driven result', async () => {
    const stop = _setConfirmSink((req) => req.resolve({ confirmed: true, reason: 'ok' }));
    await expect(confirmDialog({ title: 'x' })).resolves.toEqual({ confirmed: true, reason: 'ok' });
    stop();
  });
});

describe('ConfirmHost — render + interaction', () => {
  test('is a dialog; required reason gates the confirm button', async () => {
    render(<ConfirmHost />);
    const p = confirmDialog({ title: 'Reject voucher?', reasonRequired: true, confirmLabel: 'Reject', danger: true });

    // dialog appears with proper role
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();
    const rejectBtn = screen.getByRole('button', { name: 'Reject' });
    expect(rejectBtn).toBeDisabled(); // blocked: empty required reason

    fireEvent.change(screen.getByLabelText(/reason/i), { target: { value: 'duplicate entry' } });
    expect(rejectBtn).not.toBeDisabled();
    fireEvent.click(rejectBtn);

    await expect(p).resolves.toEqual({ confirmed: true, reason: 'duplicate entry' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); // closes after resolve
  });

  test('Cancel resolves confirmed:false', async () => {
    render(<ConfirmHost />);
    const p = confirmDialog({ title: 'Delete?', danger: true });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(p).resolves.toEqual({ confirmed: false, reason: '' });
  });
});
