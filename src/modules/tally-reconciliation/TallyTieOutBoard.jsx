import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, RefreshCcw, AlertTriangle } from 'lucide-react';
import { getTieOut, getPeriods, importTB, getDefects } from './api';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState, Select } from '../../shell/primitives';
import { VoucherDrawer } from './VoucherDrawer';
import { BRANCHES, AFRICA, CUR, localeOf, round2, branchCodeOf, fmt, statusOf, statusMeta, defectMeta } from './format';

// ─── Tally Reconciliation — the whole-books tie-out board (one page per tier) ──
// Puts the ERP's LIVE trial balance next to the UPLOADED Tally TB for a branch +
// period — every ledger, the Balance Sheet and the P&L, side by side. The tier
// (month / year) is fixed by the route; branch follows the top TK selector.
// Read-only comparison; the paste panel uploads/replaces a period's Tally TB.

function currentMonthKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function currentYearKey(branch) {
  const d = new Date(); const y = d.getFullYear();
  if (AFRICA.has(branch)) return `CY${y}`;
  return d.getMonth() >= 3 ? `FY${y}-${String((y + 1) % 100).padStart(2, '0')}` : `FY${y - 1}-${String(y % 100).padStart(2, '0')}`;
}
const defaultPeriod = (tier, branch) => (tier === 'year' ? currentYearKey(branch) : currentMonthKey());

// Group a flat (already-ordered) row list by parent group, preserving order.
function byParent(rows) {
  const m = new Map();
  for (const r of rows) { const k = r.parentGroup || 'Other'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return [...m.entries()].map(([parent, items]) => ({ parent, items }));
}

// Parse a pasted Tally Trial Balance: tab/comma columns.
//   3+ cols → Ledger, Closing Dr, Closing Cr   |   2 cols → Ledger, Closing (Cr negative)
function parseTB(text) {
  const numOf = (s) => Number(String(s || '').replace(/[₹$,\s]/g, '')) || 0;
  return String(text || '').split(/\r?\n/).map((line) => {
    const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 2 || !cells[0]) return null;
    const ledger = cells[0];
    if (/^(ledger|account|particulars|total|grand total)/i.test(ledger)) return null; // header/total lines
    if (cells.length >= 3) return { ledger, closingDebit: numOf(cells[cells.length - 2]), closingCredit: numOf(cells[cells.length - 1]) };
    return { ledger, closing: numOf(cells[1]) }; // signed (negative = Cr)
  }).filter(Boolean);
}

export function TallyTieOutBoard({ branch: appBranch, currentUser, tier: fixedTier }) {
  const tier = fixedTier === 'year' ? 'year' : 'month';
  const appCode = branchCodeOf(appBranch);
  const focus = useCockpitFocus();
  const branch = appCode || (BRANCHES.includes(focus) ? focus : 'BOM');
  const cur = CUR[branch] || '₹';
  const qc = useQueryClient();

  const [tab, setTab] = useState('tb');
  const [periodSel, setPeriodSel] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [paste, setPaste] = useState('');
  const [drill, setDrill] = useState(null); // off ledger being drilled (Phase 2)

  const { data: periodsData } = useQuery({ queryKey: ['tally-tieout', 'periods', branch], queryFn: () => getPeriods({ branch }) });
  const period = periodSel[`${branch}:${tier}`] || defaultPeriod(tier, branch);
  const setPeriod = (p) => setPeriodSel((s) => ({ ...s, [`${branch}:${tier}`]: p }));
  const periodOptions = useMemo(() => {
    const opts = new Map();
    (periodsData || []).filter((p) => p.tier === tier).forEach((p) => opts.set(p.period, `${p.period} · ${p.ledgers} ledgers`));
    if (!opts.has(period)) opts.set(period, `${period} · current`);
    return [...opts.entries()].map(([value, label]) => ({ value, label }));
  }, [periodsData, tier, period]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'board', branch, tier, period],
    queryFn: () => getTieOut({ branch, period, tier }),
  });
  const rows = data?.rows || [];
  const counts = data?.counts || {};
  const imported = data?.imported || {};

  // Defect Register — lazily loaded (the per-off-ledger voucher scan is heavier).
  const { data: defectsData, isLoading: defectsLoading, isError: defectsError, refetch: refetchDefects } = useQuery({
    queryKey: ['tally-tieout', 'defects', branch, tier, period],
    queryFn: () => getDefects({ branch, period, tier }),
    enabled: tab === 'defects',
  });

  const imp = useMutation({
    mutationFn: () => importTB({ branch, period, tier, rows: parseTB(paste) }),
    onSuccess: () => { setShowImport(false); setPaste(''); qc.invalidateQueries({ queryKey: ['tally-tieout'] }); },
  });

  const sections = useMemo(() => {
    if (tab === 'tb') return [{ label: null, rows }];
    if (tab === 'pl') return [
      { label: 'Income', rows: rows.filter((r) => r.nature === 'income') },
      { label: 'Expenses', rows: rows.filter((r) => r.nature === 'expense') },
    ];
    const np = { ledger: 'Profit for the period', code: '(from P&L)', parentGroup: 'Capital Account',
      erp: round2(-(counts.netProfitErp || 0)), tally: round2(-(counts.netProfitTally || 0)) };
    np.diff = round2((np.erp || 0) - (np.tally || 0)); np.status = statusOf(np.erp, np.tally);
    return [
      { label: 'Liabilities & Capital', rows: [...rows.filter((r) => r.nature === 'liability'), np] },
      { label: 'Assets', rows: rows.filter((r) => r.nature === 'asset') },
    ];
  }, [tab, rows, counts]);

  const foot = useMemo(() => {
    if (tab === 'tb') return { label: 'Trial Balance — Dr = Cr', balanced: data?.erpTotals?.balanced && data?.tallyTotals?.balanced };
    if (tab === 'pl') return { label: 'Net Profit', erp: counts.netProfitErp || 0, tally: counts.netProfitTally || 0 };
    const shown = sections.flatMap((s) => s.rows);
    const se = round2(shown.reduce((a, r) => a + (r.erp || 0), 0));
    const st = round2(shown.reduce((a, r) => a + (r.tally || 0), 0));
    return { label: 'Balance Sheet total', erp: se, tally: st };
  }, [tab, sections, counts, data]);

  const empty = !isLoading && !isError && rows.length === 0;
  const title = tier === 'year' ? 'Yearly Tie-Out' : 'Monthly Tie-Out';

  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8" style={{ maxWidth: 1600 }}>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Tally Reconciliation · {title}</h1>
          <p className="text-sm text-ink-muted">ERP live books vs uploaded Tally — every ledger, Balance Sheet &amp; P&amp;L side by side. Branch-wise, never blended.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Upload} onClick={() => setShowImport((s) => !s)}>Upload Tally TB</Button>
          <Button variant="ghost" icon={RefreshCcw} onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      {/* branch + period scope */}
      <div className="flex flex-wrap items-center gap-2" data-testid="tally-branch-scope">
        <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-semibold text-white">{branch} <span className="text-xs opacity-70">{cur}</span></span>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">Period
          <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Tie-out period">
            {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </label>
        <span className="text-xs italic text-ink-subtle">
          {imported.count ? `Tally TB uploaded · ${imported.count} ledgers` : 'No Tally TB uploaded for this period yet — click “Upload Tally TB”.'}
        </span>
      </div>

      {/* import panel */}
      {showImport && (
        <PageSection title="Upload Tally Trial Balance" subtitle={`Paste the ${branch} · ${period} Trial Balance from Tally — one ledger per line: Ledger, Closing Dr, Closing Cr (tab or comma separated).`}>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={7}
            placeholder={'ICICI Bank A/c\t1245300\t0\nHDFC Bank A/c\t805000\t0\nBSP / IATA\t0\t9000'}
            className="w-full rounded-brand border border-surface-border bg-surface p-3 font-mono text-xs text-ink" />
          <div className="mt-2 flex items-center gap-3">
            <Button variant="primary" loading={imp.isPending} disabled={!paste.trim()} onClick={() => imp.mutate()}>
              Parse &amp; upload ({parseTB(paste).length} rows)
            </Button>
            {imp.isError && <span className="text-sm text-danger">{imp.error?.message}</span>}
            {imp.isSuccess && <span className="text-sm text-success">Uploaded {imp.data?.inserted ?? 0} ledgers.</span>}
            <span className="text-xs text-ink-subtle">Re-uploading replaces this period's Tally TB.</span>
          </div>
        </PageSection>
      )}

      {/* KPI chips */}
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4 desktop:grid-cols-6">
        <Kpi label="In scope" value={counts.total || 0} />
        <Kpi label="Tied" value={counts.tied || 0} tone="success" />
        <Kpi label="Off" value={(counts.off || 0)} tone={(counts.off || 0) > 0 ? 'danger' : 'muted'} />
        <Kpi label="Only in ERP" value={counts.onlyErp || 0} tone={(counts.onlyErp || 0) > 0 ? 'warning' : 'muted'} />
        <Kpi label="Only in Tally" value={counts.onlyTally || 0} tone={(counts.onlyTally || 0) > 0 ? 'warning' : 'muted'} />
        <Kpi label="Net profit Δ" value={fmt(round2((counts.netProfitErp || 0) - (counts.netProfitTally || 0)), cur)} tone={round2((counts.netProfitErp || 0) - (counts.netProfitTally || 0)) !== 0 ? 'danger' : 'muted'} small />
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {[['tb', 'All Ledgers · Trial Balance'], ['bs', 'Balance Sheet'], ['pl', 'Profit & Loss'], ['defects', 'Defects']].map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {k === 'defects' && <AlertTriangle size={14} aria-hidden="true" />}{lbl}
            {k === 'defects' && (counts.offTotal || 0) > 0 ? <span className="rounded-full bg-danger/15 px-1.5 text-xs font-bold text-danger">{counts.offTotal}</span> : null}
          </button>
        ))}
      </div>

      <PageSection title={tab === 'defects' ? `Defect Register — ${branch} · ${period}` : `${branch} · ${period}`}
        subtitle={tab === 'defects' ? 'Every off ledger drilled to its voucher defects — click a row to see the vouchers.' : 'Left: ERP (live) · Middle: Tally (upload) · Right: difference. Click an off ledger to drill its vouchers.'}>
        {tab === 'defects' ? (
          <DefectRegister data={defectsData} loading={defectsLoading} error={defectsError} onRetry={refetchDefects} cur={cur} onDrill={setDrill} />
        ) : (<>
        {isLoading && <LoadingState label="Computing the tie-out…" />}
        {isError && <ErrorState title="Couldn’t load the tie-out" message="The service didn’t respond. Check the connection and retry." onRetry={() => refetch()} />}
        {empty && (
          <EmptyState title={`No ledgers to tie out for ${branch} · ${period}`}
            hint="Upload the period's Tally Trial Balance and the ERP will put its live numbers next to it."
            action={<Button variant="primary" icon={Upload} onClick={() => setShowImport(true)}>Upload Tally TB</Button>} />
        )}
        {!isLoading && !empty && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 720 }}>
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
                  <th className="px-4 py-2 text-left font-bold">Ledger</th>
                  <th className="px-4 py-2 text-right font-bold">ERP (live)</th>
                  <th className="px-4 py-2 text-right font-bold">Tally (upload)</th>
                  <th className="px-4 py-2 text-right font-bold">Difference</th>
                  <th className="px-4 py-2 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((sec) => (
                  <React.Fragment key={sec.label || 'all'}>
                    {sec.label && <tr><td colSpan={5} className="bg-surface-alt px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">{sec.label}</td></tr>}
                    {byParent(sec.rows).map((g) => (
                      <React.Fragment key={(sec.label || '') + g.parent}>
                        <tr><td colSpan={5} className="bg-navy px-4 py-2 text-xs font-bold uppercase text-white">{g.parent}</td></tr>
                        {g.items.map((r) => {
                          const meta = statusMeta(r.status);
                          const off = r.status !== 'tied';
                          return (
                            <tr key={(sec.label || '') + r.ledger}
                              onClick={off ? () => setDrill(r.ledger) : undefined}
                              className={`border-b border-surface-border ${off ? 'cursor-pointer hover:bg-accent-soft' : 'hover:bg-surface-alt/60'}`}>
                              <td className="px-4 py-2"><span className="block font-semibold text-ink">{r.ledger}</span>
                                {r.code ? <span className="font-mono text-xs text-ink-subtle">{r.code}</span> : null}
                                {off ? <span className="mt-0.5 block text-[10.5px] font-semibold text-accent">▸ drill vouchers</span> : null}</td>
                              <td className={`px-4 py-2 text-right font-mono tabular-nums ${r.erp === null ? 'text-ink-subtle' : ''}`}>{fmt(r.erp, cur)}</td>
                              <td className={`px-4 py-2 text-right font-mono tabular-nums ${r.tally === null ? 'text-ink-subtle' : ''}`}>{fmt(r.tally, cur)}</td>
                              <td className={`px-4 py-2 text-right font-mono tabular-nums font-semibold ${r.diff === 0 ? 'text-ink-subtle' : 'text-danger'}`}>{r.diff === 0 ? '0' : Math.abs(r.diff).toLocaleString(localeOf(cur))}</td>
                              <td className="px-4 py-2 text-right"><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-surface-strong bg-surface-alt font-bold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-ink-muted">{foot.label}</td>
                  {foot.balanced !== undefined ? (
                    <>
                      <td className="px-4 py-3 text-right text-success">Balanced ✓</td>
                      <td className="px-4 py-3 text-right text-success">Balanced ✓</td>
                      <td className="px-4 py-3 text-right text-ink-subtle">0</td>
                      <td className="px-4 py-3 text-right"><Badge tone="success" size="sm" dot>Tied</Badge></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(foot.erp, cur)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(foot.tally, cur)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-danger">{Math.abs(round2(foot.erp - foot.tally)).toLocaleString(localeOf(cur))}</td>
                      <td className="px-4 py-3 text-right"><Badge tone={round2(foot.erp - foot.tally) === 0 ? 'success' : 'danger'} size="sm" dot>{round2(foot.erp - foot.tally) === 0 ? 'Tied' : 'Off'}</Badge></td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        </>)}
      </PageSection>

      {drill && <VoucherDrawer branch={branch} period={period} tier={tier} ledger={drill} cur={cur} onClose={() => setDrill(null)} />}
    </div>
  );
}

// ── Defect Register — classified discrepancies across every off ledger ────────
function DefectRegister({ data, loading, error, onRetry, cur, onDrill }) {
  if (loading) return <LoadingState label="Scanning off ledgers for defects…" />;
  if (error) return <ErrorState title="Couldn’t load the Defect Register" message="The service didn’t respond." onRetry={onRetry} />;
  const defects = data?.defects || [];
  const byType = data?.summary?.byType || {};
  if (!defects.length) {
    return <EmptyState title="No defects" hint="Every off ledger's vouchers reconcile — or there are no off ledgers this period." />;
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(byType).map(([type, n]) => {
          const m = defectMeta(type);
          return <span key={type} className={`rounded-full px-3 py-1 text-xs font-semibold ${m.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-warning'}`}>{m.label}: {n}</span>;
        })}
        <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted">{data.offLedgers} off ledgers</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 640 }}>
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
              <th className="px-4 py-2 text-left font-bold">Ledger</th>
              <th className="px-4 py-2 text-left font-bold">Voucher</th>
              <th className="px-4 py-2 text-right font-bold">Amount</th>
              <th className="px-4 py-2 text-right font-bold">Defect</th>
            </tr>
          </thead>
          <tbody>
            {defects.map((d, i) => {
              const m = defectMeta(d.type);
              return (
                <tr key={i} onClick={() => onDrill(d.ledger)} className="cursor-pointer border-b border-surface-border hover:bg-accent-soft">
                  <td className="px-4 py-2 font-semibold text-ink">{d.ledger}</td>
                  <td className="px-4 py-2"><span className="block text-ink">{d.desc || '—'}</span>
                    <span className="font-mono text-xs text-ink-subtle">{[d.date, d.ref].filter(Boolean).join(' · ') || '—'}</span></td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(d.amount, cur)}</td>
                  <td className="px-4 py-2 text-right"><Badge tone={m.tone} size="sm" dot>{m.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = 'ink', small }) {
  const cls = { ink: 'text-ink', success: 'text-success', danger: 'text-danger', warning: 'text-warning', muted: 'text-ink-subtle' }[tone] || 'text-ink';
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-3 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${cls} ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
    </div>
  );
}
