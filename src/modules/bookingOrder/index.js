/* bookingOrder feature — public barrel.
   BUSINESS SUB-MODULE REORG (2026-07-13): SoPoGpVoucherEntry moved to
   accounts/daily-entry/soPoGpVoucherEntry.jsx — legacy.jsx re-exports it (and
   its private helpers) from there, so this barrel needed no changes itself. */
export * from './legacy';
