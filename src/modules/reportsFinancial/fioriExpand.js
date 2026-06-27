// Pure helpers for the Fiori P&L / Balance Sheet "Expand all · Collapse all"
// controls. Kept dependency-free (no React, no api/import.meta chain) so the
// expand-key logic is unit-testable on its own. The Fiori components import
// these and feed the returned keys into their open/openSub/… toggle state.

// Split a group's ledgers into named Tally sub-groups (carried on each ledger's
// `subGroup`) and the ledgers that hang directly under the 28-group head.
export function splitSubGroups(ledgers) {
  const direct = [];
  const map = new Map(); // subGroup name → { name, amount, ledgers }
  for (const l of (ledgers || [])) {
    const s = (l.subGroup || '').trim();
    if (!s) { direct.push(l); continue; }
    if (!map.has(s)) map.set(s, { name: s, amount: 0, ledgers: [] });
    const sg = map.get(s);
    sg.amount += l.amount || 0;
    sg.ledgers.push(l);
  }
  const subs = [...map.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  return { subs, direct };
}

// Balance Sheet (Fiori) — keys to expand every group (that has children) and
// every sub-group, across BOTH sides. Summary mode has no children → no keys.
//   group key   = g.group                 (matches BSSideCard `open`)
//   sub-grp key = `${g.group}|${sg.name}` (matches BSSideCard `openSub`)
export function bsFioriExpandKeys(d, summary) {
  const groupKeys = [], subKeys = [];
  if (summary) return { groupKeys, subKeys };
  [...(d?.liabilities || []), ...(d?.assets || [])].forEach((g) => {
    const { subs, direct } = splitSubGroups(g.ledgers);
    if (subs.length || direct.length) groupKeys.push(g.group);
    subs.forEach((sg) => subKeys.push(`${g.group}|${sg.name}`));
  });
  return { groupKeys, subKeys };
}

// P&L (Fiori) — keys for Section A (modules → sub-centres → ledger-composition
// heads with captured fare components) and Section B (Fixed/Variable buckets →
// sub-groups). Only heads that actually carry components are collected (a head
// with no components has nothing to expand).
//   module key  = m.key                       (openMod)
//   sub key     = `${m.key}|${s.code}`         (openSub)
//   head key    = `${base}:${side}:${ledger}`  (openHead)
//   bucket key  = b.name                       (openBucket)
//   exp grp key = `${b.name}|${g.name}`        (openExp)
export function pnlFioriExpandKeys(d, expBuckets) {
  const modKeys = [], subKeys = [], headKeys = [];
  const pushHeads = (heads, base) => {
    for (const side of ['sales', 'cogs']) {
      (heads?.[side] || []).forEach((h) => { if ((h.components || []).length) headKeys.push(`${base}:${side}:${h.ledger}`); });
    }
  };
  (d?.modules || []).forEach((m) => {
    modKeys.push(m.key);
    if (m.hasSubs) (m.subs || []).forEach((s) => { const sk = `${m.key}|${s.code}`; subKeys.push(sk); pushHeads(s.heads, sk); });
    else pushHeads(m.heads, m.key);
  });
  const bucketKeys = (expBuckets || []).map((b) => b.name);
  const expKeys = (expBuckets || []).flatMap((b) => (b.groups || []).map((g) => `${b.name}|${g.name}`));
  return { modKeys, subKeys, headKeys, bucketKeys, expKeys };
}
