import React from 'react';
import { ArrowLeft, CheckCircle2, HelpCircle, FileSearch, AlertTriangle } from 'lucide-react';
import { PageSection, Badge, Button } from '../../shell/primitives';

// ─── Statement Matching — the staff Match Guide ──────────────────────────────
// The line-level companion to the Rule Book: the four buckets every matching
// screen speaks, how to classify unmatched lines, when to use the certificate
// Scrutiny vs the standalone screens, what each screen is for, how the engine
// pairs lines, and the pitfalls. Pure content — no data fetching.

const cellCls = 'px-3 py-2.5 text-sm border-b border-surface-border align-top';
const headCls = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';

const BUCKETS = [
  { tone: 'success', name: 'Matched', means: 'Same amount, dates close together (or the reference agrees). The system paired it for you.', action: 'Your action: none' },
  { tone: 'warning', name: 'Probable', means: 'Same amount but dates further apart, or several book entries add up to one statement line (1:N).', action: 'Your action: look, then Confirm' },
  { tone: 'info', name: 'Statement-only', means: 'On their statement, missing in our books — charges, interest, a direct credit nobody recorded.', action: 'Your action: classify or post it' },
  { tone: 'danger', name: 'Book-only', means: 'In our books, not on their statement — an unpresented cheque, a deposit still clearing.', action: 'Your action: classify it' },
];

const CLASSIFICATIONS = [
  ['Unpresented cheque', 'Book-only', 'We issued the cheque; they have not cleared it yet.', 'Chq 004512 to Akbar, issued Tuesday, not on the statement.'],
  ['Deposit in transit', 'Book-only', 'We deposited; the bank credits it next working day.', 'Counter deposit made Friday evening.'],
  ['Charge / credit to post', 'Statement-only', 'Real bank event we have not recorded yet — needs a voucher.', 'NEFT charges + GST, savings interest.'],
  ['Other reconciling item', 'Either', 'Genuine timing/valuation item that fits none of the above.', "Bank's rounding, reversal pending."],
];

const SCREENS = [
  ['🏦 Bank Reconciliation', 'Import the bank statement lines for a bank ledger, Auto-match, then clear the leftovers by hand. The BRS view shows the classic bridge: statement balance → ± reconciling items → book balance. Use it when an account has months of history to tie — not just this week’s cycle.', ''],
  ['🏢 Supplier Reconciliation', 'Their SOA vs our creditor ledger. Supplier payments carry Agst Ref, so most pair automatically. Disputed lines: raise with the supplier and keep the line open with a note — never force a match.', 'TripJack has SEVERAL ledgers on purpose (one per module) — reconcile each against its own portal statement. Never merge them.'],
  ['👤 Client Reconciliation', 'Clients rarely send statements — this screen works OUR open items: open invoices, on-account receipts, and the receipt↔invoice allocation view.', 'Client receipts settle to bills MANUALLY — the system never auto-FIFOs them. You choose which invoice a receipt knocks off.'],
  ['📋 Reconciliation Queue', 'The worklist across all matching: what is imported, part-matched, or carrying exceptions. Start your day here — it shows where the open lines are.', ''],
  ['🔁 Inter-Branch Reconciliation', 'Each branch pair keeps two mirror accounts (BOM’s "Travkings NBO" vs NBO’s "Travkings BOM"). This screen checks the pair NETS TO ZERO. USD↔₹ legs are tied by hand — the system flags, you match.', ''],
  ['📗 Tally Reconciliation', 'Compares an ERP ledger against an imported Tally export — a migration-era check for data entered in both systems. Only compare dates up to the branch cutoff (BOM: 19-06-2026); after cutoff the ERP is live and Tally simply doesn’t have the entries — that is not a mismatch.', 'Tally is import-only history — the ERP books are the truth. Reconcile TO the ERP, not the other way.'],
];

const PITFALLS = [
  ['Importing the same statement twice', 'Every line shows up unmatched a second time.', 'Check the Queue before importing; renamed exports can slip past the dedupe.'],
  ['Matching across the period line', 'This month balances, next month is short.', 'Classify cross-period items as in-transit / unpresented instead of force-matching.'],
  ['Forcing a "close enough" match', 'A ₹10 difference hides a real error.', 'Amounts must be EXACT. A near-miss is two lines: one to match properly, one to explain.'],
  ['Classifying instead of posting', '"To post" items pile up month after month.', 'Post the voucher the same day (PXP for bank charges); the item should MATCH next period.'],
  ['PDF-only uploads', 'No line matching happens; everything is manual.', 'Excel/HTML/TXT/CSV for matching, PDF as evidence — attach both.'],
];

export function MatchGuidePage({ setRoute }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Match Guide — statement matching, line by line</h1>
          <p className="text-sm text-ink-muted">Matching means putting THEIR statement next to OUR books and pairing the lines. Every matching screen speaks the same four-bucket language — learn it once, read every screen.</p>
        </div>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setRoute && setRoute('/reconciliation')}>Back to Reconciliation</Button>
      </div>

      {/* 1 · buckets */}
      <PageSection title="1 · The four buckets — the only language you need" icon={FileSearch}
        subtitle="The goal of every matching session: ZERO unexplained lines. A line is explained when it is Matched, Confirmed, or Classified. Never delete, never ignore.">
        <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
          {BUCKETS.map((b) => (
            <div key={b.name} className="rounded-brand border border-surface-border bg-surface p-4">
              <Badge tone={b.tone} dot>{b.name}</Badge>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{b.means}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink">{b.action}</p>
            </div>
          ))}
        </div>
      </PageSection>

      {/* 2 · classifications */}
      <PageSection title="2 · Classifying unmatched lines — pick the right label"
        subtitle="“Charge to post” is a to-do, not a resting place — after classifying, post the voucher the same day. Next period it should be a Matched line.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr><th className={headCls}>Label</th><th className={headCls}>Which side</th><th className={headCls}>It means</th><th className={headCls}>Example</th></tr></thead>
            <tbody>
              {CLASSIFICATIONS.map(([label, side, means, example]) => (
                <tr key={label}>
                  <td className={`${cellCls} whitespace-nowrap font-bold`}>{label}</td>
                  <td className={cellCls}><Badge tone={side === 'Book-only' ? 'danger' : side === 'Statement-only' ? 'info' : 'neutral'} size="sm">{side}</Badge></td>
                  <td className={cellCls}>{means}</td>
                  <td className={`${cellCls} text-ink-muted`}>{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* 3 · where matching happens */}
      <PageSection title="3 · Two places matching happens — when to use which" icon={HelpCircle}>
        <div className="grid gap-3 tablet:grid-cols-2">
          <div className="rounded-brand border border-surface-border bg-surface p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink"><CheckCircle2 size={15} className="text-success" aria-hidden="true" /> Inside a certificate — the Scrutiny</div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              The weekly / closing workflow. Attach the Excel/HTML/TXT/CSV statement to the ledger's certificate — it matches automatically against that ledger's postings for that period.
              Work the buckets, then <b>Use scrutiny figures</b> feeds your classified items straight into the certificate's adjustments.
              <b> Reconciling for a certificate? Start here.</b>
            </p>
          </div>
          <div className="rounded-brand border border-surface-border bg-surface p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink"><FileSearch size={15} className="text-info" aria-hidden="true" /> The standalone Statement Matching screens</div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              For ongoing, deep or historical work: big statement imports, multi-period cleanup, party-by-party allocation, migration-era ties. Same buckets, more room — the six screens below.
            </p>
          </div>
        </div>
      </PageSection>

      {/* 4 · the six screens */}
      <PageSection title="4 · The six screens, one by one" subtitle="All under ⇄ Reconciliation ▸ Statement Matching.">
        <div className="grid gap-3">
          {SCREENS.map(([name, text, warn]) => (
            <div key={name} className="rounded-brand border border-surface-border bg-surface p-4">
              <div className="text-sm font-bold text-ink">{name}</div>
              <p className="mt-1 max-w-[85ch] text-sm leading-relaxed text-ink-muted">{text}</p>
              {warn ? (
                <p className="mt-2 inline-block rounded-brand bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning">{warn}</p>
              ) : null}
            </div>
          ))}
        </div>
      </PageSection>

      {/* 5 · engine */}
      <PageSection title="5 · How the engine pairs lines (so its choices make sense)">
        <div className="rounded-brand border border-surface-border bg-surface-alt/50 p-4 text-sm leading-relaxed text-ink-muted">
          <p><b className="text-ink">Matched</b> = same signed amount + dates within <b>±3 days</b> (or the cheque/UTR/name tokens agree).</p>
          <p className="mt-1"><b className="text-ink">Probable</b> = same amount, dates within <b>±10 days</b> — or one statement line equals the SUM of up to 4 book entries (a bulk NEFT covering several receipts → shown as <b>1:N</b>).</p>
          <p className="mt-1">Everything else lands in Statement-only / Book-only for you to explain.</p>
          <p className="mt-2 text-xs text-ink-subtle">Dates read Indian formats (14/07/2026, 14-Jul-26); amounts understand Dr/Cr columns, signed columns, ₹ symbols and parentheses-negatives.</p>
        </div>
      </PageSection>

      {/* 6 · pitfalls */}
      <PageSection title="6 · Pitfalls that waste afternoons" icon={AlertTriangle}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr><th className={headCls}>Pitfall</th><th className={headCls}>What happens</th><th className={headCls}>Avoid it by</th></tr></thead>
            <tbody>
              {PITFALLS.map(([p, happens, avoid]) => (
                <tr key={p}>
                  <td className={`${cellCls} font-bold`}>{p}</td>
                  <td className={cellCls}>{happens}</td>
                  <td className={`${cellCls} text-ink-muted`}>{avoid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <p className="text-xs text-ink-subtle">Companion to the Rule Book (Reconciliation ▸ Rule Book &amp; Process) — the certificate workflow and formal policy live there.</p>
    </div>
  );
}
