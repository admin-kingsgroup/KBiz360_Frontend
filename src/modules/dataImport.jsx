/* ════════════════════════════════════════════════════════════════════
   MODULES/DATA-IMPORT.JSX

   Super-admin Tally → Books migration centre. For every data type you can
   download a CSV template (correct headers + one example row), fill it from
   your Tally export, and upload it — rows are pushed straight into the ERP
   backend (/api/import/:entity). Vouchers post their double-entry journals on
   import, so books/registers/reports populate immediately.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Download, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { card } from '../core/styles';
import { apiPost } from '../core/api';
import { VSPECS } from '../core/voucherSpecs';

const DARK = '#0d1326', BLUE = '#0070f2', DIM = '#5a6691', RED = '#A32D2D', GREEN = '#27500A';

// entity = the backend /api/import/:entity bucket. columns = template headers.
const SPECS = [
  // ── Masters ──────────────────────────────────────────────────────────────
  { group: 'Masters', entity: 'groups', label: 'Account Groups / Sub-Groups',
    desc: 'Custom groups under a parent. The 28 Tally groups are seeded & locked — only add your own.',
    columns: ['name', 'parent', 'active'],
    example: ['Reserves & Surplus', 'Capital Account', 'true'] },
  { group: 'Masters', entity: 'ledgers', label: 'Ledgers (Chart of Accounts)',
    desc: 'Opening balances + groups. Import groups first, then these.',
    columns: ['code', 'name', 'group', 'subGroup', 'branch', 'currency', 'openingBalance', 'drCr', 'active'],
    example: ['1001', 'Cash in Hand — BOM', 'Cash-in-Hand', '', 'BOM', 'INR', '50000', 'Dr', 'true'] },
  { group: 'Masters', entity: 'voucher-types', label: 'Voucher Types',
    desc: 'Parent type must be one of the 8 Tally types.',
    columns: ['name', 'parentType', 'abbreviation', 'numberingMethod', 'prefix', 'active'],
    example: ['Sales', 'Sales', 'Sale', 'Automatic', 'SF', 'true'] },
  { group: 'Masters', entity: 'cost-categories', label: 'Cost Categories',
    desc: 'Parallel cost-centre allocation sets.',
    columns: ['name', 'allocateRevenue', 'allocateNonRevenue', 'active'],
    example: ['Branch', 'true', 'false', 'true'] },
  { group: 'Masters', entity: 'budgets', label: 'Budgets',
    desc: 'Budget header (lines can be added in-app).',
    columns: ['name', 'branch', 'fromDate', 'toDate', 'amount', 'notes', 'active'],
    example: ['FY 2026 Operating', 'ALL', '2025-04-01', '2026-03-31', '8000000', 'Annual', 'true'] },
  { group: 'Masters', entity: 'scenarios', label: 'Scenarios',
    desc: 'Use “;” to separate multiple voucher types.',
    columns: ['name', 'includeActuals', 'voucherTypes', 'exclude', 'notes', 'active'],
    example: ['Provisional', 'true', 'Journal;Contra', '', 'Actuals + provisional', 'true'] },
  // ── Parties ──────────────────────────────────────────────────────────────
  { group: 'Parties', entity: 'customers', label: 'Customers (Clients)',
    desc: 'Sundry debtors. Also added to the chart as a Sundry Debtors ledger, so each is immediately selectable in vouchers and shows on the Balance Sheet.',
    columns: ['name', 'branch', 'phone', 'email'],
    example: ['Acme Travels', 'BOM', '+91 98200 00000', 'accounts@acme.com'] },
  { group: 'Parties', entity: 'suppliers', label: 'Suppliers',
    desc: 'Sundry creditors / vendors. Also added to the chart as a Sundry Creditors ledger, so each is immediately selectable in vouchers and shows on the Balance Sheet.',
    columns: ['name', 'category', 'type', 'branch', 'gstin', 'pan', 'contact', 'phone', 'email', 'city', 'country', 'creditDays', 'active'],
    example: ['Emirates GSA', 'Air', 'GSA', 'BOM', '27AABCE1234M1Z5', 'AABCE1234M', 'Mr. Khan', '+91 98201 00000', 'gsa@emirates.com', 'Mumbai', 'India', '7', 'true'] },
  // ── SO/PO/GP Voucher (imported as PENDING — NO books impact) ───────────────
  // One card PER MODULE, generated below from the live VSPECS so the columns match
  // each module's SO/PO/GP entry grid exactly. (see makeBookingSpecs)

  // ── Sales & Purchase by product (post double-entry on import) ──────────────
  // Same Link No on a sale + its purchase ties them for invoice-wise profit.
  // GST (CGST/SGST/IGST) is auto-summed; TOTAL is used as the invoice grand total.
  { group: 'Sales & Purchase', entity: 'ticket-sale', label: 'Tickets — Sale',
    desc: 'Air ticket sale to a client.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'CLIENT Name', 'Place Of Supply', 'Ticket Type', 'PAX Name', 'Ticket No', 'Sector', 'PNR Number', 'Airline', 'BASE FARE', 'K3', 'TAXES', 'OTHER TAXES', 'SERVICE CHARGE', 'CGST', 'SGST', 'IGST'],
    example: ['SF/26/0001', '2025-06-01', 'BOM', 'TKB-0001', 'Acme Travels', 'Maharashtra', 'Domestic', 'John Doe', '0987654321098', 'BOM-DXB', 'ABCDEF', 'EK', '10000', '200', '800', '0', '500', '315', '315', '0'] },
  { group: 'Sales & Purchase', entity: 'ticket-purchase', label: 'Tickets — Purchase',
    desc: 'Air ticket cost from a supplier/GSA.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'SUPPLIER Name', 'Place Of Supply', 'Ticket Type', 'PAX Name', 'Ticket No', 'Sector', 'PNR Number', 'Airline', 'BASE FARE', 'K3', 'TAXES', 'SERVICE CHARGE', 'CGST', 'SGST', 'IGST'],
    example: ['PF/26/0001', '2025-06-01', 'BOM', 'TKB-0001', 'Emirates GSA', 'Maharashtra', 'Domestic', 'John Doe', '0987654321098', 'BOM-DXB', 'ABCDEF', 'EK', '8000', '150', '600', '300', '270', '270', '0'] },
  { group: 'Sales & Purchase', entity: 'holiday-sale', label: 'Holiday — Sale',
    desc: 'Holiday package sale.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Passport No', 'Country', 'Start Date', 'Ending Date', 'Service Type', 'Holiday Package Sales', 'CGST Sale 2.5%', 'SGST Sale 2.5%', 'TCS @ 2%', 'Round Off', 'TOTAL INVOICE'],
    example: ['SH/26/0001', '2025-06-01', 'BOM', 'TKB-0002', 'Acme Travels', 'Maharashtra', 'John Doe', 'P1234567', 'India', '2025-06-10', '2025-06-15', 'Bali Package', '100000', '2500', '2500', '2100', '0', '107100'] },
  { group: 'Sales & Purchase', entity: 'holiday-purchase', label: 'Holiday — Purchase',
    desc: 'Holiday package cost from DMC.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'SUPPLIER Name', 'Place Of Supply', 'Guest Name', 'Passport No', 'Country', 'Start Date', 'Ending Date', 'Service Type', 'Holiday Package Purchase', 'CGST Pur 2.5%', 'SGST Pur 2.5%', 'TCS @ 2%', 'Discount /Commission received', 'Round Off', 'TOTAL INVOICE'],
    example: ['PH/26/0001', '2025-06-01', 'BOM', 'TKB-0002', 'Bali Tours DMC', 'Maharashtra', 'John Doe', 'P1234567', 'India', '2025-06-10', '2025-06-15', 'Bali Package', '85000', '2125', '2125', '0', '0', '0', '89250'] },
  { group: 'Sales & Purchase', entity: 'hotel-sale', label: 'Hotel — Sale',
    desc: 'Hotel booking sale.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'Check In', 'Check Out', 'HOTEL BASIC', 'HOTEL SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL'],
    example: ['SHT/26/0001', '2025-06-01', 'BOM', 'TKB-0003', 'Acme Travels', 'Maharashtra', 'John Doe', 'India', '2025-06-10', '2025-06-12', '20000', '1000', '2000', '690', '690', '0', '24380'] },
  { group: 'Sales & Purchase', entity: 'hotel-purchase', label: 'Hotel — Purchase',
    desc: 'Hotel cost from supplier.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'Check In', 'Check Out', 'HOTEL BASIC', 'HOTEL SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL', 'INCENTIVE/DISCOUNT', 'TDS DEDUCTED BY SUPPLIER'],
    example: ['PHT/26/0001', '2025-06-01', 'BOM', 'TKB-0003', 'Island Escapes', 'Maharashtra', 'John Doe', 'India', '2025-06-10', '2025-06-12', '18000', '500', '0', '462.5', '462.5', '0', '19425', '0', '0'] },
  { group: 'Sales & Purchase', entity: 'visa-sale', label: 'Visa — Sale',
    desc: 'Visa service sale.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'VISA TYPE', 'DURATION OF VISA', 'VISA BASIC', 'VISA SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL'],
    example: ['SV/26/0001', '2025-06-01', 'BOM', 'TKB-0004', 'Acme Travels', 'Maharashtra', 'John Doe', 'UAE', 'Tourist', '30 Days', '5000', '500', '500', '270', '270', '0', '6540'] },
  { group: 'Sales & Purchase', entity: 'visa-purchase', label: 'Visa — Purchase',
    desc: 'Visa cost from supplier (VFS etc.).',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'VISA TYPE', 'DURATION OF VISA', 'VISA BASIC', 'VISA SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL', 'INCENTIVE/DISCOUNT', 'TDS DEDUCTED BY SUPPLIER'],
    example: ['PV/26/0001', '2025-06-01', 'BOM', 'TKB-0004', 'VFS Global', 'Maharashtra', 'John Doe', 'UAE', 'Tourist', '30 Days', '4500', '0', '0', '112.5', '112.5', '0', '4725', '0', '0'] },
  { group: 'Sales & Purchase', entity: 'insurance-sale', label: 'Insurance — Sale',
    desc: 'Travel insurance sale.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'INSURANCE TYPE', 'DURATION OF VISA', 'INSURANCE BASIC', 'INSURANCE SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL'],
    example: ['SI/26/0001', '2025-06-01', 'BOM', 'TKB-0005', 'Acme Travels', 'Maharashtra', 'John Doe', 'India', 'Travel', '30 Days', '2000', '200', '300', '45', '45', '0', '2590'] },
  { group: 'Sales & Purchase', entity: 'insurance-purchase', label: 'Insurance — Purchase',
    desc: 'Insurance cost from supplier.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'INSURANCE TYPE', 'DURATION OF VISA', 'INSURANCE BASIC', 'INSURANCE SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL', 'INCENTIVE/DISCOUNT', 'TDS DEDUCTED BY SUPPLIER'],
    example: ['PI/26/0001', '2025-06-01', 'BOM', 'TKB-0005', 'Insure Co', 'Maharashtra', 'John Doe', 'India', 'Travel', '30 Days', '1800', '0', '0', '45', '45', '0', '1890', '0', '0'] },
  { group: 'Sales & Purchase', entity: 'car-sale', label: 'Car Rental — Sale',
    desc: 'Car rental sale.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'CAR TYPE', 'DISTANCE COVERED', 'BASIC VALUE', 'SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL'],
    example: ['SC/26/0001', '2025-06-01', 'BOM', 'TKB-0006', 'Acme Travels', 'Maharashtra', 'John Doe', 'India', 'Sedan', '150 km', '3000', '300', '500', '342', '342', '0', '4484'] },
  { group: 'Sales & Purchase', entity: 'car-purchase', label: 'Car Rental — Purchase',
    desc: 'Car rental cost from supplier.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'CAR TYPE', 'DISTANCE COVERED', 'BASIC VALUE', 'SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL', 'INCENTIVE/DISCOUNT', 'TDS DEDUCTED BY SUPPLIER'],
    example: ['PC/26/0001', '2025-06-01', 'BOM', 'TKB-0006', 'City Cabs', 'Maharashtra', 'John Doe', 'India', 'Sedan', '150 km', '2800', '0', '0', '252', '252', '0', '3304', '0', '0'] },
  { group: 'Sales & Purchase', entity: 'misc-sale', label: 'Other/Misc — Sale',
    desc: 'Any other service sale.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'SERVICE TYPE', 'NARRATION', 'BASIC VALUE', 'SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL'],
    example: ['SM/26/0001', '2025-06-01', 'BOM', 'TKB-0007', 'Acme Travels', 'Maharashtra', 'John Doe', 'India', 'Documentation', 'Misc service', '1000', '100', '200', '117', '117', '0', '1534'] },
  { group: 'Sales & Purchase', entity: 'misc-purchase', label: 'Other/Misc — Purchase',
    desc: 'Any other service cost.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'LINK NO', 'Party Ledger Name', 'Place Of Supply', 'Guest Name', 'Country', 'SERVICE TYPE', 'NARRATION', 'BASIC VALUE', 'SERVICE CHARGE', 'MARKUP', 'CGST', 'SGST', 'IGST', 'TOTAL', 'INCENTIVE/DISCOUNT', 'TDS DEDUCTED BY SUPPLIER'],
    example: ['PM/26/0001', '2025-06-01', 'BOM', 'TKB-0007', 'Misc Vendor', 'Maharashtra', 'John Doe', 'India', 'Documentation', 'Misc service', '900', '0', '0', '81', '81', '0', '1062', '0', '0'] },

  // ── Other vouchers (post double-entry on import) ───────────────────────────
  { group: 'Vouchers', entity: 'receipt', label: 'Receipts',
    desc: 'Dr bank/cash · Cr customer.',
    columns: ['vno', 'date', 'branch', 'party', 'total', 'paymentMode', 'remarks'],
    example: ['RV/26/0001', '2025-06-02', 'BOM', 'Acme Travels', '11800', 'HDFC Bank', 'Against SF/26/0001'] },
  { group: 'Vouchers', entity: 'payment', label: 'Payments',
    desc: 'Dr supplier · Cr bank/cash.',
    columns: ['vno', 'date', 'branch', 'party', 'total', 'paymentMode', 'remarks'],
    example: ['PMT/26/0001', '2025-06-03', 'BOM', 'Emirates GSA', '9440', 'HDFC Bank', 'Against PF/26/0001'] },
  { group: 'Vouchers', entity: 'journal', label: 'Journal',
    desc: 'Dr one ledger · Cr another, same amount.',
    columns: ['vno', 'date', 'branch', 'debitLedger', 'creditLedger', 'amount', 'remarks'],
    example: ['JV/26/0001', '2025-06-30', 'BOM', 'Rent & Utilities', 'Accounts Payable', '25000', 'June rent'] },
  { group: 'Vouchers', entity: 'purchase-expense', label: 'Purchase Voucher (Expense / Asset)',
    desc: 'Supplier expense / asset bought on credit. ⏳ Approval-gated (like SO/PO/GP): each row imports as a PENDING voucher with NO books impact — approve it under Finance ▸ Purchase Expense ▸ Pending to post (Dr ledger + input GST · Cr supplier, net of TDS).',
    columns: ['vno', 'date', 'branch', 'party', 'partyGroup', 'ledger', 'description', 'subtotal', 'gstMode', 'taxAmt', 'tdsAmt', 'total', 'billNo', 'remarks'],
    example: ['PXP/26/0001', '2025-06-30', 'BOM', 'ABC Realtors', 'Sundry Creditors', 'Office Rent', 'June 2026 office rent', '25000', 'intra', '4500', '500', '29500', 'VEND-4471', 'Being office rent for June payable to ABC Realtors'] },
  { group: 'Vouchers', entity: 'contra', label: 'Contra',
    desc: 'Bank ↔ cash transfer (from → to).',
    columns: ['vno', 'date', 'branch', 'fromAccount', 'toAccount', 'total', 'remarks'],
    example: ['CV/26/0001', '2025-06-04', 'BOM', 'HDFC Bank', 'Cash in Hand — BOM', '50000', 'Cash withdrawal'] },
  { group: 'Vouchers', entity: 'credit-note', label: 'Credit Notes (Sales Return)',
    desc: 'Dr sales + GST · Cr customer. Link No ties it to the original file.',
    columns: ['vno', 'date', 'branch', 'party', 'ledger', 'subtotal', 'taxAmt', 'total', 'linkNo', 'remarks'],
    example: ['SCN/26/0001', '2025-06-05', 'BOM', 'Acme Travels', 'Sales — Air Tickets', '2000', '360', '2360', 'TKB-0001', 'Partial refund'] },
  { group: 'Vouchers', entity: 'debit-note', label: 'Debit Notes (Purchase Return)',
    desc: 'Dr supplier · Cr purchase + GST. Link No ties it to the original file.',
    columns: ['vno', 'date', 'branch', 'party', 'ledger', 'subtotal', 'taxAmt', 'total', 'linkNo', 'remarks'],
    example: ['DB/26/0001', '2025-06-05', 'BOM', 'Emirates GSA', 'Purchase — Air Tickets', '1000', '180', '1180', 'TKB-0001', 'Ticket void'] },
  // Refund / Reissue raised against a sale. The customer figure is DERIVED so the
  // entry always balances — Original Fare/Cancellation (refund) or Change Fee/Fare
  // Difference (reissue) drive the supplier leg; Service Charge + Markup + GST are
  // our retained income. Put the original sale's Link No to tie it for invoice GP.
  { group: 'Vouchers', entity: 'refund', label: 'Refund Voucher (against Sale)',
    desc: 'Cancellation of a sale. Dr supplier (net of its charges) + supplier service charge (to Purchase — <Module>) + Input GST · Cr customer + service charge/markup + Output GST. The supplier’s service charge is your own cost (reduces GP) and is NOT deducted from the customer: Customer refund = (Original Fare − Cancellation) − Service Charge − Markup − GST. Against Invoice (sale) AND Against Purchase are both required — one voucher settles both sides.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'Against Invoice', 'Against Purchase', 'Link No', 'Module', 'Place Of Supply', 'Customer Name', 'Customer Group', 'Supplier Name', 'Supplier Group', 'PNR / Ref', 'Ticket No / Ref', 'Original Fare', 'Cancellation Charge', 'Supplier Service Charge', 'Supplier GST', 'Service Charge', 'Markup', 'CGST', 'SGST', 'IGST', 'Narration'],
    example: ['RF/26/0001', '2025-06-10', 'BOM', 'SF/26/0001', 'PF/26/0001', 'TKB-0001', 'Flight', 'Maharashtra', 'Acme Travels', 'Sundry Debtors', 'Emirates GSA', 'Sundry Creditors', 'ABCDEF', '0987654321098', '11000', '1000', '200', '36', '500', '300', '72', '72', '0', 'Refund of ticket PNR ABCDEF against SF/26/0001'] },
  { group: 'Vouchers', entity: 'reissue', label: 'Reissue Voucher (against Sale)',
    desc: 'Amendment of a sale. Dr customer + supplier service charge (to Purchase — <Module>) + Input GST · Cr supplier (incl. its charges) + service charge/markup + Output GST. The supplier’s service charge is your own cost (reduces GP) and is NOT added to the customer: Customer bill = (Change Fee + Fare Difference) + Service Charge + Markup + GST. Against Invoice (sale) AND Against Purchase are both required — one voucher settles both sides.',
    columns: ['Vch No', 'Vch Date', 'Branch', 'Against Invoice', 'Against Purchase', 'Link No', 'Module', 'Place Of Supply', 'Customer Name', 'Customer Group', 'Supplier Name', 'Supplier Group', 'PNR / Ref', 'Ticket No / Ref', 'Change Fee', 'Fare Difference', 'Supplier Service Charge', 'Supplier GST', 'Service Charge', 'Markup', 'CGST', 'SGST', 'IGST', 'Narration'],
    example: ['RI/26/0001', '2025-06-12', 'BOM', 'SF/26/0001', 'PF/26/0001', 'TKB-0001', 'Flight', 'Maharashtra', 'Acme Travels', 'Sundry Debtors', 'Emirates GSA', 'Sundry Creditors', 'ABCDEF', '0987654321098', '2000', '1500', '200', '36', '500', '300', '72', '72', '0', 'Reissue of ticket PNR ABCDEF against SF/26/0001'] },
];

// Inject the optional "Reference Ledger" column into every Sales & Purchase
// template, right after the party column. On a SALE it's the debtor the invoice
// posts to — a B2C/B2B/B2E sub-group ledger under Sundry Debtors (e.g. "B2C Ref
// Harshit Jha", "B2C Meta Sayli Naik"). On a PURCHASE it's the creditor — a
// supplier sub-group ledger under Sundry Creditors (e.g. "Supplier Air Lines"
// member). Leave blank to fall back to the Client/Supplier name. The importer
// guards the side so debtor and creditor sub-groups never mix.
for (const s of SPECS) {
  if (s.group !== 'Sales & Purchase') continue;
  const pIdx = s.columns.findIndex((c) => /client name|supplier name|party ledger name/i.test(c));
  const at = pIdx >= 0 ? pIdx + 1 : s.columns.length;
  const isSale = /-sale$/.test(s.entity);
  s.columns.splice(at, 0, 'Reference Ledger');
  s.example.splice(at, 0, isSale ? 'B2C Ref Harshit Jha' : '');
  // PURCHASE only: file a NEW supplier ledger under the chosen creditor sub-group
  // (Supplier Air Lines / Supplier B2B / Supplier Others). Blank → Sundry Creditors.
  if (!isSale) {
    s.columns.splice(at + 1, 0, 'Supplier Group');
    s.example.splice(at + 1, 0, 'Supplier Air Lines');
  }
}

/* ── SO/PO/GP Voucher bulk templates — one per module, built from VSPECS so the
   columns exactly match each module's entry grid. The module is fixed by the
   entity (booking-<module>); rows are per-passenger lines grouped by Link No. ── */
const BOOKING_ENTITY = { SF: 'booking-flight', SH: 'booking-holiday', SHT: 'booking-hotel', SV: 'booking-visa', SI: 'booking-insurance', SC: 'booking-car', SM: 'booking-misc' };
const BOOKING_HEADER_SAMPLE = { SF: 'TIR-JAI / IndiGo', SH: 'Bali / Honeymoon', SHT: 'Taj Lands End / Mumbai', SV: 'UAE / VFS', SI: 'Schengen / TATA AIG', SC: 'BOM-Pune / Ola', SM: 'Documentation / Vendor' };
const BOOKING_SUPPLIER_SAMPLE = { SF: ['IndiGo GSA', 'Supplier Air Lines'], SH: ['Bali Tours DMC', 'Sundry Creditors'], SHT: ['Island Escapes', 'Sundry Creditors'], SV: ['VFS Global', 'Sundry Creditors'], SI: ['TATA AIG', 'Sundry Creditors'], SC: ['City Cabs', 'Sundry Creditors'], SM: ['Misc Vendor', 'Sundry Creditors'] };
const r2x = (n) => Math.round((Number(n) || 0) * 100) / 100;

function makeBookingSpec(code) {
  const sp = VSPECS[code];
  const hasPkg = code === 'SF' || code === 'SH';
  const header = ['Link No', 'Branch', 'Date', sp.headerLabel, 'Customer Name', 'Customer Sub-Group', 'Supplier Name', 'Supplier Sub-Group', ...(hasPkg ? ['Package Type'] : []), 'GST Mode'];
  const idLabels = sp.idCols.map((c) => c.label);
  const fareLabels = sp.fareCols.map((c) => c.label);
  const tail = ['Supplier Service', 'Supplier Service GST', 'Markup', 'Markup GST', 'Service Charge', 'Service Charge GST'];
  const columns = [...header, ...idLabels, ...fareLabels, ...tail];

  const seed = (sp.seed && sp.seed[0]) || {};
  const n = (v) => Number(v) || 0;
  const [supName, supGrp] = BOOKING_SUPPLIER_SAMPLE[code];
  const exHeader = ['BKL-0001', 'BOM', '2025-06-18', BOOKING_HEADER_SAMPLE[code], 'Global Konnection', 'B2B Clients', supName, supGrp, ...(hasPkg ? ['Domestic'] : []), 'intra'];
  const exId = sp.idCols.map((c) => String(seed[c.key] ?? ''));
  const exFare = sp.fareCols.map((c) => String(n(seed[c.key])));
  const exTail = [String(n(seed.psvc)), String(r2x(n(seed.psvc) * 0.18)), String(n(seed.markup)), String(r2x(n(seed.markup) * 0.18 / 1.18)), String(n(seed.ssvc)), String(r2x(n(seed.ssvc) * 0.18))];
  const example = [...exHeader, ...exId, ...exFare, ...exTail];

  return {
    group: 'SO/PO/GP Voucher', entity: BOOKING_ENTITY[code], label: `${sp.name} — SO/PO/GP (bulk)`,
    desc: `One row = one ${code === 'SHT' ? 'guest' : 'passenger'}/line for a ${sp.name} booking (same fields as the SO/PO/GP Voucher screen). Put the SAME Link No on rows of one booking (multi-line); blank = a standalone single-line booking. Supplier Service is an agency cost (reduces GP). The three “… GST” columns are optional — blank = auto (markup GST-inclusive; service & supplier-service @18%), or fill to import the exact GST. Header fields are read from the first row of each Link No. Imported as PENDING — approve to post the linked Sales & Purchase invoices.`,
    columns, example,
  };
}
for (const code of ['SF', 'SH', 'SHT', 'SV', 'SI', 'SC', 'SM']) SPECS.push(makeBookingSpec(code));

const GROUPS = ['Masters', 'Parties', 'SO/PO/GP Voucher', 'Sales & Purchase', 'Vouchers'];

/* ── Tax regime (India GST vs Africa VAT) ──────────────────────────────────
   India templates carry GST (CGST/SGST/IGST) + India-only TCS/TDS/incentive
   columns. The Africa branches (NBO/DAR/FBM) run VAT, so for the VAT regime we
   collapse the GST columns into ONE "VAT" column, drop the India-only tax
   columns, and switch the example branch → NBO / currency → USD. The backend
   sums any cgst|sgst|igst|vat column into taxAmt and posts it per the branch's
   regime (VAT Output/Input for Africa, CGST/SGST for India), so a VAT file just
   works. Sub-groups and non-tax columns are identical across regimes. */
const REGIMES = [
  { key: 'GST', label: 'India · GST', hint: 'BOM · AMD · TKHO' },
  { key: 'VAT', label: 'Africa · VAT', hint: 'NBO · DAR · FBM' },
];
const isGstCol = (c) => /cgst|sgst|igst/i.test(c);
const isIndiaOnlyCol = (c) => /\btcs\b/i.test(c) || /tds deducted/i.test(c) || /incentive\s*\/\s*discount/i.test(c);

// Re-point an example cell to a VAT branch (NBO/USD/Nairobi); blank the
// BOM-specific Reference Ledger sample so users pick their own branch's ledger.
function vatExampleCell(col, val) {
  if (/currency/i.test(col)) return 'USD';
  if (/^branch$/i.test(col)) return 'NBO';
  if (/reference ledger/i.test(col)) return '';
  return String(val ?? '').replace(/\bBOM\b/g, 'NBO').replace(/Maharashtra/gi, 'Nairobi');
}

// Derive the branch/regime-specific template from a base (India/GST) spec.
function applyRegime(spec, regime) {
  if (regime !== 'VAT') return spec; // India / default — unchanged
  const cols = []; const ex = [];
  let vatDone = false;
  const vatSample = spec.columns.reduce((s, c, i) => (isGstCol(c) ? s + (Number(spec.example[i]) || 0) : s), 0);
  spec.columns.forEach((c, i) => {
    if (isGstCol(c)) { if (!vatDone) { cols.push('VAT'); ex.push(String(vatSample || 0)); vatDone = true; } return; }
    if (isIndiaOnlyCol(c)) return; // drop India-only TCS/TDS/incentive columns
    cols.push(c); ex.push(vatExampleCell(c, spec.example[i]));
  });
  return { ...spec, columns: cols, example: ex };
}

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadTemplate(spec) {
  const csv = spec.columns.join(',') + '\n' + spec.example.map(csvCell).join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${spec.entity}-template.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const out = [];
  let field = '', row = [], inQ = false;
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function rowsFromCSV(text, columns) {
  const grid = parseCSV(text);
  if (!grid.length) return [];
  const headers = grid[0].map((h) => h.trim());
  return grid.slice(1).map((cells) => {
    const o = {};
    headers.forEach((h, i) => { if (columns.includes(h)) o[h] = (cells[i] ?? '').trim(); });
    return o;
  });
}

/* ── UI ──────────────────────────────────────────────────────────────────── */
const btn = (bg, fg, outline) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: bg, color: fg, border: outline ? `1px solid ${fg}33` : 'none' });

function EntityCard({ spec, onUpload, state }) {
  const inputId = `imp-${spec.entity}`;
  return (
    <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileSpreadsheet size={17} style={{ color: BLUE }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{spec.label}</div>
          <div style={{ fontSize: 10.5, color: DIM, marginTop: 2 }}>{spec.desc}</div>
        </div>
      </div>
      <div style={{ fontSize: 9.5, color: '#9aa2c0', fontFamily: 'monospace', wordBreak: 'break-word' }}>{spec.columns.join(', ')}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => downloadTemplate(spec)} style={btn('#fff', BLUE, true)}><Download size={13} /> Template</button>
        <label htmlFor={inputId} style={btn(BLUE, '#fff')}>
          <Upload size={13} /> {state?.busy ? 'Uploading…' : 'Upload CSV'}
        </label>
        <input id={inputId} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(spec, f); e.target.value = ''; }} />
      </div>
      {state?.result && (
        <div style={{ fontSize: 11, padding: '8px 10px', borderRadius: 6, background: state.result.failed?.length ? '#fff7ed' : '#ecfdf3', border: `1px solid ${state.result.failed?.length ? '#fed7aa' : '#bbf7d0'}` }}>
          <div style={{ fontWeight: 700, color: state.result.failed?.length ? '#854F0B' : GREEN, display: 'flex', alignItems: 'center', gap: 6 }}>
            {state.result.failed?.length ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            {state.result.inserted}/{state.result.total} imported{state.result.failed?.length ? `, ${state.result.failed.length} failed` : ''}
          </div>
          {state.result.failed?.slice(0, 5).map((f, i) => (
            <div key={i} style={{ color: RED, marginTop: 3 }}>Row {f.row}: {f.error}</div>
          ))}
          {state.result.failed?.length > 5 && <div style={{ color: DIM, marginTop: 3 }}>…and {state.result.failed.length - 5} more</div>}
          {state.result.createdLedgers?.length > 0 && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #bbf7d0' }}>
              <div style={{ fontWeight: 700, color: GREEN }}>
                {state.result.createdLedgers.length} ledger{state.result.createdLedgers.length > 1 ? 's' : ''} created in the Chart of Accounts:
              </div>
              {state.result.createdLedgers.slice(0, 8).map((l, i) => (
                <div key={i} style={{ color: '#27500A', marginTop: 2 }}>
                  • <strong>{l.name}</strong> → {l.group}{l.subGroup ? ` ▸ ${l.subGroup}` : ''}
                </div>
              ))}
              {state.result.createdLedgers.length > 8 && <div style={{ color: DIM, marginTop: 2 }}>…and {state.result.createdLedgers.length - 8} more</div>}
            </div>
          )}
        </div>
      )}
      {state?.error && <div style={{ fontSize: 11, color: RED, fontWeight: 600 }}>⚠ {state.error}</div>}
    </div>
  );
}

// Confirm-before-create gate. Bulk upload never creates a ledger silently: when an
// upload would add new ledgers to the Chart of Accounts, we first show exactly which
// ones and where each is filed (Group ▸ Sub-Group), and only import on "Yes".
function LedgerConfirmModal({ spec, newLedgers, busy, onYes, onNo }) {
  const n = newLedgers.length;
  return (
    <div onClick={onNo} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(580px, 96vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #eef1f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={17} style={{ color: '#854F0B' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: DARK }}>Create {n} new ledger{n > 1 ? 's' : ''}?</h3>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: DIM }}>
            “{spec.label}” will add the following to your Chart of Accounts. Review where each ledger is filed, then confirm to create {n > 1 ? 'them' : 'it'} and run the import. Nothing is created if you cancel.
          </p>
        </div>
        <div style={{ overflow: 'auto', padding: '4px 18px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: DIM, position: 'sticky', top: 0, background: '#fff' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid #eef1f6' }}>New Ledger</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #eef1f6' }}>Group</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #eef1f6' }}>Sub-Group</th>
              </tr>
            </thead>
            <tbody>
              {newLedgers.map((l, i) => (
                <tr key={i}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f5f9', fontWeight: 600, color: DARK }}>{l.name}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f5f9', color: BLUE, fontWeight: 600 }}>{l.group || '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f5f9', color: DIM }}>{l.subGroup || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid #eef1f6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onNo} disabled={busy} style={{ ...btn('#fff', DIM, true), opacity: busy ? 0.5 : 1 }}>Cancel</button>
          <button onClick={onYes} disabled={busy} style={{ ...btn(BLUE, '#fff'), opacity: busy ? 0.6 : 1 }}>
            <CheckCircle2 size={13} /> {busy ? 'Creating…' : `Yes, create & import`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataImportPage({ currentUser }) {
  const [states, setStates] = useState({}); // entity → { busy, result, error }
  const [regime, setRegime] = useState('GST'); // India (GST) | Africa (VAT) template variant
  const [confirm, setConfirm] = useState(null); // { spec, rows, newLedgers } pending ledger-create confirmation

  if (currentUser && currentUser.role !== 'Super Admin') {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', textAlign: 'center', color: DIM }}>
        <ShieldAlert size={30} style={{ color: '#854F0B', marginBottom: 10 }} />
        <h2 style={{ margin: 0, fontSize: 16, color: DARK }}>Restricted</h2>
        <p style={{ fontSize: 12.5 }}>Data migration is available to the Super Admin only.</p>
      </div>
    );
  }

  const setState = (entity, patch) => setStates((s) => ({ ...s, [entity]: { ...s[entity], ...patch } }));

  // Run the real import (creates the confirmed ledgers + posts vouchers), then
  // surface where each new ledger landed.
  const runImport = async (spec, rows) => {
    setState(spec.entity, { busy: true, error: '', result: null });
    try {
      const result = await apiPost(`/api/import/${spec.entity}`, { rows });
      setState(spec.entity, { busy: false, result });
    } catch (e) {
      setState(spec.entity, { busy: false, error: e.message });
    }
  };

  const onUpload = async (spec, file) => {
    setState(spec.entity, { busy: true, error: '', result: null });
    try {
      const text = await file.text();
      const rows = rowsFromCSV(text, spec.columns);
      if (!rows.length) throw new Error('No data rows found in the file');
      // Step 1 — dry-run: which NEW ledgers would this upload create, and where?
      // Nothing is written yet.
      const preview = await apiPost(`/api/import/${spec.entity}/preview`, { rows });
      setState(spec.entity, { busy: false });
      if (preview.newLedgers?.length) {
        // Step 2 — ask before creating any ledger. Import only runs on "Yes".
        setConfirm({ spec, rows, newLedgers: preview.newLedgers });
      } else {
        // No new ledgers — nothing to confirm; import straight through.
        await runImport(spec, rows);
      }
    } catch (e) {
      setState(spec.entity, { busy: false, error: e.message });
    }
  };

  const confirmYes = async () => {
    const { spec, rows } = confirm;
    setState(spec.entity, { busy: true });
    await runImport(spec, rows);
    setConfirm(null);
  };
  const confirmNo = () => {
    if (confirm) setState(confirm.spec.entity, { busy: false, error: 'Cancelled — no ledgers were created and nothing was imported.' });
    setConfirm(null);
  };

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Data Import — Tally Migration</h2>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>
          Download a template, fill it from your Tally export, and upload. Recommended order:
          <strong> Ledgers → Customers/Suppliers → Vouchers</strong>. Voucher imports auto-post double-entry to the books.
          {' '}On Sales & Purchase, put the <strong>same Link No</strong> on a sale and its related purchase(s) to tie them for invoice-wise profit.
          {' '}If an upload would add new ledgers to your Chart of Accounts, you’ll be asked to <strong>confirm</strong> first — showing exactly which ledgers and under which group ▸ sub-group — and nothing is created until you approve.
        </p>
      </div>

      {/* Tax-regime selector: swaps GST↔VAT tax columns + example branch/currency. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: DIM }}>Template region:</span>
        <div style={{ display: 'inline-flex', border: '1px solid #d6dbe6', borderRadius: 8, overflow: 'hidden' }}>
          {REGIMES.map((r) => (
            <button key={r.key} onClick={() => setRegime(r.key)} title={r.hint}
              style={{ padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                background: regime === r.key ? BLUE : '#fff', color: regime === r.key ? '#fff' : DIM }}>
              {r.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 10.5, color: DIM }}>
          {regime === 'VAT'
            ? 'VAT branches (NBO/DAR/FBM): one VAT column, USD, no GST/TCS/TDS.'
            : 'GST branches (BOM/AMD/TKHO): CGST/SGST/IGST + TCS/TDS as applicable.'}
        </span>
      </div>

      {GROUPS.map((g) => (
        <div key={g} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: BLUE, marginBottom: 8 }}>{g}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {SPECS.filter((s) => s.group === g).map((s) => (
              <EntityCard key={s.entity} spec={applyRegime(s, regime)} state={states[s.entity]} onUpload={onUpload} />
            ))}
          </div>
        </div>
      ))}

      {confirm && (
        <LedgerConfirmModal
          spec={confirm.spec}
          newLedgers={confirm.newLedgers}
          busy={!!states[confirm.spec.entity]?.busy}
          onYes={confirmYes}
          onNo={confirmNo}
        />
      )}
    </div>
  );
}
