// ─── TK GROUP · Rule Book branch applicability (pure) ────────────────────────
// Lets the Rule Book be read branch-wise. Each enforced rule classifies as
// 'all' (common — every branch), 'india' (GST branches) or 'africa' (VAT
// branches), mirroring the backend regime split (constants/taxRegime.js:11 —
// NBO/DAR/FBM run VAT, every other branch runs India GST). An explicit
// rule.regime in the data always wins; otherwise the rule text is classified
// by regime keywords. A rule mentioning BOTH regimes is regime-aware
// (it describes how each side behaves) and therefore stays common.

const INDIA_RX = /GST|CGST|SGST|IGST|\bTCS\b|\bTDS\b|\b194[A-Z]?\b|206C|26AS|\bRCM\b|\bITC\b|\bPAN\b|\bTAN\b|\bHSN\b|\bSAC\b|India|Indian|Maharashtra|Gujarat|40A\(3\)/;
const AFRICA_RX = /\bVAT\b|\bWHT\b|\bKES\b|\bTZS\b|\bCDF\b|Kenya|Tanzania|Congo|Africa/;
// "not a VAT branch" / "non-VAT" describe an India-only rule, not a VAT one.
const AFRICA_NEGATIONS = /not a VAT branch|non-VAT/gi;

/** Regime a Rule Book rule applies to: 'all' | 'india' | 'africa'. */
export function ruleRegime(rule) {
  if (rule && rule.regime) return rule.regime;
  const t = (rule && rule.t) || '';
  const india = INDIA_RX.test(t);
  const africa = AFRICA_RX.test(t.replace(AFRICA_NEGATIONS, ''));
  if (india && africa) return 'all';
  if (india) return 'india';
  if (africa) return 'africa';
  return 'all';
}

export const REGIME_LABEL = { all: 'All branches', india: 'India · GST', africa: 'Africa · VAT' };

/** Does this rule apply at the given branch? indiaCodes = branch codes on the India GST regime. */
export function ruleAppliesTo(rule, branchCode, indiaCodes) {
  const regime = ruleRegime(rule);
  if (regime === 'all') return true;
  const isIndia = indiaCodes.includes(branchCode);
  return regime === 'india' ? isIndia : !isIndia;
}

/** Common / india / africa counts across the whole book (for the chip hints). */
export function regimeStats(book) {
  const s = { all: 0, india: 0, africa: 0 };
  for (const d of book || []) for (const r of d.rules) s[ruleRegime(r)] += 1;
  return s;
}
