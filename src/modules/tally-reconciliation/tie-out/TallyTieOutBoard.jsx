import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, RefreshCcw, AlertTriangle, BookOpenCheck, FileUp, Trash2 } from 'lucide-react';
import { getTieOut, getPeriods, importTB, getDefects, importDayBook, getDayBookStatus, getInception, clearTB, clearDayBook, getModuleBreakdown } from '../api';
import { useCockpitFocus } from '../../../store/cockpitFocus';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState, Select } from '../../../shell/primitives';
import { VoucherDrawer } from './VoucherDrawer';
import { CertifyPanel } from './CertifyPanel';
import { parseTBFile, parseDayBookFile } from '../tallyFileParse';
import { BRANCHES, AFRICA, CUR, localeOf, round2, branchCodeOf, fmt, statusOf, statusMeta, defectMeta, reasonLabel, isCentralRole } from '../format';

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

// Human label for a period KEY (the key itself stays the machine value sent to the
// API): month 'YYYY-MM' → 'Sep 25' (matching the app-wide month:'short' format);
// FY2026-27 → 'FY 2026-27'; CY2026 → 'CY 2026'. Unknown shapes pass through.
function periodLabel(p) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(p || ''));
  if (m) return `${new Date(+m[1], +m[2] - 1, 1).toLocaleString('en', { month: 'short' })} ${m[1].slice(-2)}`;
  if (/^FY/.test(p)) return String(p).replace(/^FY/, 'FY ');
  if (/^CY/.test(p)) return String(p).replace(/^CY/, 'CY ');
  return String(p || '');
}

// Profit / (Loss) shown the ACCOUNTING way: a profit is plain, a LOSS is in
// parentheses. `np` is the TRUE net profit (income − expense; + = profit), NOT a
// Dr/Cr-signed balance — so a loss never reads as a positive "Dr" figure (the whole
// point of this line's confusion). Pair with plTone() for green-profit / red-loss.
function plText(np, cur) {
  const n = round2(np);
  if (!n) return '0';
  const s = Math.abs(n).toLocaleString(localeOf(cur), { maximumFractionDigits: 2 });
  return n > 0 ? s : `(${s})`;
}
const plTone = (np) => (round2(np) > 0 ? 'text-success' : round2(np) < 0 ? 'text-danger' : 'text-ink-subtle');

// The selectable months, newest→oldest, from the books' inception month to the
// current month. `fromISO` is the earliest posted date ('YYYY-MM-DD'); when it's
// unknown we still offer a sensible 24-month window so the picker is never empty.
function monthOptionsFrom(fromISO) {
  const now = new Date(); const cy = now.getFullYear(); const cm = now.getMonth() + 1;
  let sy = cy; let sm = cm; let span = 24;
  if (fromISO && /^\d{4}-\d{2}/.test(fromISO)) { sy = +fromISO.slice(0, 4); sm = +fromISO.slice(5, 7); span = 600; }
  else { sy = cy - 1; sm = cm; } // no inception yet → last ~24 months
  const out = []; let y = cy; let m = cm;
  while ((y > sy || (y === sy && m >= sm)) && out.length < span) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1; if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}
// The selectable years, newest→oldest, from inception to the current year. Africa
// branches run the Calendar Year (CY); everyone else the Apr–Mar Financial Year (FY).
function yearOptionsFrom(fromISO, branch) {
  const now = new Date(); const cy = now.getFullYear(); const cm = now.getMonth() + 1;
  const sy = fromISO && /^\d{4}/.test(fromISO) ? +fromISO.slice(0, 4) : cy - 1;
  const sm = fromISO && /^\d{4}-\d{2}/.test(fromISO) ? +fromISO.slice(5, 7) : 1;
  const out = [];
  if (AFRICA.has(branch)) {
    for (let y = cy; y >= sy; y -= 1) out.push(`CY${y}`);
  } else {
    const curFyStart = cm >= 4 ? cy : cy - 1;         // current FY's starting year
    const earliestFyStart = sm >= 4 ? sy : sy - 1;    // a Jan–Mar inception belongs to the prior FY
    for (let ys = curFyStart; ys >= earliestFyStart; ys -= 1) out.push(`FY${ys}-${String((ys + 1) % 100).padStart(2, '0')}`);
  }
  return out;
}

// Group a flat (already-ordered) row list by parent group, preserving order.
function byParent(rows) {
  const m = new Map();
  for (const r of rows) { const k = r.parentGroup || 'Other'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return [...m.entries()].map(([parent, items]) => ({ parent, items }));
}

// Within a parent group, nest by the chart SUB-GROUP (mirrors the ERP CoA) — preserving
// the incoming order. Rows with no sub-group cluster first, directly under the head.
function bySubGroup(items) {
  const m = new Map();
  for (const r of items) { const k = r.subGroup || ''; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return [...m.entries()]
    .sort((a, b) => (a[0] === '' ? -1 : b[0] === '' ? 1 : 0))   // "(direct)" first, then sub-groups in order
    .map(([sub, rows]) => ({ sub, rows }));
}

// The trading heads whose ledgers carry a cost-centre (module) dimension — only these
// rows get the Flight/Hotel/Holiday/Visa drill. A TB has no cost-centre axis on the
// Tally side, so the split is ERP-only (it sums to the row's ERP figure).
const MODULE_HEADS = new Set(['Sales Accounts', 'Purchase Accounts', 'Direct Income', 'Direct Expenses']);
// Income-side trading heads (rest are cost) — labels a ledger slice Sales vs Cost in By-Module view.
const INCOME_HEAD_SET = new Set(['Sales Accounts', 'Direct Income']);

// Parse a pasted Tally Trial Balance: tab/comma columns.
//   3+ cols → Ledger, Closing Dr, Closing Cr   |   2 cols → Ledger, Closing (Cr negative)
// Number parsing understands parentheses (accounting negatives) and a trailing
// Dr/Cr suffix; only EXACT header/total labels are skipped (so real ledgers like
// "Accounts Receivable" or "Total Round-Off" are NOT dropped).
const TB_SKIP = new Set(['ledger', 'ledger name', 'account', 'account name', 'particulars', 'name', 'total', 'grand total', 'opening balance', 'closing balance']);
function numOf(s) {
  let str = String(s || '').trim();
  if (!str) return 0;
  const paren = /^\(.*\)$/.test(str);                 // (9,000) = negative
  const cr = /\bcr\b/i.test(str); const dr = /\bdr\b/i.test(str);
  let n = Number(str.replace(/[()₹$,\s]/g, '').replace(/[a-z]/gi, '')) || 0;
  n = Math.abs(n);
  if (paren || cr) return -n;
  if (dr) return n;
  return Number(String(s).replace(/[₹$,\s]/g, '').replace(/[a-z()]/gi, '')) || 0; // fall back to the raw sign
}
function parseTB(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 2 || !cells[0]) return null;
    const ledger = cells[0];
    if (TB_SKIP.has(ledger.toLowerCase())) return null; // exact header/total labels only
    if (cells.length >= 3) return { ledger, closingDebit: Math.abs(numOf(cells[cells.length - 2])), closingCredit: Math.abs(numOf(cells[cells.length - 1])) };
    return { ledger, closing: numOf(cells[1]) }; // signed (parenthesised / Cr = negative)
  }).filter(Boolean);
}

export function TallyTieOutBoard({ branch: appBranch, currentUser, tier: fixedTier, setRoute }) {
  const tier = fixedTier === 'year' ? 'year' : 'month';
  const appCode = branchCodeOf(appBranch);
  const focus = useCockpitFocus();
  const branch = appCode || (BRANCHES.includes(focus) ? focus : 'BOM');
  const cur = CUR[branch] || '₹';
  const qc = useQueryClient();
  // Tally recon is a central Month/Year control — a non-central role that reaches
  // this by direct URL gets the rule, not the board. Access requires an ACTUAL
  // central role (NOT a page-visibility grant): the whole board is write-oriented
  // (Upload / Accept / Freeze / Sign) and the backend refuses those to non-central
  // roles — a grant would only produce a board where every action 403s.
  const central = isCentralRole(currentUser?.role);

  const [tab, setTab] = useState('tb');
  const [periodSel, setPeriodSel] = useState({});
  const [showImport, setShowImport] = useState(false);   // Trial Balance panel
  const [showDayBook, setShowDayBook] = useState(false);  // Day Book panel
  const [paste, setPaste] = useState('');
  const [tbFile, setTbFile] = useState(null);   // { rows, name, error } — parsed TB file
  const [dbFile, setDbFile] = useState(null);   // { rows, name, error } — parsed Day Book file
  const [parsing, setParsing] = useState('');    // 'tb' | 'db' while a file parses
  const [drill, setDrill] = useState(null); // off ledger being drilled (Phase 2)
  const [onlyFixes, setOnlyFixes] = useState(false); // filter to the "fix in Tally" punch-list
  // Two opt-in, mutually-exclusive re-views of the TB (each remembered per user); default =
  // flat Tally-order table. "Chart of Accounts view" = the ERP CoA tree (group ▸ sub-group ▸
  // ledger + subtotals). "By Module" = the ERP-only cost-centre pivot (Flight/Hotel/…).
  const lsBool = (k) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
  const [coaView, setCoaView] = useState(() => lsBool('tally.coaView'));
  const [moduleView, setModuleView] = useState(() => lsBool('tally.moduleView') && !lsBool('tally.coaView'));
  useEffect(() => { try { localStorage.setItem('tally.coaView', coaView ? '1' : '0'); } catch { /* private mode */ } }, [coaView]);
  useEffect(() => { try { localStorage.setItem('tally.moduleView', moduleView ? '1' : '0'); } catch { /* private mode */ } }, [moduleView]);
  const [modOpen, setModOpen] = useState({});  // ledgerKey → expanded (module drill)
  const [modData, setModData] = useState({});  // ledgerKey → { loading, rows, error }

  const { data: periodsData } = useQuery({ queryKey: ['tally-tieout', 'periods', branch], queryFn: () => getPeriods({ branch }), enabled: central });
  // Earliest posted date for this branch → the selector spans inception..now. Fall
  // back to the COMPANY inception (min across all branches) so a branch with no
  // entries yet (e.g. a not-yet-onboarded Africa branch) still offers the same
  // period range as the books, not an arbitrary window.
  const { data: branchInception } = useQuery({ queryKey: ['tally-tieout', 'inception', branch], queryFn: () => getInception({ branch }), enabled: central });
  const { data: globalInception } = useQuery({ queryKey: ['tally-tieout', 'inception', 'ALL'], queryFn: () => getInception({}), enabled: central });
  const inceptionFrom = branchInception || globalInception;
  const period = periodSel[`${branch}:${tier}`] || defaultPeriod(tier, branch);
  const setPeriod = (p) => setPeriodSel((s) => ({ ...s, [`${branch}:${tier}`]: p }));
  // Module drill: expand a trading ledger to its ERP cost-centre (Flight/Hotel/…) split.
  const modKey = (r) => r.code || r.ledger;
  const toggleModules = async (r) => {
    const key = modKey(r); const willOpen = !modOpen[key];
    setModOpen((s) => ({ ...s, [key]: willOpen }));
    if (willOpen && !modData[key]) {
      setModData((s) => ({ ...s, [key]: { loading: true } }));
      try { const res = await getModuleBreakdown({ branch, period, tier, ledger: r.ledger });
        setModData((s) => ({ ...s, [key]: { loading: false, rows: res?.rows || [] } })); }
      catch { setModData((s) => ({ ...s, [key]: { loading: false, error: true } })); }
    }
  };
  // The Certification Register / Report hand a period to this board via sessionStorage
  // ("Open in Tie-Out"). Consume it ONLY when this board's branch+tier match — the
  // cockpit focus hydrates lazily, so the first mount can carry a transient branch;
  // leaving a mismatch in place lets the re-run (after focus resolves) pick it up. A
  // malformed value is cleared immediately so it can't loop.
  useEffect(() => {
    let o = null;
    try {
      const raw = sessionStorage.getItem('tally-open-period');
      if (!raw) return;
      try { o = JSON.parse(raw); } catch { sessionStorage.removeItem('tally-open-period'); return; }
    } catch { return; }
    if (o && o.branch === branch && o.tier === tier && o.period) {
      try { sessionStorage.removeItem('tally-open-period'); } catch { /* ignore */ }
      setPeriod(o.period);
    }
  }, [branch, tier]); // eslint-disable-line react-hooks/exhaustive-deps
  const periodOptions = useMemo(() => {
    const current = defaultPeriod(tier, branch);
    // How many Tally ledgers are uploaded per period + its certificate status, so
    // the selector shows at a glance which months are certified (🔒).
    const uploaded = new Map(); const certOf = new Map();
    (periodsData || []).filter((p) => p.tier === tier).forEach((p) => {
      uploaded.set(p.period, p.ledgers);
      if (p.certStatus && p.certStatus !== 'none') certOf.set(p.period, p.certStatus);
    });
    // The full range from the books' inception to now, PLUS the current period and
    // any uploaded period that falls outside the range (e.g. a stray future upload).
    const base = tier === 'year' ? yearOptionsFrom(inceptionFrom, branch) : monthOptionsFrom(inceptionFrom);
    const seen = new Set(); const order = [];
    const add = (p) => { if (p && !seen.has(p)) { seen.add(p); order.push(p); } };
    add(current); base.forEach(add);
    [...uploaded.keys()].sort().reverse().forEach(add);
    order.sort().reverse(); // newest first (string-sortable within a tier)
    const CERT_MARK = { locked: ' · 🔒 Certified', signed: ' · ✍ signing', reconciled: ' · ✓ ready' };
    return order.map((value) => {
      const lbl = periodLabel(value);
      const base2 = uploaded.has(value) ? `${lbl} · ${uploaded.get(value)} ledgers` : (value === current ? `${lbl} · current` : lbl);
      return { value, label: base2 + (CERT_MARK[certOf.get(value)] || '') };
    });
  }, [periodsData, inceptionFrom, tier, period, branch]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'board', branch, tier, period],
    queryFn: () => getTieOut({ branch, period, tier }),
    enabled: central,
  });
  const rows = data?.rows || [];
  const counts = data?.counts || {};
  const imported = data?.imported || {};
  // Group subtotal rows a grouped upload carried that DIDN'T reconcile to their ledgers —
  // kept for review (not ledgers, never in the gate). Surfaced as a banner.
  const reviewGroups = data?.reviewGroups || [];
  // A certified (signed/locked) period is frozen — re-upload/Clear are blocked by the
  // BE until re-opened; gate the upload controls proactively (not just via the 409).
  const periodCertified = data?.certStatus === 'signed' || data?.certStatus === 'locked';
  // One authoritative "off" count (accepted variances already excluded on the BE),
  // used by the KPI, the Defects tab badge AND the certificate gate — never diverge.
  const offTotal = counts.offTotal ?? ((counts.off || 0) + (counts.onlyErp || 0) + (counts.onlyTally || 0));
  // Name/group corrections owed in Tally (the ledger's amount may already tie, but by
  // policy its Tally name/group must match ERP before certifying). `blocking` = the
  // single "must fix in Tally before sign-off" tally = amount gaps + name/group fixes.
  const fixTotal = counts.fixTotal ?? ((counts.nameMismatch || 0) + (counts.groupMismatch || 0));
  const blocking = counts.blocking ?? (offTotal + fixTotal);
  // Once nothing's left to fix (a corrected re-upload cleared the punch-list), drop the
  // filter so the board never sits on an empty view with its toggle already hidden.
  useEffect(() => { if (!blocking && onlyFixes) setOnlyFixes(false); }, [blocking, onlyFixes]);

  // Defect Register — lazily loaded (the per-off-ledger voucher scan is heavier).
  const { data: defectsData, isLoading: defectsLoading, isError: defectsError, refetch: refetchDefects } = useQuery({
    queryKey: ['tally-tieout', 'defects', branch, tier, period],
    queryFn: () => getDefects({ branch, period, tier }),
    enabled: central && tab === 'defects',
  });
  // How much Day Book (vouchers) is loaded for this period — the drill needs it.
  const { data: dbStatus } = useQuery({
    queryKey: ['tally-tieout', 'daybook', branch, tier, period],
    queryFn: () => getDayBookStatus({ branch, period, tier }),
    enabled: central,
  });
  // TB and Day Book are two independent uploads from Tally. Warn when they've drifted
  // out of sync so a correction re-uploads BOTH from the same export: (a) TB present
  // but Day Book missing → the drill/Defects will be empty; (b) both present but
  // uploaded > 24h apart → likely different exports.
  const dbSync = useMemo(() => {
    if (!imported.count) return null; // nothing uploaded yet — the onboarding copy covers it
    if (!(dbStatus?.vouchers > 0)) return { tone: 'warn', msg: 'A Tally TB is uploaded but no Day Book — the voucher drill and Defect Register will be empty. Upload the Day Book for this period too.' };
    if (imported.at && dbStatus?.at) {
      const gapH = Math.abs(new Date(imported.at) - new Date(dbStatus.at)) / 3.6e6;
      if (gapH > 24) return { tone: 'info', msg: `The TB and Day Book were uploaded ${Math.round(gapH / 24)} day(s) apart — re-upload BOTH from the same Tally export after any correction so they stay consistent.` };
    }
    return null;
  }, [imported.count, imported.at, dbStatus?.vouchers, dbStatus?.at]);

  // TB import source: once a file is PICKED it is authoritative — even if it parsed
  // to 0 rows / errored (→ button stays disabled), so we never silently upload the
  // leftover paste. Paste is used only when no file has been picked.
  const tbRows = () => (tbFile ? tbFile.rows : parseTB(paste));
  const imp = useMutation({
    mutationFn: () => importTB({ branch, period, tier, rows: tbRows() }),
    onSuccess: () => { setPaste(''); setTbFile(null); qc.invalidateQueries({ queryKey: ['tally-tieout'] }); },
  });
  // Full Day Book import — the whole book, all ledgers, from one file.
  const impDB = useMutation({
    mutationFn: () => importDayBook({ branch, period, tier, rows: dbFile ? dbFile.rows : [] }),
    onSuccess: () => { setDbFile(null); qc.invalidateQueries({ queryKey: ['tally-tieout'] }); },
  });
  // Clear Upload — wipe THIS month's uploaded Tally data (TB + full Day Book) for
  // this branch only. Both deletes are period-scoped and the BE refuses a certified
  // period, so a signed month is never touched. Runs both regardless of which is
  // present (a missing side just deletes 0 rows).
  const clr = useMutation({
    mutationFn: () => Promise.all([
      clearTB({ branch, period, tier }),
      clearDayBook({ branch, period, tier }),
    ]),
    // Settle (not just success): if one leg fails after the other cleared, refresh
    // anyway so the board reflects the TRUE state rather than stale counts.
    onSettled: () => qc.invalidateQueries({ queryKey: ['tally-tieout'] }),
  });
  const pickFile = async (file, kind) => {
    if (!file) return;
    setParsing(kind);
    try { const r = await (kind === 'db' ? parseDayBookFile(file) : parseTBFile(file)); (kind === 'db' ? setDbFile : setTbFile)({ rows: r.rows || [], error: r.error || '', note: r.note || '', name: file.name }); }
    catch (e) { (kind === 'db' ? setDbFile : setTbFile)({ rows: [], error: e.message, name: file.name }); }
    finally { setParsing(''); }
  };

  const sections = useMemo(() => {
    if (tab === 'tb') return [{ label: null, rows }];
    if (tab === 'pl') return [
      { label: 'Income', rows: rows.filter((r) => r.nature === 'income') },
      { label: 'Expenses', rows: rows.filter((r) => r.nature === 'expense') },
    ];
    // Net Profit belongs to Capital on the BS — inject it ONLY when the P&L has rows
    // (never a spurious "Profit · 0" line on a branch with no P&L activity).
    const hasPL = rows.some((r) => r.statement === 'PL');
    const np = { ledger: 'Profit / (Loss) for the period', code: '(from P&L)', parentGroup: 'Capital Account', synthetic: true,
      // erp/tally stay Dr/Cr-signed (profit = Cr −, loss = Dr +) so the Balance Sheet
      // total still nets to zero; plErp/plTally carry the TRUE profit (+ = profit) for
      // a clear display — a loss shows as "(1,40,700)", never a positive "1,40,700 Dr".
      erp: round2(-(counts.netProfitErp || 0)), tally: round2(-(counts.netProfitTally || 0)),
      plErp: round2(counts.netProfitErp || 0), plTally: round2(counts.netProfitTally || 0) };
    np.diff = round2((np.plErp || 0) - (np.plTally || 0)); np.status = statusOf(np.erp, np.tally);
    return [
      { label: 'Liabilities & Capital', rows: [...rows.filter((r) => r.nature === 'liability'), ...(hasPL ? [np] : [])] },
      { label: 'Assets', rows: rows.filter((r) => r.nature === 'asset') },
    ];
  }, [tab, rows, counts]);

  // The "fix in Tally" punch-list view: keep only rows the reviewer must act on
  // (amount off, one-sided, or a name/group that still differs from ERP). The FOOTER
  // totals stay on the full `sections` so a filtered view never distorts the balance.
  const viewSections = useMemo(() => ((onlyFixes && blocking > 0)
    ? sections.map((s) => ({ ...s, rows: s.rows.filter((r) => r.blocking) })).filter((s) => s.rows.length)
    : sections), [sections, onlyFixes, blocking]);

  const foot = useMemo(() => {
    // TB self-balances per side (Dr = Cr). Carry the actual boolean (true / false /
    // undefined) so the footer can show "Balanced ✓" vs "Dr ≠ Cr" — never a false
    // all-clear when a side doesn't balance.
    if (tab === 'tb') return { label: 'Trial Balance — Dr = Cr', type: 'balance', erpBalanced: data?.erpTotals?.balanced, tallyBalanced: data?.tallyTotals?.balanced };
    if (tab === 'pl') return { label: 'Net Profit / (Loss)', type: 'pl', erp: counts.netProfitErp || 0, tally: counts.netProfitTally || 0 };
    const shown = sections.flatMap((s) => s.rows);
    const se = round2(shown.reduce((a, r) => a + (r.erp || 0), 0));
    const st = round2(shown.reduce((a, r) => a + (r.tally || 0), 0));
    return { label: 'Balance Sheet total', type: 'amount', erp: se, tally: st };
  }, [tab, sections, counts, data]);

  const empty = !isLoading && !isError && rows.length === 0;
  const title = tier === 'year' ? 'Yearly Tie-Out' : 'Monthly Tie-Out';

  // ── Shared leaf-ledger row — used by BOTH the flat table and the CoA tree, so the
  // module drill, rename/regroup hints and drill-on-click behave identically in both. ──
  const renderLedgerRow = (r, keyStr, indent = 16) => {
    const fixNeeded = r.needsRename || r.needsRegroup;
    const meta = (fixNeeded && r.status === 'tied') ? { tone: 'warning', label: 'Fix in Tally' } : statusMeta(r.status);
    const off = r.status !== 'tied' && !r.synthetic;
    const acc = r.status === 'accepted';
    const drill = () => setDrill(r);
    const canModule = r.statement === 'PL' && r.erp != null && !r.synthetic && MODULE_HEADS.has(r.parentGroup) && r.hasModules;
    const mKey = modKey(r); const mShown = canModule && modOpen[mKey]; const mInfo = modData[mKey];
    return (
      <React.Fragment key={keyStr}>
        <tr
          onClick={off ? drill : undefined}
          onKeyDown={off ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(); } } : undefined}
          role={off ? 'button' : undefined} tabIndex={off ? 0 : undefined}
          aria-label={off ? `Drill ${r.ledger} vouchers` : undefined}
          className={`border-b border-surface-border ${off ? 'cursor-pointer hover:bg-accent-soft focus:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent' : 'hover:bg-surface-alt/60'}`}>
          <td className="px-4 py-2" style={{ paddingLeft: indent }}><span className="block font-semibold text-ink">{r.ledger}
            {r.nameMatch === true ? <span className="ml-1 align-middle text-success" title="Tally name matches ERP">✓</span> : null}
            {r.interBranch ? <span className="ml-1.5 align-middle rounded-full bg-info/10 px-1.5 text-[10px] font-semibold text-info">IB</span> : null}</span>
            {r.code ? <span className="font-mono text-xs text-ink-subtle">{r.code}</span> : null}
            {r.nameMatch === false ? <span className="mt-0.5 block text-[10.5px] font-semibold text-warning" title="Rename this ledger in Tally to match ERP">✎ Tally: “{r.tallyLedger}” → rename to “{r.erpLedger}”</span> : null}
            {r.groupMatch === false ? <span className="mt-0.5 block text-[10.5px] font-semibold text-warning" title="Regroup this ledger in Tally to match ERP">⚠ Group in Tally: “{r.tallyGroup}” → should be “{r.parentGroup}”</span> : null}
            {r.suggest ? <span className="mt-0.5 block text-[10.5px] font-semibold text-info" title="Closest ERP ledger — if it's the same account, rename it in Tally to match">Did you mean ERP “{r.suggest.ledger}”? — rename in Tally to match</span> : null}
            {acc ? <span className="mt-0.5 block text-[10.5px] font-semibold text-info">✓ accepted · {reasonLabel(r.acceptedReason)}
              {r.acceptanceStale ? <span className="ml-1 rounded-full bg-warning/15 px-1.5 font-bold text-warning" title={`Accepted for ${fmt(r.acceptedAmount, cur)}, now ${fmt(r.diff, cur)} — re-review`}>⚠ changed</span> : null}</span>
              : off ? <span className="mt-0.5 block text-[10.5px] font-semibold text-accent">▸ drill vouchers</span> : null}
            {canModule ? <button type="button" onClick={(e) => { e.stopPropagation(); toggleModules(r); }} className="mt-0.5 block text-[10.5px] font-semibold text-accent hover:underline" title="ERP cost-centre split (Flight/Hotel/Holiday/Visa…). Tally has no cost-centre axis, so this is ERP-only.">{mShown ? '▾' : '▸'} modules (ERP split)</button> : null}</td>
          <td className={`px-4 py-2 text-right font-mono tabular-nums ${r.synthetic ? plTone(r.plErp) : r.erp === null ? 'text-ink-subtle' : ''}`}>{r.synthetic ? plText(r.plErp, cur) : fmt(r.erp, cur)}</td>
          <td className={`px-4 py-2 text-right font-mono tabular-nums ${r.synthetic ? plTone(r.plTally) : r.tally === null ? 'text-ink-subtle' : ''}`}>{r.synthetic ? plText(r.plTally, cur) : fmt(r.tally, cur)}</td>
          <td className={`px-4 py-2 text-right font-mono tabular-nums font-semibold ${r.diff === 0 ? 'text-ink-subtle' : acc ? 'text-info' : 'text-danger'}`} title={r.diff > 0 ? 'ERP higher' : r.diff < 0 ? 'Tally higher' : ''}>{r.diff === 0 ? '0' : `${r.diff > 0 ? '+' : '−'}${Math.abs(r.diff).toLocaleString(localeOf(cur))}`}</td>
          <td className="px-4 py-2 text-right"><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
        </tr>
        {mShown ? (mInfo?.loading
          ? <tr><td colSpan={5} className="px-4 py-1 pl-10 text-[11px] text-ink-subtle">Loading module split…</td></tr>
          : mInfo?.error
            ? <tr><td colSpan={5} className="px-4 py-1 pl-10 text-[11px] text-danger">Couldn’t load the module split.</td></tr>
            : (mInfo?.rows || []).length === 0
              ? <tr><td colSpan={5} className="px-4 py-1 pl-10 text-[11px] text-ink-subtle">No cost-centre split on this ledger.</td></tr>
              : mInfo.rows.map((mr, i) => (
                <tr key={mKey + ':mod:' + i} className="border-b border-surface-border/40 bg-surface-alt/30">
                  <td className="px-4 py-1 pl-10 text-[11.5px] text-ink-muted">↳ {mr.module}</td>
                  <td className="px-4 py-1 text-right font-mono tabular-nums text-[11.5px] text-ink-muted">{fmt(mr.erp, cur)}</td>
                  <td className="px-4 py-1 text-right text-[11px] text-ink-subtle" title="A Tally trial balance has no cost-centre axis — this split is ERP-only.">— ⓘ</td>
                  <td className="px-4 py-1" />
                  <td className="px-4 py-1" />
                </tr>
              ))) : null}
      </React.Fragment>
    );
  };

  // ── CoA tree: group/sub-group SUBTOTAL rows (Σ ERP · Σ Tally · diff · tie badge) with
  // their leaf ledgers beneath, fully expanded and indented by depth. ──
  const renderTreeNodes = (nodes, depth = 0) => (nodes || []).map((n) => (
    <React.Fragment key={'coa|' + depth + '|' + (n.id || n.name)}>
      <tr className={`border-b border-surface-border ${depth === 0 ? 'bg-navy' : 'bg-surface-alt/60'}`}>
        <td className={`py-1.5 pr-4 font-bold ${depth === 0 ? 'text-[11px] uppercase tracking-wider text-white' : 'text-[12px] text-ink'}`} style={{ paddingLeft: 16 + depth * 16 }}>{depth > 0 ? '▸ ' : ''}{n.name}</td>
        <td className={`px-4 py-1.5 text-right font-mono tabular-nums font-semibold ${depth === 0 ? 'text-white' : 'text-ink'}`}>{fmt(n.erp, cur)}</td>
        <td className={`px-4 py-1.5 text-right font-mono tabular-nums font-semibold ${depth === 0 ? 'text-white' : 'text-ink'}`}>{fmt(n.tally, cur)}</td>
        <td className={`px-4 py-1.5 text-right font-mono tabular-nums font-semibold ${n.diff === 0 ? (depth === 0 ? 'text-white/70' : 'text-ink-subtle') : 'text-danger'}`}>{n.diff === 0 ? '0' : `${n.diff > 0 ? '+' : '−'}${Math.abs(n.diff).toLocaleString(localeOf(cur))}`}</td>
        <td className="px-4 py-1.5 text-right"><Badge tone={n.status === 'tied' ? 'success' : 'danger'} size="sm" dot>{n.status === 'tied' ? 'Tied' : 'Off'}</Badge></td>
      </tr>
      {(n.rows || []).map((r) => renderLedgerRow(r, 'coa|' + (n.id || n.name) + '|' + (r.code || r.ledger), 16 + (depth + 1) * 16))}
      {renderTreeNodes(n.children, depth + 1)}
    </React.Fragment>
  ));

  const showTree = coaView && tab === 'tb' && Array.isArray(data?.tree) && data.tree.length > 0;

  // ── "By Module" (cost-centre) pivot — now ERP↔Tally. A module header (Σ ERP · Σ Tally · diff)
  // with its trading-ledger slices beneath. A single-module ledger carries its Tally straight
  // across (real diff); a ledger split across ≥2 cost centres can't attribute its one Tally figure
  // to a module, so it shows "— at ledger" (reconcile By CoA); an ERP posting with no Tally match
  // shows "— not in Tally". Each module splits into a Sales side then a Purchase/COGS side, each
  // with its own subtotal ("Sales / Purchase" on TB, "Sales (income) / Less: COGS" on P&L); the P&L
  // header also carries a per-module GP tie-out. The trailing bucket holds every ledger with no cost
  // centre (BS + non-trading on TB; indirect income/expense on P&L). ──
  const gpText = (n) => (n === 0 || n == null ? '0' : `${n > 0 ? '' : '−'}${Math.abs(n).toLocaleString(localeOf(cur))}`);
  const diffCell = (n) => (n == null ? '—' : n === 0 ? '0' : `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString(localeOf(cur))}`);
  const modBadge = (st) => st === 'tied' ? { tone: 'success', label: 'Tied' }
    : st === 'off' ? { tone: 'danger', label: 'Off' }
    : st === 'partial' ? { tone: 'warning', label: 'Partial' }
    : st === 'shared' ? { tone: 'info', label: 'At ledger' }
    : { tone: 'warning', label: 'Not in Tally' };
  // "N not in Tally · M at ledger" — makes a module header's Tally/Δ composition transparent, so a
  // reviewer sees WHY a Δ is large (unattributed ledgers, not necessarily a real amount gap).
  const modNote = (m) => {
    const bits = [];
    if (m.unmatched) bits.push(`${m.unmatched} not in Tally`);
    if (m.shared) bits.push(`${m.shared} at ledger`);
    return bits.length ? ' · ' + bits.join(' · ') : '';
  };
  // Tally cell for a module slice: the real figure, or a typed "why it's absent" note.
  const sliceTallyCell = (r) => (r.tally != null
    ? <span className="font-mono tabular-nums">{fmt(r.tally, cur)}</span>
    : r.shared
      ? <span className="text-[11px] text-info" title="This ledger posts to more than one cost centre — Tally holds one figure for it, reconciled at ledger level (By CoA), not split by module.">— at ledger</span>
      : <span className="text-[11px] text-warning" title="ERP has a posting here but no matching Tally ledger — rename / regroup it in Tally to match.">— not in Tally</span>);
  // Slice → its FULL tie-out ledger row, so a click opens the SAME voucher drawer the flat/CoA rows
  // do (voucher-by-voucher ERP ↔ Tally ↔ match). Matched by ledger name (canonical, unique per
  // branch). Drill-ability is gated on the FULL row's status — exactly like the flat view
  // (off = status !== 'tied') — so a multi-cost-centre ledger that reconciles at ledger level
  // ('tied' full row) is NOT drillable and can't open accept-variance, even though its per-module
  // slice reads 'shared'/'off'.
  const nkFE = (s) => String(s || '').trim().toLowerCase();
  const renderModuleSlice = (r, keyStr) => {
    const meta = modBadge(r.status);
    const full = rows.find((x) => nkFE(x.ledger) === nkFE(r.ledger));
    const canDrill = !!full && full.status !== 'tied' && !full.synthetic;   // verify only where the ledger is genuinely off
    const drill = () => { if (full) setDrill(full); };
    return (
      <tr key={keyStr}
        onClick={canDrill ? drill : undefined}
        onKeyDown={canDrill ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(); } } : undefined}
        role={canDrill ? 'button' : undefined} tabIndex={canDrill ? 0 : undefined}
        aria-label={canDrill ? `Drill ${r.ledger} vouchers` : undefined}
        className={`border-b border-surface-border/60 ${canDrill ? 'cursor-pointer hover:bg-accent-soft focus:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent' : 'hover:bg-surface-alt/60'}`}>
        <td className="px-4 py-1.5" style={{ paddingLeft: 32 }}><span className="block font-medium text-ink">{r.ledger}</span>
          {r.code ? <span className="font-mono text-[11px] text-ink-subtle">{r.code}</span> : null}
          <span className="ml-1 text-[10.5px] text-ink-subtle">· {INCOME_HEAD_SET.has(r.head) ? 'Sales' : 'Cost'}</span>
          {canDrill ? <span className="mt-0.5 block text-[10.5px] font-semibold text-accent">▸ drill vouchers</span> : null}</td>
        <td className="px-4 py-1.5 text-right font-mono tabular-nums">{fmt(r.erp, cur)}</td>
        <td className="px-4 py-1.5 text-right">{sliceTallyCell(r)}</td>
        <td className={`px-4 py-1.5 text-right font-mono tabular-nums ${r.diff == null || r.diff === 0 ? 'text-ink-subtle' : 'text-danger'}`}>{diffCell(r.diff)}</td>
        <td className="px-4 py-1.5 text-right"><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
      </tr>
    );
  };
  const renderModuleNodes = (mt, { pl = false } = {}) => {
    if (!mt || !Array.isArray(mt.modules)) return null;
    // Bucket = the EXACT complement of the module pivot. On P&L keep only P&L rows with no cost
    // centre (indirect income/expense); on TB keep everything non-trading (BS + indirect + any
    // Tally-only trading ledger with erp == null, which has no ERP slice to pivot — without the erp
    // check a Sales/Purchase ledger in Tally but not ERP would vanish, though it's a real gap).
    const nonModule = rows.filter((r) => !(MODULE_HEADS.has(r.parentGroup) && r.erp != null) && (!pl || r.statement === 'PL'));
    const bucketLabel = pl ? 'Other P&L · no cost centre (indirect income & expense)' : 'Balance Sheet & non-trading · no cost centre';
    // The bucket, grouped as the ERP Chart of Accounts (group ▸ sub-group ▸ ledger with per-group
    // subtotals) — built by the BE from the SAME non-module rows. Falls back to the flat list if an
    // older BE hasn't shipped the tree yet (deploy skew).
    const bucket = pl ? mt.bucketTreePL : mt.bucketTree;
    const groupedBucket = Array.isArray(bucket) && bucket.length > 0;
    // Each module splits into Sales then Purchase (cost), each carrying its own Σ ERP·Tally·Δ
    // subtotal. TB uses plain "Sales / Purchase"; the P&L tab keeps its income-statement wording.
    const salesLabel = pl ? 'Sales (income)' : 'Sales';
    const cogsLabel = pl ? 'Less: COGS (cost)' : 'Purchase';
    const modHead = (m) => {
      const meta = modBadge(m.status || 'unmatched');
      const gpTie = pl && m.gpTally != null;
      return (
        <tr className="border-b border-surface-border bg-navy">
          <td className="py-2 pl-4 pr-4"><span className="block text-[11px] font-bold uppercase tracking-wider text-white">{m.label}</span>
            <span className="text-[10.5px] font-semibold text-white/70">GP {gpText(m.gp)}{gpTie ? ` · Tally ${gpText(m.gpTally)} · Δ ${diffCell(m.gpDiff)}` : ''} · {cur}{modNote(m)}</span></td>
          <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-white">{fmt(m.erp, cur)}</td>
          <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-white">{m.tally == null ? <span className="text-[11px] font-semibold text-white/70" title="No attributable Tally in this module — its ledgers are shared across cost centres or absent from Tally.">—</span> : fmt(m.tally, cur)}</td>
          <td className={`px-4 py-2 text-right font-mono tabular-nums font-semibold ${m.diff == null || m.diff === 0 ? 'text-white/70' : 'text-danger'}`}
            title={(m.unmatched || m.shared) ? 'Δ = ERP − Tally. This module also has ledgers not in Tally / shared across cost centres (listed below) — the tie/untie status is judged on the ledgers present in both books.' : undefined}>{diffCell(m.diff)}</td>
          <td className="px-4 py-2 text-right"><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
        </tr>
      );
    };
    const subTotal = (label, erp, tally) => {
      const d = tally == null ? null : round2(erp - tally);   // null when this subtotal has no matched slice
      return (
        <tr className="border-b border-surface-border bg-surface-alt/70">
          <td className="px-4 py-1 pl-8 text-[11px] font-bold uppercase tracking-wide text-ink-muted">{label}</td>
          <td className="px-4 py-1 text-right font-mono tabular-nums font-semibold text-ink">{fmt(erp, cur)}</td>
          <td className="px-4 py-1 text-right font-mono tabular-nums font-semibold text-ink">{tally == null ? '—' : fmt(tally, cur)}</td>
          <td className={`px-4 py-1 text-right font-mono tabular-nums ${d == null || d === 0 ? 'text-ink-subtle' : 'text-danger'}`}>{diffCell(d)}</td>
          <td className="px-4 py-1" />
        </tr>
      );
    };
    return (
      <>
        {mt.modules.length === 0 && (
          <tr><td colSpan={5} className="px-4 py-2 text-[11.5px] text-ink-subtle">No cost-centre (module) postings in this period — every ledger below is non-trading.</td></tr>
        )}
        {mt.modules.map((m) => {
          const inc = m.rows.filter((r) => INCOME_HEAD_SET.has(r.head));
          const cost = m.rows.filter((r) => !INCOME_HEAD_SET.has(r.head));
          const kp = 'mod|' + (m.code || 'unspec');
          return (
            <React.Fragment key={kp}>
              {modHead(m)}
              {/* Sales side, then Purchase side — each with a subtotal; a side with no ledgers is skipped. */}
              {inc.length > 0 && subTotal(salesLabel, m.sales, m.salesTally)}
              {inc.map((r) => renderModuleSlice(r, kp + '|s|' + (r.code || r.ledger)))}
              {cost.length > 0 && subTotal(cogsLabel, m.cogs, m.cogsTally)}
              {cost.map((r) => renderModuleSlice(r, kp + '|c|' + (r.code || r.ledger)))}
            </React.Fragment>
          );
        })}
        {(groupedBucket || nonModule.length > 0) && (
          <>
            <tr><td colSpan={5} className="bg-surface-alt px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">{bucketLabel}</td></tr>
            {groupedBucket
              ? renderTreeNodes(bucket, 0)                                        /* group ▸ sub-group ▸ ledger, per-group Σ ERP·Tally·Δ·tie */
              : nonModule.map((r) => renderLedgerRow(r, `mod-nc|${r.code || r.ledger}`))}
          </>
        )}
      </>
    );
  };

  const showModule = moduleView && (tab === 'tb' || tab === 'pl') && data?.moduleTree && Array.isArray(data.moduleTree.modules);

  // Direct-URL guard: a non-central role gets the rule, not the working board.
  if (!central) {
    return (
      <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8" style={{ maxWidth: 1600 }}>
        <h1 className="kbiz-page-title">Tally Reconciliation · {title}</h1>
        <EmptyState title="Central control"
          hint="The whole-books ERP↔Tally tie-out is worked from TK Group Central by AE / FM / Director / Owner. The Branch Accountant handles the weekly statement cycle." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8" style={{ maxWidth: 1600 }}>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Tally Reconciliation · {title}</h1>
          <p className="text-sm text-ink-muted">ERP live books vs uploaded Tally — every ledger, Balance Sheet &amp; P&amp;L side by side. Branch-wise, never blended.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Upload} disabled={periodCertified} title={periodCertified ? 'This period is certified — re-open the certificate to re-upload' : undefined} onClick={() => { setShowImport((s) => !s); setShowDayBook(false); }}>Upload Tally TB</Button>
          <Button variant="secondary" icon={FileUp} disabled={periodCertified} title={periodCertified ? 'This period is certified — re-open the certificate to re-upload' : undefined} onClick={() => { setShowDayBook((s) => !s); setShowImport(false); }}>Upload Day Book</Button>
          {(imported.count > 0 || dbStatus?.vouchers > 0) && (
            <Button variant="danger" icon={Trash2} loading={clr.isPending}
              disabled={periodCertified}
              title={periodCertified ? 'This period is certified — re-open the certificate to clear' : `Remove the uploaded Tally TB & Day Book for ${branch} · ${periodLabel(period)}`}
              onClick={() => { const n = tier === 'year' ? 'year' : 'month'; if (window.confirm(`Clear the uploaded Tally data for ${branch} · ${periodLabel(period)}?\n\nThis removes only this ${n}'s Trial Balance and Day Book upload — no other ${n} is affected, and your live ERP books are untouched.`)) clr.mutate(); }}>
              Clear Upload
            </Button>
          )}
          {clr.isError && <span className="text-sm text-danger">{clr.error?.message || 'Could not clear this period.'}</span>}
          <Button variant="ghost" icon={RefreshCcw} onClick={() => qc.invalidateQueries({ queryKey: ['tally-tieout'] })}>Refresh</Button>
          <Button variant="ghost" icon={BookOpenCheck} onClick={() => setRoute && setRoute('/tally-reconciliation/guide')}>Guide</Button>
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
        {dbStatus?.vouchers > 0 && (
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent" title="Full Day Book loaded for this period">
            Day Book · {dbStatus.vouchers} vouchers · {dbStatus.ledgers} ledgers
          </span>
        )}
        {periodCertified && (
          <span className="rounded-full bg-navy/10 px-2.5 py-1 text-xs font-semibold text-navy" title="Certified — re-open the certificate to re-upload or Clear">
            🔒 Certified · re-open to change
          </span>
        )}
      </div>

      {/* TB ↔ Day Book out-of-sync notice */}
      {dbSync && (
        <div className={`flex items-start gap-2 rounded-brand border px-4 py-2.5 text-sm ${dbSync.tone === 'warn' ? 'border-warning/40 bg-warning/10 text-ink' : 'border-surface-border bg-surface-muted text-ink-muted'}`} data-testid="db-sync-warning">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <span>{dbSync.msg}</span>
        </div>
      )}

      {/* Grouped-upload subtotals that didn't reconcile to their ledgers — kept for review */}
      {reviewGroups.length > 0 && (
        <div className="flex items-start gap-2 rounded-brand border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-ink" data-testid="group-review-warning">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <span>
            <b>{reviewGroups.length} group subtotal row{reviewGroups.length === 1 ? '' : 's'} didn’t reconcile to {reviewGroups.length === 1 ? 'its' : 'their'} ledgers</b> — check the Tally export.{' '}
            {reviewGroups.slice(0, 4).map((g, i) => (
              <span key={g.ledger}>{i > 0 ? ' · ' : ''}<b>{g.ledger}</b> (upload {fmt(g.amount, cur)} vs ledgers {fmt(g.childSum, cur)})</span>
            ))}{reviewGroups.length > 4 ? ` · +${reviewGroups.length - 4} more` : ''}
          </span>
        </div>
      )}

      {/* Trial Balance import — pick a file (Excel/CSV/XML) OR paste */}
      {showImport && (
        <PageSection title="Upload Tally Trial Balance" subtitle={`The ${branch} · ${periodLabel(period)} Trial Balance from Tally — export it as Excel/CSV (or paste below). Columns: Ledger, Closing Dr, Closing Cr. Add a Group/Parent column (or export the grouped TB) so the tie-out can flag any group that differs from ERP.`}>
          <label className="flex flex-wrap items-center gap-3 rounded-brand border border-dashed border-surface-border bg-surface-muted p-3">
            <FileUp size={18} className="text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">Choose Trial Balance file</span>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,.xml,.html,.htm" data-testid="tb-file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              onChange={(e) => pickFile(e.target.files?.[0], 'tb')} className="text-xs text-ink-muted" />
            <span className="text-xs text-ink-subtle">Excel, CSV, TSV or Tally XML/HTML export.</span>
          </label>
          {parsing === 'tb' && <p className="mt-2 text-sm text-ink-muted">Reading file…</p>}
          {tbFile && (tbFile.error
            ? <p className="mt-2 text-sm text-danger">Couldn’t read {tbFile.name}: {tbFile.error}</p>
            : <p className="mt-2 text-sm text-success">{tbFile.name} — {tbFile.rows.length} ledger rows ready.</p>)}
          {tbFile && !tbFile.error && tbFile.note && <p className="mt-1 text-xs text-warning">{tbFile.note}</p>}
          <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-ink-subtle">…or paste</p>
          <textarea value={paste} onChange={(e) => { setPaste(e.target.value); if (tbFile) setTbFile(null); }} rows={6}
            placeholder={'ICICI Bank A/c\t1245300\t0\nHDFC Bank A/c\t805000\t0\nBSP / IATA\t0\t9000'}
            className="w-full rounded-brand border border-surface-border bg-surface p-3 font-mono text-xs text-ink" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button variant="primary" loading={imp.isPending} disabled={tbRows().length === 0} onClick={() => imp.mutate()}>
              Upload ({tbRows().length} rows)
            </Button>
            {imp.isError && <span className="text-sm text-danger">{imp.error?.message}</span>}
            {imp.isSuccess && <span className="text-sm text-success">Uploaded {imp.data?.inserted ?? 0} ledgers{imp.data?.skippedGroups ? ` · skipped ${imp.data.skippedGroups} group row${imp.data.skippedGroups === 1 ? '' : 's'}` : ''}{imp.data?.reviewGroups?.length ? ` · ⚠ ${imp.data.reviewGroups.length} to review` : ''}.</span>}
            <span className="text-xs text-ink-subtle">Re-uploading replaces this period's Tally TB.</span>
          </div>
        </PageSection>
      )}

      {/* Full Day Book import — one file, every ledger's vouchers for the period */}
      {showDayBook && (
        <PageSection title="Upload Tally Day Book" subtitle={`The whole ${branch} · ${periodLabel(period)} Day Book from Tally — every voucher, every ledger. Export as Excel/CSV (or Tally XML). Columns: Date, Vch No, Ledger, Debit, Credit.`}>
          <label className="flex flex-wrap items-center gap-3 rounded-brand border border-dashed border-surface-border bg-surface-muted p-3">
            <FileUp size={18} className="text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">Choose Day Book file</span>
            <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,.xml,.html,.htm" data-testid="db-file"
              onClick={(e) => { e.currentTarget.value = ''; }}
              onChange={(e) => pickFile(e.target.files?.[0], 'db')} className="text-xs text-ink-muted" />
            <span className="text-xs text-ink-subtle">Excel, CSV, TSV or Tally XML/HTML export.</span>
          </label>
          {parsing === 'db' && <p className="mt-2 text-sm text-ink-muted">Reading file…</p>}
          {dbFile && (dbFile.error
            ? <p className="mt-2 text-sm text-danger">Couldn’t read {dbFile.name}: {dbFile.error}</p>
            : <p className="mt-2 text-sm text-success">{dbFile.name} — {dbFile.rows.length} voucher legs ready.</p>)}
          {dbFile && !dbFile.error && dbFile.note && <p className="mt-1 text-xs text-warning">{dbFile.note}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={FileUp} loading={impDB.isPending} disabled={!dbFile || dbFile.rows.length === 0} onClick={() => impDB.mutate()}>
              Upload Day Book ({dbFile ? dbFile.rows.length : 0} legs)
            </Button>
            {impDB.isError && <span className="text-sm text-danger">{impDB.error?.message}</span>}
            {impDB.isSuccess && <span className="text-sm text-success">Loaded {impDB.data?.inserted ?? 0} voucher legs across {impDB.data?.ledgers ?? 0} ledgers{impDB.data?.signMismatchCount ? ` · ⚠ ${impDB.data.signMismatchCount} sign mismatch${impDB.data.signMismatchCount === 1 ? '' : 'es'}` : ''}{impDB.data?.unbalancedCount ? ` · ⚠ ${impDB.data.unbalancedCount} unbalanced` : ''}.</span>}
            <span className="text-xs text-ink-subtle">Only rows dated within {period} are kept; re-uploading replaces this period's Day Book.</span>
          </div>
          {/* Import guardrails — a sign-flipped export (Debit/Credit swapped) or a voucher
              that doesn't balance is caught here, before it becomes a wall of phantom defects. */}
          {impDB.isSuccess && (impDB.data?.signMismatchCount > 0 || impDB.data?.unbalancedCount > 0) && (
            <div className="mt-3 flex items-start gap-2 rounded-brand border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-ink" data-testid="daybook-import-warning">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <span className="space-y-1">
                {impDB.data?.signMismatchCount > 0 && (
                  <span className="block">
                    <b>{impDB.data.signMismatchCount} ledger{impDB.data.signMismatchCount === 1 ? '' : 's'} whose Day Book side disagrees with the Trial Balance</b> — a likely sign-flipped export; check the Debit/Credit columns and re-upload.{' '}
                    {(impDB.data.signMismatches || []).slice(0, 4).map((s, i) => (
                      <span key={s.ledger}>{i > 0 ? ' · ' : ''}<b>{s.ledger}</b> (Day Book {s.dayBookSide} {fmt(Math.abs(s.dayBook), cur)} vs TB {s.tbSide} {fmt(Math.abs(s.tb), cur)})</span>
                    ))}{impDB.data.signMismatchCount > 4 ? ` · +${impDB.data.signMismatchCount - 4} more` : ''}
                  </span>
                )}
                {impDB.data?.unbalancedCount > 0 && (
                  <span className="block">
                    <b>{impDB.data.unbalancedCount} voucher{impDB.data.unbalancedCount === 1 ? '' : 's'} don’t balance (Σ Dr ≠ Σ Cr)</b> — a dropped leg or a flipped side.{' '}
                    {(impDB.data.unbalancedVouchers || []).slice(0, 4).map((v, i) => (
                      <span key={`${v.date}|${v.vno}`}>{i > 0 ? ' · ' : ''}<b>{v.vno || v.date}</b> (Dr {fmt(v.debit, cur)} vs Cr {fmt(v.credit, cur)})</span>
                    ))}{impDB.data.unbalancedCount > 4 ? ` · +${impDB.data.unbalancedCount - 4} more` : ''}
                  </span>
                )}
              </span>
            </div>
          )}
        </PageSection>
      )}

      {/* KPI chips */}
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4 desktop:grid-cols-8">
        <Kpi label="In scope" value={counts.total || 0} />
        <Kpi label="Tied" value={counts.tied || 0} tone="success" />
        <Kpi label="Off" value={(counts.off || 0)} tone={(counts.off || 0) > 0 ? 'danger' : 'muted'} />
        <Kpi label="Only in ERP" value={counts.onlyErp || 0} tone={(counts.onlyErp || 0) > 0 ? 'warning' : 'muted'} />
        <Kpi label="Only in Tally" value={counts.onlyTally || 0} tone={(counts.onlyTally || 0) > 0 ? 'warning' : 'muted'} />
        <Kpi label="Fix in Tally" value={fixTotal} tone={fixTotal > 0 ? 'warning' : 'muted'} />
        <Kpi label="Accepted" value={counts.accepted || 0} tone={(counts.accepted || 0) > 0 ? 'info' : 'muted'} />
        <Kpi label="Net profit Δ" value={fmt(round2((counts.netProfitErp || 0) - (counts.netProfitTally || 0)), cur)} tone={round2((counts.netProfitErp || 0) - (counts.netProfitTally || 0)) !== 0 ? 'danger' : 'muted'} small />
      </div>

      {/* Before any Tally TB is uploaded, onboard calmly (not a wall of red);
          once uploaded, show the certificate close gate. Deferred until the board
          has loaded so the gate never flashes a wrong state (U4). */}
      {!empty && !isLoading && (imported.count
        ? <CertifyPanel branch={branch} period={period} tier={tier} offTotal={offTotal} fixTotal={fixTotal} staleAccepted={counts.staleAccepted || 0} currentUser={currentUser} />
        : (
          <PageSection icon={Upload} title={`No Tally Trial Balance uploaded — ${branch} · ${periodLabel(period)}`}
            subtitle="Until you upload the period's Tally TB, every ERP ledger below shows as unmatched. This is the starting point, not an error.">
            <Button variant="primary" icon={Upload} onClick={() => { setShowImport(true); setShowDayBook(false); }}>Upload Tally TB</Button>
          </PageSection>
        ))}

      {/* tabs */}
      <div className="flex gap-1 border-b border-surface-border">
        {[['tb', 'All Ledgers · Trial Balance'], ['bs', 'Balance Sheet'], ['pl', 'Profit & Loss'], ['defects', 'Defects']].map(([k, lbl]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold ${tab === k ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {k === 'defects' && <AlertTriangle size={14} aria-hidden="true" />}{lbl}
            {k === 'defects' && offTotal > 0 ? <span className="rounded-full bg-danger/15 px-1.5 text-xs font-bold text-danger">{offTotal}</span> : null}
          </button>
        ))}
      </div>

      <PageSection title={tab === 'defects' ? `Defect Register — ${branch} · ${periodLabel(period)}` : `${branch} · ${periodLabel(period)}`}
        subtitle={tab === 'defects' ? 'Every off ledger drilled to its voucher defects — click a row to see the vouchers.' : 'Left: ERP (live) · Middle: Tally (upload) · Right: difference. Click an off ledger to drill its vouchers.'}>
        {tab === 'defects' ? (
          <DefectRegister data={defectsData} loading={defectsLoading} error={defectsError} onRetry={refetchDefects} cur={cur} onDrill={setDrill} />
        ) : (<>
        {isLoading && <LoadingState label="Computing the tie-out…" />}
        {isError && <ErrorState title="Couldn’t load the tie-out" message="The service didn’t respond. Check the connection and retry." onRetry={() => refetch()} />}
        {empty && (
          <EmptyState title={`No ledgers to tie out for ${branch} · ${periodLabel(period)}`}
            hint="Upload the period's Tally Trial Balance and the ERP will put its live numbers next to it."
            action={<Button variant="primary" icon={Upload} onClick={() => { setShowImport(true); setShowDayBook(false); }}>Upload Tally TB</Button>} />
        )}
        {!isLoading && !empty && (
          <>
          {(tab === 'tb' || tab === 'pl' || blocking > 0) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {/* Re-views, mutually exclusive (ticking one clears the other). Chart of Accounts is
                  a TB re-view; By Module works on the Trial Balance AND the Profit & Loss (both
                  carry the cost-centre pivot). Balance Sheet has no cost centre, so no By Module
                  there. All remembered per user. */}
              {tab === 'tb' && (
                <label className="inline-flex items-center gap-2 rounded-brand border border-surface-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted"
                  title="Show the ERP-live vs Tally trial balance arranged as your ERP Chart of Accounts — group ▸ sub-group ▸ ledger with running subtotals, fully expanded.">
                  <input type="checkbox" checked={coaView} onChange={(e) => { const v = e.target.checked; setCoaView(v); if (v) setModuleView(false); }} className="accent-accent" />
                  Chart of Accounts view
                </label>
              )}
              {(tab === 'tb' || tab === 'pl') && (
                <label className="inline-flex items-center gap-2 rounded-brand border border-surface-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted"
                  title={tab === 'pl'
                    ? "Pivot the P&L by cost centre / module (Flight · Hotel · Holiday · Visa …) as a mini-P&L per module — Sales / COGS and a per-module Gross Profit tie-out (ERP vs Tally). A ledger split across cost centres reconciles at ledger level."
                    : "Pivot the trial balance by cost centre / module (Flight · Hotel · Holiday · Visa …) with each module's Sales / COGS / GP, ERP vs Tally. Balance-Sheet ledgers (no cost centre) list in a trailing bucket."}>
                  <input type="checkbox" checked={moduleView} onChange={(e) => { const v = e.target.checked; setModuleView(v); if (v) setCoaView(false); }} className="accent-accent" />
                  By Module <span className="text-[10px] font-semibold text-ink-subtle">{tab === 'pl' ? '(cost centre · GP)' : '(cost centre)'}</span>
                </label>
              )}
              {blocking > 0 && !showTree && !showModule && (
                <label className="inline-flex items-center gap-2 rounded-brand border border-surface-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted">
                  <input type="checkbox" checked={onlyFixes} onChange={(e) => setOnlyFixes(e.target.checked)} className="accent-accent" />
                  Show only items to fix in Tally <span className="rounded-full bg-warning/15 px-1.5 font-bold text-warning">{blocking}</span>
                </label>
              )}
            </div>
          )}
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
                {showModule ? renderModuleNodes(data.moduleTree, { pl: tab === 'pl' }) : showTree ? renderTreeNodes(data.tree, 0) : viewSections.map((sec) => (
                  <React.Fragment key={sec.label || 'all'}>
                    {sec.label && <tr><td colSpan={5} className="bg-surface-alt px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">{sec.label}</td></tr>}
                    {byParent(sec.rows).map((g) => (
                      <React.Fragment key={(sec.label || '') + g.parent}>
                        <tr><td colSpan={5} className="bg-navy px-4 py-2 text-xs font-bold uppercase text-white">{g.parent}</td></tr>
                        {bySubGroup(g.items).map((sg) => (
                          <React.Fragment key={(sec.label || '') + g.parent + '|' + sg.sub}>
                            {sg.sub ? <tr><td colSpan={5} className="bg-surface-alt/70 px-4 py-1 pl-8 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">▸ {sg.sub}</td></tr> : null}
                            {sg.rows.map((r) => renderLedgerRow(r, `${sec.label || ''}|${g.parent}|${r.code || r.ledger}`))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                <tr className="border-t-2 border-surface-strong bg-surface-alt font-bold">
                  <td className="px-4 py-3 text-xs uppercase tracking-wider text-ink-muted">{foot.label}</td>
                  {foot.type === 'balance' ? (
                    <>
                      <td className={`px-4 py-3 text-right ${foot.erpBalanced ? 'text-success' : 'text-danger'}`}>{foot.erpBalanced ? 'Balanced ✓' : 'Dr ≠ Cr'}</td>
                      <td className={`px-4 py-3 text-right ${foot.tallyBalanced ? 'text-success' : 'text-danger'}`}>{foot.tallyBalanced ? 'Balanced ✓' : 'Dr ≠ Cr'}</td>
                      <td className="px-4 py-3 text-right text-ink-subtle">—</td>
                      <td className="px-4 py-3 text-right"><Badge tone={foot.erpBalanced && foot.tallyBalanced ? 'success' : 'danger'} size="sm" dot>{foot.erpBalanced && foot.tallyBalanced ? 'Balanced' : 'Not balanced'}</Badge></td>
                    </>
                  ) : foot.type === 'pl' ? (
                    <>
                      {/* Net Profit / (Loss): a loss shows in parentheses + red, never a positive Dr. */}
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${plTone(foot.erp)}`}>{plText(foot.erp, cur)}</td>
                      <td className={`px-4 py-3 text-right font-mono tabular-nums ${plTone(foot.tally)}`}>{plText(foot.tally, cur)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-danger">{round2(foot.erp - foot.tally) === 0 ? '0' : `${foot.erp - foot.tally > 0 ? '+' : '−'}${Math.abs(round2(foot.erp - foot.tally)).toLocaleString(localeOf(cur))}`}</td>
                      <td className="px-4 py-3 text-right"><Badge tone={round2(foot.erp - foot.tally) === 0 ? 'success' : 'danger'} size="sm" dot>{round2(foot.erp - foot.tally) === 0 ? 'Tied' : 'Off'}</Badge></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(foot.erp, cur)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmt(foot.tally, cur)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-danger">{round2(foot.erp - foot.tally) === 0 ? '0' : `${foot.erp - foot.tally > 0 ? '+' : '−'}${Math.abs(round2(foot.erp - foot.tally)).toLocaleString(localeOf(cur))}`}</td>
                      <td className="px-4 py-3 text-right"><Badge tone={round2(foot.erp - foot.tally) === 0 ? 'success' : 'danger'} size="sm" dot>{round2(foot.erp - foot.tally) === 0 ? 'Tied' : 'Off'}</Badge></td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
          </>
        )}
        </>)}
      </PageSection>

      {drill && <VoucherDrawer branch={branch} period={period} tier={tier} row={drill} cur={cur} setRoute={setRoute} onClose={() => setDrill(null)} />}
    </div>
  );
}

// ── Defect Register — classified discrepancies across every off ledger ────────
// Triage cuts: a Master/Voucher tier segment (structural vs posting defects) and
// per-type toggle chips. Both are in-session filters over the already-loaded
// `defects` array — instant, no refetch. Chip counts stay fixed to the full
// totals so the distribution reads even while a subset is filtered.
const DEFECT_TIERS = [
  { key: 'all', label: 'All' },
  { key: 'master', label: 'Master mismatches' },
  { key: 'voucher', label: 'Voucher mismatches' },
];
function DefectRegister({ data, loading, error, onRetry, cur, onDrill }) {
  const [tier, setTier] = useState('all');       // 'all' | 'master' | 'voucher'
  const [types, setTypes] = useState(() => new Set()); // active type chips; empty = all in tier

  const defects = data?.defects || [];
  const byType = data?.summary?.byType || {};

  // Fixed per-tier totals for the segment badges (independent of active filter).
  const tierCount = useMemo(() => {
    const c = { all: 0, master: 0, voucher: 0 };
    for (const [type, n] of Object.entries(byType)) { c.all += n; c[defectMeta(type).tier] += n; }
    return c;
  }, [byType]);

  // Chips belonging to the active tier, in a stable severity-then-count order.
  const chips = useMemo(() => Object.entries(byType)
    .filter(([type]) => tier === 'all' || defectMeta(type).tier === tier)
    .sort((a, b) => (defectMeta(b[0]).tone === 'danger') - (defectMeta(a[0]).tone === 'danger') || b[1] - a[1]),
  [byType, tier]);

  const visible = useMemo(() => defects.filter((d) => {
    if (tier !== 'all' && defectMeta(d.type).tier !== tier) return false;
    if (types.size && !types.has(d.type)) return false;
    return true;
  }), [defects, tier, types]);

  const selectTier = (k) => { setTier(k); setTypes(new Set()); };  // tier change resets chip picks
  const toggleType = (t) => setTypes((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const clearFilters = () => { setTier('all'); setTypes(new Set()); };
  const filtered = tier !== 'all' || types.size > 0;

  if (loading) return <LoadingState label="Scanning off ledgers for defects…" />;
  if (error) return <ErrorState title="Couldn’t load the Defect Register" message="The service didn’t respond." onRetry={onRetry} />;
  if (!defects.length) {
    return <EmptyState title="No defects" hint="Every off ledger's vouchers reconcile — or there are no off ledgers this period." />;
  }
  return (
    <div className="grid gap-4">
      {/* Tier segment + scope badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-brand border border-surface-border bg-surface p-0.5 text-xs font-semibold" role="group" aria-label="Filter defects by tier">
          {DEFECT_TIERS.map((t) => (
            <button key={t.key} type="button" aria-pressed={tier === t.key} onClick={() => selectTier(t.key)}
              className={`rounded-[6px] px-3 py-1 transition focus:outline-none focus:ring-2 focus:ring-accent ${tier === t.key ? 'bg-accent text-navy shadow-card' : 'text-ink-muted hover:text-ink'}`}>
              {t.label} <span className="tabular-nums opacity-80">({tierCount[t.key]})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.pairedRenames > 0 && (
            <span className="rounded-full bg-info/10 px-3 py-1 text-xs font-semibold text-info" title="Ledgers renamed between ERP and Tally — each pair (ERP name absent in Tally + Tally name absent in ERP) is one account, collapsed to a single row instead of two.">
              {data.pairedRenames} rename pair{data.pairedRenames === 1 ? '' : 's'} collapsed
            </span>
          )}
          <span className="rounded-full bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted">{data.offLedgers} off ledgers</span>
        </div>
      </div>
      {/* Type toggle chips */}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([type, n]) => {
          const m = defectMeta(type);
          const on = types.has(type);
          const dim = types.size > 0 && !on;
          return (
            <button key={type} type="button" onClick={() => toggleType(type)} aria-pressed={on}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent ${m.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-warning/15 text-warning'} ${on ? 'ring-2 ring-accent shadow-card' : dim ? 'opacity-45 hover:opacity-100' : 'hover:opacity-90'}`}>
              {m.label}: {n}
            </button>
          );
        })}
        {filtered && (
          <button type="button" onClick={clearFilters}
            className="rounded-full px-3 py-1 text-xs font-semibold text-ink-subtle underline decoration-dotted underline-offset-2 hover:text-ink focus:outline-none focus:ring-2 focus:ring-accent">
            Clear
          </button>
        )}
      </div>
      {filtered && (
        <div className="text-xs font-semibold text-ink-subtle">Showing {visible.length} of {defects.length} defects</div>
      )}
      {/* Two stacked panels — master (ledger-level) and voucher (transaction-level)
          defects are DIFFERENT problems with different fixes, so they never share one
          flat table. Under "All" both render, master FIRST because it's the root cause:
          an absent/renamed ledger turns all its postings into voucher mismatches, so
          clearing the master usually clears those on the same ledger too. Selecting a
          tier shows only that panel; a chip filter can empty a panel (its own empty row). */}
      {(() => {
        const master = visible.filter((d) => defectMeta(d.type).tier === 'master');
        const voucher = visible.filter((d) => defectMeta(d.type).tier === 'voucher');
        const showMaster = (tier === 'all' || tier === 'master') && (master.length > 0 || tier === 'master');
        const showVoucher = (tier === 'all' || tier === 'voucher') && (voucher.length > 0 || tier === 'voucher');
        if (!showMaster && !showVoucher) {
          return (
            <div className="rounded-brand border border-dashed border-surface-border px-4 py-8 text-center text-sm text-ink-subtle">
              No defects match this filter. <button type="button" onClick={clearFilters} className="font-semibold text-accent underline underline-offset-2">Clear</button>
            </div>
          );
        }
        return (
          <div className="grid gap-4">
            {showMaster && <DefectPanel kind="master" rows={master} cur={cur} onDrill={onDrill} onClear={clearFilters} />}
            {showVoucher && <DefectPanel kind="voucher" rows={voucher} cur={cur} onDrill={onDrill} onClear={clearFilters} />}
          </div>
        );
      })()}
    </div>
  );
}

// One stacked panel of the Defect Register — master (ledger-level) OR voucher
// (transaction-level). Each shows only the columns that make sense for its kind:
// a master defect has no single offending voucher (the WHOLE ledger is absent /
// renamed), so its middle column is the *reason*; a voucher defect names the
// voucher's date · ref. Rows drill to the same voucher drawer on click.
function DefectPanel({ kind, rows, cur, onDrill, onClear }) {
  const master = kind === 'master';
  return (
    <section className="overflow-hidden rounded-brand border border-surface-border bg-surface shadow-card">
      <header className="border-b border-surface-border bg-surface-alt/60 px-4 py-3">
        <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
          {master ? 'Master defects' : 'Voucher defects'}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">· {master ? 'ledger-level' : 'transaction-level'}</span>
          <span className="rounded-full bg-surface-alt px-2 text-xs font-bold tabular-nums text-ink-muted">{rows.length}</span>
        </h4>
        <p className="mt-0.5 text-xs text-ink-muted">
          {master
            ? 'The whole ledger is missing or named differently on one side. Fix in Tally — create / rename / regroup — then re-upload. Clearing these usually clears the voucher mismatches on the same ledger too.'
            : 'Individual voucher legs that don’t tie. Fix the specific voucher in ERP or Tally.'}
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 640 }}>
          <thead>
            <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
              <th className="px-4 py-2 text-left font-bold">Ledger</th>
              <th className="px-4 py-2 text-left font-bold">{master ? 'Reason' : 'Voucher'}</th>
              <th className="px-4 py-2 text-right font-bold">Amount</th>
              <th className="px-4 py-2 text-right font-bold">Defect</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-subtle">No {master ? 'master' : 'voucher'} defects match this filter. <button type="button" onClick={onClear} className="font-semibold text-accent underline underline-offset-2">Clear</button></td></tr>
            ) : rows.map((d, i) => {
              const m = defectMeta(d.type);
              return (
                <tr key={i} onClick={() => onDrill({ ledger: d.ledger })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrill({ ledger: d.ledger }); } }}
                  role="button" tabIndex={0} aria-label={`Drill ${d.ledger} vouchers`}
                  className="cursor-pointer border-b border-surface-border hover:bg-accent-soft focus:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent">
                  <td className="px-4 py-2 font-semibold text-ink">{d.ledger}</td>
                  {master ? (
                    <td className="px-4 py-2 text-ink-muted">
                      <span className="block">{d.desc || '—'}</span>
                      {d.suggest ? <span className="mt-0.5 block text-[10.5px] font-semibold text-info" title="Closest unmatched Tally ledger — if it's the same account, rename it in Tally to match ERP (counted once, not twice)">Did you mean Tally “{d.suggest.ledger}”? — rename it in Tally to match ERP</span> : null}
                      {d.strandedCount ? <span className="mt-0.5 block text-[10.5px] font-semibold text-warning" title="ERP postings on this ledger with no Tally counterpart — they'll reconcile once this ledger exists in Tally">{d.strandedCount} ERP {d.strandedCount === 1 ? 'entry has' : 'entries have'} no Tally match</span> : null}
                    </td>
                  ) : (
                    <td className="px-4 py-2"><span className="block text-ink">{d.desc || '—'}</span>
                      <span className="font-mono text-xs text-ink-subtle">{[d.date, d.ref].filter(Boolean).join(' · ') || '—'}</span></td>
                  )}
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{fmt(d.amount, cur)}</td>
                  <td className="px-4 py-2 text-right"><Badge tone={m.tone} size="sm" dot>{m.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Kpi({ label, value, tone = 'ink', small }) {
  const cls = { ink: 'text-ink', success: 'text-success', danger: 'text-danger', warning: 'text-warning', info: 'text-info', muted: 'text-ink-subtle' }[tone] || 'text-ink';
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-3 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${cls} ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
    </div>
  );
}
