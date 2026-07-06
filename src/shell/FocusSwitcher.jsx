/* ════════════════════════════════════════════════════════════════════
   FocusSwitcher — the in-cockpit branch spotlight (TK Group Central)
   ════════════════════════════════════════════════════════════════════
   Rendered ONLY inside the control cockpit (AppShell gates it on group mode
   + central role). A segmented control:  Focus · [All branches] BOM AMD …

   • All branches → branchwise oversight (₹ and $ side by side, never summed).
   • A branch     → that branch alone, in its native currency, WITHOUT leaving
                    Central (the central user keeps full authority).

   State lives in useCockpitFocusStore; oversight pages read effectiveScope().
   ──────────────────────────────────────────────────────────────────── */

import React, { useEffect, useMemo } from 'react';
import { BRANCHES } from '../core/data';
import { useCockpitFocusStore } from '../store/cockpitFocus';
import { FOCUS_ALL } from '../modules/tk-group/utils/cockpitFocus';

const curSym = (b) => b.cur || ((b.currency === 'USD' || b.curCode === 'USD') ? '$' : '₹');

export function FocusSwitcher() {
  const focus = useCockpitFocusStore((s) => s.focus);
  const setFocus = useCockpitFocusStore((s) => s.setFocus);
  const initFocus = useCockpitFocusStore((s) => s.initFocus);

  const branches = useMemo(
    () => (BRANCHES || []).filter((b) => b && b.code && b.code !== 'ALL'),
    [],
  );
  const codes = useMemo(() => branches.map((b) => b.code), [branches]);

  // Hydrate once from ?focus= / localStorage against the real branch codes.
  useEffect(() => { initFocus(codes); }, [initFocus, codes]);

  const options = useMemo(
    () => [
      { code: FOCUS_ALL, label: 'All branches', cur: '₹ · $' },
      ...branches.map((b) => ({ code: b.code, label: b.code, cur: curSym(b) })),
    ],
    [branches],
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-subtle whitespace-nowrap">Focus <span className="text-ink-subtle/70">· scopes everything below</span></span>
      <div role="group" aria-label="Branch focus" className="inline-flex flex-wrap overflow-hidden rounded-lg border border-surface-border bg-surface">
        {options.map((o, i) => {
          const on = focus === o.code;
          return (
            <button
              key={o.code}
              type="button"
              aria-pressed={on}
              onClick={() => setFocus(o.code, codes)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                i > 0 ? 'border-l border-surface-border' : '',
                on ? 'bg-gold text-navy' : 'text-ink-muted hover:bg-gold/10 hover:text-navy',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
              ].join(' ')}
            >
              <span>{o.label}</span>
              <span className={['font-mono text-[10px]', on ? 'text-navy/70' : 'text-ink-subtle'].join(' ')}>{o.cur}</span>
            </button>
          );
        })}
      </div>
      <span className="text-[11px] text-ink-subtle whitespace-nowrap">
        {focus === FOCUS_ALL ? 'branchwise · never summed' : 'scoped to this branch · full authority'}
      </span>
    </div>
  );
}

export default FocusSwitcher;
