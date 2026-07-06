import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BranchSwitcher } from '../shell/BranchSwitcher';
import { UserMenu } from '../shell/UserMenu';

// Keep confirm/toast side effects inert in tests.
jest.mock('../core/ux/confirm', () => ({ confirmDialog: () => Promise.resolve({ confirmed: false }) }));
jest.mock('../core/ux/toast', () => ({ toast: () => {} }));

const director = { name: 'Afshin Dhanani', email: 'afshin@x.com', role: 'Director', branches: ['BOM', 'AMD'] };

describe('BranchSwitcher (keyboard/listbox)', () => {
  it('trigger is a button with listbox semantics, closed initially', () => {
    render(<BranchSwitcher branch={{ code: 'BOM', city: 'Mumbai' }} setBranch={() => {}} currentUser={director} light />);
    const trigger = screen.getByRole('button', { name: /change branch/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens to a listbox of options and selects with keyboard', () => {
    const setBranch = jest.fn();
    render(<BranchSwitcher branch={{ code: 'BOM', city: 'Mumbai' }} setBranch={setBranch} currentUser={director} light />);
    const trigger = screen.getByRole('button', { name: /change branch/i });
    fireEvent.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    // Move and select.
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(setBranch).toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape closes and returns focus to the trigger', () => {
    render(<BranchSwitcher branch={{ code: 'BOM', city: 'Mumbai' }} setBranch={() => {}} currentUser={director} light />);
    const trigger = screen.getByRole('button', { name: /change branch/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('UserMenu (keyboard/menu)', () => {
  it('avatar is a button with menu semantics', () => {
    render(<UserMenu currentUser={director} setCurrentUser={() => {}} setRoute={() => {}} />);
    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a menu of items, first focused, and My Notifications calls the callback', () => {
    const onOpenNotifications = jest.fn();
    render(<UserMenu currentUser={director} setCurrentUser={() => {}} setRoute={() => {}} onOpenNotifications={onOpenNotifications} />);
    const trigger = screen.getByRole('button', { name: /account menu/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const items = screen.getAllByRole('menuitem');
    expect(items.length).toBe(6); // + Roles & Responsibilities
    expect(document.activeElement.textContent).toMatch(/My Profile/);
    fireEvent.click(screen.getByText('My Notifications'));
    expect(onOpenNotifications).toHaveBeenCalled();
  });

  it('Escape closes the menu and returns focus to the avatar', () => {
    render(<UserMenu currentUser={director} setCurrentUser={() => {}} setRoute={() => {}} />);
    const trigger = screen.getByRole('button', { name: /account menu/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
