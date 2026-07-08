import React, { useMemo, useState } from 'react';
import { RULE_BOOK, ruleBookStats, RULE_GROUP_LABEL } from './utils/ruleBook.data';
import { ResponsiveGrid, Badge, Input } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';

// ─── TK GROUP · FE · Rule Book (read-only enforced-rule reference) ────────────
// Every Accounts & Operations rule the ERP actually ENFORCES in code — a guard,
// threshold, rate, lock or throw. Grouped into 24 domains, searchable, filterable
// by Accounts / Operations. This is documentation, not a Control-Tower monitoring
// rule: nothing here is evaluated on live data (that is the ERP Rules Manager tab).
// Data lives in utils/ruleBook.data.js; counts are derived, never hand-typed.

const GROUP_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'ops', label: 'Operations' },
];

export function RuleBook() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const stats = useMemo(() => ruleBookStats(), []);

  const term = q.trim().toLowerCase();
  const domains = useMemo(() => {
    return RULE_BOOK
      .filter((d) => group === 'all' || d.group === group)
      .map((d) => {
        const rules = term
          ? d.rules.filter((r) => (`${r.t} ${r.r}`).toLowerCase().includes(term))
          : d.rules;
        return { ...d, rules };
      })
      .filter((d) => d.rules.length > 0);
  }, [term, group]);

  const shown = domains.reduce((n, d) => n + d.rules.length, 0);

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md">
        <KpiTile label="Enforced rules" value={`${stats.total}`} sub="guards, rates, locks & throws" color="#1a1c22" />
        <KpiTile label="Accounts" value={`${stats.accounts}`} sub="tax · posting · ledgers · recon" color="#1a7a4c" />
        <KpiTile label="Operations" value={`${stats.ops}`} sub="lifecycle · approvals · access" color="#a86a10" />
        <KpiTile label="Domains" value={`${stats.domains}`} sub="reference sections" color="#7a8090" />
      </ResponsiveGrid>

      <div className="rounded-lg border border-dashed border-surface-border bg-surface/60 p-3 text-[12px] text-ink-muted">
        Read-only reference of the rules enforced in code across the ERP backend and frontend — recovered from a source scan and
        re-verified against the codebase. Each rule cites the file that enforces it. This is documentation; unlike
        <span className="font-semibold text-ink"> ERP Rules Manager</span>, nothing here is evaluated on live data.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[240px] grow">
          <Input value={q} placeholder="Search rules — e.g. TCS, revoke, foreign supplier, wired ledger…" onChange={(e) => setQ(e.target.value)} />
        </div>
        {GROUP_FILTERS.map((g) => (
          <button key={g.id} type="button" onClick={() => setGroup(g.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${group === g.id ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
            {g.label}
          </button>
        ))}
        <span className="font-mono text-[11px] text-ink-subtle">
          {term ? `${shown} match${shown === 1 ? '' : 'es'}` : `${shown} rules`}
        </span>
      </div>

      {!domains.length ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-ink-subtle">
          No rules match your search.
        </div>
      ) : (
        <div className="grid gap-4">
          {domains.map((d) => (
            <section key={d.id} className="rounded-lg border border-surface-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-surface-border pb-2">
                <span className="font-mono text-[11px] font-bold text-accent">{d.id}</span>
                <h3 className="text-[15px] font-bold text-ink">{d.title}</h3>
                <Badge tone={d.group === 'accounts' ? 'success' : 'warning'} size="sm">{RULE_GROUP_LABEL[d.group]}</Badge>
                <Badge tone="neutral" size="sm">{d.rules.length} {d.rules.length === 1 ? 'rule' : 'rules'}</Badge>
              </div>
              {d.blurb && <p className="mt-2 text-[12.5px] text-ink-muted">{d.blurb}</p>}
              <ol className="mt-2 grid gap-0">
                {d.rules.map((r, i) => (
                  <li key={i} className="grid grid-cols-[22px_1fr] gap-x-2 border-b border-surface-border/70 py-2 last:border-b-0">
                    <span className="pt-0.5 font-mono text-[11px] text-ink-subtle">{i + 1}</span>
                    <div>
                      <div className="text-[13.5px] text-ink">{r.t}</div>
                      <div className="mt-1 font-mono text-[11px] text-accent/90 break-words">{r.r}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
