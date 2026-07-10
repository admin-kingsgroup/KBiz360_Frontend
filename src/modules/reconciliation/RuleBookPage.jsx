import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Snowflake, FileUp, Scale, PenLine, LockKeyhole, ListChecks } from 'lucide-react';
import { getRulebook } from './api';
import { TIERS, GOLDEN_RULES, ROLE_MATRIX, branchCodeOf } from './utils';
import { PageSection, Badge, Button } from '../../shell/primitives';

// ─── Reconciliation Rule Book ────────────────────────────────────────────────
// The single reference for users and staff: the four tiers, who does what,
// the six-step process and the eight golden rules. Content lives in utils.js
// (pure, tested); current periods come live from the backend so staff always
// see which week/month/quarter/FY they are reconciling right now.

const STEPS = [
  { icon: Snowflake, title: 'Freeze snapshot', text: 'Balances frozen · branch · period · ledger' },
  { icon: FileUp, title: 'Upload statements', text: 'Scan physical / download portal — hash-tied' },
  { icon: Scale, title: 'Reconcile', text: 'Books vs statement → difference to zero' },
  { icon: ListChecks, title: 'Verify', text: 'AE, then FM' },
  { icon: PenLine, title: 'Sign / Certify', text: 'Director · Owner · Auditor per tier' },
  { icon: LockKeyhole, title: 'Release / Lock', text: 'Pay & collect — or lock the period' },
];

const cellCls = 'px-3 py-2.5 text-sm border-b border-surface-border align-top';
const headCls = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';

export function RuleBookPage({ branch, setRoute }) {
  // Periods are regime-aware: India books show FY keys, Africa books CY keys —
  // pass the app branch CODE (the prop is a branch object) so staff see THEIR
  // current period, not another regime's.
  const code = branchCodeOf(branch);
  const { data: live } = useQuery({ queryKey: ['recon-certs', 'rulebook', code], queryFn: () => getRulebook({ branch: code || undefined }) });
  const periods = live?.periods || {};

  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Reconciliation Rule Book</h1>
          <p className="text-sm text-ink-muted">Who reconciles what, when, and who signs — the single source of truth for staff. Branch-wise, never mixed.</p>
        </div>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setRoute && setRoute('/reconciliation/weekly')}>Weekly Reconciliation</Button>
      </div>

      {/* 1 · tiers */}
      <PageSection title="1 · The four tiers" subtitle="Each tier reconciles over the one below; higher certificates attach the lower ones as evidence.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr>
              <th className={headCls}>Tier</th><th className={headCls}>Cadence</th><th className={headCls}>Current period</th>
              <th className={headCls}>Scope reconciled</th><th className={headCls}>Signers (in order)</th><th className={headCls}>Medium</th><th className={headCls}>Lock</th>
            </tr></thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.key}>
                  <td className={cellCls}><Badge tone={t.tone} dot>{t.short}</Badge><div className="mt-1 text-xs text-ink-subtle">{t.label}</div></td>
                  <td className={cellCls}>{t.cadence}</td>
                  <td className={`${cellCls} font-mono text-xs`}>{periods[t.key] || '—'}</td>
                  <td className={cellCls}>{t.scope}</td>
                  <td className={cellCls}><b>{t.chain.map((s) => s.role).join(' → ')}</b></td>
                  <td className={cellCls}>{t.mode === 'digital' ? 'Digital (in ERP)' : 'Physical (wet-sign → scan back)'}</td>
                  <td className={cellCls}>{t.lock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* 2 · roles */}
      <PageSection title="2 · Roles — who does what" subtitle="The Branch Accountant is weekly-only; AE steps up to first verifier at every tier; Owner never signs weekly but sees everything.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr>
              <th className={headCls}>Role</th><th className={headCls}>Responsibility</th>
              <th className={headCls}>Weekly</th><th className={headCls}>Month-End</th><th className={headCls}>Quarterly</th><th className={headCls}>Year-End</th>
            </tr></thead>
            <tbody>
              {ROLE_MATRIX.map((r) => (
                <tr key={r.role}>
                  <td className={cellCls}><b>{r.role}</b><div className="text-xs text-ink-subtle">{r.who}</div></td>
                  <td className={cellCls}>{r.duty}</td>
                  {['weekly', 'month', 'quarter', 'year'].map((k) => (
                    <td key={k} className={cellCls}>
                      {r[k] === '—' ? <span className="text-ink-subtle">—</span> : <Badge tone={r[k] === 'Fallback' ? 'neutral' : 'success'} size="sm">{r[k]}</Badge>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* 3 · process */}
      <PageSection title="3 · The process — same six steps at every tier" subtitle="What changes per tier is the statement set, the signers and whether it locks.">
        <ol className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-brand border border-surface-border bg-surface p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-navy"><s.icon size={14} aria-hidden="true" /> STEP {i + 1}</div>
              <div className="mt-1 text-sm font-semibold text-ink">{s.title}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{s.text}</div>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* 4 · golden rules */}
      <PageSection title="4 · The eight golden rules" subtitle="These gates are enforced by the system — the UI only offers what the rules allow.">
        <div className="grid gap-3 tablet:grid-cols-2">
          {GOLDEN_RULES.map((r) => (
            <div key={r.n} className="rounded-brand border border-surface-border bg-surface p-4">
              <div className="text-xs font-extrabold tracking-wider text-navy">RULE {r.n}</div>
              <div className="mt-0.5 text-sm font-bold text-ink">{r.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{r.text}</p>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
