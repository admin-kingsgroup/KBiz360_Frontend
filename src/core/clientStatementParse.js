/* Parse a pasted/upload client statement into normalized rows for import.
 * A client statement has the SAME column shape as a vendor statement
 * (date, invoiceNo, debit, credit, [description]) — debit = the client owes
 * more (an invoice), credit = they owe less (a receipt) — so we reuse the
 * supplier parser rather than duplicate the CSV/date/amount handling. */
export { parseSupplierStatement as parseClientStatement, normDate } from './supplierStatementParse';
