import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { getCycleLedgers, addCycleLedger, removeCycleLedger } from './api';
import { Drawer, Button, Input, FormField, Badge, EmptyState } from '../../shell/primitives';

// ─── Weekly cycle ledgers — config drawer ────────────────────────────────────
// Banks / OD (incl. credit cards) / cash join the weekly cycle automatically,
// as do BSP/IATA/TripJack creditors. Anything ELSE the branch settles weekly —
// a supplier WALLET, a payment-gateway ledger — is added here (FM/central roles;
// the backend blocks Branch Accountants) and joins weekly generation from then on.

export function CycleLedgerDrawer({ branch, onClose }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recon-certs', 'cycle-ledgers', branch],
    queryFn: () => getCycleLedgers({ branch }),
  });
  const done = () => { setErr(''); setCode(''); qc.invalidateQueries({ queryKey: ['recon-certs'] }); };
  const add = useMutation({ mutationFn: () => addCycleLedger({ branch, code: code.trim() }), onSuccess: done, onError: (e) => setErr(e.message) });
  const del = useMutation({ mutationFn: (c) => removeCycleLedger({ branch, code: c }), onSuccess: done, onError: (e) => setErr(e.message) });

  return (
    <Drawer open onClose={onClose} width="md"
      title={`Weekly cycle ledgers — ${branch}`}
      subtitle="Wallets, gateway accounts and other weekly-settled ledgers that join the Friday cycle.">
      <div className="grid gap-4 p-4">
        <div className="rounded-brand border border-surface-border bg-surface-alt/50 px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
          Already covered automatically: <b>banks · OD / credit cards · cash</b> (liquidity) and <b>BSP / IATA / TripJack</b> creditors.
          Add anything else here — e.g. a supplier <b>wallet / prepaid advance</b> or a <b>payment-gateway</b> ledger — and it gets a weekly certificate from the next Generate.
        </div>

        <div className="flex items-end gap-2">
          <FormField label="Ledger code" hint="Balance-Sheet ledgers only — find the code on the ledger master." className="flex-1">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={`e.g. ${branch}-MN-0042`} />
          </FormField>
          <Button variant="primary" icon={Plus} loading={add.isPending} disabled={!code.trim()} onClick={() => add.mutate()}>Add</Button>
        </div>
        {err ? <p className="text-sm text-danger">{err}</p> : null}

        {isLoading ? null : items.length === 0 ? (
          <EmptyState title="No extra cycle ledgers" hint="Only the automatic scope (banks, cards, cash, BSP, TripJack) reconciles weekly for this branch." />
        ) : (
          <ul className="grid gap-2">
            {items.map((l) => (
              <li key={l.code} className="flex items-center gap-3 rounded-brand border border-surface-border px-3 py-2 text-sm">
                <Badge tone="info" size="sm">weekly</Badge>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{l.name} <span className="ml-1 font-mono text-xs font-normal text-ink-subtle">{l.code}</span></span>
                <Button size="xs" variant="ghost" icon={X} loading={del.isPending && del.variables === l.code} onClick={() => del.mutate(l.code)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
