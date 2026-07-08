import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIntegrity } from './api/monitor';
import { integrityKpis, branchCards, findingRows, statusTone, focusView } from './utils/integrity';
import { ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';

// ─── TK GROUP · FE · Close-Readiness summary (compact, on the Control Tower) ──
// A glanceable band for the Control Tower landing: group close-readiness KPIs, a
// close-ready chip per branch (worst first), and the top findings that block a close —
// with a link to the full gate × branch checklist at /tk/integrity. Live + dormant-safe.

const OK = '#1a7a4c';
const BAD = '#b23b3b';

export function IntegritySummary({ setRoute } = {}) {
  const focus = useCockpitFocus();
  const q = useQuery({ queryKey: ['tk', 'monitor', 'integrity'], queryFn: getIntegrity, staleTime: 60_000, refetchInterval: 300_000 });
  const d = focusView(q.data || {}, focus); // narrow to the spotlighted branch (ALL = group)
  const kpis = integrityKpis(d, focus);
  const cards = branchCards(d);
  const findings = findingRows(d).slice(0, 4);

  // A failed roll-up must not read as "close-ready 100 / 0 failing gates".
  if (q.isError) return <BandError label="close-readiness" onRetry={q.refetch} />;

  return (
    <div className="grid gap-3">
      <ResponsiveGrid min="150px" gap="md">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={k.key === 'fails' && Number(k.value) > 0 ? BAD : k.key === 'score' ? OK : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      <div className="flex flex-wrap gap-1.5">
        {cards.map((c) => (
          <Badge key={c.branch} tone={c.closeReady ? 'success' : 'danger'} size="sm">
            {c.branch} {c.score}{c.closeReady ? '' : ` · ${c.fails}✗`}
          </Badge>
        ))}
      </div>

      {findings.length > 0 && (
        <div className="grid gap-1">
          {findings.map((f, i) => (
            <div key={`${f.branch}:${i}`} className="flex items-center gap-2 text-xs">
              <Badge tone={statusTone(f.status)} size="sm">{f.branch}</Badge>
              <span className="text-ink">{f.label}</span>
              <span className="text-ink-subtle truncate">— {f.detail}</span>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => (setRoute ? setRoute('/tk/integrity') : (window.location.href = '/tk/integrity'))}
        className="w-fit text-[12px] font-medium text-info hover:underline">View full close checklist →</button>
    </div>
  );
}
