import { GP_BILLS } from '../../../core/data';
import {
  filterBillsByBranchPeriod,
  filterBillsFromDate,
} from '../utils/transformers';
import { CURRENT_MONTH, PREV_MONTH, FY_START } from '../utils/constants';

/**
 * Data access for bills. Today these are synchronous reads against the seed
 * data; when the backend lands, swap the bodies for `fetch()` calls — the
 * return shapes stay identical, so hooks and components don't change.
 */

export const getBillsForBranchMonth = async (branchCode, month = CURRENT_MONTH) =>
  filterBillsByBranchPeriod(GP_BILLS, branchCode, month);

export const getBillsForPreviousMonth = async (branchCode) =>
  filterBillsByBranchPeriod(GP_BILLS, branchCode, PREV_MONTH);

export const getBillsYearToDate = async (branchCode) =>
  filterBillsFromDate(GP_BILLS, branchCode, FY_START);
