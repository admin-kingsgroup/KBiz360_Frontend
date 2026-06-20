import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Menu } from '../Menu';

function setup(onSelect = jest.fn(), extra = {}) {
  const items = [
    { key: 'a', label: 'Apple', onSelect: () => onSelect('a') },
    { key: 'b', label: 'Banana', disabled: true, onSelect: () => onSelect('b') },
    { key: 'c', label: 'Cherry', onSelect: () => onSelect('c') },
  ];
  render(
    <Menu
      ariaLabel="Fruit"
      items={items}
      {...extra}
      renderTrigger={({ ref, toggle, triggerProps }) => (
        <button ref={ref} {...triggerProps} onClick={toggle}>Open</button>
      )}
    />,
  );
  return { onSelect };
}

const trigger = () => screen.getByText('Open');
const menu = () => screen.queryByRole('menu');

describe('Menu', () => {
  it('is closed initially and opens on click with the first item focused', () => {
    setup();
    expect(menu()).toBeNull();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger());
    expect(menu()).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement.textContent).toBe('Apple');
  });

  it('opens with ArrowDown (first) and ArrowUp (last) from the trigger', () => {
    setup();
    fireEvent.keyDown(trigger(), { key: 'ArrowUp' });
    expect(document.activeElement.textContent).toBe('Cherry'); // last enabled
  });

  it('arrow navigation skips disabled items and wraps', () => {
    setup();
    fireEvent.click(trigger());
    expect(document.activeElement.textContent).toBe('Apple');
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    expect(document.activeElement.textContent).toBe('Cherry'); // skipped disabled Banana
    fireEvent.keyDown(menu(), { key: 'ArrowDown' });
    expect(document.activeElement.textContent).toBe('Apple');  // wrapped
  });

  it('Enter selects the active item, closes, and returns focus to the trigger', () => {
    const { onSelect } = setup();
    fireEvent.click(trigger());
    fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // → Cherry
    fireEvent.keyDown(menu(), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('c');
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('Escape closes and returns focus without selecting', () => {
    const { onSelect } = setup();
    fireEvent.click(trigger());
    fireEvent.keyDown(menu(), { key: 'Escape' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('type-ahead jumps to a matching item', () => {
    setup();
    fireEvent.click(trigger());
    fireEvent.keyDown(menu(), { key: 'c' });
    expect(document.activeElement.textContent).toBe('Cherry');
  });

  it('disabled items are marked disabled and not selectable by click', () => {
    const { onSelect } = setup();
    fireEvent.click(trigger());
    const banana = screen.getByText('Banana').closest('button');
    expect(banana).toBeDisabled();
    fireEvent.click(banana);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('listbox mode exposes option roles and aria-selected', () => {
    render(
      <Menu
        menuRole="listbox"
        items={[{ key: 'x', label: 'X', selected: true, onSelect: () => {} }, { key: 'y', label: 'Y', onSelect: () => {} }]}
        renderTrigger={({ ref, toggle, triggerProps }) => <button ref={ref} {...triggerProps} onClick={toggle}>L</button>}
      />,
    );
    fireEvent.click(screen.getByText('L'));
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(2);
    expect(opts[0]).toHaveAttribute('aria-selected', 'true');
    expect(opts[1]).toHaveAttribute('aria-selected', 'false');
  });
});
