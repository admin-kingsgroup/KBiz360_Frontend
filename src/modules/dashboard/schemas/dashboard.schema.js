/**
 * Entity shapes consumed by the dashboard feature.
 *
 * These are plain object factories today. Once `zod` is installed, wrap each
 * factory in `z.object({ ... })` and rename them to `…Schema`; the consumer
 * contracts will not change because the field names are stable.
 *
 *   import { z } from 'zod';
 *   export const billSchema = z.object({ id: z.string(), branch: z.string(), ... });
 *
 * The factories below are useful for tests, fixtures, and form defaults.
 */

export const makeBill = (overrides = {}) => ({
  id: '',
  branch: '',
  date: '',
  mod: 'Flight',
  consultant: '',
  sell: 0,
  cost: 0,
  ...overrides,
});

export const makeActionItem = (overrides = {}) => ({
  type: 'info', // 'info' | 'warn' | 'success'
  icon: '',
  text: '',
  route: null,
  urgent: false,
  ...overrides,
});

export const makeBookingFile = (overrides = {}) => ({
  id: '',
  client: '',
  clientName: '',
  destination: '',
  dest: '',
  travelDate: '',
  departure: '',
  mod: 'Flight',
  pax: 1,
  ...overrides,
});

export const makeBankAccount = (overrides = {}) => ({
  id: '',
  bank: '',
  branch: '',
  accountNo: '',
  currency: 'INR',
  openingBal: 0,
  limit: 0,
  ...overrides,
});

export const makeConsultantStats = (overrides = {}) => ({
  name: '',
  rev: 0,
  gp: 0,
  cnt: 0,
  ...overrides,
});

export const makeModuleKpis = (overrides = {}) => ({
  mod: '',
  rev: 0,
  gp: 0,
  cnt: 0,
  ...overrides,
});

export const makeBranchKpis = (overrides = {}) => ({
  revenue: 0,
  cost: 0,
  gp: 0,
  gpPct: 0,
  bookings: 0,
  ...overrides,
});
