// Generic "upload a statement file, store it in S3, extract rows if it's a
// PDF" hook — the browser side of POST /api/statement-files/parse. Deliberately
// NOT bank-reco-specific: any screen with a CSV/paste import (client / supplier
// / tally reconciliation) can reuse this same mutation for its own "Upload PDF"
// button by passing its own `module` (an S3 folder name only — no other
// coupling to Bank Reconciliation).
//
// Resolves to { key, fileName, headers, rows, rowCount, warning } — headers/
// rows are already shaped like the CSV/paste parser's output (rows: string[][]),
// so callers can feed them straight into their existing Map-Columns preview.

import { useMutation } from '@tanstack/react-query';
import { apiPost } from './api';

export function useParseStatementFile() {
  return useMutation({
    mutationFn: ({ file, module: mod }) => {
      const form = new FormData();
      form.append('file', file);
      if (mod) form.append('module', mod);
      return apiPost('/api/statement-files/parse', form);
    },
  });
}
