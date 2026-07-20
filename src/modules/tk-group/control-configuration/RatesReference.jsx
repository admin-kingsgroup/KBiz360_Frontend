import React from 'react';
import { Badge } from '../../../shell/primitives';

// ─── TK GROUP CENTRAL · Owner Rules › Rates & Values (reference index) ────────
// The Owner-set VALUES behind the ~27 owner-governed rules (the govern:'owner' laws
// that are NOT the 4 who-rules). They are deliberately NOT a single editable store:
// each value lives in its own master, in per-user config, or — for a few — is a code
// constant that changes only with a release. Only the who-verifies/approves/signs values
// are edited live in this console (Approval Authority). This screen is the ONE place that
// indexes the rest and says WHERE each is changed, so the Owner can find them from here.
// Read-only reference — it never writes.

const GROUPS = [
  { title: 'Taxation — rates', where: 'Tax Rates master (per branch / regime)', editable: true, rows: [
    ['VAT — Kenya (NBO)', '16%', 'Africa'],
    ['VAT — Tanzania (DAR)', '18%', 'Africa'],
    ['VAT — DR Congo (FBM)', '16%', 'Africa'],
    ['GST — default output / service', '18%', 'India'],
    ['GST — holiday package', '5% on Base + SVC2', 'India'],
  ] },
  { title: 'Taxation — withholding & collection', where: 'Code constant — changes ship with a release', editable: false, rows: [
    ['TCS 206C(1G) — international holiday', '5% ≤ 31-Mar-2026, 2% after', 'date-based'],
    ['194H — supplier commission TDS', '2% (eff 01-Oct-2024)', 'India'],
  ] },
  { title: 'Depreciation', where: 'Fixed-Assets / Depreciation master (dual-basis)', editable: true, rows: [
    ['Depreciation rates', 'per asset class', 'both'],
  ] },
  { title: 'Credit & trading capacity', where: 'Credit Facilities master', editable: true, rows: [
    ['Sanctioned limit · available capacity · over-limit flag', 'per party', 'both'],
  ] },
  { title: 'Payroll — statutory', where: 'Payroll configuration (India regime only)', editable: true, rows: [
    ['PF · ESI · Professional Tax · TDS', 'statutory', 'India'],
  ] },
  { title: 'Per-user visibility & ceilings', where: 'Owner Rules › User Ceilings  +  Page Visibility', editable: true, rows: [
    ['Per-user approval ceiling (branch-wise)', 'per user × branch', 'both'],
    ['Per-user hidden pages / out-of-role grants', 'per user', 'both'],
    ['Field access — Credit Limit · Vendor PAN · Bank A/c', 'per role', 'both'],
  ] },
  { title: 'Locks — these are switches', where: 'Owner Rules › Configurable Rules', editable: true, rows: [
    ['Master-creation lock · field locks', 'off (dormant)', 'both'],
    ['Period lock · tax-filing lock', 'off (dormant)', 'both'],
    ['Reconciliation / integrity before close', 'off (dormant)', 'both'],
  ] },
];

export function RatesReference() {
  return (
    <div className="grid gap-4">
      <p className="max-w-[84ch] text-[13px] text-ink-muted">
        The Owner-set <b>values</b> behind the rules the ERP enforces — rates, limits and per-user settings.
        Unlike the switches, these aren’t a single toggle list: each lives in its own master, in per-user config,
        or (for a few) is a code constant that changes only with a release. This screen indexes them and points
        to <b>where each is changed</b>. Who verifies / approves / signs lives in <b>Approval Authority</b>.
      </p>
      {GROUPS.map((g) => (
        <div key={g.title} className="overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface-alt px-4 py-2.5">
            <span className="text-[13px] font-semibold text-ink">{g.title}</span>
            <Badge tone={g.editable ? 'success' : 'neutral'} size="sm">{g.editable ? 'Owner-editable' : '🔒 Code constant'}</Badge>
            <span className="ml-auto text-[11.5px] text-ink-muted">Set in: <b className="text-ink">{g.where}</b></span>
          </div>
          <div>
            {g.rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-surface-border/60 px-4 py-2 text-[12.5px] first:border-t-0">
                <span className="flex-1 text-ink">{r[0]}</span>
                <span className="font-mono text-[12px] font-semibold text-ink">{r[1]}</span>
                <span className="w-[70px] text-right font-mono text-[9.5px] font-bold uppercase tracking-wide text-ink-subtle">{r[2]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="rounded-brand border border-dashed border-surface-border bg-surface/60 px-4 py-3 text-[12px] text-ink-muted">
        Only the <b className="text-ink">who verifies / approves / signs</b> values are edited live in this console (Approval Authority).
        The rates and masters above are edited in their own screens — this index just tells you where. A code-constant rate changes only with a release.
      </div>
    </div>
  );
}

export default RatesReference;
