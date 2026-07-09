// ─── TK GROUP CENTRAL · branchwise fan-out load state (pure) ─────────────────
// Every branchwise dashboard fans out one query per branch (useQueries). One rule for
// all of them, so partial failures read the same everywhere:
//   • a branch whose query errored is DROPPED from the table (never shown as a fake
//     ₹0/$0 row) and named in a BranchLoadNotice, while loaded branches still render;
//   • `allError` (every branch failed) is what drives the whole-table error state.
// `queries2` is the optional second fan-out (dashboards that join two endpoints per
// branch, e.g. P&L + invoice-GP): a branch is failed when EITHER of its queries errored
// (the row can't be built without both). `allFailed` means EVERY branch was dropped —
// there are no surviving rows — so the host shows the whole-table error state and the
// notice hides. This covers the one-endpoint-down case too: if /profit-and-loss fails
// for all branches but /invoice-gp succeeds, every branch still drops → allFailed → the
// table shows a real error, never a silently-empty table with a wrong "showing the rest".
export function branchLoadState(queries, view, queries2) {
  const a = queries || [];
  const b = queries2 || null;
  const v = view || [];
  const failedCodes = [];
  v.forEach((br, i) => {
    const e1 = !!(a[i] && a[i].isError);
    const e2 = b ? !!(b[i] && b[i].isError) : false;
    if (e1 || e2) failedCodes.push(br.code);
  });
  const all = b ? [...a, ...b] : a;
  return {
    loading: all.some((qq) => qq && qq.isLoading),
    allFailed: v.length > 0 && failedCodes.length === v.length,
    failedCodes,
  };
}
