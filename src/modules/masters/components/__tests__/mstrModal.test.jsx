import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MstrModal } from '../mstr';

describe('MstrModal honest footer', () => {
  it('without onSave: shows a "not saved" preview note + Close, and NO fake Save button', () => {
    render(<MstrModal title="New Airline" onClose={() => {}}><div>body</div></MstrModal>);
    expect(screen.getByText(/aren’t saved yet/i)).toBeInTheDocument();
    // Footer Close button (the Modal's ✕ also has aria-label "Close", so match the visible text).
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('with onSave: shows Cancel + a real Save that calls the handler', () => {
    const onSave = jest.fn();
    render(<MstrModal title="Edit" onClose={() => {}} onSave={onSave}><div>body</div></MstrModal>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalled();
    expect(screen.queryByText(/aren’t saved yet/i)).toBeNull();
  });
});
