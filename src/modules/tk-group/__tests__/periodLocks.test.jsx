import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isValidPeriod, statusLabel, lockRows } from '../utils/periodLocks';
import { PeriodLockPanel } from '../PeriodLockPanel';

// api/periodLocks pulls core/api (import.meta) → mock it for the container test.
jest.mock('../api/periodLocks', () => ({ getPeriodLocks: jest.fn(), proposePeriodLock: jest.fn().mockResolvedValue({}) }));
// eslint-disable-next-line import/first
import { PeriodLockAdmin } from '../PeriodLockAdmin';
// eslint-disable-next-line import/first
import { getPeriodLocks, proposePeriodLock } from '../api/periodLocks';

describe('period-lock utils', () => {
  test('isValidPeriod accepts YYYY-MM, rejects junk', () => {
    expect(isValidPeriod('2026-07')).toBe(true);
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(isValidPeriod('2026-7')).toBe(false);
    expect(isValidPeriod('')).toBe(false);
  });
  test('statusLabel + lockRows (newest period first)', () => {
    expect(statusLabel('hard')).toMatch(/blocked/i);
    const rows = lockRows({ items: [{ branch: 'BOM', period: '2026-05' }, { branch: 'AMD', period: '2026-07' }] });
    expect(rows.map((r) => r.period)).toEqual(['2026-07', '2026-05']);
  });
});

describe('PeriodLockPanel', () => {
  test('submit is disabled until a valid period is entered', () => {
    const onPropose = jest.fn();
    render(<PeriodLockPanel rows={[]} branches={['ALL', 'BOM']} onPropose={onPropose} />);
    const btn = screen.getByRole('button', { name: /propose lock/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Period (YYYY-MM)'), { target: { value: '2026-07' } });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onPropose).toHaveBeenCalledWith(expect.objectContaining({ branch: 'ALL', period: '2026-07', status: 'hard' }));
  });
});

describe('PeriodLockAdmin container', () => {
  beforeEach(() => { jest.clearAllMocks(); getPeriodLocks.mockResolvedValue({ items: [{ branch: 'BOM', period: '2026-06', status: 'hard', reason: 'closed' }] }); });
  test('renders current locks and files a change-request on propose', async () => {
    render(<PeriodLockAdmin branches={['ALL', 'BOM']} />);
    expect(await screen.findByText('2026-06')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Period (YYYY-MM)'), { target: { value: '2026-07' } });
    fireEvent.click(screen.getByRole('button', { name: /propose lock/i }));
    await waitFor(() => expect(proposePeriodLock).toHaveBeenCalledWith(expect.objectContaining({ period: '2026-07' })));
    expect(await screen.findByRole('status')).toHaveTextContent(/submitted for Farhan \+ Owner approval/);
  });
});
