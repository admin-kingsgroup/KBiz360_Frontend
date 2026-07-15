import React from 'react';
import { BookOpenCheck, Upload, ClipboardCheck, ShieldCheck, AlertTriangle, ListChecks, ArrowLeftRight } from 'lucide-react';
import { PageSection, Badge, Button } from '../../../shell/primitives';

// ─── Tally Reconciliation — the staff Guide ──────────────────────────────────
// The how-to for the whole-books ERP↔Tally tie-out: what to export from Tally and
// where each file goes, the monthly routine, how to read the board, and the
// certificate that gates the close. Pure content.

const cell = 'px-3 py-2.5 text-sm border-b border-surface-border align-top';
const head = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';

const UPLOADS = [
  ['Trial Balance', 'Tally ▸ Trial Balance (the period, all ledgers) — press F5 for the ledger-wise view so group subtotals don’t double-count, then Export as Excel / CSV / XML', 'Tie-Out board ▸ “Upload Tally TB”', 'Builds every balance you see — the Trial Balance, Balance Sheet and P&L side-by-side.'],
  ['Day Book', 'Tally ▸ Day Book / a ledger’s vouchers (for a ledger that’s off)', 'Ledger Matcher (Day Book)', 'Lets you drill an OFF ledger to the exact voucher that differs.'],
];

const STATUSES = [
  ['tied', 'Tied', 'ERP equals Tally (a zero-balance ledger Tally omits also reads as tied).', 'success'],
  ['off', 'Off', 'Both have the ledger but the balances differ.', 'danger'],
  ['only-erp', 'Only in ERP', 'A real balance in the ERP that the Tally upload doesn’t have.', 'warning'],
  ['only-tally', 'Only in Tally', 'A balance in Tally with no ERP counterpart.', 'warning'],
];

const ROUTINE = [
  ['1', 'Upload the Tally Trial Balance', 'On the Tie-Out board, click “Upload Tally TB” and paste the period’s TB. The ERP puts its own live numbers next to it — you never type the ERP side.'],
  ['2', 'Read the tie-out', 'Scan the three tabs (Trial Balance / Balance Sheet / P&L). Green = tied. Anything red or amber needs a look.'],
  ['3', 'Drill the off ledgers', 'Click an off ledger to open its vouchers (ERP ↔ Tally Day Book). Import the Day Book in the Ledger Matcher if you haven’t yet, then correct the entry at source (in ERP or Tally) until it ties.'],
  ['4', 'Freeze & certify', 'When every ledger is Tied, freeze the tie-out and sign the certificate up the chain. Only then can the month hard-lock.'],
];

const CHAIN = [
  ['AE', 'Verified'],
  ['FM', 'Approved'],
  ['Director', 'Certified'],
  ['Owner', 'Locked'],
];

const GOTCHAS = [
  ['Zero-balance ledgers not in Tally', 'Tally lists only ledgers with balances, so a zero ERP ledger looks “missing”.', 'It reads as TIED, not a difference — nothing to do.'],
  ['Name drift (e.g. “Trip Jack” vs “TripJack”)', 'The same account split into Only-in-ERP + Only-in-Tally.', 'They auto-pair by ledger CODE. Align the names in Tally to be safe.'],
  ['Post-migration cutoff dates', 'Before a branch’s cutoff (BOM: 19-06-2026) both books exist; after, the ERP is live.', 'Reconcile up to the cutoff; post-cutoff isn’t a Tally gap.'],
  ['Empty / mis-pasted upload', 'A one-column or header-only paste has no ledgers.', 'The upload is rejected — your existing TB is never wiped. Use “Clear” to remove one on purpose.'],
];

export function TallyGuidePage({ setRoute }) {
  const go = (r) => setRoute && setRoute(r);
  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8" style={{ maxWidth: 1100 }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Tally Reconciliation Guide</h1>
          <p className="text-sm text-ink-muted">Putting the ERP’s own books next to Tally — every ledger, the Balance Sheet and the P&amp;L — so the two agree before a month can close. This is the how-to for the whole flow.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={ArrowLeftRight} onClick={() => go('/tally-reconciliation/monthly')}>Open Monthly Tie-Out</Button>
          <Button variant="ghost" icon={Upload} onClick={() => go('/accounts/tally-reco')}>Ledger Matcher</Button>
        </div>
      </div>

      {/* 0 · what it is */}
      <PageSection title="What this is (and how it differs from Statement Reconciliation)" icon={BookOpenCheck}>
        <p className="text-sm text-ink-muted">
          <b className="text-ink">Statement Reconciliation</b> checks the ERP against an <b>outside party</b> (bank / supplier / client) — differences like cheques in transit are normal.
          <b className="text-ink"> Tally Reconciliation</b> checks the ERP against your <b>own parallel books in Tally</b> — the two should be <b className="text-ink">identical</b>. This is a whole-books tie-out, not a party statement: every ledger, the Balance Sheet and the P&amp;L, side by side.
        </p>
      </PageSection>

      {/* 1 · what to export */}
      <PageSection title="1 · What to export from Tally — and where each goes" icon={Upload}
        subtitle="Two files. The ERP side is automatic — you only ever upload the Tally side.">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className={head}>Export</th><th className={head}>From Tally</th><th className={head}>Upload it here</th><th className={head}>What it powers</th></tr></thead>
            <tbody>
              {UPLOADS.map((u) => (
                <tr key={u[0]}>
                  <td className={cell}><b className="text-ink">{u[0]}</b></td>
                  <td className={`${cell} text-ink-muted`}>{u[1]}</td>
                  <td className={cell}><span className="font-semibold text-accent">{u[2]}</span></td>
                  <td className={`${cell} text-ink-muted`}>{u[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-subtle">Tally’s native <b>XML</b> export can carry both in one file. Excel/CSV work too — the Trial Balance uses separate Dr/Cr columns.</p>
      </PageSection>

      {/* 2 · the monthly routine */}
      <PageSection title="2 · The monthly routine" icon={ListChecks}>
        <ol className="grid gap-2">
          {ROUTINE.map((s) => (
            <li key={s[0]} className="flex gap-3 rounded-brand border border-surface-border p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white">{s[0]}</span>
              <span><b className="text-ink">{s[1]}</b><span className="block text-sm text-ink-muted">{s[2]}</span></span>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* 3 · reading the board */}
      <PageSection title="3 · Reading the board — the statuses" icon={ClipboardCheck}
        subtitle="Left is ERP (live), middle is Tally (your upload), right is the difference. The goal: every ledger Tied.">
        <div className="grid gap-2 tablet:grid-cols-2">
          {STATUSES.map((s) => (
            <div key={s[0]} className="flex items-start gap-3 rounded-brand border border-surface-border p-3">
              <Badge tone={s[3]} size="sm" dot>{s[1]}</Badge>
              <span className="text-sm text-ink-muted">{s[2]}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-muted">The <b className="text-ink">Unmatched Entries</b> tab lists the vouchers on only one side — <b>Not in ERP</b> / <b>Not in Tally</b> (plus an amount-differs band), grouped by voucher number; click one to drill its ledger legs. The <b className="text-ink">Ledger Matcher</b> tab does the same for whole ledger &amp; master names — <b>Not in ERP</b> / <b>Not in Tally</b> — with the rename / regroup / split to make in Tally.</p>
      </PageSection>

      {/* 4 · the certificate + gate */}
      <PageSection title="4 · The certificate — and the hard gate" icon={ShieldCheck}
        subtitle="A month cannot hard-lock until the ERP ties to Tally AND this is signed.">
        <div className="flex flex-wrap items-center gap-2">
          {CHAIN.map((c, i) => (
            <React.Fragment key={c[0]}>
              <span className="rounded-brand border border-surface-border bg-surface px-3 py-2 text-sm"><b className="text-ink">{c[0]}</b> <span className="text-ink-subtle">· {c[1]}</span></span>
              {i < CHAIN.length - 1 && <span className="text-ink-subtle">→</span>}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-muted">Freeze snapshots the tie-out (only when clean); then the chain signs. If a voucher is posted after freezing and the tie-out drifts off, Sign is blocked until you re-freeze — the close can never lock on stale numbers.</p>
      </PageSection>

      {/* 5 · gotchas */}
      <PageSection title="5 · Gotchas" icon={AlertTriangle}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className={head}>Situation</th><th className={head}>Why it looks wrong</th><th className={head}>What to do</th></tr></thead>
            <tbody>
              {GOTCHAS.map((g) => (
                <tr key={g[0]}>
                  <td className={cell}><b className="text-ink">{g[0]}</b></td>
                  <td className={`${cell} text-ink-muted`}>{g[1]}</td>
                  <td className={`${cell} text-ink-muted`}>{g[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  );
}
