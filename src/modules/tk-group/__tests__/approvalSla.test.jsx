import React from 'react';
import { render, screen } from '@testing-library/react';
import { ageHours, slaState, slaTone, classifySla, SLA_DEFAULT_HOURS } from '../utils/approvalSla';
import { ChangeRequestList } from '../ChangeRequestList';

const NOW = Date.parse('2026-07-06T12:00:00Z');
const hoursAgo = (h) => new Date(NOW - h * 3_600_000).toISOString();

describe('approvalSla utils', () => {
  test('ageHours: hours since createdAt, never negative, 0 on bad/missing date', () => {
    expect(ageHours(hoursAgo(5), NOW)).toBeCloseTo(5, 5);
    expect(ageHours(hoursAgo(-3), NOW)).toBe(0);   // future → clamped
    expect(ageHours(undefined, NOW)).toBe(0);
    expect(ageHours('not-a-date', NOW)).toBe(0);
  });

  test('slaState: ontime < 75% · at-risk ≥75% · breached ≥ SLA', () => {
    expect(slaState({ createdAt: hoursAgo(10) }, NOW, 48).state).toBe('ontime');
    expect(slaState({ createdAt: hoursAgo(40) }, NOW, 48).state).toBe('at-risk');   // 40/48 = 83%
    expect(slaState({ createdAt: hoursAgo(50) }, NOW, 48)).toMatchObject({ state: 'breached', overdueByHours: 2 });
  });

  test('slaState falls back to the default SLA on a bad threshold', () => {
    const s = slaState({ createdAt: hoursAgo(SLA_DEFAULT_HOURS + 1) }, NOW, 0);
    expect(s.state).toBe('breached');
  });

  test('slaTone maps state → chip tone', () => {
    expect(slaTone('breached')).toBe('danger');
    expect(slaTone('at-risk')).toBe('warning');
    expect(slaTone('ontime')).toBe('success');
  });

  test('classifySla summarises the queue and finds the worst-aged', () => {
    const items = [
      { _id: 'a', createdAt: hoursAgo(2) },
      { _id: 'b', createdAt: hoursAgo(40) },
      { _id: 'c', createdAt: hoursAgo(60) },
    ];
    const { summary, worst } = classifySla(items, NOW, 48);
    expect(summary).toMatchObject({ ontime: 1, 'at-risk': 1, breached: 1, total: 3 });
    expect(worst._id).toBe('c');
  });

  test('classifySla is defensive to a non-array', () => {
    expect(classifySla(null, NOW).summary.total).toBe(0);
  });
});

describe('ChangeRequestList · SLA surfacing', () => {
  test('shows the SLA summary strip and a per-row state badge', () => {
    const items = [
      { _id: 'cr1', type: 'master', branch: 'BOM', maker: { name: 'Faiz' }, createdAt: hoursAgo(72), chain: [{ role: 'Owner' }], approvals: [] },
    ];
    render(<ChangeRequestList items={items} slaHours={48} now={NOW} />);
    expect(screen.getByTestId('tk-cr-sla')).toBeInTheDocument();
    expect(screen.getByText(/1 breached/)).toBeInTheDocument();
    expect(screen.getByText('SLA breached')).toBeInTheDocument();
    expect(screen.getByText(/72h old/)).toBeInTheDocument();
  });
});
