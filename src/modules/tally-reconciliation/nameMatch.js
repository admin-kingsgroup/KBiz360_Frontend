// ─── Name Matcher (view-only) — pair unmatched ledger NAMES across ERP ↔ Tally ──
// The tie-out already flags a ledger present on only one side (status 'only-erp' /
// 'only-tally'). With a single name column you can't tell "in ERP, not Tally" from
// "in Tally, not ERP", nor see that two orphans are the SAME account under two
// names. This pairs the ERP-only orphans against the Tally-only orphans with four
// escalating signals and hands the accountant a concrete fix TO MAKE IN TALLY.
//
// It is a DISPLAY AID, not an accepted mapping: nothing is persisted and no amount
// gap is waved through. Pairing resolves IDENTITY (this ERP head is that Tally
// head); the residual amount difference still blocks the gate until the entry is
// corrected at source (rename / regroup / split in Tally, then re-upload).
//
// Pure + unit-tested — no React, no I/O.

import { round2 } from './format';

const nkey = (s) => String(s || '').trim().toLowerCase();
const sameSign = (a, b) => (a >= 0) === (b >= 0);

function bigrams(s) {
  const t = nkey(s).replace(/\s+/g, ' ');
  const out = new Map();
  for (let i = 0; i < t.length - 1; i += 1) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1); }
  return out;
}

/** Sørensen–Dice similarity on character bigrams — the SAME basis as the backend's
 *  "did you mean" (bestErpSuggestion). 1 = identical, 0 = nothing in common. */
export function diceSim(a, b) {
  const A = nkey(a); const B = nkey(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.length < 2 || B.length < 2) return 0;
  const ga = bigrams(A); const gb = bigrams(B);
  let inter = 0; let sizeA = 0; let sizeB = 0;
  for (const v of ga.values()) sizeA += v;
  for (const [g, v] of gb) { sizeB += v; if (ga.has(g)) inter += Math.min(v, ga.get(g)); }
  return (2 * inter) / (sizeA + sizeB);
}

/** The ERP code often embeds the account's ORIGINAL (Tally) name behind a system
 *  prefix — "AUTO-IT-Other Taxes", "BOM-AUTO-TDS Payable", "AUTO-Markup Income".
 *  Strip the prefix so a rename the fuzzy NAME match misses (IT-SVC2 ← IT-Other
 *  Taxes) is still caught. Returns '' for a pure serial ("L1139") or an all-caps
 *  slug ("BOM-OTHER-TAXES-CGST-OUTPUT") that carries no readable name. */
export function codeHintName(code) {
  let c = String(code || '').trim();
  if (!c) return '';
  c = c.replace(/^(BOM|BOMMB|AMD|NBO|DAR|FBM)-/i, '');   // branch tag
  c = c.replace(/^(AUTO|SYS|MN)-/i, '');                 // system marker
  c = c.replace(/^(AUTO|SYS|MN)-/i, '');                 // a second (BOM-AUTO-…)
  c = c.trim();
  if (!/[a-z]/.test(c)) return '';   // all-caps slug → not a readable name
  if (/^l?\d+$/i.test(c)) return ''; // bare serial code
  return c;
}

/** Find a SUBSET (size 2–3) of the unclaimed, same-sign Tally orphans whose amounts
 *  sum to `target` within `tol` — a 1-to-many split (ERP one head; Tally many, e.g.
 *  TDS Payable ← 194J + 194C). Bounded brute force; orphan counts are tiny. */
function findSplit(target, tally, claimed, tol) {
  const idx = [];
  for (let i = 0; i < tally.length; i += 1) if (!claimed.has(i) && sameSign(tally[i].amount, target)) idx.push(i);
  const A = idx;
  for (let a = 0; a < A.length; a += 1) {
    for (let b = a + 1; b < A.length; b += 1) {
      if (Math.abs(tally[A[a]].amount + tally[A[b]].amount - target) <= tol) return [A[a], A[b]];
    }
  }
  for (let a = 0; a < A.length; a += 1) {
    for (let b = a + 1; b < A.length; b += 1) {
      for (let c = b + 1; c < A.length; c += 1) {
        if (Math.abs(tally[A[a]].amount + tally[A[b]].amount + tally[A[c]].amount - target) <= tol) return [A[a], A[b], A[c]];
      }
    }
  }
  return null;
}

const CODE_MIN = 0.85;    // code-hint name similarity that is "certainly the same account"
const SUGGEST_MIN = 0.6;  // fuzzy-name floor for an advisory "possible rename"

/** Pair the tie-out's ERP-only orphans with its Tally-only orphans.
 *  `rows` = tie-out rows (each carries status, erpLedger/tallyLedger, code, erp,
 *  tally, group). Returns { erp:[{name,code,amount,group,suggestion}], tally,
 *  unmatchedTally, summary }. suggestion.kind ∈ code|exact|split|rename|none.
 *  Signals are claimed GLOBALLY strongest-first (code → exact → split → fuzzy) so a
 *  greedy fuzzy guess can't steal a Tally head a certain match needs. */
export function buildNameMatcher(rows = [], opts = {}) {
  const tol = opts.amtTol != null ? Number(opts.amtTol) : 1;
  const erp = (rows || []).filter((r) => r && r.status === 'only-erp').map((r) => ({
    name: r.erpLedger || r.ledger || '', code: r.code || '', amount: round2(r.erp), group: r.group || r.parentGroup || '',
  }));
  const tally = (rows || []).filter((r) => r && r.status === 'only-tally').map((r) => ({
    name: r.tallyLedger || r.ledger || '', amount: round2(r.tally), group: r.tallyGroup || r.group || '',
  }));
  const claimed = new Set();
  const result = erp.map(() => null);

  const mk = (kind, targets, e, score) => {
    targets.forEach((i) => claimed.add(i));
    const sum = round2(targets.reduce((s, i) => s + tally[i].amount, 0));
    return { kind, targets: targets.slice(), score: round2(score), tallySum: sum, residual: round2(e.amount - sum) };
  };

  const codeMatch = (e) => {
    const hint = codeHintName(e.code);
    if (!hint) return null;
    let best = null;
    for (let i = 0; i < tally.length; i += 1) { if (claimed.has(i)) continue; const cs = diceSim(hint, tally[i].name); if (cs >= CODE_MIN && (!best || cs > best.cs)) best = { i, cs }; }
    return best ? mk('code', [best.i], e, best.cs) : null;
  };
  const exactMatch = (e) => {
    let best = null;
    for (let i = 0; i < tally.length; i += 1) {
      if (claimed.has(i)) continue; const t = tally[i];
      if (Math.abs(e.amount - t.amount) <= tol && sameSign(e.amount, t.amount)) { const ns = diceSim(e.name, t.name); if (!best || ns > best.ns) best = { i, ns }; }
    }
    return best ? mk('exact', [best.i], e, best.ns) : null;
  };
  const splitMatch = (e) => { const sp = findSplit(e.amount, tally, claimed, tol); return sp ? mk('split', sp, e, 1) : null; };
  const fuzzyMatch = (e) => {
    const hint = codeHintName(e.code);
    let best = null;
    for (let i = 0; i < tally.length; i += 1) {
      if (claimed.has(i)) continue;
      const sim = Math.max(diceSim(e.name, tally[i].name), hint ? diceSim(hint, tally[i].name) : 0);
      if (sim >= SUGGEST_MIN && (!best || sim > best.sim)) best = { i, sim };
    }
    return best ? mk('rename', [best.i], e, best.sim) : null;
  };

  // Global phases — strongest identity signal claims first.
  for (const fn of [codeMatch, exactMatch, splitMatch, fuzzyMatch]) {
    erp.forEach((e, idx) => { if (result[idx]) return; const s = fn(e); if (s) result[idx] = s; });
  }
  erp.forEach((e, idx) => { if (!result[idx]) result[idx] = { kind: 'none', targets: [], score: 0, tallySum: 0, residual: e.amount }; });

  const erpOut = erp.map((e, idx) => ({ ...e, suggestion: result[idx] }));
  const unmatchedTally = tally.map((t, i) => ({ ...t, _i: i })).filter((t) => !claimed.has(t._i));
  return {
    erp: erpOut,
    tally,
    unmatchedTally,
    summary: {
      erpOrphans: erp.length,
      tallyOrphans: tally.length,
      suggested: erpOut.filter((r) => r.suggestion.kind !== 'none').length,
      unmatchedTally: unmatchedTally.length,
    },
  };
}
