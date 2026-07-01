// Support-ticket presentation helpers — the vocabulary maps (label + brand tone),
// the route→module inference (auto-captured on every ticket) and the delete gate.
import {
  typeMeta, priorityMeta, statusMeta, isDoneStatus, moduleForRoute, canDeleteTickets,
  TICKET_TYPES, TICKET_STATUSES, TICKET_PRIORITIES,
} from '../services/support.service';

describe('support vocabulary meta', () => {
  test('every enum has a label + a valid StatusPill tone', () => {
    const tones = new Set(['neutral', 'info', 'success', 'warning', 'danger', 'gold', 'navy']);
    [...TICKET_TYPES, ...TICKET_STATUSES, ...TICKET_PRIORITIES].forEach((o) => {
      expect(o.label).toBeTruthy();
      expect(tones.has(o.tone)).toBe(true);
    });
  });

  test('meta lookups resolve known values and degrade gracefully', () => {
    expect(typeMeta('bug').label).toBe('Bug');
    expect(statusMeta('in_progress').label).toBe('In progress');
    expect(priorityMeta('urgent').tone).toBe('danger');
    expect(typeMeta('???')).toEqual({ value: '???', label: '???', tone: 'neutral' });
    expect(statusMeta(undefined).label).toBe('—');
  });

  test('isDoneStatus marks only the closed-out states', () => {
    expect(isDoneStatus('resolved')).toBe(true);
    expect(isDoneStatus('closed')).toBe(true);
    expect(isDoneStatus('wont_fix')).toBe(true);
    expect(isDoneStatus('open')).toBe(false);
    expect(isDoneStatus('in_progress')).toBe(false);
  });
});

describe('moduleForRoute', () => {
  test('maps route prefixes to the ERP module (mirrors App.jsx)', () => {
    expect(moduleForRoute('/reports/pnl')).toBe('Reports');
    expect(moduleForRoute('/finance/trial-balance')).toBe('Finance');
    expect(moduleForRoute('/accounts/dashboard')).toBe('Accounts');
    expect(moduleForRoute('/hr/payroll')).toBe('HR & Payroll');
    expect(moduleForRoute('/settings/users')).toBe('Settings');
    expect(moduleForRoute('/support/tickets')).toBe('Support');
    expect(moduleForRoute('/totally-unknown')).toBe('');
  });
});

describe('canDeleteTickets', () => {
  test('senior roles only', () => {
    expect(canDeleteTickets({ role: 'Super Admin' })).toBe(true);
    expect(canDeleteTickets({ role: 'Director' })).toBe(true);
    expect(canDeleteTickets({ role: 'Senior Finance Manager' })).toBe(true);
    expect(canDeleteTickets({ role: 'Branch Accountant' })).toBe(false);
    expect(canDeleteTickets({})).toBe(false);
  });
});
