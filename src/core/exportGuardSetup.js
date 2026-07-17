// ─── Report/Export controls — app wiring ─────────────────────────────────────
// Wires the dormant export guard to the live app once, at boot: who is exporting
// (auth store), where the export trail is logged (POST /api/export-audit), how a
// blocked export tells the user (toast), and the current export policy (from the TK
// Group flags). Everything stays DORMANT until the Owner engages the export flags —
// with them off, canExport always allows and nothing is logged.
import { apiGet, apiPost } from './api';
import { useAuthStore } from '../store/auth';
import { configureExportGuard, setExportPolicy, readExportPolicy } from './exportGuard';

function toast(msg) {
  try { window.dispatchEvent(new CustomEvent('kb:toast', { detail: { id: `exp-block-${Date.now()}`, msg, kind: 'error', ttl: 3000 } })); }
  catch { /* ignore */ }
}

configureExportGuard({
  getUser: () => useAuthStore.getState().currentUser,
  // Fire-and-forget: a failed log must never block or surface over a download.
  log: (entry) => { apiPost('/api/export-audit', entry).catch(() => {}); },
  notify: toast,
});

// Pull the export policy from the flags. Refresh at boot (in case a session is
// already live) and once when a user signs in — the policy changes rarely, so a
// per-login snapshot is enough; anything unfetched stays OFF (dormant).
// /effective, NOT /api/tk/flags. The central-only read 403s for every branch-scoped user —
// i.e. exactly the people reports.restrict_export and reports.block_branch_group_export exist
// to restrict — so the policy silently stayed dormant for them and the guard could never
// bite. /effective serves the reports.* keys to any signed-in user, in the same shape.
function refreshPolicy() {
  apiGet('/api/tk/flags/effective')
    .then((state) => setExportPolicy(readExportPolicy(state)))
    .catch(() => { /* not authed yet / offline → stays dormant */ });
}
let loadedForUser = false;
useAuthStore.subscribe((state) => {
  if (state.currentUser && !loadedForUser) { loadedForUser = true; refreshPolicy(); }
  if (!state.currentUser) { loadedForUser = false; setExportPolicy({}); } // sign-out → dormant
});
refreshPolicy();
