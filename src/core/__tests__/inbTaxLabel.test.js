// The INB voucher's tax NAME and RATE must follow the SELLER's regime — an Africa seller bills its
// own VAT %, an India seller bills IGST 18%.
//
// The bug this pins: the "Bill IGST 18% even cross-border" tick and its "IGST on Service Fee" label
// were hardcoded. On FBM (Lubumbashi, VAT 16%) the screen therefore announced IGST 18% while the
// server — which has always picked the rate off the seller's regime (inb.service.inbTaxTreatment:
// `isVat ? vatRateOf(fromBranch) : 18`) — would post VAT 16%. The math was right and the label lied,
// which is the more dangerous direction: the operator ticks a box believing a rate that never lands.
//
// These tests are the FE half of an FE/BE mirror. The backend is authoritative; if these two ever
// disagree, the screen misquotes a real inter-branch deal to a real counterparty branch.
import { inbTaxOf, vatPctOf, isVatBranch, GST_RATE } from '../voucherSpecs.js';

describe('inbTaxOf — the seller regime decides the tax name and rate', () => {
  test('Africa (VAT) sellers bill their OWN branch rate, never a flat 18%', () => {
    expect(inbTaxOf({ branch: 'FBM' })).toEqual({ name: 'VAT', rate: 16 });
    expect(inbTaxOf({ branch: 'NBO' })).toEqual({ name: 'VAT', rate: 16 });
    expect(inbTaxOf({ branch: 'DAR' })).toEqual({ name: 'VAT', rate: 18 });
  });

  test('FBM — the exact regression: VAT 16, not IGST 18', () => {
    const t = inbTaxOf({ branch: 'FBM' });
    expect(t.name).not.toBe('IGST');
    expect(t.rate).not.toBe(18);
    expect(t).toEqual({ name: 'VAT', rate: 16 });
  });

  test('India sellers bill IGST 18% — the name is IGST, not the generic "GST" caption', () => {
    expect(inbTaxOf({ branch: 'BOM' })).toEqual({ name: 'IGST', rate: 18 });
    expect(inbTaxOf({ branch: 'AMD' })).toEqual({ name: 'IGST', rate: 18 });
    expect(inbTaxOf({ branch: 'BOMMB' })).toEqual({ name: 'IGST', rate: 18 });
  });

  test('DAR at 18 is VAT-named — a rate match must not be mistaken for an IGST match', () => {
    // DAR's VAT is coincidentally 18, the same number as IGST. A regression that reverted the NAME
    // while keeping the rate would pass a rate-only assertion, so pin the name explicitly.
    expect(inbTaxOf({ branch: 'DAR' }).name).toBe('VAT');
  });

  test('a live VAT-master override wins over the static fallback (Super-Admin rate amendment)', () => {
    expect(inbTaxOf({ branch: 'FBM', vatRate: 20 })).toEqual({ name: 'VAT', rate: 20 });
    // Blank/absent must NOT be read as zero — it means "no override", so fall back to the constant.
    expect(inbTaxOf({ branch: 'FBM', vatRate: '' }).rate).toBe(16);
    expect(inbTaxOf({ branch: 'FBM', vatRate: null }).rate).toBe(16);
    // An India seller ignores a VAT rate entirely — IGST is not branch-rated.
    expect(inbTaxOf({ branch: 'BOM', vatRate: 20 })).toEqual({ name: 'IGST', rate: 18 });
  });

  test('lower-case / padded branch codes resolve — the backend case-folds, so must this', () => {
    expect(inbTaxOf({ branch: 'fbm' })).toEqual({ name: 'VAT', rate: 16 });
    // Assert the NAME, not just the rate. ' DAR ' asserted `.rate === 18` before and passed while
    // isVatBranch lacked .trim() — it was resolving to IGST 18, the very rate-vs-name confusion
    // the DAR test above warns about. ' FBM ' is the case that also moves the money (VAT 16 vs
    // IGST 18), so pin the padded form there too.
    expect(inbTaxOf({ branch: ' DAR ' })).toEqual({ name: 'VAT', rate: 18 });
    expect(inbTaxOf({ branch: ' FBM ' })).toEqual({ name: 'VAT', rate: 16 });
    expect(inbTaxOf({ branch: ' nbo ' })).toEqual({ name: 'VAT', rate: 16 });
  });

  test('an unknown seller fails safe to IGST 18 rather than a zero rate', () => {
    // Not a VAT branch → the India rule. A 0% would silently understate a real supply.
    expect(inbTaxOf({ branch: '???' })).toEqual({ name: 'IGST', rate: 18 });
    expect(inbTaxOf({})).toEqual({ name: 'IGST', rate: 18 });
    expect(inbTaxOf(null)).toEqual({ name: 'IGST', rate: 18 });
  });

  test('the IGST rate is derived from GST_RATE, not a second hardcoded 18', () => {
    expect(inbTaxOf({ branch: 'BOM' }).rate).toBe(GST_RATE * 100);
  });
});

describe('vatPctOf — the caption % matches the rate the math uses', () => {
  test('returns a PERCENT, where the rate helpers return a fraction', () => {
    expect(vatPctOf({ branch: 'FBM' })).toBe(16);
    expect(vatPctOf({ branch: 'DAR' })).toBe(18);
    expect(vatPctOf({ branch: 'NBO', vatRate: 14 })).toBe(14);
  });
});

// FE/BE parity. The VAT table exists in three places (this module, the backend's taxRegime.js, and
// the backend's INB rate pick). The screen states what the server will post, so a drift here is a
// wrong number shown against a real deal — pin the pair the INB label leans on.
describe('FE/BE mirror — the seller regimes and rates agree with the backend', () => {
  const BACKEND_VAT_BRANCHES = ['NBO', 'DAR', 'FBM'];        // taxRegime.VAT_BRANCHES
  const BACKEND_VAT_RATE = { NBO: 16, DAR: 18, FBM: 16 };    // taxRegime.VAT_RATE
  const BACKEND_INDIA = ['BOM', 'AMD', 'BOMMB'];             // inb.service.COUNTRY === 'IN'

  test('every backend VAT branch is a VAT branch here, at the same rate', () => {
    BACKEND_VAT_BRANCHES.forEach((b) => {
      expect(isVatBranch(b)).toBe(true);
      expect(inbTaxOf({ branch: b })).toEqual({ name: 'VAT', rate: BACKEND_VAT_RATE[b] });
    });
  });

  test('no India branch is treated as a VAT seller', () => {
    BACKEND_INDIA.forEach((b) => {
      expect(isVatBranch(b)).toBe(false);
      expect(inbTaxOf({ branch: b }).name).toBe('IGST');
    });
  });
});
