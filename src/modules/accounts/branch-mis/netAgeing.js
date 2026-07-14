/* ─────────────────────── NET AGEING (Debtors − Creditors) ───────────────────
 * Same-party net exposure: joins the AR and AP ageing rows by EXACT party name.
 * Per the inter-branch policy each branch is an independent party, so netting is
 * same-name only — a party owing us X while we owe them Y nets to X − Y. We never
 * net across different parties/branches. Receivable/payable use each side's NET
 * (open bills − on-account advances), so advances are already reflected.
 * Pure (no imports) so it's unit-testable without the app's import.meta tree.   */
const r2 = (n) => Math.round(n * 100) / 100;
const rowNet = (r) => (r && r.net != null ? r.net : (r ? ((r.total || 0) - (r.onAccount || 0)) : 0));

export function computeNetAgeing(d) {
  const rec = (d && d.receivables && d.receivables.rows) || [];
  const pay = (d && d.payables && d.payables.rows) || [];
  const map = new Map(); // party → { party, receivable, payable, net }
  const ensure = (name) => { if (!map.has(name)) map.set(name, { party: name, receivable: 0, payable: 0, net: 0 }); return map.get(name); };
  for (const r of rec) { const o = ensure(r.party); o.receivable = r2(o.receivable + rowNet(r)); }
  for (const p of pay) { const o = ensure(p.party); o.payable = r2(o.payable + rowNet(p)); }
  const rows = [];
  const totals = { receivable: 0, payable: 0, net: 0 };
  for (const o of map.values()) {
    o.net = r2(o.receivable - o.payable);
    if (Math.abs(o.receivable) <= 0.01 && Math.abs(o.payable) <= 0.01) continue;
    rows.push(o);
    totals.receivable = r2(totals.receivable + o.receivable);
    totals.payable = r2(totals.payable + o.payable);
  }
  totals.net = r2(totals.receivable - totals.payable);
  rows.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return { rows, totals };
}
