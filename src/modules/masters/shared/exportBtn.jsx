/* ════════════════════════════════════════════════════════════════════
   masters/shared/exportBtn — shared "Export to Excel" toolbar button
   ════════════════════════════════════════════════════════════════════
   Moved out of legacy.jsx (strangler-fig masters reorg). Wires a master's
   visible rows to the dependency-free CSV exporter. Pass the rows array +
   {key,label} columns. The button greys out when there's nothing to export.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { exportToExcel } from '../../../core/exportExcel';

export function ExportBtn({ name, columns, rows, label = "📤 Export" }) {
  const empty = !rows || rows.length === 0;
  return (
    <button onClick={() => exportToExcel(name, columns, rows || [])} disabled={empty} title="Export to Excel"
      className="max-tablet:min-h-[44px]"
      style={{ padding: "8px 14px", background: "#fff", border: "1px solid #cdd1d8", borderRadius: 6, fontSize: 12, cursor: empty ? "not-allowed" : "pointer", opacity: empty ? 0.5 : 1 }}>
      {label}
    </button>
  );
}
