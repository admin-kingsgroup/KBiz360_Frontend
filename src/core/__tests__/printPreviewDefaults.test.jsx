import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { PrintPreviewHost, openPrintPreview } from '../PrintPreview';

// The app-wide print spec: clicking Print opens the in-app preview defaulting to
// Portrait · A4 · Narrow margins · Shrink-to-fit ON — even when the screen
// recommends landscape (the recommendation is only a hint).
function openJob(detail) {
  render(<PrintPreviewHost />);
  act(() => { openPrintPreview(detail); });
}

describe('Print Preview default settings', () => {
  it('is hidden until a print job is dispatched', () => {
    render(<PrintPreviewHost />);
    expect(screen.queryByText(/Print Preview/)).toBeNull();
  });

  it('opens with Portrait · A4 · Narrow · Shrink-to-fit, even when landscape is recommended', () => {
    openJob({ selector: 'main', title: 'Trial Balance', recommend: 'landscape' });

    // Preview is shown.
    expect(screen.getByText(/Print Preview — Trial Balance/)).toBeInTheDocument();

    // Paper = A4, Margins = Narrow (the two <select>s).
    const selects = screen.getAllByRole('combobox');
    const paper = selects.find((s) => s.value === 'A4' || /A4|Letter/.test(s.innerHTML));
    const margin = selects.find((s) => /Normal|Narrow|None/.test(s.innerHTML));
    expect(paper.value).toBe('A4');
    expect(margin.value).toBe('Narrow');

    // Shrink to fit is ON.
    expect(screen.getByRole('checkbox')).toBeChecked();

    // Orientation defaults to Portrait (active = blue), NOT the recommended Landscape.
    const portrait = screen.getByRole('button', { name: 'Portrait' });
    const landscape = screen.getByRole('button', { name: 'Landscape' });
    expect(landscape.style.background).toBe('rgb(255, 255, 255)'); // inactive
    expect(portrait.style.background).not.toBe('rgb(255, 255, 255)'); // active
  });
});
