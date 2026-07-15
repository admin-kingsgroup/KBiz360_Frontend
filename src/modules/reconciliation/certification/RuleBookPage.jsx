import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Snowflake, FileUp, Scale, PenLine, LockKeyhole, ListChecks, Layers, Users, ShieldCheck } from 'lucide-react';
import { getRulebook } from '../api';
import { TIERS, GOLDEN_RULES, ROLE_MATRIX, branchCodeOf } from '../utils';
import { PageSection, Badge, Button, cn } from '../../../shell/primitives';

// ─── Reconciliation Rule Book ────────────────────────────────────────────────
// The single reference for users and staff: the four tiers, who does what,
// the six-step process and the eight golden rules. Content lives in utils.js
// (pure, tested); current periods come live from the backend so staff always
// see which week/month/quarter/FY they are reconciling right now.

const STEPS = [
  { icon: Snowflake, title: 'Freeze snapshot', text: 'Balances frozen · branch · period · ledger' },
  { icon: FileUp, title: 'Upload statements', text: 'Scan physical / download portal — hash-tied' },
  { icon: Scale, title: 'Reconcile', text: 'Books vs statement → difference to zero' },
  { icon: ListChecks, title: 'Approve / Verify', text: 'Daily: AE · Weekly: AE→FM · Month+: FM' },
  { icon: PenLine, title: 'Certify', text: 'Month/Quarter/Year: Director (TK Group)' },
  { icon: LockKeyhole, title: 'Approve / Lock', text: 'Branch freeze — or the Owner locks the period' },
];

const cellCls = 'px-3 py-2.5 text-sm border-b border-surface-border align-top';
const headCls = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';

// Soft row tint + accent bar per tier tone — mirrors the tone already on that
// tier's Badge, so the color coding is consistent (and readable) top to bottom.
const TIER_ROW_BG = { neutral: 'bg-surface-alt/60', success: 'bg-success-soft/40', info: 'bg-info-soft/40', gold: 'bg-gold-light/30', warning: 'bg-warning-soft/40' };
const TIER_ROW_BORDER = { neutral: 'border-l-surface-border', success: 'border-l-success', info: 'border-l-info', gold: 'border-l-gold', warning: 'border-l-warning' };

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
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setRoute && setRoute('/reconciliation/weekly')}>Weekly Certification</Button>
      </div>

      {/* 1 · tiers */}
      <PageSection icon={Layers} title="1 · The five tiers" subtitle="Daily & Weekly freeze at the branch (no certification); Month/Quarter/Year certify at TK Group. Each tier reconciles over the one below.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr>
              <th className={headCls}>Tier</th><th className={headCls}>Cadence</th><th className={headCls}>Current period</th>
              <th className={headCls}>Scope reconciled</th><th className={headCls}>Signers (in order)</th><th className={headCls}>Medium</th><th className={headCls}>Lock</th>
            </tr></thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.key} className={cn(TIER_ROW_BG[t.tone], 'transition-colors hover:brightness-[0.97]')}>
                  <td className={cn(cellCls, 'border-l-4', TIER_ROW_BORDER[t.tone])}><Badge tone={t.tone} dot>{t.short}</Badge><div className="mt-1 text-xs text-ink-subtle">{t.label}</div></td>
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
      <PageSection icon={Users} title="2 · Roles — who does what" subtitle="Branch Accountant freezes Daily & Weekly; AE approves those and freezes Month+; FM verifies (and is the sole editor in an Owner-opened correction window); only the Owner locks and re-opens.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead><tr>
              <th className={headCls}>Role</th><th className={headCls}>Responsibility</th>
              <th className={headCls}>Daily</th><th className={headCls}>Weekly</th><th className={headCls}>Month-End</th><th className={headCls}>Quarterly</th><th className={headCls}>Year-End</th>
            </tr></thead>
            <tbody>
              {ROLE_MATRIX.map((r, i) => (
                <tr key={r.role} className={cn(i % 2 === 1 && 'bg-surface-alt/60', 'hover:bg-gold-light/20 transition-colors')}>
                  <td className={cellCls}><b>{r.role}</b><div className="text-xs text-ink-subtle">{r.who}</div></td>
                  <td className={cellCls}>{r.duty}</td>
                  {['daily', 'weekly', 'month', 'quarter', 'year'].map((k) => (
                    <td key={k} className={cellCls}>
                      {(!r[k] || r[k] === '—') ? <span className="text-ink-subtle">—</span> : <Badge tone={r[k] === 'Freeze' ? 'info' : 'success'} size="sm">{r[k]}</Badge>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* 3 · process */}
      <PageSection icon={ListChecks} title="3 · The process — same six steps at every tier" subtitle="What changes per tier is the statement set, the signers and whether it locks.">
        <ol className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-brand border border-surface-border bg-gradient-to-b from-surface-alt to-surface p-3 shadow-xs transition-shadow hover:shadow-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-gold">
                <s.icon size={15} aria-hidden="true" />
              </div>
              <div className="mt-2 text-[10px] font-extrabold uppercase tracking-wider text-gold-dark">Step {i + 1}</div>
              <div className="mt-0.5 text-sm font-semibold text-ink">{s.title}</div>
              <div className="mt-0.5 text-xs text-ink-muted">{s.text}</div>
            </li>
          ))}
        </ol>
      </PageSection>

      {/* 4 · golden rules */}
      <PageSection icon={ShieldCheck} title="4 · The eight golden rules" subtitle="These gates are enforced by the system — the UI only offers what the rules allow.">
        <div className="grid gap-3 tablet:grid-cols-2">
          {GOLDEN_RULES.map((r) => (
            <div key={r.n} className="flex gap-3 rounded-brand border border-surface-border border-l-4 border-l-gold bg-gold-light/15 p-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-extrabold text-gold">{r.n}</div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold tracking-wider text-gold-dark">RULE {r.n}</div>
                <div className="mt-0.5 text-sm font-bold text-ink">{r.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
