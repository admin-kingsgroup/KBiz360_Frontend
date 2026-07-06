import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isTargetValid, isMasterValid, metricLabel, masterKindLabel } from '../utils/governance';

// api/governance pulls core/api (import.meta) → mock for the container tests.
jest.mock('../api/governance', () => ({ proposeGovernance: jest.fn().mockResolvedValue({}), getPendingByType: jest.fn().mockResolvedValue([]) }));
// eslint-disable-next-line import/first
import { TargetsBudgets } from '../TargetsBudgets';
// eslint-disable-next-line import/first
import { MasterControl } from '../MasterControl';
// eslint-disable-next-line import/first
import { proposeGovernance, getPendingByType } from '../api/governance';

describe('governance utils', () => {
  test('isTargetValid needs branch + valid period + metric + positive amount', () => {
    expect(isTargetValid({ branch: 'BOM', period: '2026-07', metric: 'sales', amount: 100 })).toBe(true);
    expect(isTargetValid({ branch: 'BOM', period: '2026-13', metric: 'sales', amount: 100 })).toBe(false);
    expect(isTargetValid({ branch: 'BOM', period: '2026-07', metric: 'sales', amount: 0 })).toBe(false);
  });
  test('isMasterValid needs a kind + a target', () => {
    expect(isMasterValid({ kind: 'add_head', target: 'Bank X' })).toBe(true);
    expect(isMasterValid({ kind: 'add_head', target: '' })).toBe(false);
  });
  test('labels resolve', () => {
    expect(metricLabel('gp')).toBe('Gross Profit');
    expect(masterKindLabel('deactivate')).toBe('Deactivate head');
  });
});

describe('TargetsBudgets container', () => {
  beforeEach(() => { jest.clearAllMocks(); getPendingByType.mockResolvedValue([]); });
  test('files a target_budget change-request on submit', async () => {
    render(<TargetsBudgets branches={['ALL', 'BOM']} />);
    fireEvent.change(screen.getByLabelText('Period (YYYY-MM)'), { target: { value: '2026-07' } });
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: /submit target/i }));
    await waitFor(() => expect(proposeGovernance).toHaveBeenCalledWith('target_budget', 'ALL', expect.objectContaining({ period: '2026-07', amount: 1000000 })));
    expect(await screen.findByRole('status')).toHaveTextContent(/Owner approval/);
  });
});

describe('MasterControl container', () => {
  beforeEach(() => { jest.clearAllMocks(); getPendingByType.mockResolvedValue([]); });
  test('files a master change-request on submit', async () => {
    render(<MasterControl />);
    fireEvent.change(screen.getByLabelText('Head or target'), { target: { value: 'ICICI 1234' } });
    fireEvent.click(screen.getByRole('button', { name: /submit master change/i }));
    await waitFor(() => expect(proposeGovernance).toHaveBeenCalledWith('master', null, expect.objectContaining({ kind: 'add_head', target: 'ICICI 1234' })));
    expect(await screen.findByRole('status')).toHaveTextContent(/Owner approval/);
  });
});
