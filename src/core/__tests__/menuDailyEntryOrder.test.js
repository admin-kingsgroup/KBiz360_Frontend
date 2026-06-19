import { MENU_ACCOUNTS } from '../menus';

describe('Accounts ▸ Daily Entry ordering', () => {
  const dailyEntry = MENU_ACCOUNTS.children.find(c => c.label === 'Daily Entry');

  it('has a Daily Entry section', () => {
    expect(dailyEntry).toBeTruthy();
  });

  it('lists SO/PO/GP Voucher as the 1st option', () => {
    const first = dailyEntry.children[0];
    expect(first.label).toBe('SO/PO/GP Voucher');
    expect(first.href).toBe('/bookings/new');
  });

  it('keeps SO/PO/GP Voucher exactly once', () => {
    const count = dailyEntry.children.filter(c => c.href === '/bookings/new').length;
    expect(count).toBe(1);
  });
});
