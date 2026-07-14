import React, { useMemo } from 'react';
import { buildNameMatcher } from './nameMatch';
import { fmt } from './format';
import { EmptyState, Badge } from '../../shell/primitives';

// ─── Name Matcher pane (view-only) — the Defects-tab companion that answers a
// question the single-name grid can't: which ERP-only head IS which Tally-only
// head. Left = ERP orphan, middle = the paired signal + the fix to make, right =
// the matched Tally head(s) (one, or many for a split). Purely a guide — the fix
// is made in Tally (rename / regroup / split) and re-uploaded; nothing here is
// saved and no amount gap is accepted (the residual still blocks until it ties).

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

export function NameMatcherPane({ rows = [], cur }) {
  const m = useMemo(() => buildNameMatcher(rows), [rows]);

  if (!m.erp.length && !m.tally.length) {
    return (
      <EmptyState
        title="Every ledger has a name on both sides"
        hint="No unmatched ledger names to pair here — the ERP and Tally charts line up. Amount differences (if any) show on the other tabs."
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        <span className="font-semibold text-ink">{m.summary.erpOrphans}</span> in ERP with no Tally name ·{' '}
        <span className="font-semibold text-ink">{m.summary.tallyOrphans}</span> in Tally with no ERP name ·{' '}
        <span className="font-semibold text-success">{m.summary.suggested}</span> paired below. A guide only — make the fix in Tally
        (rename / regroup / split) and re-upload; a row clears when it genuinely ties.
      </p>

      {m.erp.length > 0 && (
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
      )}

      {m.unmatchedTally.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            In Tally, no ERP twin suggested <span className="rounded-full bg-warning/15 px-1.5 font-bold text-warning">{m.unmatchedTally.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-1 tablet:grid-cols-2">
            {m.unmatchedTally.map((t, i) => (
              <div key={`${t.name}:${i}`} className="flex items-center justify-between rounded-brand border border-surface-border/60 px-3 py-1.5">
                <span className="truncate font-semibold text-ink" title={t.name}>{t.name}</span>
                <span className="ml-2 shrink-0 font-mono text-sm tabular-nums text-ink-muted">{fmt(t.amount, cur)}</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-subtle">
            These Tally ledgers have no ERP match — create the head in ERP, or they belong to a merge / rename on the ERP side.
          </p>
        </div>
      )}
    </div>
  );
}
