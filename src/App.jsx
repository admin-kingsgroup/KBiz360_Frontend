/* ════════════════════════════════════════════════════════════════════
   App.jsx — KBiz360 root component
   Composes the entire app: routes, state, layout shell.
   See PROJECT_CONTEXT.md for full architecture.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { LoginScreen } from './auth/LoginScreen';
import { BRANCHES } from './core/data';
import { BudgetPlanning, DashboardRouter, DocumentTypeMaster, FxRevaluation, GratuityRegister, MarkupRateSheet, MsmeTracker, PackagePnL, PendingApprovals, Recruitment, SeatInventory, SubAgentStatement, TdsCertRegister, TrainingRecords, UxPreferences } from './core/helpers';
import { useMobile } from './core/hooks';
import { PERM_MODULES, ROLE_TEMPLATES } from './core/permissions';
import { RPT_ABCAnalysis, RPT_Attrition, RPT_AuditTrail, RPT_BirthdayCalendar, RPT_CashPosition, RPT_CurrencyExposure, RPT_CustomerLTV, RPT_FSNotes, RPT_InterbranchElim, RPT_LeaveUtilization, RPT_StatutoryDues, RPT_TaxFilingBoard, RPT_YieldConsultant, RPT_YieldDestination, RPT_YieldSupplier, RPT_YoY } from './core/styles';
import { AcmRegister, AssetDepreciation, AssetDisposal, BlockOfAssets, FixedAssetRegister } from './modules/assets';
import { Dashboard } from './modules/dashboard';
import { BankBalanceDashboard, BankReco, CashBookReport, CashFlowDirect, CashFlowForecast, DayBook, InterestCalculator, InvestmentDeclaration, InvestmentRegister, LedgerAc, LoanAmortization, LoanEmiRegister, ReconciliationQueue, TDSCalculator, TrialBalance, WorkingCapitalDashboard, YearEndClose } from './modules/finance';
import { AuthorityConfigCenter, BankingApiSettings, CentralAuditQueue, DelegationsManager, GroupDashboard, GroupMonthlyDashboard, HOAssetProcurement, HOBankingControl, HOVendorMasterLock, PeriodLockControl, PeriodLocking, StatutoryFilingRegister } from './modules/ho-control';
import { EmployeeAdvances, EmployeeMasterTabbed, ExpenseBudget, Feedback360, HRPortal, HrAttendance, HrEmployees, HrExpenses, HrLeave, HrPayroll, HrPayslips, LeaveApply, MyPayslip, PerformanceReview, PfEsiChallan, ReimbursementClaim, SalaryRevision, SkillMatrix } from './modules/hr';
import { ApprovalLimitsMaster, BankAccountMaster, BulkImportMaster, ChartOfAccounts, CostCenterMaster, CurrencyMaster, CustomerMasterDetail, CustomerMasterTabbed, MasterChangeQueue, MastersAirlines, MastersCustomers, MastersForex, MastersHotels, MastersLedgers, MastersSubAgents, MastersSuppliers, MastersTaxRates, MergeRecordsUtility, NumberingSeriesMaster, PassportManager, ProjectMaster, Supplier360, SupplierMasterTabbed, TourCodeMaster, VendorAdvances, VendorTermsMaster } from './modules/masters';
import { ClientConcentration, ClientStatement, ConsolidatedBS, ConsultantReport, CustomReportBuilder, DestinationIntelligence, ForexReport, IntercompanyBilling, MisReport, RatioAnalysis, ReportBS, ReportBranch, ReportCF, ReportCommission, ReportExpenseBgt, ReportGP, ReportPackagePnL, ReportPayables, ReportPnL, ReportReceivables, ReportSalesReg, ReportViewerTabbed, ReportsMetaDemo, SavedReportViews, ScheduleIIIBS, ScheduledReports, VarianceAnalysis } from './modules/reports';
import { ApiKeySettings, ApprovalMatrixBuilder, ApprovalWorkflow, BrandingSettings, BulkUserOperations, CustomFieldsManager, DocTemplateEditor, EmailSMSTemplates, FieldAccessControl, GspIrpSettings, PermissionsMatrix, SettingsAudit, SettingsBranches, SettingsCompany, SettingsUsers } from './modules/settings';
import { EWayBill, Form16AGenerator, Form16Generator, Form26AS, GSTR1Prep, GSTR3BPrep, Gstr2aReco, Gstr9c, GstrRecon, TallyExport, TaxAudit3CD, TaxCalendar, TaxCalendarV2, TaxEInvoice, TaxGstr1, TaxGstr3b, TaxRcm, TaxTdsTcs, TaxVat } from './modules/taxation';
import { AdmRegister, AutoLinkedVouchers, BspCsvImport, BspSummary, BulkVoucherImport, ContraVoucher, GdsPnrImport, JournalEntry, MultiCurrencyVoucher, PaymentVoucher, PrintPreviewDemo, PurchaseCar, PurchaseFlight, PurchaseHoliday, PurchaseHotelVoucher, PurchaseInsurance, PurchaseMisc, PurchaseRefunds, PurchaseVisa, ReceiptVoucher, RecurringVouchers, SalesCancellation, SalesCar, SalesCreditNote, SalesDebitNote, SalesFlight, SalesHoliday, SalesHotel, SalesInsurance, SalesMisc, SalesVisa, TicketControlRegister, VoucherCommentsDemo, VoucherEntryTabbed } from './modules/transactions';
import { TrialBalanceLive, DayBookLive, LedgerAcLive, ReportPnLLive, ReportBSLive, RegisterLive, LedgerGroupsLive, ChartOfAccountsLive, InvoiceGPLive } from './modules/accountingLive';
import { PaymentVerificationLive } from './modules/paymentVerification';
import { VoucherTypesMaster, CostCategoriesMaster, BudgetsMaster, ScenariosMaster, CustomersMaster, SuppliersMaster } from './modules/mastersLive';
import { DataImportPage } from './modules/dataImport';
import { GlobalSearch } from './shell/GlobalSearch';
import { Placeholder } from './shell/Placeholder';
import { SideNav } from './shell/SideNav';
import { TopNav } from './shell/TopNav';
import { TopBar } from './shell/TopBar';

export default function KB360App(){
  /* ── Multi-branch starts at TKHO; viewer defaults to Super Admin ── */
  const [branch,setBranch]=useState(BRANCHES[0]);  // TKHO is first in BRANCHES
  const [route,setRoute]=useState("/dashboard");
  const [sideOpen,setSideOpen]=useState(true);
  const [currentUser,setCurrentUser]=useState(null);  // null → LoginScreen shows on app load
  const mob=useMobile();
  const navigate=r=>{setRoute(r);if(mob)setSideOpen(false);};

  /* ── Permission helpers ──────────────────────────────────────── */
  const FULL_SCOPE_ROLES = ["Super Admin","Director","Senior Finance Manager","Sr. Accounts Executive"];
  const canSeeAllBranches = u => FULL_SCOPE_ROLES.includes(u.role);
  const canAccessModule = (u, moduleName) => {
    if(!moduleName) return true;  // unrestricted (e.g. Dashboard)
    const tmpl = ROLE_TEMPLATES[u.role];
    if(!tmpl) return false;
    // perms is keyed by sub-module ID; check if any sub-mod in the group has view
    const grp = PERM_MODULES.find(g => g.group === moduleName);
    if(!grp) return true;
    return grp.mods.some(mod => tmpl.perms?.[mod.id]?.view === true);
  };

  /* ── Switch user (demo simulator) — auto-corrects branch ───── */
  const switchUser = (newUser) => {
    setCurrentUser(newUser);
    // If new user is branch-restricted, ensure current branch is allowed
    if(!canSeeAllBranches(newUser)){
      if(branch==="ALL" || !newUser.branches.includes(branch?.code)){
        const allowed = BRANCHES.find(b => newUser.branches.includes(b.code));
        if(allowed) setBranch(allowed);
      }
    }
    // Redirect to dashboard on user switch (since current route may be forbidden)
    setRoute("/dashboard");
  };

  function Page(){
    // Route → module mapping (URL prefix-based)
    const routeModule = (() => {
      if(route==="/dashboard") return null; // always allowed
      if(route.startsWith("/settings")) return "Settings";
      if(route.startsWith("/hr"))       return "HR & Payroll";
      if(route.startsWith("/reports"))  return "Reports";
      if(route.startsWith("/tax"))      return "Taxation";
      if(route.startsWith("/finance"))  return "Finance";
      if(route.startsWith("/assets"))   return "Finance";
      if(route.startsWith("/purchase")) return "Purchase";
      if(route.startsWith("/sales"))    return "Sales";
      if(route.startsWith("/masters"))  return "Masters";
      if(route.startsWith("/approvals"))return "Finance";
      if(route.startsWith("/group"))    return "Reports"; // group dashboard
      return null;
    })();
    if(routeModule && !canAccessModule(currentUser, routeModule)){
      return (
        <div style={{padding:30,maxWidth:600,margin:"40px auto",
          background:"#fff",borderRadius:10,border:"1px solid #e1e3ec",
          textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🔒</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>Access restricted</h2>
          <p style={{margin:"0 0 6px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>
            Your role <b>{currentUser.role}</b> does not have permission to view
            the <b>{routeModule}</b> module.
          </p>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:12}}>
            Contact <b>Faiz Patel (Sr. FM)</b> or <b>AD (Super Admin)</b> for access.
          </p>
          <button onClick={()=>navigate("/dashboard")}
            style={{background:"#0d1326",color:"#fff",border:"none",
              padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>
            ← Back to Dashboard
          </button>
        </div>
      );
    }
            /* Format / Import / Export Centers */
    if(route==="/settings/export-center")   return <ExportCenter/>;
    if(route==="/settings/import-center")   return <ImportCenter/>;
    if(route==="/settings/format-mapping")  return <FormatMappingSettings/>;

    /* Standardized Tabbed Screens */
    if(route==="/masters/customer-tabs")  return <CustomerMasterTabbed/>;
    if(route==="/masters/supplier-tabs")  return <SupplierMasterTabbed/>;
    if(route==="/transactions/voucher-tabs") return <VoucherEntryTabbed/>;
    if(route==="/reports/viewer")         return <ReportViewerTabbed/>;
    if(route==="/hr/employee-tabs")       return <EmployeeMasterTabbed/>;

    /* New Financial Reports */
    if(route==="/reports/cash-position")  return <RPT_CashPosition branch={branch}/>;
    if(route==="/reports/interbranch")    return <RPT_InterbranchElim/>;
    if(route==="/reports/fs-notes")       return <RPT_FSNotes/>;
    if(route==="/reports/audit-trail")    return <RPT_AuditTrail/>;
    /* New Profitability Reports */
    if(route==="/reports/yield-destination")return <RPT_YieldDestination/>;
    if(route==="/reports/yield-consultant") return <RPT_YieldConsultant/>;
    if(route==="/reports/yield-supplier")   return <RPT_YieldSupplier/>;
    if(route==="/reports/yoy")              return <RPT_YoY/>;
    if(route==="/reports/customer-ltv")     return <RPT_CustomerLTV/>;
    if(route==="/reports/abc-analysis")     return <RPT_ABCAnalysis/>;
    /* New HR Reports */
    if(route==="/hr/attrition")           return <RPT_Attrition/>;
    if(route==="/hr/leave-utilization")   return <RPT_LeaveUtilization/>;
    if(route==="/hr/calendar")            return <RPT_BirthdayCalendar/>;
    /* New Compliance Reports */
    if(route==="/reports/statutory-dues") return <RPT_StatutoryDues/>;
    if(route==="/reports/tax-board")      return <RPT_TaxFilingBoard/>;
    if(route==="/reports/fx-exposure")    return <RPT_CurrencyExposure/>;
                        /* HR Self-Service */
        /* HO Control Center */
        /* Authority Configuration */
    if(route==="/settings/authority-config")  return <AuthorityConfigCenter/>;
    if(route==="/settings/delegations")       return <DelegationsManager/>;
    if(route==="/settings/master-change-queue")return <MasterChangeQueue/>;
    if(route==="/ho/asset-procurement")  return <HOAssetProcurement/>;
    if(route==="/ho/vendor-master-lock") return <HOVendorMasterLock/>;
    if(route==="/ho/banking-control")    return <HOBankingControl/>;
    if(route==="/ho/group-dashboard")    return <GroupMonthlyDashboard/>;
    if(route==="/ho/filing-register")    return <StatutoryFilingRegister/>;
    if(route==="/ho/period-lock")        return <PeriodLockControl/>;
    if(route==="/ho/audit-queue")        return <CentralAuditQueue/>;
    if(route==="/hr/portal")               return <HRPortal setRoute={navigate}/>;
    if(route==="/hr/leave-apply")          return <LeaveApply/>;
    if(route==="/hr/reimbursement")        return <ReimbursementClaim/>;
    if(route==="/hr/my-payslip")           return <MyPayslip/>;
    if(route==="/hr/investment-declaration")return <InvestmentDeclaration/>;
    if(route==="/hr/form-16")              return <Form16Generator/>;
    if(route==="/hr/performance")          return <PerformanceReview/>;
    if(route==="/hr/feedback-360")         return <Feedback360/>;
    if(route==="/hr/skills")               return <SkillMatrix/>;
    /* Taxation */
    if(route==="/tax/gstr-1-prep")         return <GSTR1Prep/>;
    if(route==="/tax/gstr-3b-prep")        return <GSTR3BPrep/>;
    if(route==="/tax/form-16a")            return <Form16AGenerator/>;
    if(route==="/tax/calendar")            return <TaxCalendarV2/>;
    /* Settings */
    if(route==="/settings/doc-templates")  return <DocTemplateEditor/>;
    if(route==="/settings/email-templates")return <EmailSMSTemplates/>;
    if(route==="/settings/approval-matrix-builder") return <ApprovalMatrixBuilder/>;
    if(route==="/settings/custom-fields")  return <CustomFieldsManager/>;
    if(route==="/settings/field-access")   return <FieldAccessControl/>;
    if(route==="/settings/bulk-users")     return <BulkUserOperations/>;
    if(route==="/settings/permissions-matrix") return <PermissionsMatrix/>;
    if(route==="/settings/branding")       return <BrandingSettings/>;
    if(route==="/reports/builder")      return <CustomReportBuilder/>;
    if(route==="/reports/saved-views")  return <SavedReportViews/>;
    if(route==="/reports/scheduled")    return <ScheduledReports/>;
    if(route==="/reports/meta-demo")    return <ReportsMetaDemo/>;
    if(route==="/finance/bank-balance")  return <BankBalanceDashboard/>;
    if(route==="/finance/tds-calculator")return <TDSCalculator/>;
    if(route==="/finance/interest-calc") return <InterestCalculator/>;
    if(route==="/finance/investments")   return <InvestmentRegister/>;
    if(route==="/finance/loan-amort")    return <LoanAmortization/>;
    if(route==="/finance/reco-queue")    return <ReconciliationQueue/>;
    if(route==="/transactions/bulk-import")    return <BulkVoucherImport/>;
    if(route==="/transactions/multi-currency")  return <MultiCurrencyVoucher/>;
    if(route==="/transactions/comments-demo")   return <VoucherCommentsDemo/>;
    if(route==="/transactions/print-preview")   return <PrintPreviewDemo/>;
    if(route==="/transactions/auto-linked")     return <AutoLinkedVouchers/>;
    if(route==="/masters/customer-detail-demo") return <CustomerMasterDetail/>;
    if(route==="/masters/bulk-import")          return <BulkImportMaster/>;
    if(route==="/masters/merge")                return <MergeRecordsUtility/>;
    if(route==="/masters/bank-accounts")  return <BankAccountMaster branch={branch}/>;
    if(route==="/masters/currency")       return <CurrencyMaster/>;
    if(route==="/masters/cost-centers")   return <CostCenterMaster/>;
    if(route==="/masters/projects")       return <ProjectMaster/>;
    if(route==="/masters/doc-types")      return <DocumentTypeMaster/>;
    if(route==="/masters/approval-limits")return <ApprovalLimitsMaster/>;
    if(route==="/masters/numbering")      return <NumberingSeriesMaster branch={branch}/>;
    if(route==="/dashboard")          return <DashboardRouter branch={branch} setRoute={navigate} currentUser={currentUser}/>;
    if(route==="/sales/flight")       return <SalesFlight branch={branch} setRoute={navigate}/>;
    if(route==="/sales/holiday")      return <SalesHoliday branch={branch} setRoute={navigate}/>;
    if(route==="/sales/car")          return <SalesCar branch={branch} setRoute={navigate}/>;
    if(route==="/sales/visa")         return <SalesVisa branch={branch} setRoute={navigate}/>;
    if(route==="/sales/hotel")        return <SalesHotel branch={branch} setRoute={navigate}/>;
    if(route==="/sales/insurance")    return <SalesInsurance branch={branch} setRoute={navigate}/>;
    if(route==="/sales/misc")         return <SalesMisc branch={branch} setRoute={navigate}/>;
    if(route==="/sales/credit-note")  return <SalesCreditNote branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/flight")    return <PurchaseFlight branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/holiday")   return <PurchaseHoliday branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/hotel")     return <PurchaseHotelVoucher branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/visa")      return <PurchaseVisa branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/car")       return <PurchaseCar branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/insurance") return <PurchaseInsurance branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/misc")      return <PurchaseMisc branch={branch} setRoute={navigate}/>;
    if(route==="/receipts")           return <ReceiptVoucher branch={branch}/>;
    if(route==="/payments")           return <PaymentVoucher branch={branch}/>;
    if(route==="/contra")             return <ContraVoucher branch={branch}/>;
    if(route==="/bank-reco")          return <BankReco/>;
    if(route==="/journal")            return <JournalEntry branch={branch}/>;
    if(route==="/finance/verification") return <PaymentVerificationLive/>;
    if(route==="/import")               return <DataImportPage currentUser={currentUser}/>;
    if(route==="/day-book")           return <DayBookLive branch={branch}/>;
    if(route==="/ledger")             return <LedgerAcLive branch={branch}/>;
    if(route==="/trial-balance")      return <TrialBalanceLive branch={branch}/>;
    if(route==="/tax/gstr1")          return <TaxGstr1/>;
    if(route==="/tax/gstr3b")         return <TaxGstr3b/>;
    if(route==="/tax/tds")            return <TaxTdsTcs/>;
    if(route==="/tax/rcm")            return <TaxRcm/>;
    if(route==="/tax/vat")            return <TaxVat/>;
    if(route==="/tax/einvoice")       return <TaxEInvoice/>;
    if(route==="/reports/gp")        return <ReportGP branch={branch} setRoute={navigate}/>;
    if(route==="/reports/pnl")        return <ReportPnLLive branch={branch}/>;
    if(route==="/reports/bs")         return <ReportBSLive branch={branch}/>;
    if(route==="/reports/cf")         return <ReportCF/>;
    if(route==="/reports/rec")        return <ReportReceivables/>;
    if(route==="/reports/pay")        return <ReportPayables/>;
    if(route==="/reports/sreg")       return <RegisterLive branch={branch} initial="sales"/>;
    if(route==="/reports/preg")       return <RegisterLive branch={branch} initial="purchase"/>;
    if(route==="/reports/invoice-gp") return <InvoiceGPLive branch={branch}/>;
    if(route==="/reports/branch")     return <ReportBranch/>;
    if(route==="/reports/pkg")        return <ReportPackagePnL/>;
    if(route==="/sales/debit-note")     return <SalesDebitNote branch={branch} setRoute={navigate}/>;
    if(route==="/sales/cancellation")   return <SalesCancellation branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/refunds")     return <PurchaseRefunds branch={branch} setRoute={navigate}/>;
    if(route==="/purchase/adm")          return <AdmRegister branch={branch}/>;
    if(route==="/purchase/acm")          return <AcmRegister branch={branch}/>;
    if(route==="/purchase/bsp-summary")  return <BspSummary branch={branch}/>;
    if(route==="/masters/sub-agents")   return <MastersSubAgents/>;
    if(route==="/masters/forex")        return <MastersForex/>;
    if(route==="/reports/commission")   return <ReportCommission branch={branch} setRoute={navigate}/>;
    if(route==="/search")               return <GlobalSearch setRoute={navigate}/>;
    if(route==="/group-dashboard")       return <GroupDashboard/>;
    if(route==="/tax/calendar")          return <TaxCalendar/>;
    if(route==="/hr/leave")              return <HrLeave branch={branch}/>;
    if(route==="/hr/expenses")           return <HrExpenses branch={branch}/>;
    if(route==="/settings/preferences")  return <UxPreferences/>;
    if(route==="/reports/mis")            return <MisReport branch={branch}/>;
    if(route==="/reports/concentration")  return <ClientConcentration branch={branch}/>;
    if(route==="/reports/consolidated-bs")return <ConsolidatedBS/>;
    if(route==="/reports/cashflow-forecast")return <CashFlowForecast branch={branch}/>;
    if(route==="/reports/supplier-360")   return <Supplier360 branch={branch}/>;
    if(route==="/reports/tally-export")   return <TallyExport branch={branch}/>;
    if(route==="/masters/passports")      return <PassportManager branch={branch}/>;
    if(route==="/masters/markup")         return <MarkupRateSheet branch={branch}/>;
    if(route==="/masters/vendor-terms")   return <VendorTermsMaster branch={branch}/>;
    if(route==="/purchase/ticket-control")return <TicketControlRegister branch={branch}/>;
    if(route==="/purchase/bsp-import")    return <BspCsvImport branch={branch}/>;
    if(route==="/purchase/gds-import")    return <GdsPnrImport branch={branch} setRoute={navigate}/>;
    if(route==="/tax/gstr2b")             return <GstrRecon branch={branch}/>;
    if(route==="/tax/tds-certs")          return <TdsCertRegister branch={branch}/>;
    if(route==="/hr/salary-revision")     return <SalaryRevision branch={branch}/>;
    if(route==="/expense/budget")       return <ExpenseBudget branch={branch} setRoute={navigate}/>;
    if(route==="/reports/exp-bgt")      return <ReportExpenseBgt branch={branch} setRoute={navigate}/>;
    if(route==="/hr/employees")         return <HrEmployees branch={branch}/>;
    if(route==="/hr/attendance")        return <HrAttendance branch={branch}/>;
    if(route==="/hr/payroll")           return <HrPayroll branch={branch}/>;
    if(route==="/hr/payslips")          return <HrPayslips branch={branch}/>;
    if(route==="/settings/company")     return <SettingsCompany/>;
    if(route==="/settings/branches")     return <SettingsBranches/>;
    if(route==="/settings/users")        return <SettingsUsers/>;
    if(route==="/settings/audit")        return <SettingsAudit/>;
    if(route==="/masters/groups")        return <LedgerGroupsLive/>;
    if(route==="/masters/ledgers")    return <ChartOfAccountsLive branch={branch}/>;
    if(route==="/masters/voucher-types")   return <VoucherTypesMaster/>;
    if(route==="/masters/cost-categories") return <CostCategoriesMaster/>;
    if(route==="/masters/budgets")         return <BudgetsMaster/>;
    if(route==="/masters/scenarios")       return <ScenariosMaster/>;
    if(route==="/masters/customers")  return <CustomersMaster/>;
    if(route==="/masters/suppliers")  return <SuppliersMaster/>;
    if(route==="/masters/airlines")   return <MastersAirlines/>;
    if(route==="/masters/hotels")     return <MastersHotels/>;
    if(route==="/masters/tax")        return <MastersTaxRates/>;
    if(route==="/hr/pf-esi")            return <PfEsiChallan branch={branch}/>;
    if(route==="/accounting/recurring") return <RecurringVouchers branch={branch}/>;
    if(route==="/masters/tour-codes")   return <TourCodeMaster branch={branch} setRoute={navigate}/>;
    if(route==="/reports/consultant")   return <ConsultantReport branch={branch}/>;
    if(route==="/settings/integrations")return <ApiKeySettings/>;
    if(route==="/tax/form26as")         return <Form26AS branch={branch}/>;
    if(route==="/reports/client-statement") return <ClientStatement branch={branch}/>;
    if(route==="/reports/cashbook")         return <CashBookReport branch={branch}/>;
    if(route==="/accounting/year-close")    return <YearEndClose branch={branch}/>;
    if(route==="/reports/forex")            return <ForexReport branch={branch}/>;
    if(route==="/reports/destination")      return <DestinationIntelligence branch={branch}/>;
    if(route==="/reports/package-pl")       return <PackagePnL branch={branch}/>;
    if(route==="/reports/sa-statement")     return <SubAgentStatement branch={branch}/>;
    if(route==="/hr/recruitment")           return <Recruitment branch={branch}/>;
    if(route==="/hr/training")              return <TrainingRecords branch={branch}/>;
    if(route==="/reports/budget")           return <BudgetPlanning branch={branch}/>;
    if(route==="/accounting/intercompany")  return <IntercompanyBilling branch={branch}/>;
    if(route==="/masters/seats")            return <SeatInventory branch={branch}/>;
    if(route==="/hr/gratuity")              return <GratuityRegister branch={branch}/>;
    if(route==="/tax/eway")                 return <EWayBill branch={branch}/>;
        if(route==="/assets/register")                 return <FixedAssetRegister branch={branch} setRoute={navigate}/>;
        if(route==="/assets/depreciation")             return <AssetDepreciation branch={branch} setRoute={navigate}/>;
        if(route==="/assets/disposal")                 return <AssetDisposal branch={branch} setRoute={navigate}/>;
        if(route==="/assets/blocks")                   return <BlockOfAssets branch={branch} setRoute={navigate}/>;
        if(route==="/accounting/vendor-advances")      return <VendorAdvances branch={branch} setRoute={navigate}/>;
        if(route==="/accounting/loans")                return <LoanEmiRegister branch={branch} setRoute={navigate}/>;
        if(route==="/accounting/fx-revaluation")       return <FxRevaluation branch={branch} setRoute={navigate}/>;
        if(route==="/tax/gstr9c")                      return <Gstr9c branch={branch} setRoute={navigate}/>;
        if(route==="/tax/audit-3cd")                   return <TaxAudit3CD branch={branch} setRoute={navigate}/>;
        if(route==="/tax/gstr2a")                      return <Gstr2aReco branch={branch} setRoute={navigate}/>;
        if(route==="/reports/ratios")                  return <RatioAnalysis branch={branch} setRoute={navigate}/>;
        if(route==="/reports/schedule3-bs")            return <ScheduleIIIBS branch={branch} setRoute={navigate}/>;
        if(route==="/reports/working-capital")         return <WorkingCapitalDashboard branch={branch} setRoute={navigate}/>;
        if(route==="/reports/variance")                return <VarianceAnalysis branch={branch} setRoute={navigate}/>;
        if(route==="/reports/cf-direct")               return <CashFlowDirect branch={branch} setRoute={navigate}/>;
        if(route==="/reports/msme-aging")              return <MsmeTracker branch={branch} setRoute={navigate}/>;
        if(route==="/hr/loans-advances")               return <EmployeeAdvances branch={branch} setRoute={navigate}/>;
        if(route==="/settings/period-lock")            return <PeriodLocking branch={branch} setRoute={navigate}/>;
        if(route==="/settings/approval-workflow")      return <ApprovalWorkflow branch={branch} setRoute={navigate}/>;
        if(route==="/approvals")                       return <PendingApprovals branch={branch} setRoute={navigate}/>;
        if(route==="/settings/banking-api")            return <BankingApiSettings branch={branch} setRoute={navigate}/>;
        if(route==="/settings/gsp-irp")                return <GspIrpSettings branch={branch} setRoute={navigate}/>;
    return <Placeholder route={route} setRoute={navigate}/>;
  }

  /* If signed out, show the sign-out screen */
  if(!currentUser){
    return <LoginScreen onSignIn={(user)=>setCurrentUser(user)}/>;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",
      overflow:"hidden",fontFamily:"system-ui,sans-serif",background:"#f3f4f8"}}>

      {/* Top bar */}
      <TopBar onToggle={()=>setSideOpen(o=>!o)} setRoute={navigate} currentUser={currentUser} setCurrentUser={setCurrentUser}/>

      {/* Desktop — SAP Fiori-style horizontal navigation (replaces the sidebar) */}
      {!mob&&(
        <TopNav branch={branch} setBranch={setBranch} currentUser={currentUser} switchUser={switchUser}
          route={route} setRoute={navigate}/>
      )}

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>

        {mob&&sideOpen&&(
          /* Mobile — overlay drawer (the header nav is desktop-only) */
          <>
            <div onClick={()=>setSideOpen(false)}
              style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200}}/>
            <div style={{position:"fixed",top:52,left:0,bottom:0,
              width:260,zIndex:201,overflowY:"hidden"}}>
              <SideNav branch={branch} setBranch={setBranch} currentUser={currentUser} switchUser={switchUser}
                route={route} setRoute={navigate}
                onClose={()=>setSideOpen(false)}/>
            </div>
          </>
        )}

        {/* Main */}
        <main style={{flex:1,overflowY:"auto",minWidth:0,background:"#f3f4f8"}}>
          <Page/>
        </main>
      </div>
    </div>
  );
}

