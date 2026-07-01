import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartDateInput } from '../SmartDateInput';

describe('SmartDateInput component', () => {
  test('renders a native date input bound to the ISO value', () => {
    const onChange = jest.fn();
    render(<SmartDateInput value="2026-06-24" onChange={onChange} />);
    const input = screen.getByDisplayValue('2026-06-24');
    expect(input).toHaveAttribute('type', 'date');
  });

  test('picking a date commits the ISO value via onChange', () => {
    const onChange = jest.fn();
    render(<SmartDateInput value="" onChange={onChange} />);
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-12-25' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-12-25');
  });

  test('min/max are passed through to the native input', () => {
    render(<SmartDateInput value="" onChange={() => {}} min="2026-06-23" max="2026-12-31" />);
    const input = document.querySelector('input[type="date"]');
    expect(input).toHaveAttribute('min', '2026-06-23');
    expect(input).toHaveAttribute('max', '2026-12-31');
  });
});
