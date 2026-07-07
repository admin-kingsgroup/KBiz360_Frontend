// ─── TK GROUP · currency symbol (pure, deterministic) ────────────────────────
// A branch's `currency` field is an ISO CODE ('INR' / 'USD'), NOT a symbol. money()
// prepends whatever it is given, so passing the code renders "INR50,000". Row builders
// must pass the SYMBOL. This map is deterministic — it works in tests and before the
// live currency metadata hydrates (currencySymbolOf falls back to the code for USD).
// The six oversight branches are INR (BOM/BOMMB/AMD) or USD-books (NBO/DAR/FBM).
const SYMBOL = { INR: '₹', USD: '$', KES: '$', TZS: '$', CDF: '$' };

/** Currency CODE → display symbol; unknown/blank → ₹. */
export const curSym = (code) => SYMBOL[code] || '₹';
