/* ════════════════════════════════════════════════════════════════════
   Settings ▸ GSP / IRP E-Invoice Integration.
   ════════════════════════════════════════════════════════════════════
   Credentials PERSIST via the existing /api/app-config mechanism (key
   'integration.gsp') so they're ready the day a GST Suvidha Provider
   contract lands. The integration itself stays DORMANT: Test Connection
   and the enable switch are disabled ("awaiting provider contract") —
   no GSP/IRP fetch exists anywhere yet, by design.
   Secrets are stored as entered (single-company internal tool) but are
   MASKED in the UI after save: the inputs clear and show a •••• saved
   placeholder; leaving a secret blank on re-save keeps the stored one.
   ──────────────────────────────────────────────────────────────────── */

import React, { useEffect, useState } from 'react';
import { useConfigValue, useSaveConfigValue } from '../../../core/useAccounting';
import { toast } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { ResponsiveGrid, PageSection, StatusPill, Button, FormField, Input, Switch } from '../../../shell/primitives';

const CONFIG_KEY = 'integration.gsp';
const AWAITING = 'Awaiting GSP/IRP provider contract — Test Connection and go-live stay disabled until credentials are validated with the provider.';

const FIELDS = [
  { k: 'provider', label: 'GSP provider', hint: 'e.g. the contracted GST Suvidha Provider (ClearTax, Masters India, NIC direct…)', placeholder: 'Provider name' },
  { k: 'apiBase', label: 'API endpoint (base URL)', hint: 'The provider sandbox/production base URL', placeholder: 'https://…', mono: true },
  { k: 'gstin', label: 'GSTIN (seller)', hint: 'The GSTIN e-invoices will be reported under', placeholder: '27XXXXXXXXXXXZX', mono: true },
  { k: 'clientId', label: 'Client ID', placeholder: 'client id', mono: true },
  { k: 'username', label: 'API username', placeholder: 'username', mono: true },
];
const SECRET_FIELDS = [
  { k: 'clientSecret', label: 'Client secret' },
  { k: 'password', label: 'API password' },
];

export function GspIrpSettings() {
  const q = useConfigValue(CONFIG_KEY);
  const saved = q.data || {};
  const saveCfg = useSaveConfigValue();
  const [form, setForm] = useState({ provider: '', apiBase: '', gstin: '', clientId: '', username: '', clientSecret: '', password: '' });
  const [dirty, setDirty] = useState(false);

  // Hydrate the plain fields once the saved config loads (secrets stay blank —
  // they render as a masked placeholder instead).
  useEffect(() => {
    if (!q.data || dirty) return;
    setForm((f) => ({ ...f, provider: q.data.provider || '', apiBase: q.data.apiBase || '', gstin: q.data.gstin || '', clientId: q.data.clientId || '', username: q.data.username || '' }));
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setDirty(true); setForm((f) => ({ ...f, [k]: e.target.value })); };
  const configured = !!(saved.apiBase || saved.clientId || saved.provider);

  const onSave = () => {
    const value = {
      ...saved,
      provider: form.provider.trim(), apiBase: form.apiBase.trim(), gstin: form.gstin.trim(),
      clientId: form.clientId.trim(), username: form.username.trim(),
      // a blank secret input means "keep the stored secret"
      ...(form.clientSecret ? { clientSecret: form.clientSecret } : {}),
      ...(form.password ? { password: form.password } : {}),
      enabled: false, // integration stays dormant until the provider contract exists
      updatedAt: new Date().toISOString(),
    };
    saveCfg.mutate(
      { key: CONFIG_KEY, value, description: 'GSP / IRP e-invoice provider credentials (integration dormant — awaiting provider contract)' },
      {
        onSuccess: () => { toast('GSP / IRP settings saved'); setForm((f) => ({ ...f, clientSecret: '', password: '' })); setDirty(false); },
        onError: (e) => toast('Could not save — ' + (e?.message || 'unknown error'), 'error'),
      },
    );
  };

  return (
    <PageLayout
      title="GSP / IRP Direct E-Invoice Integration"
      subtitle="NIC IRP via GST Suvidha Provider · credentials persist here; IRN generation goes live once a provider contract exists"
      actions={<StatusPill tone={configured ? 'warning' : 'neutral'} dot>{configured ? 'Credentials saved — integration dormant' : 'Not configured'}</StatusPill>}
    >
      <div className="mb-4 rounded-brand border border-dashed border-surface-border bg-surface px-4 py-3 text-[11px] text-ink-muted">
        {AWAITING} The E-Invoice and E-Way registers under Taxation already list every candidate invoice live from the books.
      </div>

      <PageSection title="Provider credentials" className="mb-4">
        <ResponsiveGrid cols={2} gap="md">
          {FIELDS.map((f) => (
            <FormField key={f.k} label={f.label} hint={f.hint}>
              <Input value={form[f.k]} onChange={set(f.k)} placeholder={f.placeholder} className={f.mono ? 'font-mono text-[11px]' : ''} autoComplete="off" />
            </FormField>
          ))}
          {SECRET_FIELDS.map((f) => (
            <FormField key={f.k} label={f.label} hint={saved[f.k] ? 'A secret is saved — leave blank to keep it, type to replace.' : 'Stored via app-config; masked here after save.'}>
              <Input type="password" value={form[f.k]} onChange={set(f.k)} placeholder={saved[f.k] ? '••••••••  (saved)' : 'not set'} className="font-mono text-[11px]" autoComplete="new-password" />
            </FormField>
          ))}
        </ResponsiveGrid>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={onSave} disabled={saveCfg.isPending} write>{saveCfg.isPending ? 'Saving…' : 'Save credentials'}</Button>
          <span title={AWAITING}><Button variant="secondary" disabled>Test connection</Button></span>
          <span title={AWAITING} className="inline-flex items-center gap-2">
            <Switch checked={false} onChange={() => {}} disabled label="Enable e-invoicing" />
            <StatusPill tone="neutral" size="sm">awaiting provider contract</StatusPill>
          </span>
        </div>
      </PageSection>

      <PageSection title="What happens when a provider is contracted">
        <ul className="list-disc pl-5 text-[11.5px] leading-relaxed text-ink-muted">
          <li>Taxation ▸ E-Invoice: the Generate IRN action activates and stamps IRN + Ack. no. on each live invoice row.</li>
          <li>Taxation ▸ E-Way Bill: EWB generation activates for consignment invoices ≥ ₹50,000.</li>
          <li>Until then this page only persists the credentials (app-config key <code className="font-mono text-[10.5px]">{CONFIG_KEY}</code>) — nothing is transmitted anywhere.</li>
        </ul>
      </PageSection>
    </PageLayout>
  );
}

export default GspIrpSettings;
