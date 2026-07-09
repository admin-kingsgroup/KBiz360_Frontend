import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, RefreshCcw, ChevronRight, CalendarClock } from 'lucide-react';
import { getTree, getSummary, generateCertificates } from './api';
import { BRANCHES, TIERS, tierOf, statusMeta, tierProgress, chainProgress, fmtAmt, currencyOf } from './utils';
import { PageSection, Badge, Button, EmptyState, LoadingState } from '../../shell/primitives';
import { CertificateDrawer } from './CertificateDrawer';

// ─── Reconciliation Hub — the module's home ─────────────────────────────────
// Branch-wise (Rule 06: one branch at a time, never mixed), four tier tabs,
// and the per-ledger register grouped Parent Group → Sub-group → ledger — one
// certificate per ledger (Rule 01). Opening a row works the certificate in a
// drawer: freeze → attach → exceptions → sign chain → (physical) scan-back.

function TierCard({ tier, counts, period, active, onClick }) {
  const p = tierProgress(counts);
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-brand border p-4 text-left transition-colors ${active ? 'border-navy bg-navy/5 shadow-card' : 'border-surface-border bg-surface hover:border-ink/20'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{tier.short}</span>
        <Badge tone={tier.tone} size="sm">{tier.mode === 'digital' ? 'Digital' : 'Physical'}</Badge>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-ink">{p.done}<span className="text-base font-semibold text-ink-subtle"> / {p.total}</span></div>
      <div className="mt-0.5 truncate text-xs text-ink-muted">{period || '—'} · {p.pct}% signed</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${p.pct}%` }} />
      </div>
    </button>
  );
}

export function ReconciliationHub({ branch: appBranch, setRoute, currentUser }) {
  const [branch, setBranch] = useState(BRANCHES.includes(appBranch) ? appBranch : 'BOM');
  const [tierKey, setTierKey] = useState('weekly');
  const [openId, setOpenId] = useState(null);
  const qc = useQueryClient();
  const tier = tierOf(tierKey);

  const { data: summary } = useQuery({ queryKey: ['recon-certs', 'summary', branch], queryFn: () => getSummary({ branch }) });
  const period = summary?.periods?.[tierKey];
  const { data: treeData, isLoading } = useQuery({
    queryKey: ['recon-certs', 'tree', branch, tierKey, period || ''],
    queryFn: () => getTree({ branch, tier: tierKey, period }),
  });
  const groups = treeData?.groups || [];
  const empty = !isLoading && groups.length === 0;

  const gen = useMutation({
    mutationFn: () => generateCertificates({ branch, tier: tierKey, period }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recon-certs', 'tree'] });
      qc.invalidateQueries({ queryKey: ['recon-certs', 'summary'] });
    },
  });

  return (
    <div className="grid gap-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Reconciliation</h1>
          <p className="text-sm text-ink-muted">One certificate per ledger · four signed tiers · branch-wise, never mixed.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={CalendarClock} onClick={() => setRoute && setRoute('/reconciliation/reports')}>Reports &amp; Pending</Button>
          <Button variant="ghost" icon={BookOpenCheck} onClick={() => setRoute && setRoute('/reconciliation/rulebook')}>Rule Book</Button>
          <Button variant="secondary" icon={RefreshCcw} loading={gen.isPending} onClick={() => gen.mutate()}>
            Generate {tier.short} certificates
          </Button>
        </div>
      </div>

      {/* branch chips — the register is always a single branch (Rule 06) */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Branch">
        {BRANCHES.map((b) => (
          <button key={b} type="button" role="tab" aria-selected={branch === b} onClick={() => setBranch(b)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${branch === b ? 'border-transparent bg-navy text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-ink/20'}`}>
            {b} <span className="ml-1 text-xs opacity-60">{currencyOf(b)}</span>
          </button>
        ))}
        <span className="ml-auto text-xs italic text-ink-subtle">Branch-wise — data is never mixed across branches</span>
      </div>

      {/* tier cards */}
      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        {TIERS.map((t) => (
          <TierCard key={t.key} tier={t} active={tierKey === t.key}
            counts={summary?.tiers?.[t.key]} period={summary?.periods?.[t.key]}
            onClick={() => setTierKey(t.key)} />
        ))}
      </div>

      {/* register */}
      <PageSection
        title={`${tier.label} — ${branch} · ${period || ''}`}
        subtitle={`${tier.scope} · Signers: ${tier.chain.map((s) => s.role).join(' → ')}`}>
        {isLoading && <LoadingState label="Loading register…" />}
        {empty && (
          <EmptyState title={`No ${tier.short} certificates for ${branch} · ${period || 'this period'}`}
            hint="Generate the period's certificates — one per ledger in this tier's scope."
            action={<Button variant="primary" loading={gen.isPending} onClick={() => gen.mutate()}>Generate certificates</Button>} />
        )}
        <div className="grid gap-4">
          {groups.map((g) => (
            <div key={g.parentGroup} className="overflow-hidden rounded-brand border border-surface-border">
              <div className="bg-navy px-4 py-2 text-sm font-bold text-white">{g.parentGroup}</div>
              {g.subGroups.map((sg) => (
                <div key={sg.subGroup}>
                  <div className="border-y border-surface-border bg-surface-alt px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {sg.subGroup}
                  </div>
                  <ul>
                    {sg.items.map((c) => {
                      const meta = statusMeta(c.status);
                      const prog = chainProgress(c);
                      return (
                        <li key={c._id}>
                          <button type="button" onClick={() => setOpenId(c._id)}
                            className="flex w-full items-center gap-3 border-b border-surface-border px-4 py-2.5 text-left last:border-0 hover:bg-surface-alt/60">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{c.ledger.name}</span>
                              <span className="font-mono text-xs text-ink-subtle">{c.ledger.code}</span>
                            </span>
                            <span className="hidden text-xs tabular-nums text-ink-muted tablet:block">
                              {c.snapshot?.frozenAt ? `diff ${fmtAmt(c.snapshot.difference, c.branch)}` : 'not frozen'}
                            </span>
                            <span className="text-xs tabular-nums text-ink-muted">{prog.done}/{prog.total} signed</span>
                            <Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge>
                            <ChevronRight size={15} className="text-ink-subtle" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PageSection>

      {openId && <CertificateDrawer id={openId} branch={branch} onClose={() => setOpenId(null)} />}
    </div>
  );
}
