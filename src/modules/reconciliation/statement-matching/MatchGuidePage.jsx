import React from 'react';
import { ArrowLeft, CheckCircle2, HelpCircle, FileSearch, AlertTriangle } from 'lucide-react';
import { PageSection, Badge, Button } from '../../../shell/primitives';

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

const BUCKET_CARD_CLS = {
  success: 'border-success/25 bg-success-soft/40',
  warning: 'border-warning/25 bg-warning-soft/40',
  info: 'border-info/25 bg-info-soft/40',
  danger: 'border-danger/25 bg-danger-soft/40',
};

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
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Match Guide — statement matching, line by line</h1>
          <p className="text-sm text-ink-muted">Matching means putting THEIR statement next to OUR books and pairing the lines. Every matching screen speaks the same four-bucket language — learn it once, read every screen.</p>
        </div>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setRoute && setRoute('/reconciliation/weekly')}>Weekly Certification</Button>
      </div>

      {/* 1 · buckets */}
      <PageSection title="1 · The four buckets — the only language you need" icon={FileSearch}
        subtitle="The goal of every matching session: ZERO unexplained lines. A line is explained when it is Matched, Confirmed, or Classified. Never delete, never ignore.">
        <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
          {BUCKETS.map((b) => (
            <div key={b.name} className={`rounded-brand border p-4 ${BUCKET_CARD_CLS[b.tone] || 'border-surface-border bg-surface'}`}>
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
                <tr key={label} className={side === 'Book-only' ? 'bg-danger-soft/15' : side === 'Statement-only' ? 'bg-info-soft/15' : ''}>
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
          <div className="rounded-brand border border-success/25 bg-success-soft/30 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink"><CheckCircle2 size={15} className="text-success" aria-hidden="true" /> Inside a certificate — the Scrutiny</div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              The weekly / closing workflow. Attach the Excel/HTML/TXT/CSV statement to the ledger's certificate — it matches automatically against that ledger's postings for that period.
              Work the buckets, then <b>Use scrutiny figures</b> feeds your classified items straight into the certificate's adjustments.
              <b> Reconciling for a certificate? Start here.</b>
            </p>
          </div>
          <div className="rounded-brand border border-info/25 bg-info-soft/30 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-ink"><FileSearch size={15} className="text-info" aria-hidden="true" /> The standalone Statement Matching screens</div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              For ongoing, deep or historical work: big statement imports, multi-period cleanup, party-by-party allocation, migration-era ties. Same buckets, more room — the six screens below.
            </p>
          </div>
        </div>
      </PageSection>

      {/* 4 · the statement-matching screens */}
      <PageSection title="4 · The five screens, one by one" subtitle="All under ⇄ Statement Reconciliation ▸ Statement Matching.">
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
        <p className="mt-3 rounded-brand bg-accent-soft px-3 py-2 text-xs font-semibold text-accent">
          📗 ERP↔Tally reconciliation moved to its own pill — see <b>Tally Reconciliation ▸ Help ▸ Tally Reconciliation Guide</b> (the per-ledger Day Book matcher is under Tally Reconciliation ▸ Vouchers).
        </p>
      </PageSection>

      {/* 5 · engine */}
      <PageSection title="5 · How the engine pairs lines (so its choices make sense)">
        <div className="rounded-brand border border-surface-border bg-surface-alt/50 p-4 text-sm leading-relaxed text-ink-muted">
          <p><b className="text-ink">Document reference first</b> — an invoice/ticket/PNR/cheque number shared by both sides pairs the lines regardless of date. Same reference but a different amount = a <b>rate difference on a known document</b> (shown with the Δ).</p>
          <p className="mt-1"><b className="text-ink">Matched</b> = same signed amount + dates within <b>±3 days</b> (or the cheque/UTR/name tokens agree). <b className="text-ink">Learned</b> matches pair instantly from patterns you confirmed before.</p>
          <p className="mt-1"><b className="text-ink">Probable</b> = same amount, dates within <b>±10 days</b> — or one statement line equals the SUM of up to 6 book entries (bulk NEFT → <b>1:N</b>; if the group includes a TDS entry it's tagged <b>TDS-explained</b>, not an anomaly).</p>
          <p className="mt-1">Everything else lands in Statement-only / Book-only — each with a <b>suggested</b> classification you can apply in one tap.</p>
          <p className="mt-2 text-xs text-ink-subtle">Dates read Indian formats (14/07/2026, 14-Jul-26); amounts understand Dr/Cr columns, signed columns, ₹/$ symbols and parentheses-negatives. Supplier/client SOA scrutinies automatically switch to the trade vocabulary (invoice not received · TDS deduction · credit note pending · disputed…).</p>
        </div>
      </PageSection>

      {/* 5b · the four superpowers */}
      <PageSection title="5b · Four things that do the work for you">
        <div className="grid gap-3 tablet:grid-cols-2">
          <div className="rounded-brand border border-gold/25 bg-accent-soft/30 p-4">
            <div className="text-sm font-bold text-ink">Carry-forward — explain an item once, ever</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">A classified item (unpresented cheque, deposit in transit…) automatically appears in next period's scrutiny and <b>clears itself</b> the moment it finally hits a statement. You never re-explain it.</p>
          </div>
          <div className="rounded-brand border border-gold/25 bg-accent-soft/30 p-4">
            <div className="text-sm font-bold text-ink">The matcher learns from you</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">Every Probable you Confirm teaches a narration↔party pattern for that ledger. The same pairing lands as <b>Matched (learned)</b> automatically from then on — confirmations shrink every week.</p>
          </div>
          <div className="rounded-brand border border-gold/25 bg-accent-soft/30 p-4">
            <div className="text-sm font-bold text-ink">Re-run match</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">Posted the missing bank charge? Press <b>Re-run match</b> on the scrutiny — it re-matches the stored statement against the current books. No re-upload.</p>
          </div>
          <div className="rounded-brand border border-gold/25 bg-accent-soft/30 p-4">
            <div className="text-sm font-bold text-ink">Bulk classify</div>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">Tick the checkboxes (or select-all), pick a classification once, <b>Apply</b> — one action for a whole pile of unpresented cheques. "Confirm probables" works the same way.</p>
          </div>
        </div>
      </PageSection>

      {/* 6 · pitfalls */}
      <PageSection title="6 · Pitfalls that waste afternoons" icon={AlertTriangle}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead><tr><th className={headCls}>Pitfall</th><th className={headCls}>What happens</th><th className={headCls}>Avoid it by</th></tr></thead>
            <tbody>
              {PITFALLS.map(([p, happens, avoid]) => (
                <tr key={p} className="bg-warning-soft/15">
                  <td className={`${cellCls} font-bold`}>{p}</td>
                  <td className={cellCls}>{happens}</td>
                  <td className={`${cellCls} text-ink-muted`}>{avoid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection title="6b · Cards, wallets, gateways, payroll — where they fit">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead><tr><th className={headCls}>Channel</th><th className={headCls}>How it reconciles</th></tr></thead>
            <tbody>
              <tr><td className={`${cellCls} font-bold whitespace-nowrap`}>Credit cards</td><td className={cellCls}>Card ledgers sit under Bank OD, so they are ALREADY on the weekly cycle — attach the card statement (Excel) to the card certificate and the scrutiny matches it like a bank. Card spends appear as statement debits ↔ our credits, automatically.</td></tr>
              <tr><td className={`${cellCls} font-bold whitespace-nowrap`}>Supplier wallets</td><td className={cellCls}>TripJack wallet / BSP deposit top-ups &amp; usage: add the wallet ledger via <b>Hub ▸ Cycle ledgers</b> (FM/central only) and it joins weekly generation — then attach the wallet statement export like any other.</td></tr>
              <tr><td className={`${cellCls} font-bold whitespace-nowrap`}>Payment gateways</td><td className={cellCls}>Settlement batches are one bank credit covering many receipts — the matcher pairs them as 1:N groups (up to 6 parts). Add a dedicated gateway ledger to the cycle if you keep one.</td></tr>
              <tr><td className={`${cellCls} font-bold whitespace-nowrap`}>Payroll bulk debit</td><td className={cellCls}>Small salary batches match 1:N on the bank scrutiny; large runs: classify the bulk debit and tie it to the payroll run total.</td></tr>
              <tr><td className={`${cellCls} font-bold whitespace-nowrap`}>Inter-branch (line level)</td><td className={cellCls}>The Inter-Branch Reconciliation screen now lists every OPEN INB Link No — the exact deal one side hasn't booked — under the pair table. Book the missing leg and the pair nets to zero.</td></tr>
              <tr><td className={`${cellCls} font-bold whitespace-nowrap`}>GSTR-2B / 26AS</td><td className={cellCls}>Tax matching lives under the Taxation pill (2B invoice matching is live there); 26AS line-level lands when the TRACES file lands.</td></tr>
            </tbody>
          </table>
        </div>
      </PageSection>

      <PageSection title="7 · Which file format? (the one-liner)">
        <div className="rounded-brand border border-success/30 bg-success-soft/30 p-4 text-sm font-semibold text-ink">
          “Download CSV if the portal offers it, otherwise Excel — and ALWAYS attach the PDF alongside as evidence.”
          <p className="mt-1 text-xs font-normal text-ink-muted">CSV parses deterministically every time · Excel is the practical default (banks decorate XLS, the parser skips the noise) · HTML/TXT are fine · PDF is a picture of a table — evidence only, never the matching source. And remember: clients who DO send their SOA can be matched too — the Client Reconciliation screen imports and matches client statement lines (reverse match).</p>
        </div>
      </PageSection>

      <p className="text-xs text-ink-subtle">Companion to the Rule Book (Reconciliation ▸ Rule Book &amp; Process) — the certificate workflow and formal policy live there.</p>
    </div>
  );
}
