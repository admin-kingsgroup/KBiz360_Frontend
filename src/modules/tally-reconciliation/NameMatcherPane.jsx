import React, { useMemo } from 'react';
import { buildNameMatcher } from './nameMatch';
import { fmt } from './format';
import { EmptyState, Badge } from '../../shell/primitives';

// ─── Ledger Matcher pane (view-only) — every ledger & master NAME that appears on
// only one side, split into two sections: "Not in ERP" (in Tally, no ERP head) and
// "Not in Tally" (in ERP, no Tally name). The second section answers the question a
// single-name grid can't — which ERP-only head IS which Tally-only head — pairing
// each ERP orphan against its likely Tally twin(s) (one, or many for a split) with
// the fix to make. Purely a guide — the fix is made in Tally (rename / regroup /
// split) or by creating the head in ERP, then re-uploaded; nothing here is saved
// and no amount gap is accepted (the residual still blocks until it ties).

const KIND_META = {
  code:   { tone: 'info',    label: 'Renamed · code match' },
  exact:  { tone: 'success', label: 'Same amount' },
  split:  { tone: 'info',    label: 'Split in Tally' },
  rename: { tone: 'warning', label: 'Possible rename' },
  none:   { tone: 'muted',   label: 'No Tally twin' },
};

// The concrete instruction the accountant acts on — always "fix in Tally".
function actionText(e, s, targets, cur) {
  const gap = Math.abs(s.residual) > 0.01;
  const tail = gap
    ? ` Names then match, but the ${fmt(s.residual, cur)} amount gap still blocks until it's corrected at source.`
    : ' Renaming clears this row.';
  if (s.kind === 'none') {
    return `No Tally twin found — likely a structural ERP-only head (e.g. an SVC2 / section split). Create or rename it in Tally to match “${e.name}”, then re-upload.`;
  }
  if (s.kind === 'split') {
    const names = targets.map((t) => `“${t.name}”`).join(' + ');
    return `Fix in Tally: “${e.name}” is ${names} combined (Σ ${fmt(s.tallySum, cur)}).${gap ? ` Residual ${fmt(s.residual, cur)} to reconcile.` : ' Amounts tie.'}`;
  }
  return `Fix in Tally: rename “${targets[0].name}” → “${e.name}”.${tail}`;
}

// One section header — coloured dot + title + count + a one-line note.
function SectionHead({ title, count, note }) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
        <span className="inline-block h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
        {title}
        <span className="rounded-full bg-surface-alt px-2 text-xs font-bold tabular-nums text-ink-muted">{count}</span>
      </div>
      {note ? <p className="mt-0.5 text-xs text-ink-muted">{note}</p> : null}
    </div>
  );
}
const AllClear = ({ text }) => (
  <div className="rounded-brand border border-dashed border-surface-border px-4 py-5 text-center text-sm text-ink-subtle">✓ {text}</div>
);

export function NameMatcherPane({ rows = [], cur }) {
  const m = useMemo(() => buildNameMatcher(rows), [rows]);

  if (!m.erp.length && !m.tally.length) {
    return (
      <EmptyState
        title="Every ledger has a name on both sides"
        hint="No unmatched ledger / master names to pair here — the ERP and Tally charts line up. Amount differences (if any) show on the other tabs."
      />
    );
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-muted">
        <span className="font-semibold text-ink">{m.unmatchedTally.length}</span> in Tally with no ERP name ·{' '}
        <span className="font-semibold text-ink">{m.summary.erpOrphans}</span> in ERP with no Tally name ·{' '}
        <span className="font-semibold text-success">{m.summary.suggested}</span> paired below. A guide only — make the fix in Tally
        (rename / regroup / split) or create the head in ERP, then re-upload; a row clears when it genuinely ties.
      </p>

      {/* Section 1 — Not in ERP: ledgers/masters in Tally with no ERP head. */}
      <section>
        <SectionHead title="Not in ERP" count={m.unmatchedTally.length}
          note="In Tally, with no ERP head — create the head in ERP, or they belong to a merge / rename on the ERP side." />
        {m.unmatchedTally.length ? (
          <div className="grid grid-cols-1 gap-1 tablet:grid-cols-2">
            {m.unmatchedTally.map((t, i) => (
              <div key={`${t.name}:${i}`} className="flex items-center justify-between rounded-brand border border-surface-border/60 px-3 py-1.5">
                <span className="min-w-0 truncate font-semibold text-ink" title={t.name}>{t.name}
                  {t.group ? <span className="ml-1.5 text-[11px] font-normal text-ink-subtle">· {t.group}</span> : null}</span>
                <span className="ml-2 shrink-0 font-mono text-sm tabular-nums text-ink-muted">{fmt(t.amount, cur)}</span>
              </div>
            ))}
          </div>
        ) : <AllClear text="Every Tally ledger has an ERP head." />}
      </section>

      {/* Section 2 — Not in Tally: heads in ERP with no Tally name, each paired to its likely twin + the fix. */}
      <section>
        <SectionHead title="Not in Tally" count={m.erp.length}
          note="In ERP, with no Tally name — rename / regroup / split in Tally to match, then re-upload. A suggested Tally twin is shown where one is likely." />
        {m.erp.length ? (
          <div className="flex flex-col gap-2">
            {m.erp.map((e, i) => {
              const s = e.suggestion;
              const meta = KIND_META[s.kind] || KIND_META.none;
              const targets = s.targets.map((ti) => m.tally[ti]);
              const gap = Math.abs(s.residual) > 0.01;
              return (
                <div key={`${e.name}:${i}`}
                  className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-brand border border-surface-border p-3 tablet:grid-cols-[1fr_11rem_1fr]">
                  {/* ERP orphan */}
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">In ERP</div>
                    <div className="truncate font-semibold text-ink" title={e.name}>{e.name}</div>
                    {e.code ? <div className="truncate font-mono text-[11px] text-ink-subtle" title={e.code}>{e.code}</div> : null}
                    <div className="mt-0.5 font-mono text-sm tabular-nums text-ink-muted">
                      {fmt(e.amount, cur)}{e.group ? <span className="ml-1.5 text-[11px] text-ink-subtle">· {e.group}</span> : null}
                    </div>
                  </div>

                  {/* pairing signal */}
                  <div className="flex flex-row items-center gap-2 tablet:flex-col tablet:items-center tablet:justify-center tablet:gap-1 tablet:text-center">
                    <Badge tone={meta.tone} size="sm">{meta.label}</Badge>
                    {s.kind !== 'none' ? (
                      <span className="text-[11px] text-ink-subtle">
                        {targets.length > 1 ? `Σ ${fmt(s.tallySum, cur)} · ` : ''}
                        {gap ? <span className="font-semibold text-danger">gap {fmt(s.residual, cur)}</span> : <span className="font-semibold text-success">amount ties</span>}
                      </span>
                    ) : null}
                  </div>

                  {/* Tally twin(s) */}
                  <div className="min-w-0 tablet:text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">In Tally</div>
                    {targets.length ? targets.map((t, j) => (
                      <div key={`${t.name}:${j}`} className="truncate">
                        <span className="font-semibold text-ink" title={t.name}>{t.name}</span>
                        <span className="ml-2 font-mono text-sm tabular-nums text-ink-muted">{fmt(t.amount, cur)}</span>
                      </div>
                    )) : <span className="text-sm italic text-ink-subtle">— no Tally ledger</span>}
                  </div>

                  {/* the fix to make, spanning the card */}
                  <div className="border-t border-surface-border/60 pt-2 text-[11.5px] text-ink-muted tablet:col-span-3">
                    {actionText(e, s, targets, cur)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <AllClear text="Every ERP head has a Tally name." />}
      </section>
    </div>
  );
}
