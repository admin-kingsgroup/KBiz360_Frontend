import { MENU_ACCOUNTS } from '../menus';

describe('Accounts ▸ Daily Entry ordering', () => {
  const dailyEntry = MENU_ACCOUNTS.children.find(c => c.label === 'Daily Entry');

  it('has a Daily Entry section', () => {
    expect(dailyEntry).toBeTruthy();
  });

  it('lists SO/PO/GP Voucher as the 1st option', () => {
    // Daily Entry is now segmented by divider section-headers ("Sales & Inter-Branch"
    // etc.); the FIRST ACTIONABLE option (first non-divider) must still be SO/PO/GP.
    const first = dailyEntry.children.find((c) => !c.divider);
    expect(first.label).toBe('SO/PO/GP Voucher');
    expect(first.href).toBe('/bookings/new');
  });

  it('keeps SO/PO/GP Voucher exactly once', () => {
    const count = dailyEntry.children.filter(c => c.href === '/bookings/new').length;
    expect(count).toBe(1);
  });
});
