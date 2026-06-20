import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { installNumberWheelGuard } from '../numberGuard';
import { useFormKeys } from '../forms';

describe('installNumberWheelGuard', () => {
  beforeAll(() => installNumberWheelGuard());

  it('blurs a focused number input on wheel so its value cannot change', () => {
    render(<input type="number" data-testid="amt" defaultValue="100" />);
    const amt = screen.getByTestId('amt');
    amt.focus();
    expect(document.activeElement).toBe(amt);
    fireEvent.wheel(amt, { deltaY: -100 });
    expect(document.activeElement).not.toBe(amt); // blurred → wheel won't step the value
  });

  it('leaves text inputs alone', () => {
    render(<input type="text" data-testid="txt" defaultValue="x" />);
    const txt = screen.getByTestId('txt');
    txt.focus();
    fireEvent.wheel(txt, { deltaY: -100 });
    expect(document.activeElement).toBe(txt);
  });
});

function FormHarness({ onSubmit }) {
  const fk = useFormKeys({ onSubmit });
  return (
    <div ref={fk.ref} onKeyDown={fk.onKeyDown}>
      <input data-testid="f1" />
      <button type="button">Dr/Cr</button>
      <input data-testid="f2" />
    </div>
  );
}

describe('useFormKeys Enter-advance', () => {
  // jsdom reports offsetParent === null for every element; the advance filter
  // uses it to skip hidden fields. Shim it so attached elements look visible.
  let origDesc;
  beforeAll(() => {
    origDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return this.parentNode; } });
  });
  afterAll(() => { if (origDesc) Object.defineProperty(HTMLElement.prototype, 'offsetParent', origDesc); });

  it('advances to the next DATA field, skipping action buttons', () => {
    render(<FormHarness onSubmit={() => {}} />);
    const f1 = screen.getByTestId('f1');
    f1.focus();
    fireEvent.keyDown(f1, { key: 'Enter' });
    expect(document.activeElement).toBe(screen.getByTestId('f2')); // not the button
  });

  it('submits when Enter is pressed on the last field', () => {
    const onSubmit = jest.fn();
    render(<FormHarness onSubmit={onSubmit} />);
    const f2 = screen.getByTestId('f2');
    f2.focus();
    fireEvent.keyDown(f2, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('Ctrl+Enter submits from any field', () => {
    const onSubmit = jest.fn();
    render(<FormHarness onSubmit={onSubmit} />);
    const f1 = screen.getByTestId('f1');
    f1.focus();
    fireEvent.keyDown(f1, { key: 'Enter', ctrlKey: true });
    expect(onSubmit).toHaveBeenCalled();
  });
});
