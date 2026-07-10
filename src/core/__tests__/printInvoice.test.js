// printBookingInvoice — the local-currency print toggle wiring:
//  • India branch → a single (₹) invoice, no currency variants, no FX lookup.
//  • Africa branch + today's FX set → USD + local variants (local converts at the rate).
//  • Africa branch + today's FX NOT set → the local tab is locked (printing blocked).
//  • FBM (VAT but USD-only, no secondary currency) → single USD invoice, no FX lookup.
// invoiceHtml + api are mocked; we capture the dispatched `kb:print` job detail.
import { printBookingInvoice } from '../printInvoice';

jest.mock('../invoiceHtml', () => ({
  buildBookingInvoice: (b, s, br, m, opts) => (opts && opts.fxRate ? `<local ${opts.localCurrency} ${opts.fxRate}>` : '<usd>'),
}));
jest.mock('../api', () => ({ apiGet: jest.fn() }));
const { apiGet } = require('../api');

const capture = () => {
  const jobs = [];
  const h = (e) => jobs.push(e.detail);
  window.addEventListener('kb:print', h);
  return { jobs, off: () => window.removeEventListener('kb:print', h) };
};

describe('printBookingInvoice — local-currency toggle wiring', () => {
  beforeEach(() => apiGet.mockReset());

  test('India (BOM) → single invoice, no currency variants, no FX lookup', async () => {
    const c = capture();
    await printBookingInvoice({ booking: { branch: 'BOM', bookingNo: 'X' }, side: 'sale', branch: { code: 'BOM' } });
    expect(apiGet).not.toHaveBeenCalled();
    expect(c.jobs[0].currencyVariants).toBeFalsy();
    c.off();
  });

  test('Africa (NBO) with today FX set → USD + local variants, local converts at the rate', async () => {
    apiGet.mockResolvedValue({ applicable: true, set: true, rate: 130, to: 'KES', date: '2026-06-29' });
    const c = capture();
    await printBookingInvoice({ booking: { branch: 'NBO', bookingNo: 'X' }, side: 'sale', branch: { code: 'NBO' } });
    const v = c.jobs[0].currencyVariants;
    expect(v.map((x) => x.label)).toEqual(['USD', 'KES']);
    expect(v[1].disabled).toBeFalsy();
    expect(v[1].html).toContain('local KES 130');
    c.off();
  });

  test('Africa (FBM, USD-only) → single USD invoice, no currency variants, no FX lookup', async () => {
    const c = capture();
    await printBookingInvoice({ booking: { branch: 'FBM', bookingNo: 'X' }, side: 'sale', branch: { code: 'FBM' } });
    expect(apiGet).not.toHaveBeenCalled();
    expect(c.jobs[0].currencyVariants).toBeFalsy();
    c.off();
  });

  test('Africa (NBO) with today FX NOT set → local tab locked (printing blocked)', async () => {
    apiGet.mockResolvedValue({ applicable: true, set: false, rate: null, to: 'KES', date: '2026-06-29' });
    const c = capture();
    await printBookingInvoice({ booking: { branch: 'NBO', bookingNo: 'X' }, side: 'sale', branch: { code: 'NBO' } });
    const v = c.jobs[0].currencyVariants;
    expect(v[1].label).toBe('KES');
    expect(v[1].disabled).toBe(true);
    expect(v[1].note).toMatch(/not set/i);
    c.off();
  });
});
