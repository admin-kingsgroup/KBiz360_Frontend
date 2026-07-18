/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Sub-Agents — commission structure, performance, credit.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. KPI totals + commission math + expand/add
   logic unchanged (SUBAGENTS). KPIs + agent cards → ResponsiveGrid; the
   add dialog → the shared responsive Modal.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { ACTIVE_CURRENCIES, currencySymbol } from '../../../core/data';
import { money } from '../../../core/format';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { exportToExcel } from '../../../core/exportExcel';
import { PageLayout } from '../../../shell/PageLayout';
import { Modal, Button, Input, Select, FormField, ResponsiveGrid, StatusPill } from '../../../shell/primitives';
import { clickable } from '../../../core/ux/clickable';

const TYPE_TONE = { Retail: 'info', Corporate: 'warning', Local: 'success', Online: 'success' };
// Per-agent figures format in the agent's own currency; cross-agent aggregates
// (which may mix currencies) fall back to the ₹ house base.
const f = (n, code) => money(n, currencySymbol(code) || '₹');
const blankForm = { name: '', iata: '', email: '', phone: '', type: 'Retail', city: '', currency: 'INR', commType: 'Percentage of GP', commRate: 10, creditLimit: 200000, creditDays: 30, paymentCycle: 'Monthly' };

export function MastersSubAgents() {
  const [modal, setModal] = useState(false);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(blankForm);
  const setF = (o) => setForm((p) => ({ ...p, ...o }));
  // Live sub-agent master (/api/sub-agents); Add persists via the create mutation.
  const { data: SUBAGENTS = [] } = useMasterList('sub-agents');
  const { create } = useMasterMutations('sub-agents');
  const addSubAgent = () => create.mutate(form, { onSuccess: () => { setModal(false); setForm(blankForm); } });

  const KPIS = [
    { l: 'Sub-Agents', v: String(SUBAGENTS.length), c: '#2e323c' },
    { l: 'Active', v: String(SUBAGENTS.filter((s) => s.active).length), c: '#16a34a' },
    { l: 'Total YTD Revenue', v: f(SUBAGENTS.reduce((s, a) => s + a.revYTD, 0)), c: '#2563eb' },
    { l: 'Commission Paid YTD', v: f(SUBAGENTS.reduce((s, a) => s + (a.commType.includes('%') ? a.gpYTD * (a.commRate / 100) : a.books * a.commRate), 0)), c: '#d97706' },
    { l: 'Total Bookings', v: String(SUBAGENTS.reduce((s, a) => s + a.books, 0)), c: '#3fb7a3' },
  ];

  const exportAgents = () => exportToExcel('sub-agents',
    [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Agency Name' }, { key: 'iata', label: 'IATA' }, { key: 'type', label: 'Type' }, { key: 'city', label: 'City' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'commType', label: 'Commission Type' }, { key: 'commRate', label: 'Commission Rate' }, { key: 'creditLimit', label: 'Credit Limit' }, { key: 'revYTD', label: 'YTD Revenue' }, { key: 'gpYTD', label: 'YTD GP' }, { key: 'books', label: 'Bookings' }],
    SUBAGENTS);

  const Stat = ({ l, v, c }) => (
    <div className="rounded-lg bg-surface-alt px-2 py-2.5 text-center"><div className="mb-1 text-[11px] text-ink-muted">{l}</div><div className="font-bold" style={{ color: c || '#1a1c22' }}>{v}</div></div>
  );

  return (
    <PageLayout
      title="Sub-Agents Master"
      subtitle="Commission structure · Performance · Credit limits · Payment cycles"
      actions={
        <>
          <Button size="sm" variant="secondary" icon={Download} onClick={exportAgents}>Export</Button>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => { setForm(blankForm); setModal(true); }}>Add Sub-Agent</Button>
        </>
      }
    >
      <ResponsiveGrid min="140px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-navy tablet:text-xl">{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <ResponsiveGrid min="320px" gap="md">
        {SUBAGENTS.map((s) => {
          const open = sel?.id === s.id;
          const tone = TYPE_TONE[s.type] || 'neutral';
          return (
            <div key={s.id} {...clickable(() => setSel(open ? null : s))}
              className={`cursor-pointer rounded-brand border border-t-[4px] bg-surface p-3.5 transition ${open ? 'shadow-brand' : 'border-surface-border shadow-sm hover:shadow'}`}
              style={{ borderTopColor: { info: '#2563eb', warning: '#d97706', success: '#16a34a', neutral: '#2e323c' }[tone] }}>
              <div className="mb-2.5 flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-bold text-navy">{s.name}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">{s.city} · {s.type} · {s.iata || 'Non-IATA'}</p>
                </div>
                <StatusPill tone={tone} size="sm">{s.type}</StatusPill>
              </div>
              <div className="mb-2.5 grid grid-cols-3 gap-2">
                <Stat l="YTD Revenue" v={f(s.revYTD, s.currency)} />
                <Stat l="YTD GP" v={f(s.gpYTD, s.currency)} c="#3fb7a3" />
                <Stat l="Bookings" v={String(s.books)} />
              </div>
              <div className="flex justify-between border-t border-surface-alt pt-2 text-[10.5px] text-ink-muted">
                <span>Commission: <b className="text-navy">{s.commType.includes('%') ? `${s.commRate}%` : `${f(s.commRate, s.currency)}/booking`}</b></span>
                <span>Cycle: <b className="text-navy">{s.paymentCycle}</b></span>
                <span>Credit: <b className="text-navy">{s.creditDays}d</b></span>
              </div>
              {open && (
                <div className="mt-3 rounded-lg bg-surface-alt p-3" onClick={(e) => e.stopPropagation()}>
                  {[{ l: 'IATA No.', v: s.iata || 'Non-IATA' }, { l: 'Email', v: s.email }, { l: 'Phone', v: s.phone }, { l: 'Territory', v: s.territory }, { l: 'Currency', v: s.currency }, { l: 'Credit Limit', v: f(s.creditLimit, s.currency) }, { l: 'Joined', v: s.joined }].map((r, i) => (
                    <div key={i} className="flex gap-2 border-b border-surface-border py-1 text-[10.5px]"><span className="min-w-[100px] shrink-0 text-ink-muted">{r.l}</span><span className="font-medium text-navy">{r.v}</span></div>
                  ))}
                  <div className="mt-2 flex gap-1.5">
                    <Button size="xs" variant="primary">Edit</Button>
                    <Button size="xs" variant="secondary">Statement</Button>
                    <Button size="xs" variant="secondary">Pay Commission</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </ResponsiveGrid>

      {modal && (
        <Modal title="Add Sub-Agent" maxWidth={600} onClose={() => setModal(false)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" size="sm" write disabled={!form.name || create.isPending} onClick={addSubAgent}>{create.isPending ? 'Adding…' : 'Add Sub-Agent'}</Button></>}>
          <div className="flex flex-col gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Agency name"><Input value={form.name} onChange={(e) => setF({ name: e.target.value })} /></FormField>
              <FormField label="Type"><Select value={form.type} onChange={(e) => setF({ type: e.target.value })}><option>Retail</option><option>Corporate</option><option>Local</option><option>Online</option></Select></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="IATA number (if any)"><Input value={form.iata} onChange={(e) => setF({ iata: e.target.value })} className="font-mono" placeholder="14-3 XXXXX X" /></FormField>
              <FormField label="City / Territory"><Input value={form.city} onChange={(e) => setF({ city: e.target.value })} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Email"><Input type="email" value={form.email} onChange={(e) => setF({ email: e.target.value })} /></FormField>
              <FormField label="Phone"><Input value={form.phone} onChange={(e) => setF({ phone: e.target.value })} /></FormField>
            </div>
            <div className="rounded-brand bg-surface-alt p-3">
              <p className="mb-2.5 text-[11px] font-bold text-navy">Commission Structure</p>
              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
                <FormField label="Commission type"><Select value={form.commType} onChange={(e) => setF({ commType: e.target.value })}><option>Percentage of GP</option><option>Percentage of sell price</option><option>Fixed ₹ per booking</option></Select></FormField>
                <FormField label={form.commType === 'Fixed ₹ per booking' ? 'Fixed ₹/booking' : 'Rate %'}><Input type="number" value={form.commRate} onChange={(e) => setF({ commRate: +e.target.value })} /></FormField>
                <FormField label="Payment cycle"><Select value={form.paymentCycle} onChange={(e) => setF({ paymentCycle: e.target.value })}><option>Weekly</option><option>Bi-weekly</option><option>Monthly</option><option>Per booking</option></Select></FormField>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 tablet:grid-cols-3">
                <FormField label="Credit limit (₹)"><Input type="number" value={form.creditLimit} onChange={(e) => setF({ creditLimit: +e.target.value })} /></FormField>
                <FormField label="Credit days"><Input type="number" value={form.creditDays} onChange={(e) => setF({ creditDays: +e.target.value })} /></FormField>
                <FormField label="Currency"><Select value={form.currency} onChange={(e) => setF({ currency: e.target.value })}>{ACTIVE_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></FormField>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default MastersSubAgents;
