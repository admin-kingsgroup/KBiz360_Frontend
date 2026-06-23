import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartDateInput, autoFormat, displayToIso, isoToDisplay } from '../SmartDateInput';

describe('SmartDateInput helpers', () => {
  test('autoFormat inserts slashes from raw digits / any separator', () => {
    expect(autoFormat('2')).toBe('2');
    expect(autoFormat('2003')).toBe('20/03');
    expect(autoFormat('20032026')).toBe('20/03/2026');
    expect(autoFormat('20.03.2026')).toBe('20/03/2026');
    expect(autoFormat('20-03-2026')).toBe('20/03/2026');
    expect(autoFormat('200320261')).toBe('20/03/2026'); // capped at 8 digits
  });

  test('displayToIso parses complete dates and rejects impossible/incomplete ones', () => {
    expect(displayToIso('20/03/2026')).toBe('2026-03-20');
    expect(displayToIso('20.03.2026')).toBe('2026-03-20');
    expect(displayToIso('20/03')).toBeNull();      // incomplete
    expect(displayToIso('31/02/2026')).toBeNull();  // impossible (Feb 31)
    expect(displayToIso('00/03/2026')).toBeNull();
    expect(displayToIso('20/13/2026')).toBeNull();
  });

  test('isoToDisplay renders DD/MM/YYYY (or empty)', () => {
    expect(isoToDisplay('2026-03-20')).toBe('20/03/2026');
    expect(isoToDisplay('')).toBe('');
    expect(isoToDisplay('20/03/2026')).toBe(''); // not ISO → empty
  });
});

describe('SmartDateInput component', () => {
  test('typing 20.03.2026 auto-formats and commits ISO', () => {
    const onChange = jest.fn();
    render(<SmartDateInput value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '20.03.2026' } });
    expect(input.value).toBe('20/03/2026');
    expect(onChange).toHaveBeenLastCalledWith('2026-03-20');
  });

  test('a past date below `min` is rejected (not committed)', () => {
    const onChange = jest.fn();
    render(<SmartDateInput value="" onChange={onChange} min="2026-06-23" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '20/03/2026' } }); // before min
    expect(onChange).toHaveBeenLastCalledWith('');     // not accepted
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('a date on/after `min` is accepted', () => {
    const onChange = jest.fn();
    render(<SmartDateInput value="" onChange={onChange} min="2026-06-23" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '25/12/2026' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-12-25');
  });

  test('completing the date then blurring keeps all 8 digits (regression: last digit was dropped)', () => {
    const onChange = jest.fn();
    render(<SmartDateInput value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '24/06/202' } }); // 7 digits
    fireEvent.change(input, { target: { value: '24/06/2026' } }); // 8th digit completes
    fireEvent.blur(input);                                        // focus-advance fires blur
    expect(input.value).toBe('24/06/2026');                       // blur must NOT clobber it
    expect(onChange).toHaveBeenLastCalledWith('2026-06-24');
  });

  test('the calendar picker commits the chosen ISO date', () => {
    const onChange = jest.fn();
    const { container } = render(<SmartDateInput value="" onChange={onChange} min="2026-06-23" />);
    const picker = container.querySelector('input[type="date"]');
    expect(picker).toBeTruthy();
    fireEvent.change(picker, { target: { value: '2026-12-25' } });
    expect(screen.getByRole('textbox').value).toBe('25/12/2026');
    expect(onChange).toHaveBeenLastCalledWith('2026-12-25');
  });
});
