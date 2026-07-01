// The RPT_Page "Excel"/"CSV" toolbar buttons were dead (no onClick). They now scrape the
// rendered detail table from the page container and download it. This proves the CSV
// button generates a blob from the actual table (button no longer inert) and quotes
// comma-bearing cells correctly.
jest.mock('../api', () => ({ apiGet: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));

import { render, screen, fireEvent } from '@testing-library/react';
import { RPT_Page } from '../styles';

describe('RPT_Page — CSV/Excel export', () => {
  test('CSV button exports the rendered table (quotes comma cells)', () => {
    const parts = [];
    const RealBlob = global.Blob;
    global.Blob = jest.fn(function B(p, opts) { parts.push((p || []).join('')); this.type = opts && opts.type; });
    global.URL.createObjectURL = jest.fn(() => 'blob:x');
    global.URL.revokeObjectURL = jest.fn();
    try {
      render(
        <RPT_Page title="Yield by Supplier">
          <table>
            <thead><tr><th>Name</th><th>Amt</th></tr></thead>
            <tbody><tr><td>Acme, Inc</td><td>100</td></tr></tbody>
          </table>
        </RPT_Page>
      );
      fireEvent.click(screen.getByText('📋 CSV'));
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(parts[0]).toContain('Name,Amt');
      expect(parts[0]).toContain('"Acme, Inc",100'); // comma-containing cell is CSV-quoted
    } finally { global.Blob = RealBlob; }
  });

  test('Excel button also fires (generates a blob)', () => {
    const created = [];
    global.URL.createObjectURL = jest.fn((b) => { created.push(b); return 'blob:x'; });
    global.URL.revokeObjectURL = jest.fn();
    render(
      <RPT_Page title="ABC">
        <table><thead><tr><th>H</th></tr></thead><tbody><tr><td>v</td></tr></tbody></table>
      </RPT_Page>
    );
    fireEvent.click(screen.getByText('📊 Excel'));
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(created[0].type).toBe('application/vnd.ms-excel');
  });
});
