// The party-master picklists are the single source of truth shared by the simple list
// masters (mastersLive.jsx) and the 12-tab masters (mastersParties.jsx). Two invariants
// matter most:
//   1. SUPPLIER_CATS must equal the backend's VALID_CATS — it's the ONLY list the server
//      validates, so a drift here = the dropdown offers a value the API then rejects.
//   2. The optional-classification lists lead with '' (so "not set" is selectable in the
//      tab master); the simple master strips that and renders its own placeholder.
import {
  SUPPLIER_CATS, GST_TREATMENTS, COUNTRIES, IN_STATES, STATE_NAMES,
  MSME_STATUS, TDS_SECTIONS, PAY_TERMS, SETTLE_CYCLES, PAY_METHODS, CUST_TYPES, CUST_SOURCES,
} from '../partyEnums';

// Mirror of kbiz360-erp-backend/src/features/suppliers/suppliers.validator.js VALID_CATS.
const BACKEND_VALID_CATS = ['Airline', 'DMC', 'Hotel', 'Visa', 'Insurance', 'Car', 'Misc'];

describe('partyEnums', () => {
  test('SUPPLIER_CATS matches the backend VALID_CATS exactly (no rejected dropdown values)', () => {
    expect(SUPPLIER_CATS).toEqual(BACKEND_VALID_CATS);
  });

  test('SUPPLIER_CATS has no blank entry — every choice is a valid category', () => {
    expect(SUPPLIER_CATS.every((c) => c && c.trim())).toBe(true);
  });

  test('COUNTRIES starts with India and includes the foreign branches we trade with', () => {
    expect(COUNTRIES[0]).toBe('India');
    expect(COUNTRIES).toEqual(expect.arrayContaining(['United Arab Emirates', 'Singapore']));
  });

  test('STATE_NAMES is derived from IN_STATES with a leading blank + "Others" (foreign parties)', () => {
    expect(STATE_NAMES[0]).toBe('');
    expect(STATE_NAMES[1]).toBe('Others'); // non-Indian parties (Africa branches / foreign suppliers)
    expect(STATE_NAMES).toContain('Maharashtra');
    expect(STATE_NAMES.length).toBe(IN_STATES.length + 2);
  });

  test('IN_STATES code↔name pairs are well formed (2-digit code, named)', () => {
    for (const [code, name] of IN_STATES) {
      expect(code).toMatch(/^\d{2}$/);
      expect(name && name.trim().length).toBeTruthy();
    }
    expect(IN_STATES.find(([c]) => c === '27')[1]).toBe('Maharashtra');
  });

  test('optional classification lists lead with a blank "not set" entry', () => {
    for (const list of [GST_TREATMENTS, MSME_STATUS, TDS_SECTIONS, PAY_TERMS, SETTLE_CYCLES, PAY_METHODS, CUST_TYPES, CUST_SOURCES]) {
      expect(list[0]).toBe('');
    }
  });
});
