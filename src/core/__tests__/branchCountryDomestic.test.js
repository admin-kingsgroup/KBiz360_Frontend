// "Foreign" means foreign to THIS BRANCH, not "not Indian".
//
// The bug: `isForeignSupplier = !isIndiaCountry(country)` — no branch anywhere in it. The
// group runs six independent branches in four countries, but the party layer had one home:
// India. On NBO/DAR/FBM the predicate inverted, in both directions:
//   • a LOCAL African vendor read "foreign" → its input VAT was zeroed → reclaim lost
//   • an INDIAN vendor read "domestic" → 16% Congolese input VAT fabricated on an import
// It only ever looked right because the country field was empty (blank read as India, which
// happened to mean domestic). Filling a supplier's country in correctly is what broke it.
//
// Root cause was upstream: partyEnums.COUNTRIES offered India + India's trading partners and
// no Kenya / Tanzania / DR Congo, so an Africa user had NO correct value to record — only
// 'Other' (→ foreign) or the India default (→ fabricated VAT + India's 2% withholding).
//
// The FE and BE MUST agree here: approvalChecks recomputes foreignSupplier server-side and
// 422s a booking whose purchase GST disagrees with its own recompute.
import { isDomesticFor, homeCountryOf, countryCodeOf, supplyTypeOf, homeStateForBranch, BRANCH_COUNTRY } from '../gstSupply.js';
import { COUNTRIES } from '../partyEnums.js';

describe('homeCountryOf — every branch knows the country it operates in', () => {
  test('the map covers all six branches', () => {
    expect(BRANCH_COUNTRY).toEqual({ BOM: 'IN', AMD: 'IN', MHUB: 'IN', NBO: 'KE', DAR: 'TZ', FBM: 'CD' });
  });
  test('resolves case-insensitively and defaults an unknown branch to India', () => {
    expect(homeCountryOf('fbm')).toBe('CD');
    expect(homeCountryOf(' NBO ')).toBe('KE');
    expect(homeCountryOf('???')).toBe('IN');
  });
});

describe('isDomesticFor — the predicate that gates input VAT and withholding', () => {
  test('THE BUG (a): a LOCAL African vendor is DOMESTIC to its own branch', () => {
    expect(isDomesticFor('DR Congo', 'FBM')).toBe(true);   // was false → input VAT dropped
    expect(isDomesticFor('Kenya', 'NBO')).toBe(true);
    expect(isDomesticFor('Tanzania', 'DAR')).toBe(true);
  });

  test('THE BUG (b): an INDIAN vendor is FOREIGN to an Africa branch (a real import)', () => {
    expect(isDomesticFor('India', 'FBM')).toBe(false);     // was true → VAT fabricated
    expect(isDomesticFor('India', 'NBO')).toBe(false);
  });

  test('an African vendor is foreign to an India branch, and to a DIFFERENT African one', () => {
    expect(isDomesticFor('DR Congo', 'BOM')).toBe(false);
    expect(isDomesticFor('Kenya', 'FBM')).toBe(false);     // each Africa branch is its own country
  });

  test('India branches are unchanged — the control', () => {
    expect(isDomesticFor('India', 'BOM')).toBe(true);
    expect(isDomesticFor('India', 'AMD')).toBe(true);
    expect(isDomesticFor('India', 'MHUB')).toBe(true);
    expect(isDomesticFor('Singapore', 'BOM')).toBe(false);
    expect(isDomesticFor('United Arab Emirates', 'BOM')).toBe(false);
  });

  test('BLANK is domestic to whichever branch owns the row — branch-relative, not Indian', () => {
    // The permissive default `isIndiaCountry('')` had, but now it means "local to me".
    expect(isDomesticFor('', 'BOM')).toBe(true);
    expect(isDomesticFor('', 'FBM')).toBe(true);
    expect(isDomesticFor(null, 'NBO')).toBe(true);
    expect(isDomesticFor(undefined, 'DAR')).toBe(true);
  });

  test("an UNMAPPED country is foreign everywhere — fail safe, never invent a credit", () => {
    expect(isDomesticFor('Other', 'FBM')).toBe(false);
    expect(isDomesticFor('Other', 'BOM')).toBe(false);
    expect(isDomesticFor('Atlantis', 'FBM')).toBe(false);
  });

  test('aliases and casing resolve', () => {
    expect(countryCodeOf('  dr congo ')).toBe('CD');
    expect(countryCodeOf('DRC')).toBe('CD');
    expect(countryCodeOf('bharat')).toBe('IN');
    expect(isDomesticFor('  KENYA  ', 'nbo')).toBe(true);
  });
});

// The blast radius. A live survey of the real supplier master found exactly these values, and
// exactly ONE Africa supplier with a non-blank country. If any row below flips, the change is
// no longer behaviour-preserving for existing data and needs a migration.
describe('EXISTING DATA: no supplier in the live master changes classification', () => {
  const wasForeign = (c) => { const x = String(c || '').trim().toLowerCase(); return !(x === '' || x === 'india' || x === 'in' || x === 'bharat'); };
  const rows = [
    ['BOM', 'India'], ['BOM', ''], ['BOM', 'Other'], ['BOM', 'Singapore'],
    ['BOM', 'Thailand'], ['BOM', 'UAE'],
    ['FBM', 'Other'],   // RAW Credit Card-2076 — the only Africa row with a country
  ];
  test.each(rows)('%s + "%s" classifies identically before and after', (branch, country) => {
    expect(!isDomesticFor(country, branch)).toBe(wasForeign(country));
  });
});

describe('supplyTypeOf — foreign is branch-relative; intra/inter stays an INDIA concept', () => {
  test('a VAT branch has no place-of-supply split', () => {
    // Was 'intra' vs Maharashtra(!) for an Indian party on FBM, and 'foreign' for a local one.
    expect(supplyTypeOf({ country: 'DR Congo', state: 'Maharashtra' }, 'FBM')).toBe('');
    expect(supplyTypeOf({ country: '', state: 'Maharashtra' }, 'FBM')).toBe('');
    expect(supplyTypeOf({ country: 'India', state: 'Maharashtra' }, 'FBM')).toBe('foreign');
  });

  test('India branches keep the intra/inter split exactly as before', () => {
    expect(supplyTypeOf({ country: 'India', state: 'Maharashtra' }, 'BOM')).toBe('intra');
    expect(supplyTypeOf({ country: 'India', state: 'Gujarat' }, 'BOM')).toBe('inter');
    expect(supplyTypeOf({ country: 'India', state: 'Gujarat' }, 'AMD')).toBe('intra');
    expect(supplyTypeOf({ country: 'Singapore' }, 'BOM')).toBe('foreign');
    expect(supplyTypeOf({ country: 'India' }, 'BOM')).toBe('');   // state not captured
  });

  test('MHUB is Mumbai by DECLARATION, not by falling through the default', () => {
    expect(homeStateForBranch('MHUB')).toBe('27');
    expect(supplyTypeOf({ country: 'India', state: 'Maharashtra' }, 'MHUB')).toBe('intra');
  });
});

describe('COUNTRIES — an Africa user has a correct value to record', () => {
  test('the three operating countries are selectable', () => {
    expect(COUNTRIES).toEqual(expect.arrayContaining(['India', 'Kenya', 'Tanzania', 'DR Congo']));
  });

  test('EVERY listed country maps to a code, except the deliberate "Other" catch-all', () => {
    // A listed value that doesn't map would silently read as foreign to every branch — the
    // exact trap that made a local Congolese vendor lose its VAT.
    COUNTRIES.filter((c) => c !== 'Other').forEach((c) => {
      expect({ country: c, code: countryCodeOf(c) }).toEqual({ country: c, code: expect.any(String) });
    });
    ['India', 'Kenya', 'Tanzania', 'DR Congo'].forEach((c) => expect(countryCodeOf(c)).not.toBe(''));
  });

  test('each operating country is domestic to its own branch and foreign to the others', () => {
    const pairs = [['India', 'BOM'], ['Kenya', 'NBO'], ['Tanzania', 'DAR'], ['DR Congo', 'FBM']];
    pairs.forEach(([country, home]) => {
      expect(isDomesticFor(country, home)).toBe(true);
      pairs.filter(([, b]) => b !== home).forEach(([, other]) => {
        expect(isDomesticFor(country, other)).toBe(false);
      });
    });
  });
});
