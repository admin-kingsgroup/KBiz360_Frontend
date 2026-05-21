import { EXP_ACTUALS } from '../../../core/data';
import { filterExpensesByBranchMonth } from '../utils/transformers';
import { CURRENT_MONTH } from '../utils/constants';

export const getExpensesForBranchMonth = async (branchCode, month = CURRENT_MONTH) =>
  filterExpensesByBranchMonth(EXP_ACTUALS, branchCode, month);
