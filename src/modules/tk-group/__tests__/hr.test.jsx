import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isHrValid, hrKindLabel, HR_KINDS } from '../utils/hr';

jest.mock('../api/governance', () => ({ proposeGovernance: jest.fn().mockResolvedValue({}), getPendingByType: jest.fn().mockResolvedValue([]) }));
// eslint-disable-next-line import/first
import { HRControl } from '../HRControl';
// eslint-disable-next-line import/first
import { proposeGovernance, getPendingByType } from '../api/governance';

describe('hr utils', () => {
  test('isHrValid needs a kind + subject', () => {
    expect(isHrValid({ kind: 'new_hire', subject: 'Ravi' })).toBe(true);
    expect(isHrValid({ kind: 'new_hire', subject: '' })).toBe(false);
  });
  test('kinds + labels', () => {
    expect(HR_KINDS.length).toBeGreaterThanOrEqual(3);
    expect(hrKindLabel('salary_revision')).toMatch(/Salary/);
  });
});

describe('HRControl container', () => {
  beforeEach(() => { jest.clearAllMocks(); getPendingByType.mockResolvedValue([]); });
  test('files an hr governance change-request on submit', async () => {
    render(<HRControl branches={['', 'BOM']} />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Ravi Kumar' } });
    fireEvent.click(screen.getByRole('button', { name: /submit hr request/i }));
    await waitFor(() => expect(proposeGovernance).toHaveBeenCalledWith('hr', null, expect.objectContaining({ kind: 'new_hire', subject: 'Ravi Kumar' })));
    expect(await screen.findByRole('status')).toHaveTextContent(/Farhan \+ Owner approval/);
  });
});
