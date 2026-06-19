/* ════════════════════════════════════════════════════════════════════
   Settings ▸ API Key Management — integration credentials.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx onto PageLayout + primitives. Enable/disable
   toggle logic unchanged; cards are now responsive (actions wrap on mobile).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Plus, Wrench, RefreshCw } from 'lucide-react';
import { PageLayout } from '../../../shell/PageLayout';
import { Button, StatusPill } from '../../../shell/primitives';

const SVC_ICONS = { Amadeus: '✈', WhatsApp: '💬', 'IATA BSP': '📋', Email: '📧', 'GSTN IRP': '🏛', Custom: '⚙' };
const STATUS_TONE = { Active: 'success', Testing: 'warning', Inactive: 'danger' };
// No backend integration-credential store exists yet, so this starts EMPTY rather than
// showing fabricated/sample keys. Wire to an /api integrations endpoint when available.
const SEED = [];

export function ApiKeySettings() {
  const [keys, setKeys] = useState(SEED);

  return (
    <PageLayout
      title="API Key Management"
      subtitle={`${keys.length} integrations · GDS · WhatsApp · BSP · GSTN · Email`}
      actions={<Button size="sm" variant="primary" icon={Plus}>Add Integration</Button>}
    >
      <div className="mb-3 rounded-brand border border-[#FAC775] bg-[#FAEEDA] px-3.5 py-2.5 text-[10.5px] text-[#854F0B]">
        🔒 API keys are stored encrypted. Never share keys externally. Rotate keys every 90 days. Super Admin access only.
      </div>

      <div className="flex flex-col gap-2">
        {keys.length === 0 && (
          <div className="rounded-brand border border-dashed border-surface-border bg-surface px-4 py-8 text-center text-[11px] text-ink-muted">
            No integrations configured yet. Use “Add Integration” to connect a GDS, WhatsApp, BSP, GSTN or email service.
          </div>
        )}
        {keys.map((k) => (
          <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-brand border border-surface-border bg-surface px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-xl">{SVC_ICONS[k.service] || '🔑'}</div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-navy">{k.name}</span>
                <StatusPill tone={STATUS_TONE[k.status] || 'neutral'} size="sm">{k.status}</StatusPill>
                <span className="rounded-full px-1.5 py-px text-[9px] font-bold" style={{ background: k.env === 'Production' ? '#0d1326' : '#f3f4f8', color: k.env === 'Production' ? '#d4a437' : '#5a6691' }}>{k.env}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-ink-muted">
                <span className="font-mono">{k.key}</span>
                <span>Secret: {k.secret}</span>
                <span>Last tested: {k.lastTest}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button size="xs" variant="primary" icon={Wrench}>Test</Button>
              <Button size="xs" variant="secondary" icon={RefreshCw}>Rotate</Button>
              <Button size="xs" variant="secondary" className={k.status === 'Active' ? 'text-maroon' : 'text-[#27500A]'}
                onClick={() => setKeys((ks) => ks.map((x) => x.id === k.id ? { ...x, status: x.status === 'Active' ? 'Inactive' : 'Active' } : x))}>
                {k.status === 'Active' ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

export default ApiKeySettings;
