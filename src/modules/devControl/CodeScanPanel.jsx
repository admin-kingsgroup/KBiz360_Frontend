/* ════════════════════════════════════════════════════════════════════
   MODULES/DEV-CONTROL/CODE-SCAN-PANEL.JSX
   ════════════════════════════════════════════════════════════════════
   The LIVE automated code-scan panel, shared by the Control Tower ▸
   Development lens and the Developer Control page. Auto-runs on every ERP
   refresh (refetchOnMount:'always' + refetchOnWindowFocus) so a developer
   is highlighted new issues the moment they open ERP — the backend walks
   the source trees and returns findings (broken imports, dead routes,
   placeholder screens, dead buttons, TODOs), each with a how-to-fix remark.
   "Re-scan now" forces a fresh walk past the 60s server cache.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCodeScan } from '../tk-group/api/monitor';
import { mergeScan, SCAN_SEVERITY, SCAN_CATEGORY } from './scan';
import { PageSection, ResponsiveGrid, Button } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// One react-query key so the Overview card, the Development lens and the Dev
// Control page all share ONE cache/one scan — a re-scan anywhere updates all.
export function useCodeScan() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['dev-control', 'scan'],
    queryFn: () => getCodeScan(false),
    staleTime: 30_000,
    refetchOnMount: 'always',       // fresh scan every time the lens opens/refreshes
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,    // background heartbeat while the lens stays open
  });
  const rescan = useMutation({
    mutationFn: () => getCodeScan(true),
    onSuccess: (data) => qc.setQueryData(['dev-control', 'scan'], data),
  });
  return { scan: mergeScan(q.data), isFetching: q.isFetching, isLoading: q.isLoading, rescan };
}

function SeverityPill({ severity }) {
  const m = SCAN_SEVERITY[severity] || SCAN_SEVERITY.low;
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', color: m.color, background: m.bg }}>{m.label}</span>;
}

export const SCAN_COLS = [
  { key: 'severity', header: 'Severity', render: (r) => <SeverityPill severity={r.severity} /> },
  { key: 'category', header: 'Type', render: (r) => <span className="text-[11.5px] text-ink-muted">{(SCAN_CATEGORY[r.category] || {}).label || r.category}</span> },
  { key: 'location', header: 'Where', render: (r) => (
    <div className="flex items-center gap-1.5">
      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: r.tree === 'BE' ? '#e7f1ff' : '#f3ecff', color: r.tree === 'BE' ? '#0969da' : '#8250df' }}>{r.tree}</span>
      <code className="font-mono text-[11px] text-ink">{r.file}:{r.line}</code>
    </div>
  ) },
  { key: 'title', header: 'Issue', render: (r) => (
    <div><div className="font-medium text-ink">{r.title}</div>{r.snippet && <code className="mt-0.5 block truncate font-mono text-[10.5px] text-ink-subtle" style={{ maxWidth: 340 }}>{r.snippet}</code>}</div>
  ) },
  { key: 'remark', header: 'How to fix (remark)', render: (r) => <span className="text-ink-muted">{r.remark}</span> },
];

function timeAgo(iso) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

export function CodeScanPanel({ subtitle } = {}) {
  const { scan, isFetching, rescan } = useCodeScan();
  const c = scan.counts;
  const src = scan.unreachable
    ? 'Backend scan unreachable — showing the frontend build-time scan only.'
    : `${scan.beScanned ? 'API ✓ live' : 'API —'} · ${scan.feLive ? 'Frontend ✓ live' : `Frontend from last build (${scan.buildFilesScanned} files)`}${scan.cached ? ' · cached' : ''}`;
  const ts = timeAgo(scan.generatedAt);
  return (
    <PageSection
      title="Automated code scan — live"
      subtitle={subtitle || 'Auto-runs on every ERP refresh. Walks the frontend + backend source and flags broken imports, dead routes, placeholder screens, dead buttons and TODOs — each with a how-to-fix remark. Quiet when the code is clean.'}
      actions={<Button size="sm" loading={rescan.isPending || isFetching} onClick={() => rescan.mutate()}>Re-scan now</Button>}
    >
      <div className="grid gap-3">
        <ResponsiveGrid min="120px" gap="md">
          <KpiTile label="Total issues" value={c.total} color={c.total ? '#9a6700' : '#1a7f37'} />
          <KpiTile label="High" value={c.bySeverity.high || 0} sub="broken / dead-end" color={(c.bySeverity.high || 0) ? '#cf222e' : '#1a7f37'} />
          <KpiTile label="Medium" value={c.bySeverity.medium || 0} color="#9a6700" />
          <KpiTile label="Low" value={c.bySeverity.low || 0} sub="tech-debt / TODO" color="#57606a" />
          <KpiTile label="Frontend / Backend" value={`${c.byTree.FE || 0} / ${c.byTree.BE || 0}`} color="#0969da" />
        </ResponsiveGrid>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-subtle">
          <span>{src}</span>
          {ts && <span>· scanned {ts}</span>}
        </div>
        <DataTable
          title={`Code-scan findings (${scan.findings.length})`}
          columns={SCAN_COLS}
          rows={scan.findings}
          getRowKey={(r) => r.id}
          loading={scan.findings.length === 0 && isFetching}
          emptyMessage="No code issues found — imports resolve, routes render, no placeholders or dead controls. 🎉"
          searchable
          showDensityToggle={false}
          zebra
        />
      </div>
    </PageSection>
  );
}

export default CodeScanPanel;
