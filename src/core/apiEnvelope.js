// Unwrap the backend `{ success, data, ...siblings }` envelope. Returns `data`, BUT
// preserves any extra top-level siblings by hanging them on the returned value. Some
// endpoints (e.g. /api/accounting/gp-bills) return a bare-ARRAY `data` plus a top-level
// `byBranch` sibling — a plain unwrap to `json.data` silently dropped it, so the
// consolidated GP report always read `byBranch === undefined` and showed "no data".
// Keeping siblings on the returned array/object is generic and non-breaking: bare-array
// consumers ignore the extra property; sibling-readers (ReportGP consolidated) now work.
export function unwrapEnvelope(json) {
  if (!json || typeof json !== 'object' || !('data' in json)) return json;
  const data = json.data;
  if (data && typeof data === 'object') {
    for (const k of Object.keys(json)) {
      if (k === 'data' || k === 'success' || k === 'message') continue;
      if (!(k in data)) { try { data[k] = json[k]; } catch { /* frozen target — skip */ } }
    }
  }
  return data;
}
