// Scenario tests for the SO/PO register search bars.
// Module Sales/Purchase/S&P Register searches the full booking (header + every
// captured line + flight sectors); Sales/Purchase Register searches the posted
// voucher (header + line labels + line meta). A passenger name typed in either
// box must surface its deal.
import { bookingHaystack, voucherHaystack } from '../core/registerSearch';

// A realistic approved Flight SO/PO booking as returned by /api/booking-orders.
const flightBooking = {
  id: 'bk1', bookingNo: 'SF-0007', linkNo: 'LK-2026-77', date: '2026-06-10', module: 'SF',
  status: 'approved', headerRef: 'BOM-DXB / Emirates', packageType: '',
  customer: { name: 'Globe Trekkers Pvt Ltd', gstin: '27AABCG1234M1Z5', contact: '9820011223' },
  supplier: { name: 'Emirates Airlines' },
  saleVno: 'SF/26/41', purchaseVno: 'PF/26/41',
  rows: [{
    fn: 'KUNAL', sn: 'CHAUHAN', base: 4000, k3: 800, tax: 287, psvc: 50, markup: 500, ssvc: 100,
    tkt: '0981234567801', pnr: 'TJ1021',
    sectors: [{ sector: 'BOM-DXB', airline: 'Emirates', flightNo: 'EK 501', ticketNo: '0981234567801', pnr: 'TJ1021', travelDate: '2026-07-01' }],
  }],
  so: { total: 5990, gst: 108 }, po: { total: 5137, gst: 9 }, gp: { total: 845, pct: 14 },
};

describe('Module register — booking search (all SO/PO data captured)', () => {
  test('finds by passenger first name', () => {
    expect(bookingHaystack(flightBooking)).toContain('kunal');
  });
  test('finds by passenger surname', () => {
    expect(bookingHaystack(flightBooking)).toContain('chauhan');
  });
  test('finds by ticket number inside a sector', () => {
    expect(bookingHaystack(flightBooking)).toContain('0981234567801');
  });
  test('finds by PNR and sector route', () => {
    const h = bookingHaystack(flightBooking);
    expect(h).toContain('tj1021');
    expect(h).toContain('bom-dxb');
  });
  test('finds by booking no, link no, customer and supplier', () => {
    const h = bookingHaystack(flightBooking);
    expect(h).toContain('sf-0007');
    expect(h).toContain('lk-2026-77');
    expect(h).toContain('globe trekkers');
    expect(h).toContain('emirates');
  });
  test('does not match an unrelated needle', () => {
    expect(bookingHaystack(flightBooking).includes('nonexistentpax')).toBe(false);
  });
});

// A posted Sales voucher carrying SO line meta (passenger / ticket / PNR).
const salesVoucher = {
  id: 'v1', vno: 'SF/26/41', type: 'SF', category: 'sale', date: '10-06-2026',
  party: 'Globe Trekkers Pvt Ltd', linkNo: 'LK-2026-77',
  lines: [
    { label: 'Base Fare', meta: { Passenger: 'KUNAL CHAUHAN', 'Ticket No': '0981234567801', PNR: 'TJ1021', Sector: 'BOM-DXB' } },
    { label: 'Output GST', meta: {} },
  ],
};

describe('Sales/Purchase register — voucher search (SO/PO meta)', () => {
  test('finds by passenger name held in line meta', () => {
    expect(voucherHaystack(salesVoucher)).toContain('kunal chauhan');
  });
  test('finds by ticket no, PNR and party', () => {
    const h = voucherHaystack(salesVoucher);
    expect(h).toContain('0981234567801');
    expect(h).toContain('tj1021');
    expect(h).toContain('globe trekkers');
  });
  test('finds by voucher no and link no', () => {
    const h = voucherHaystack(salesVoucher);
    expect(h).toContain('sf/26/41');
    expect(h).toContain('lk-2026-77');
  });
  test('handles a voucher with no lines gracefully', () => {
    expect(() => voucherHaystack({ vno: 'X', lines: undefined })).not.toThrow();
    expect(voucherHaystack({ vno: 'X1', lines: undefined })).toContain('x1');
  });
});
