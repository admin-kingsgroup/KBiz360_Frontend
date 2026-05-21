import { getAllUnmatched } from '../../../core/business-logic';

export const getUnmatchedTickets = async (branch) => {
  const groups = getAllUnmatched?.(branch) || [];
  const totalCount = groups.reduce((sum, group) => sum + group.rows.length, 0);
  return { groups, totalCount };
};
