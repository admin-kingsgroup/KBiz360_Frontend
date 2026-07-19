import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreenDirectory } from '../screen-directory/ScreenDirectory';
import { getScreenCatalog } from '../screen-directory/screenCatalog';
import registry from '../../../core/screenRegistry.json';

describe('screenCatalog', () => {
  const rows = getScreenCatalog();

  test('has one row per registered screen, each numbered', () => {
    const expected = Object.keys(registry.screens).length + Object.keys(registry.retired || {}).length;
    expect(rows.length).toBe(expected);
    for (const r of rows.slice(0, 8)) {
      expect(Number.isInteger(r.no)).toBe(true);
      expect(typeof r.route).toBe('string');
      expect(r).toHaveProperty('surfaces.india');
    }
  });

  test('resolves a known screen with its stable number and surface presence', () => {
    const bs = rows.find((r) => r.route === '/reports/bs');
    expect(bs).toBeTruthy();
    expect(bs.no).toBe(registry.screens['/reports/bs']);
    expect(bs.inMenu).toBe(true);
  });
});

describe('ScreenDirectory', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  test('number search narrows the list to that one screen', () => {
    render(<ScreenDirectory />);
    const no = registry.screens['/reports/bs'];
    fireEvent.change(screen.getByLabelText(/Search screens/i), { target: { value: String(no) } });
    expect(screen.getByText('/reports/bs')).toBeInTheDocument();
    expect(screen.queryByText('/sales/flight')).toBeNull();
  });

  test('selecting a screen previews it live in an embedded iframe', () => {
    const { container } = render(<ScreenDirectory />);
    const no = registry.screens['/reports/bs'];
    fireEvent.change(screen.getByLabelText(/Search screens/i), { target: { value: String(no) } });
    fireEvent.click(screen.getByText('/reports/bs'));
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toBe('/reports/bs?embed=1');
  });
});
