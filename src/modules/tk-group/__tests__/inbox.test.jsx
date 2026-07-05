import React from 'react';
import { render, screen } from '@testing-library/react';
import { typeLabel, inboxSummary, badgeText } from '../utils/inbox';
import { InboxBadge } from '../InboxBadge';
import { InboxPanel } from '../InboxPanel';

describe('inbox utils', () => {
  test('typeLabel maps known types, passes through unknown', () => {
    expect(typeLabel('period_lock')).toBe('Period lock');
    expect(typeLabel('config')).toBe('Config change');
    expect(typeLabel('weird')).toBe('weird');
    expect(typeLabel(undefined)).toBe('Change');
  });

  test('inboxSummary normalises payload + counts by type', () => {
    const s = inboxSummary({ count: 3, items: [{ type: 'config' }, { type: 'config' }, { type: 'period_lock' }] });
    expect(s.count).toBe(3);
    expect(s.byType).toEqual({ config: 2, period_lock: 1 });
  });

  test('inboxSummary tolerates missing/empty payload', () => {
    expect(inboxSummary(undefined)).toEqual({ count: 0, items: [], byType: {} });
    expect(inboxSummary({ items: [{ type: 'flag' }] }).count).toBe(1); // count falls back to items.length
  });

  test('badgeText: empty when 0, capped at 99+', () => {
    expect(badgeText(0)).toBe('');
    expect(badgeText(5)).toBe('5');
    expect(badgeText(150)).toBe('99+');
  });
});

describe('InboxBadge', () => {
  test('renders nothing when empty', () => {
    const { container } = render(<InboxBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
  test('shows the count with an accessible label', () => {
    render(<InboxBadge count={4} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('4 pending approvals')).toBeInTheDocument();
  });
});

describe('InboxPanel', () => {
  test('empty state', () => {
    render(<InboxPanel items={[]} />);
    expect(screen.getByText('Nothing waiting on you.')).toBeInTheDocument();
  });
  test('lists items with type label and branch', () => {
    render(<InboxPanel items={[{ _id: '1', type: 'period_lock', branch: 'BOM', maker: { name: 'Faiz' } }]} />);
    expect(screen.getByText('Period lock')).toBeInTheDocument();
    expect(screen.getByText(/BOM/)).toBeInTheDocument();
    expect(screen.getByText('Faiz')).toBeInTheDocument();
  });
});
