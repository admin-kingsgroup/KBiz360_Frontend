import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FocusSwitcher } from '../FocusSwitcher';
import { useCockpitFocusStore } from '../../store/cockpitFocus';
import { BRANCHES } from '../../core/data';

const branches = (BRANCHES || []).filter((b) => b && b.code && b.code !== 'ALL');

beforeEach(() => {
  // Reset the singleton store + storage between tests. hydrated:true so the
  // component's initFocus() is a no-op (we control `focus` directly).
  useCockpitFocusStore.setState({ focus: 'ALL', hydrated: true });
  try { localStorage.clear(); } catch { /* ignore */ }
});
afterEach(cleanup);

describe('cockpit focus store', () => {
  test('setFocus upper-cases a valid code and rejects an out-of-scope one', () => {
    const codes = branches.map((b) => b.code);
    const { setFocus } = useCockpitFocusStore.getState();
    setFocus(codes[0].toLowerCase(), codes);
    expect(useCockpitFocusStore.getState().focus).toBe(codes[0]);
    setFocus('NOT_A_BRANCH', codes);
    expect(useCockpitFocusStore.getState().focus).toBe('ALL'); // invalid → branchwise
  });
  test('resetFocus returns to ALL', () => {
    const codes = branches.map((b) => b.code);
    useCockpitFocusStore.getState().setFocus(codes[0], codes);
    useCockpitFocusStore.getState().resetFocus();
    expect(useCockpitFocusStore.getState().focus).toBe('ALL');
  });
});

describe('FocusSwitcher UI', () => {
  test('renders All branches + one button per branch', () => {
    render(<FocusSwitcher />);
    const buttons = screen.getAllByRole('button');
    // options = [All, ...branches]
    expect(buttons).toHaveLength(branches.length + 1);
    expect(buttons[0].textContent).toMatch(/All branches/i);
  });

  test('clicking a branch focuses it (store + aria-pressed)', () => {
    render(<FocusSwitcher />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // first real branch
    expect(useCockpitFocusStore.getState().focus).toBe(branches[0].code);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false'); // All no longer active
  });

  test('defaults to All branches active', () => {
    render(<FocusSwitcher />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });
});
