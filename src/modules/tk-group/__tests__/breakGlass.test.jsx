import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../api/breakglass', () => ({ getBreakglass: jest.fn(), invokeBreakglass: jest.fn().mockResolvedValue({}), endBreakglass: jest.fn().mockResolvedValue({}) }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn().mockResolvedValue({ confirmed: true }) }));
// eslint-disable-next-line import/first
import { BreakGlass } from '../BreakGlass';
// eslint-disable-next-line import/first
import { getBreakglass, invokeBreakglass, endBreakglass } from '../api/breakglass';
// eslint-disable-next-line import/first
import { confirmDialog } from '../../../core/ux/confirm';

function renderWith(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('BreakGlass', () => {
  beforeEach(() => { jest.clearAllMocks(); confirmDialog.mockResolvedValue({ confirmed: true }); });

  test('invoke requires a reason (≥5 chars) before it fires', async () => {
    getBreakglass.mockResolvedValue({ items: [] });
    renderWith(<BreakGlass />);
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'no' } });
    fireEvent.click(screen.getByRole('button', { name: /Invoke break-glass/ }));
    expect(await screen.findByRole('status')).toHaveTextContent(/reason/i);
    expect(invokeBreakglass).not.toHaveBeenCalled();
  });

  test('invoke confirms, then calls invokeBreakglass with reason + clamped minutes', async () => {
    getBreakglass.mockResolvedValue({ items: [] });
    renderWith(<BreakGlass />);
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'urgent supplier payment' } });
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: /Invoke break-glass/ }));
    await waitFor(() => expect(invokeBreakglass).toHaveBeenCalledWith(expect.objectContaining({ reason: 'urgent supplier payment', minutes: 120 })));
    expect(confirmDialog).toHaveBeenCalledTimes(1);
  });

  test('cancelling the confirm blocks the invoke', async () => {
    confirmDialog.mockResolvedValue({ confirmed: false });
    getBreakglass.mockResolvedValue({ items: [] });
    renderWith(<BreakGlass />);
    fireEvent.change(await screen.findByLabelText('Reason'), { target: { value: 'urgent supplier payment' } });
    fireEvent.click(screen.getByRole('button', { name: /Invoke break-glass/ }));
    await Promise.resolve();
    expect(invokeBreakglass).not.toHaveBeenCalled();
  });

  test('ends an active session', async () => {
    getBreakglass.mockResolvedValue({ items: [{ id: 'BG1', email: 'faiz@x.com', reason: 'x', branch: null, startedAt: '2026-07-15T09:00:00', expiresAt: '2026-07-15T10:00:00', active: true, endedAt: null }] });
    renderWith(<BreakGlass />);
    fireEvent.click(await screen.findByRole('button', { name: /End now/ }));
    await waitFor(() => expect(endBreakglass).toHaveBeenCalledWith('BG1'));
  });
});
