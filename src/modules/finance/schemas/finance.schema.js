/* Entity shapes for the finance feature. Plain factory shapes today, ready to
   wrap in z.object() when zod lands (mirrors the dashboard feature's approach).

   Example once zod is installed:

     import { z } from 'zod';
     export const trialBalanceRowSchema = z.object({
       group: z.string(),
       code: z.string(),
       ledger: z.string(),
       openingDebit: z.number(),  openingCredit: z.number(),
       debit: z.number(),         credit: z.number(),
       closingDebit: z.number(),  closingCredit: z.number(),
     });
*/

/** @typedef {Object} TrialBalanceRow
 *  @property {string} group  @property {string} code  @property {string} ledger
 *  @property {number} openingDebit  @property {number} openingCredit
 *  @property {number} debit  @property {number} credit
 *  @property {number} closingDebit  @property {number} closingCredit
 */

export const makeTrialBalanceRow = (o = {}) => ({
  group: '', code: '', ledger: '',
  openingDebit: 0, openingCredit: 0,
  debit: 0, credit: 0,
  closingDebit: 0, closingCredit: 0,
  ...o,
});
