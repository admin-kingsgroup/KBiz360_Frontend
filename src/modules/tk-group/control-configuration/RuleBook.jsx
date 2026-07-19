import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../../core/api';
import { RULE_BOOK, ruleBookStats, RULE_GROUP_LABEL } from '../utils/ruleBook.data';
import { ruleRegime, ruleAppliesTo, REGIME_LABEL, regimeStats } from '../utils/ruleBranches';
import { ResponsiveGrid, Badge, Input } from '../../../shell/primitives';
import { KpiTile } from '../../dashboard/components/cards/KpiTile';
import { BRANCHES } from '../../../core/data';

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

// Regroup the flat GET /api/rules registry into the RULE_BOOK shape the view renders.
// regime is preserved only when explicit ('' → undefined so ruleRegime() derives it from
// the text, exactly as with the bundled data). Returns null when there is nothing to show
// (so the caller falls back to the bundled RULE_BOOK).
function regroupRegistry(items) {
  if (!items || !items.length) return null;
  const map = new Map();
  const order = [];
  for (const it of items) {
    if (!map.has(it.domain)) {
      map.set(it.domain, { id: it.domain, group: it.group, title: it.domainTitle, blurb: it.domainBlurb || '', rules: [] });
      order.push(it.domain);
    }
    map.get(it.domain).rules.push({ t: it.title, r: it.sourceRef, regime: it.regime || undefined });
  }
  return order.map((id) => map.get(id));
}

export function RuleBook() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [branch, setBranch] = useState('all'); // 'all' | 'common' | branch code
  // Read the Rule Book live from the DB registry; fall back to the bundled data so the tab
  // still renders if the endpoint is unavailable (older backend / offline / cold DB).
  const { data: reg } = useQuery({ queryKey: ['tk', 'rules-registry'], queryFn: () => apiGet('/api/rules').catch(() => null), staleTime: 300_000 });
  const book = useMemo(() => regroupRegistry(reg && reg.items) || RULE_BOOK, [reg]);
  const stats = useMemo(() => ruleBookStats(book), [book]);
  const rStats = useMemo(() => regimeStats(book), [book]);
  const indiaCodes = useMemo(() => BRANCHES.filter((b) => b.country === 'India').map((b) => b.code), []);

  const term = q.trim().toLowerCase();
  const domains = useMemo(() => {
    return book
      .filter((d) => group === 'all' || d.group === group)
      .map((d) => {
        let rules = term
          ? d.rules.filter((r) => (`${r.t} ${r.r}`).toLowerCase().includes(term))
          : d.rules;
        if (branch === 'common') rules = rules.filter((r) => ruleRegime(r) === 'all');
        else if (branch !== 'all') rules = rules.filter((r) => ruleAppliesTo(r, branch, indiaCodes));
        return { ...d, rules };
      })
      .filter((d) => d.rules.length > 0);
  }, [book, term, group, branch, indiaCodes]);

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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Branch</span>
        {[{ id: 'all', label: 'All branches' }, { id: 'common', label: 'Common only' },
          ...BRANCHES.map((b) => ({ id: b.code, label: `${b.flag} ${b.code}` }))].map((c) => (
          <button key={c.id} type="button" onClick={() => setBranch(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${branch === c.id ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
            {c.label}
          </button>
        ))}
        <span className="font-mono text-[11px] text-ink-subtle">
          {rStats.all} common · {rStats.india} India-GST · {rStats.africa} Africa-VAT
        </span>
      </div>

      {branch !== 'all' && (
        <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-[12px] text-ink-muted">
          {branch === 'common'
            ? <>Showing only the <b className="text-ink">{shown}</b> common rules — the ones enforced identically on every branch. Branch-regime rules (India · GST and Africa · VAT) are hidden.</>
            : <>Showing the <b className="text-ink">{shown}</b> rules in force at <b className="text-ink">{branch}</b> — every common rule plus its {indiaCodes.includes(branch) ? 'India · GST' : 'Africa · VAT'} regime rules. Rules of the other regime are hidden.</>}
        </div>
      )}

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
                {d.rules.map((r, i) => {
                  const regime = ruleRegime(r);
                  return (
                    <li key={i} className="grid grid-cols-[22px_1fr] gap-x-2 border-b border-surface-border/70 py-2 last:border-b-0">
                      <span className="pt-0.5 font-mono text-[11px] text-ink-subtle">{i + 1}</span>
                      <div>
                        <div className="text-[13.5px] text-ink">
                          {r.t}
                          {regime !== 'all' && <Badge tone={regime === 'india' ? 'success' : 'info'} size="sm" className="ml-2 align-middle">{REGIME_LABEL[regime]}</Badge>}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-accent/90 break-words">{r.r}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
