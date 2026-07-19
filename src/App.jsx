/* ════════════════════════════════════════════════════════════════════
   App.jsx — KBiz360 root component
   Composes the entire app: routes, state, layout shell.
   See PROJECT_CONTEXT.md for full architecture.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { LoginScreen } from './auth/LoginScreen';
import { apiPost } from './core/api';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { pickBranchForUser, withCanonicalRole, applyRenewedAccess } from './core/branchScope';
import { useMobile } from './core/hooks';
import { ReferenceProvider } from './core/ReferenceProvider';
import { getRole, getPermModules } from './core/referenceCache';
import { lazyModule } from './core/lazyModule';
import { isOwnerDashboardUser, topLevelPillHrefs, ALWAYS_VISIBLE } from './core/pageCatalog';
import { canReachRoute, expandHidden } from './core/menus';

/* ── Route-level code-splitting ───────────────────────────────────────────
   Every page component below is loaded via lazyModule() → one dynamic
   import() per feature file → Vite emits one chunk per module that downloads
   only when a screen in it is first opened. The destructures keep the exact
   names Page() already uses, so the giant route table needs zero changes.
   Infrastructure that renders on every screen (shell, providers, hosts) stays
   eagerly imported above/below. Components render inside <Suspense> (see render).
   ── */
const { BudgetPlanning, DashboardRouter, DocumentTypeMaster, MarkupRateSheet, MsmeTracker, PackagePnL, PendingApprovals, Recruitment, SeatInventory, TdsCertRegister, UxPreferences } = lazyModule(() => import('./core/helpers'));
const { RPT_ABCAnalysis, RPT_Attrition, RPT_AuditTrail, RPT_BirthdayCalendar, RPT_CashPosition, RPT_CustomerLTV, RPT_LeaveUtilization, RPT_StatutoryDues, RPT_TaxFilingBoard, RPT_YieldConsultant, RPT_YieldDestination, RPT_YieldSupplier, RPT_YoY } = lazyModule(() => import('./core/styles'));
const { RPT_InterbranchElim, InterBranchRegister, InterBranchMatrix, InterBranchCounterpartyLedger, InboundInterBranch } = lazyModule(() => import('./modules/interbranch'));
const { SalesGpAnalytics } = lazyModule(() => import('./modules/reports/salesGpAnalytics'));
const { AcmRegister, AssetDepreciation, AssetDisposal, BlockOfAssets, FixedAssetRegister } = lazyModule(() => import('./modules/assets'));
const { Dashboard, AlertsDashboard, OwnerCockpit, GovernanceBoard, ReceivablesAgeingSettlementPage, PayablesAgeingSettlementPage } = lazyModule(() => import('./modules/dashboard'));
const { DirectorDash, TargetsMaster } = lazyModule(() => import('./modules/directorDashboards'));
const { BankBalanceDashboard, BankReco, CashFlowDirect, CashFlowForecast, InterestCalculator, InvestmentDeclaration, InvestmentRegister, LoanAmortization, LoanEmiRegister, ReconciliationQueue, TDSCalculator, WorkingCapitalDashboard, YearEndClose } = lazyModule(() => import('./modules/finance'));

/* financeRoutes is plain DATA (a route table) needed synchronously at module
   load, so it's imported directly from ./modules/finance/routes — NOT through
   the finance barrel — to avoid dragging the whole finance feature (incl. the
   ~140 KB legacy.jsx) into the initial bundle. */
import { financeRoutes } from './modules/finance/routes';
/* Support (in-app issue tracker) route table — same plain-data shape as finance. */
import { supportRoutes } from './modules/support/routes';
/* Reconciliation module (4-tier per-ledger certificates + Rule Book). */
import { reconciliationRoutes } from './modules/reconciliation/routes';
import { tallyReconRoutes } from './modules/tally-reconciliation/routes';

/* Declarative route tables from migrated feature modules. The host renders
   these via react-router FIRST; any route not listed falls through to the
   legacy string-router in Page(). Append more tables here as modules migrate. */
const MIGRATED_FEATURE_ROUTES = [...financeRoutes, ...supportRoutes, ...reconciliationRoutes, ...tallyReconRoutes];
const { BankingApiSettings, DelegationsManager, GroupDashboard, StatutoryFilingRegister } = lazyModule(() => import('./modules/ho-control'));
const { EmployeeAdvances, EmployeeMasterTabbed, ExpenseBudget, Feedback360, GratuityEstimateView, HRPortal, HrAttendance, HrEmployees, HrLeave, HrPayroll, HrPayslips, HrShifts, LeaveApply, MyForm16, MyPayslip, PerformanceReview, PfEsiChallan, ReimbursementClaim, SalaryRevision, SkillMatrix } = lazyModule(() => import('./modules/hr'));
const { ApprovalLimitsMaster, BankAccountMaster, BulkImportMaster, CurrencyMaster, CustomerMasterDetail, MasterChangeQueue, MastersAirlines, MastersCustomers, MastersForex, MastersHotels, MastersSubAgents, MastersSuppliers, MastersTaxRates, MergeRecordsUtility, NumberingSeriesMaster, PassportManager, ProjectMaster, Supplier360, Customer360, TourCodeMaster, VendorAdvances, VendorTermsMaster } = lazyModule(() => import('./modules/masters'));
const { CustomerMasterTabbed, SupplierMasterTabbed } = lazyModule(() => import('./modules/masters/mastersParties'));
const { ClientConcentration, ClientStatement, ConsolidatedBS, ConsultantReport, CustomReportBuilder, DestinationIntelligence, MisReport, RatioAnalysis, ReportBranch, ReportCF, ReportCommission, ReportExpenseBgt, ReportGP, ReportPackagePnL, ReportViewerTabbed, ReportsMetaDemo, RPT_TaxSummary, RPT_TaxRateSummary, SavedReportViews, ScheduleIIIBS, ScheduledReports, VarianceAnalysis } = lazyModule(() => import('./modules/reports'));
const { ApiKeySettings, ApprovalMatrixBuilder, ApprovalWorkflow, BrandingSettings, BulkUserOperations, CustomFieldsManager, DocTemplateEditor, EmailSMSTemplates, FieldAccessControl, GspIrpSettings, PermissionsMatrix, SettingsAudit, SettingsBranches, SettingsCompany, SettingsUsers } = lazyModule(() => import('./modules/settings'));
const { PageAccessControl } = lazyModule(() => import('./modules/settings/pageAccess'));
const { EWayBill, Form16AGenerator, Form26AS, GSTR1Prep, GSTR3BPrep, Gstr2aReco, Gstr9c, GstrRecon, TallyExport, TaxAudit3CD, TaxCalendar, TaxCalendarV2, TaxEInvoice, TaxGstr1, TaxGstr3b, TaxRcm, TaxReco, TaxTdsTcs, TaxVat } = lazyModule(() => import('./modules/taxation'));
const { AdmRegister, AdmVoucher, AcmVoucher, AutoLinkedVouchers, BspCsvImport, BspSummary, ContraVoucher, DebitNoteVoucher, GdsPnrImport, JournalEntry, PaymentVoucher, PrintPreviewDemo, PurchaseCar, PurchaseExpenseVoucher, PurchaseFlight, PurchaseHoliday, PurchaseHotelVoucher, PurchaseInsurance, PurchaseMisc, PurchaseRefunds, PurchaseVisa, ReceiptVoucher, RecurringVouchers, RefundVoucher, RefundPartialVoucher, ReissueVoucher, SalesCancellation, SalesCar, SalesFlight, SalesHoliday, SalesHotel, SalesInsurance, SalesMisc, SalesVisa, TicketControlRegister, VoucherCommentsDemo, VoucherEntryTabbed } = lazyModule(() => import('./modules/transactions'));
const { SoPoGpVoucherEntry } = lazyModule(() => import('./modules/bookingOrder'));
const { UnifiedApprovals, InbOutgoing } = lazyModule(() => import('./modules/approvals'));
const { PaymentVerificationLive } = lazyModule(() => import('./modules/payments'));
const { ModuleRegister } = lazyModule(() => import('./modules/reports/moduleRegister'));
const { AccountsTreeView } = lazyModule(() => import('./modules/masters/chartBuilder'));
const { PnLTallyLive } = lazyModule(() => import('./modules/reportsFinancial/pnlTally'));
const { BalanceSheetTallyLive } = lazyModule(() => import('./modules/reportsFinancial/balanceSheetTally'));
const { ReconStatusPage } = lazyModule(() => import('./modules/recon-status'));
const { Gstr2bPage } = lazyModule(() => import('./modules/gstr2b'));
const { CapitalVsInvestmentLive } = lazyModule(() => import('./modules/reportsFinancial/capitalVsInvestment'));
const { TrialBalanceLive, DayBookLive, CashBookLive, LedgerAcLive, RegisterLive, InvoiceGPLive } = lazyModule(() => import('./modules/accountingLive'));
const { DashboardAccountant, CollectionsFollowup, SupplierReco, ClientReco, InterBranchReco, TallyReco, SuspenseClearing, MonthEndChecklist } = lazyModule(() => import('./modules/accountantWorkspace'));
const { ReportPnLLive, ReportBSLive, ReceivablesLive, PayablesLive } = lazyModule(() => import('./modules/reportsFinancial'));
const { TkMyRolePage, TkApprovalsPage, TkVoucherApprovalsPage, TkConfigReadinessPage, TkControlPanelPage, TkControlsPage, TkPeriodLockPage, TkDecisionsPage, TkControlTowerPage, TkAdoptionPage, TkIntegrityPage, TkModulesPage, TkHealthScorecardPage, TkRulesPage, TkUserRulesPage, TkBranchCockpitPage, TkAuditTrailPage, TkTargetsPage, TkMasterControlPage, TkGoLivePage, TkOnboardingPage, TkScorecardPage, TkExceptionsPage, TkCompliancePage, TkPerformancePage, TkInvestmentPage, TkProfitabilityPage, TkArapPage, TkHRControlPage, TkRolesPage, TkScreenDirectoryPage, TkLimitsPage, TkTaxDeskPage, TkAssetsPage, StagePipeline } = lazyModule(() => import('./modules/tk-group'));
import { useHideStatements } from './modules/tk-group/useHideStatements';
import { isStatementHref } from './modules/tk-group/utils/statements';
import { isCockpitRoute } from './modules/tk-group/cockpit';
import { FULL_SCOPE_ROLES, hasNoAssignedBranch } from './core/branchScope';
import { BRANCHES } from './core/referenceCache';
import { setActiveCurrency } from './core/format';
import { useCockpitFocus } from './store/cockpitFocus';
import { FOCUS_ALL } from './modules/tk-group/utils/cockpitFocus';
const { ProfitAndLossUnified, BalanceSheetUnified } = lazyModule(() => import('./modules/reportsFinancial/financialStatements'));
const { NotesToFinancials } = lazyModule(() => import('./modules/reportsFinancial/reportsNotes'));
const { Statistics } = lazyModule(() => import('./modules/reports/statistics'));
const { CostCenterMasterLive } = lazyModule(() => import('./modules/masters/costCentersLive'));
const { VoucherTypesMaster, CostCategoriesMaster, BudgetsMaster, ScenariosMaster, CustomersMaster, SuppliersMaster, CreditFacilitiesMaster, GroupsMaster, LedgersMaster } = lazyModule(() => import('./modules/masters/mastersLive'));
const { DataImportPage } = lazyModule(() => import('./modules/dataImport'));
const { DevControlPage } = lazyModule(() => import('./modules/devControl'));
import { GlobalSearch } from './shell/GlobalSearch';
import { Placeholder } from './shell/Placeholder';
import { SideNav } from './shell/SideNav';
import { TopNav } from './shell/TopNav';
import { TopBar } from './shell/TopBar';
import { AppShell } from './shell/AppShell';
import { PrintPreviewHost } from './core/PrintPreview';
import { ReportActionBar } from './core/ReportActionBar';
import { PrefsProvider } from './core/prefs';
import { HotkeysProvider } from './core/ux/hotkeys';
import { NavContext } from './core/ux/nav';
import { ToastHost } from './core/ux/toast';
import { RuleBlockHost } from './core/ux/ruleBlock';
import { GlobalFetchBar } from './core/ux/GlobalFetchBar';
import { ConfirmHost } from './core/ux/confirm';
import { ContextBar } from './shell/ContextBar';
import { LedgerSwitcher } from './shell/LedgerSwitcher';
import { LedgerModalHost } from './core/LedgerModalHost';
import { BookingFolderHost } from './core/BookingFolderHost';
import { ShortcutHelp } from './shell/ShortcutHelp';
import { DockProvider } from './core/ux/dock';

/* Shown by <Suspense> while a lazily-loaded route chunk downloads. Branded,
   lightweight, and motion-reduced-aware (styles in index.css). */
function RouteFallback(){
  return (
    <div className="kb-route-fallback" role="status" aria-live="polite">
      <div className="kb-route-spinner" aria-hidden="true"/>
      <span>Loading…</span>
    </div>
  );
}

export default function KB360App(){
  /* ── Restore the session from localStorage so a refresh keeps the user
     signed in (the JWT lives under 'kb360-token', the user under 'kb360-user'). */
  const restoredUser = (() => {
    // Canonicalise the role on restore too — a session saved with 'super_admin' must
    // come back as the title-case Owner every owner gate recognises.
    try { if(localStorage.getItem("kb360-token")) return withCanonicalRole(JSON.parse(localStorage.getItem("kb360-user")||"null")); }
    catch { /* ignore */ }
    return null;
  })();

  /* ── Branch: restore the last-selected branch so a refresh keeps you where you
     were (e.g. on BOM instead of snapping back to the default). The chosen branch
     code is persisted under 'kb360-branch' on every switch (see effect below).
     We only honour a saved branch the current user may actually see — "ALL" is
     limited to full-scope roles, and a specific branch must be in the user's
     allowed list (full-scope users see all). If the saved value is missing or no
     longer permitted, we fall back to the user's first allowed branch. All six
     branches are equal peers (no Head Office), so any allowed branch is a valid
     default. ── */
  const [branch,setBranch]=useState(()=>pickBranchForUser(restoredUser));
  /* ── Route + history, bridged onto react-router-dom ──────────────────────
     The URL is now the single source of truth: deep links resolve, and the
     browser's native Back/Forward (plus Esc, Alt+←/→ and the ContextBar arrows)
     drive history. We still expose the SAME { route, navigate, goBack,
     goForward, canBack, canForward } shape on NavContext, so the hundreds of
     existing consumers keep working with zero changes. `canForward` is
     reconstructed from react-router's history index (window.history.state.idx)
     versus the furthest index reached this session — faithfully matching the
     old linear-stack-with-cursor behaviour. ── */
  const rrNavigate = useNavigate();
  const { pathname, search } = useLocation();
  // Normalise trailing slash(es): some hosts serve "/dashboard/" (live) while
  // dev serves "/dashboard". Every route check below matches the no-slash form,
  // so a trailing slash would fall through to <Placeholder>. Keep root "/" intact.
  const route = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  // Embedded preview mode (?embed=1) — used by the Screen Directory to load any screen
  // in an iframe with the app chrome (app-bar, breadcrumb, badge) stripped. It also
  // suppresses the TK-central group-mode redirect below, so a branch screen can be
  // previewed even while the owner's session is in the consolidated ALL mode.
  const embed = new URLSearchParams(search || '').has('embed');
  const histIdx = (typeof window !== 'undefined' && window.history.state && typeof window.history.state.idx === 'number')
    ? window.history.state.idx : 0;
  const maxIdxRef = useRef(histIdx);
  if (histIdx > maxIdxRef.current) maxIdxRef.current = histIdx;
  const [currentUser,setCurrentUser]=useState(restoredUser);  // null → LoginScreen shows on app load
  // TK Group control: when the hide-statements control is ON for a Branch Accountant,
  // P&L / Balance Sheet are blocked even by direct URL (dormant until the flag is on).
  const hideStatements = useHideStatements(currentUser);
  const mob=useMobile();
  const navigate = useCallback((r)=>{ if(r && r!==window.location.pathname) rrNavigate(r); }, [rrNavigate]);
  const goBack = useCallback(()=>rrNavigate(-1), [rrNavigate]);
  const goForward = useCallback(()=>rrNavigate(1), [rrNavigate]);
  const navValue={ route, navigate, goBack, goForward, canBack:histIdx>0, canForward:histIdx<maxIdxRef.current };

  // TK Group Central · in-cockpit branch Focus. The top selector holds the MODE (ALL);
  // this holds which branch a central user is spotlighting. When a branch is focused it
  // becomes the OPERATING branch for everything Page() renders — Data Entry, Reports,
  // registers — so a central user works IN that branch without leaving the cockpit
  // ("Focus scopes everything below"). Mode detection stays on the outer `branch` = 'ALL'.
  const focus = useCockpitFocus();
  const isCentral = FULL_SCOPE_ROLES.includes(currentUser?.role || '');
  const inGroupMode = branch === 'ALL' || (branch && branch.code === 'ALL');
  const branchFocused = isCentral && inGroupMode && focus && focus !== FOCUS_ALL;
  const opBranch = branchFocused ? (BRANCHES.find((b) => b.code === focus) || branch) : branch;

  // Branch-aware money: the whole app's default currency follows the OPERATING branch, so
  // the ₹-defaulting formatters (fmt / fmtINR / money's default) print $ + Western scale
  // on the Africa USD branches (NBO/DAR/FBM) and ₹ + lakh/crore on India / consolidated.
  useEffect(() => {
    const code = (opBranch && typeof opBranch === 'object') ? opBranch.currency : null;
    setActiveCurrency(code === 'USD' ? '$' : '₹');
  }, [opBranch]);

  // TK Group Central mode: a central role selecting the consolidated entity ENTERS the
  // control cockpit. With Focus = ALL keep them on control routes (book-less); with a
  // branch focused they may work in that branch's ERP (opBranch drives it), so don't
  // bounce those routes back to the Control Tower.
  useEffect(()=>{
    if (!embed && isCentral && inGroupMode && !branchFocused && route && !isCockpitRoute(route)) navigate('/tk/control-tower');
  }, [branch, currentUser, route, navigate, focus, isCentral, inGroupMode, branchFocused, embed]);

  /* Persist the current route so a refresh / re-open returns you here.
     Never persist the bare root "/": it is the live host's entry URL, not a real
     destination. Persisting it would clobber the saved route BEFORE the restore
     effect below reads it (this effect runs first on mount), leaving the user
     stranded on "/" → <Placeholder> on every live load. */
  useEffect(()=>{ if(embed || route==="/") return; try{ localStorage.setItem("kb360-route", route); }catch{ /* ignore */ } },[route, embed]);

  /* Persist the selected branch so a refresh keeps you on it (restored above). */
  useEffect(()=>{ try{ localStorage.setItem("kb360-branch", branch==="ALL"?"ALL":(branch?.code||"")); }catch{ /* ignore */ } },[branch]);

  /* On first load only, restore the last route: if we opened at the index path
     with a live session and a saved route, jump there once (replace, so it
     doesn't add a Back entry). Logged-out users see the LoginScreen overlay. */
  const restoredRouteRef = useRef(false);
  useEffect(()=>{
    if(restoredRouteRef.current) return;
    restoredRouteRef.current = true;
    let saved = "/dashboard";
    try { if(localStorage.getItem("kb360-token")) saved = localStorage.getItem("kb360-route") || "/dashboard"; }
    catch { /* ignore */ }
    if((pathname === "/" || pathname === "") && saved && saved !== "/") rrNavigate(saved, { replace:true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  /* Open the Sales/Purchase Register from anywhere (e.g. the P&L drill's Ledger
     Account → invoice). The needle is read by ModuleRegister on mount. */
  useEffect(()=>{
    const onOpenRegister=(e)=>{ const r=e.detail&&e.detail.route; if(r) navigate(r); };
    window.addEventListener("kb:open-register", onOpenRegister);
    return ()=>window.removeEventListener("kb:open-register", onOpenRegister);
  },[]);

  /* ── Permission helpers ──────────────────────────────────────────
     OPEN ACCESS: every ERP user can see all modules.
     (Module-level access gating is intentionally disabled.) */
  const canAccessModule = () => true;

  /* ── Sign in / switch user ─────────────────────────────────────────
     Re-scope the branch to one THIS user may actually access (same picker the
     refresh-time initializer uses). This is the fix for "some pages show failed
     to fetch until I refresh": login left the branch at a stale/out-of-scope
     value, which the server-side branch scoping then rejected with 403s. */
  const switchUser = (rawUser) => {
    // Canonicalise 'super_admin' → 'Super Admin' so the Owner gets full scope + the
    // central cockpit + every owner-only surface, not a half-owner.
    const newUser = withCanonicalRole(rawUser);
    setCurrentUser(newUser);
    setBranch(pickBranchForUser(newUser));
    // Redirect on user switch (current route may be forbidden). Accountants land on
    // their own workspace dashboard; everyone else on the general dashboard.
    navigate(/accountant/i.test(newUser?.role || '') ? "/accounts/dashboard" : "/dashboard");
  };

  /* ── Sign out: clear the stored JWT + user so the next session must log in ── */
  const setUser = (u) => {
    if(!u){
      // Clear the ENTIRE kb360-* session — token, user, AND branch / route / prefs. Clearing
      // only token+user let the previous user's saved branch and last route bleed into the
      // next login on a shared machine. Wipe every kb360-* key so nothing leaks across users.
      try{ Object.keys(localStorage).filter(k=>k.startsWith("kb360-")).forEach(k=>localStorage.removeItem(k)); }catch{}
      // Drop any minimized/parked (branch-scoped) items so they never leak to the next session.
      try{ window.dispatchEvent(new CustomEvent("kbiz:logout")); }catch{ /* ignore */ }
    }
    setCurrentUser(withCanonicalRole(u));
  };

  /* ── Auto-renew the JWT so an open session never reaches the token expiry.
     Renew on load + every 10 min while signed in; the fresh token replaces the
     stored one. A failed renew fires 'kbiz:auth-expired' (handled below). */
  useEffect(()=>{
    if(!currentUser) return;
    let alive=true;
    const renew=async()=>{
      try{
        const r=await apiPost("/api/auth/refresh");
        if(!alive || !r || !r.token) return;
        try{ localStorage.setItem("kb360-token", r.token); }catch{ /* ignore */ }
        // Pick up live changes to the page-visibility deny-list (Settings → Page
        // Visibility Control) without forcing a re-login. Only re-render when the
        // hidden set actually changed, so this renew loop never re-triggers itself.
        if(r.user){
          // Apply the server's re-read access (role / branch scope / view-only / page-
          // visibility) so an admin's change in Settings → Users & Roles takes effect within
          // the 10-min renew cycle WITHOUT a full re-login. Previously only `hidden` was
          // picked up, so a promoted role (e.g. AE → Sr. Accounts Executive) kept the old,
          // non-central menu until re-login. applyRenewedAccess returns the SAME reference
          // when nothing changed, so this renew loop never re-triggers itself.
          setCurrentUser(prev=>{
            const merged=applyRenewedAccess(prev, r.user);
            if(merged!==prev){ try{ localStorage.setItem("kb360-user", JSON.stringify(merged)); }catch{ /* ignore */ } }
            return merged;
          });
        }
      }
      catch{ /* a dead session is handled by the auth-expired listener */ }
    };
    /* ── Single-device sessions ────────────────────────────────────────────────
       A login on another device invalidates THIS device's token server-side (the
       backend rejects any token issued before the account's last login). renew()
       doubles as the probe: on a dead token /api/auth/refresh 401s → the interceptor
       fires 'kbiz:auth-expired' → this device signs out. To surface that within
       SECONDS instead of on the next click, we validate on a short heartbeat AND
       whenever the user returns to this tab/window (visibility + focus) — so an idle
       device signs out as soon as the user looks at it. `tick` is throttled so
       focus+visibility firing together (or a burst of tab switches) can't spam the
       endpoint. Background tabs throttle timers to ~1/min anyway; the focus/visibility
       hooks cover the "picked the old device back up" case instantly. */
    let lastRun=0;
    const HEARTBEAT_MS=60*1000; // idle-but-visible backstop
    const MIN_GAP_MS=5*1000;    // collapse near-simultaneous triggers
    const tick=()=>{ const now=Date.now(); if(now-lastRun<MIN_GAP_MS) return; lastRun=now; renew(); };
    tick();
    const id=setInterval(tick, HEARTBEAT_MS);
    const onVisible=()=>{ if(document.visibilityState==="visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    return ()=>{ alive=false; clearInterval(id); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", tick); };
  // Keyed on identity (not the whole object) so updating `hidden` above doesn't
  // tear down/recreate the renew interval.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentUser?.email, currentUser?.id]);

  /* ── Any API call that 401s / 403s (expired or invalid token) signs the user
     out and lands them on the login screen — instead of showing broken data. */
  useEffect(()=>{
    const onExpired=()=>{ setUser(null); navigate("/dashboard"); };
    window.addEventListener("kbiz:auth-expired", onExpired);
    return ()=> window.removeEventListener("kbiz:auth-expired", onExpired);
  },[]);

  function Page(){
    // eslint-disable-next-line no-shadow -- intentional: re-scope every route rendered
    // below to the OPERATING branch (the spotlighted Focus branch in the cockpit, else
    // the top-right branch). Mode/menu logic above keeps using the outer `branch`.
    const branch = opBranch;
    /* ── Per-user page visibility (Settings → Page Visibility Control) ────────
       A route on the user's `hidden` deny-list isn't rendered, even via a direct
       URL — it's removed from their nav too (see getMenu). The landing dashboard
       and the visibility-control page itself are never blocked here (the latter
       gates non-admins inside its own component). ── */
    // No branch assigned: a non-central user (GM / BM / Branch Accountant) with NO branch
    // in their profile can see NOTHING — never all branches. Show a clear notice until an
    // admin assigns a branch (the server also branch-scopes every call as the safety net).
    if(hasNoAssignedBranch(currentUser)){
      return (
        <div style={{padding:30,maxWidth:560,margin:"40px auto",
          background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🏢</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>No branch assigned</h2>
          <p style={{margin:"0 0 8px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>
            Your account <b>{currentUser?.name || currentUser?.email}</b> ({currentUser?.role}) isn't
            assigned to any branch yet, so there's nothing to show. You are branch-scoped —
            you'll only ever see the branch(es) assigned to you, never all branches.
          </p>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>
            Ask an administrator to assign your branch in <b>Settings ▸ Users</b>.
          </p>
        </div>
      );
    }

    // TK Group hide-statements: a restricted view with the control ON can't reach the
    // financial statements even by direct URL — send them back to their dashboard.
    if(hideStatements && isStatementHref(route)) return <Navigate to="/accounts/dashboard" replace/>;

    // expandHidden also maps LEGACY keys onto their split replacements (e.g. a
    // pre-split '/reconciliation' deny still covers the four per-tier pages).
    const hiddenPages = expandHidden(currentUser?.hidden);
    // Top-level pills are structural — never blocked by the deny-list (they can't be
    // hidden from the catalogue either), so a single-page pill like Approvals always works.
    if(!ALWAYS_VISIBLE.has(route) && !topLevelPillHrefs().has(route) && hiddenPages.has(route)){
      return (
        <div style={{padding:30,maxWidth:560,margin:"40px auto",
          background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🚫</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>Page not available</h2>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>
            This page has been hidden for your account by the administrator.
            Contact <b>afshin.dhanani@kingsgroupco.com</b> if you need access.
          </p>
          <button onClick={()=>navigate("/dashboard")}
            style={{background:"#0d1326",color:"#fff",border:"none",
              padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>
            ← Back to Dashboard
          </button>
        </div>
      );
    }

    /* ── Hard route-level lockout for restricted roles ───────────────────────
       A Branch Accountant's nav is limited to their Accounts workspace, but the
       nav filter alone doesn't stop a direct URL. canReachRoute() blocks the
       out-of-scope admin areas (HR, Settings, Group dashboard) by
       direct link too. Full-menu roles (Super Admin/Director/…) reach everything;
       finer per-page control stays with the `hidden` deny-list above. ── */
    if(!canReachRoute(route, currentUser)){
      return (
        <div style={{padding:30,maxWidth:600,margin:"40px auto",
          background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🔒</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>Access restricted</h2>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>
            Your role <b>{currentUser?.role}</b> doesn't have access to this section.
            Contact <b>afshin.dhanani@kingsgroupco.com</b> if you need access.
          </p>
          <button onClick={()=>navigate("/dashboard")}
            style={{background:"#0d1326",color:"#fff",border:"none",
              padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>
            ← Back to Dashboard
          </button>
        </div>
      );
    }

    // Route → module mapping (URL prefix-based)
    const routeModule = (() => {
      if(route==="/dashboard") return null; // always allowed
      if(route.startsWith("/purchase-expense")) return "Finance"; // Finance voucher (+ its approval lists), despite the /purchase prefix
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
          background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",
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

    /* ── Migrated feature routes (incremental react-router-dom adoption) ──────
       Migrated modules render from their declarative route tables; anything not
       listed falls through to the legacy string-router below. Same role-gating
       applies (the routeModule check above already ran). ── */
    const migratedHit = MIGRATED_FEATURE_ROUTES.find(r => r.path === route);
    if(migratedHit){ const El = migratedHit.Element; return <El branch={branch} setRoute={navigate} currentUser={currentUser}/>; }

            /* Format / Import / Export Centers — components were never built; the
       real working screens are Data Import (/import), BSP/GDS imports and
       Tally XML Export, all under Admin ▸ Import / Export Data. Routes removed
       so a stale/direct URL falls through to the not-found handler instead of
       crashing on an undefined component. */

    /* Standardized Tabbed Screens */
    if(route==="/masters/customer-tabs")  return <CustomerMasterTabbed branch={branch}/>;
    if(route==="/masters/supplier-tabs")  return <SupplierMasterTabbed branch={branch}/>;
    if(route==="/transactions/voucher-tabs") return <VoucherEntryTabbed/>;
    if(route==="/reports/viewer")         return <ReportViewerTabbed/>;
    if(route==="/hr/employee-tabs")       return <EmployeeMasterTabbed/>;

    /* New Financial Reports */
    if(route==="/reports/cash-position")  return <RPT_CashPosition branch={branch}/>;
    if(route==="/reports/interbranch")    return <RPT_InterbranchElim/>;
    if(route==="/reports/fs-notes")       return <NotesToFinancials branch={branch}/>;
    if(route==="/reports/audit-trail")    return <RPT_AuditTrail branch={branch}/>;
    /* New Profitability Reports */
    if(route==="/reports/yield-destination")return <RPT_YieldDestination branch={branch} setRoute={navigate}/>;
    if(route==="/reports/yield-consultant") return <RPT_YieldConsultant branch={branch} setRoute={navigate}/>;
    if(route==="/reports/yield-supplier")   return <RPT_YieldSupplier branch={branch} setRoute={navigate}/>;
    if(route==="/reports/yoy")              return <RPT_YoY branch={branch} setRoute={navigate}/>;
    if(route==="/reports/customer-ltv")     return <RPT_CustomerLTV branch={branch} setRoute={navigate}/>;
    if(route==="/reports/abc-analysis")     return <RPT_ABCAnalysis branch={branch} setRoute={navigate}/>;
    /* New HR Reports */
    if(route==="/hr/attrition")           return <RPT_Attrition/>;
    if(route==="/hr/leave-utilization")   return <RPT_LeaveUtilization/>;
    if(route==="/hr/calendar")            return <RPT_BirthdayCalendar/>;
    /* New Compliance Reports */
    if(route==="/reports/tax-summary")    return <RPT_TaxSummary branch={branch}/>;
    if(route==="/reports/tax-rate-summary") return <RPT_TaxRateSummary branch={branch}/>;
    if(route==="/reports/statutory-dues") return <RPT_StatutoryDues/>;
    if(route==="/reports/tax-board")      return <RPT_TaxFilingBoard branch={branch}/>;
                        /* HR Self-Service */
        /* Settings — Authority & Compliance (HO Control Center prototype removed; no Head Office in TK Group model) */
    if(route==="/settings/delegations")       return <DelegationsManager/>;
    if(route==="/settings/master-change-queue")return <MasterChangeQueue/>;
    if(route==="/settings/filing-register")   return <StatutoryFilingRegister/>;
    /* TK Group — central control (real /api/tk/* pages; dormant until core.policy_guard on) */
    if(route==="/tk/my-role")            return <TkMyRolePage/>;
    if(route==="/tk/approvals")          return <TkApprovalsPage/>;
    // Approvals — Vouchers: the SAME approval screen as the branch (UnifiedApprovals:
    // vouchers + SO/PO/GP + INB — full JV detail + Approve/Reject), with the 5-stage
    // pipeline funnel on top (where each pending entry is waiting: Branch → AE → FM →
    // Director → Owner). Operates on the focused branch (opBranch); Focus = ALL pools
    // every branch's pending into one central queue.
    if(route==="/tk/voucher-approvals")  return (
      <div className="grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
        <StagePipeline/>
        <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="vouchers"/>
      </div>
    );
    if(route==="/tk/readiness")          return <TkConfigReadinessPage/>;
    if(route==="/tk/control-panel")      return <TkControlPanelPage setRoute={navigate}/>;
    if(route==="/tk/controls")           return <TkControlsPage/>;
    if(route==="/tk/period-locks")       return <TkPeriodLockPage/>;
    if(route==="/tk/decisions")          return <TkDecisionsPage/>;
    if(route==="/tk/control-tower")      return <TkControlTowerPage setRoute={navigate}/>;
    if(route==="/tk/adoption")           return <TkAdoptionPage/>;
    if(route==="/tk/integrity")          return <TkIntegrityPage/>;
    if(route==="/tk/modules")            return <TkModulesPage setRoute={navigate}/>;
    if(route==="/tk/health-scorecard")   return <TkHealthScorecardPage/>;
    if(route==="/tk/rules")              return <TkRulesPage owner={['Super Admin','super_admin'].includes(currentUser?.role)}/>;
    if(route==="/tk/user-rules")         return <TkUserRulesPage owner={['Super Admin','super_admin'].includes(currentUser?.role)} currentUser={currentUser} setRoute={navigate}/>;
    if(route==="/tk/branch-cockpit")     return <TkBranchCockpitPage/>;
    if(route==="/tk/audit")              return <TkAuditTrailPage/>;
    if(route==="/tk/targets")            return <TkTargetsPage/>;
    if(route==="/tk/master-control")     return <TkMasterControlPage/>;
    if(route==="/tk/go-live")            return <TkGoLivePage setRoute={navigate}/>;
    if(route==="/tk/onboarding")         return <TkOnboardingPage/>;
    if(route==="/tk/scorecard")          return <TkScorecardPage/>;
    if(route==="/tk/exceptions")         return <TkExceptionsPage/>;
    if(route==="/tk/compliance")         return <TkCompliancePage/>;
    if(route==="/tk/performance")        return <TkPerformancePage/>;
    if(route==="/tk/investment")         return <TkInvestmentPage/>;
    if(route==="/tk/tax-desk")           return <TkTaxDeskPage/>;
    if(route==="/tk/assets")             return <TkAssetsPage/>;
    if(route==="/tk/profitability")      return <TkProfitabilityPage/>;
    if(route==="/tk/receivables-payables") return <TkArapPage/>;
    if(route==="/tk/hr-control")         return <TkHRControlPage/>;
    if(route==="/tk/roles")              return <TkRolesPage/>;
    // Screen Directory — the owner's index of every screen (by stable #number) with a
    // live preview. Super-Admin only, both in the menu and by direct URL.
    if(route==="/tk/screens")            return ['Super Admin','super_admin'].includes(currentUser?.role||'')
      ? <TkScreenDirectoryPage/>
      : <div style={{padding:30,maxWidth:560,margin:"40px auto",background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🔒</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>Screen Directory</h2>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>This screen index is restricted to the Super Admin.</p>
          <button onClick={()=>navigate("/dashboard")} style={{background:"#0d1326",color:"#fff",border:"none",padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>← Back to Dashboard</button>
        </div>;
    if(route==="/tk/limits")             return <TkLimitsPage/>;
    if(route==="/hr/portal")               return <HRPortal setRoute={navigate}/>;
    if(route==="/hr/leave-apply")          return <LeaveApply/>;
    if(route==="/hr/reimbursement")        return <ReimbursementClaim/>;
    if(route==="/hr/my-payslip")           return <MyPayslip/>;
    if(route==="/hr/investment-declaration")return <InvestmentDeclaration/>;
    if(route==="/hr/form-16")              return <MyForm16/>;
    if(route==="/hr/performance")          return <PerformanceReview/>;
    if(route==="/hr/feedback-360")         return <Feedback360/>;
    if(route==="/hr/skills")               return <SkillMatrix/>;
    /* Taxation */
    if(route==="/tax/gstr-1-prep")         return <GSTR1Prep/>;
    if(route==="/tax/gstr-3b-prep")        return <GSTR3BPrep/>;
    if(route==="/tax/form-16a")            return <Form16AGenerator branch={branch}/>;
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
    if(route==="/reports/builder")      return <CustomReportBuilder branch={branch} setRoute={navigate}/>;
    if(route==="/reports/saved-views")  return <SavedReportViews setRoute={navigate}/>;
    if(route==="/reports/scheduled")    return <ScheduledReports/>;
    if(route==="/reports/meta-demo")    return <ReportsMetaDemo/>;
    if(route==="/finance/bank-balance")  return <BankBalanceDashboard branch={branch}/>;
    if(route==="/finance/tds-calculator")return <TDSCalculator/>;
    if(route==="/finance/interest-calc") return <InterestCalculator/>;
    if(route==="/finance/recon-status")  return <ReconStatusPage/>;
    if(route==="/tax/gstr2b-itc")        return <Gstr2bPage/>;
    if(route==="/finance/investments")   return <InvestmentRegister branch={branch}/>;
    if(route==="/finance/loan-amort")    return <LoanAmortization/>;
    if(route==="/finance/reco-queue")    return <ReconciliationQueue branch={branch} setRoute={navigate}/>;
    // Retired: the combined Outstanding & On-Account screen is now split into the
    // Receivables / Payables 2-tab workbenches. Redirect old links to Receivables.
    if(route==="/finance/outstanding")   return <Navigate to="/reports/rec" replace/>;
    if(route==="/finance/comments-demo")   return <VoucherCommentsDemo/>;
    if(route==="/finance/print-preview")   return <PrintPreviewDemo/>;
    if(route==="/finance/auto-linked")     return <AutoLinkedVouchers/>;
    if(route==="/masters/customer-detail-demo") return <CustomerMasterDetail/>;
    if(route==="/masters/bulk-import")          return <BulkImportMaster/>;
    if(route==="/masters/merge")                return <MergeRecordsUtility/>;
    if(route==="/masters/bank-accounts")  return <BankAccountMaster branch={branch} setRoute={navigate}/>;
    if(route==="/masters/currency")       return <CurrencyMaster setRoute={navigate}/>;
    if(route==="/masters/cost-centers")   return <CostCenterMasterLive currentUser={currentUser} shellBranch={branch}/>;
    if(route==="/masters/projects")       return <ProjectMaster/>;
    if(route==="/masters/doc-types")      return <DocumentTypeMaster/>;
    if(route==="/masters/approval-limits")return <ApprovalLimitsMaster/>;
    if(route==="/masters/numbering")      return <NumberingSeriesMaster branch={branch}/>;
    // ── Accounts — branch accountant workspace (new screens) ──
    if(route==="/accounts/dashboard")     return <DashboardAccountant branch={branch} setRoute={navigate} currentUser={currentUser}/>;
    if(route==="/accounts/receivables-ageing-settlement") return <ReceivablesAgeingSettlementPage branch={branch} setRoute={navigate} currentUser={currentUser}/>;
    if(route==="/accounts/payables-ageing-settlement")    return <PayablesAgeingSettlementPage branch={branch} setRoute={navigate} currentUser={currentUser}/>;
    if(route==="/accounts/net-ageing")    return <PayablesLive branch={branch} setRoute={navigate} initialTab="net"/>;
    if(route==="/accounts/collections")   return <CollectionsFollowup branch={branch} setRoute={navigate}/>;
    // CRM payment-verification inbox — salespeople submit payments in the CRM;
    // finance verifies/rejects here (drives the CRM's own endpoints via SSO).
    if(route==="/accounts/payment-verification") return <PaymentVerificationLive branch={branch}/>;
    if(route==="/accounts/supplier-reco") return <SupplierReco branch={branch} setRoute={navigate}/>;
    if(route==="/accounts/client-reco")   return <ClientReco branch={branch} setRoute={navigate}/>;
    if(route==="/accounts/interbranch-reco") return <InterBranchReco branch={branch} setRoute={navigate}/>;
    // ── Inter-Branch (INB) · the two mirror pipelines ──────────────────────────────
    // INCOMING — deals another branch pushed TO us (InbLink.toBranch = me). '/accounts/
    // inb-inbound' is the legacy path, kept working so existing links/bookmarks don't 404.
    if(route==="/inb/incoming" || route==="/accounts/inb-inbound") return <InboundInterBranch branch={branch} setRoute={navigate} currentUser={currentUser}/>;
    if(route==="/accounts/inb-register")   return <InterBranchRegister branch={branch} setRoute={navigate}/>;
    if(route==="/accounts/inb-matrix")     return <InterBranchMatrix branch={branch} setRoute={navigate}/>;
    if(route==="/accounts/inb-counterparty") return <InterBranchCounterpartyLedger branch={branch} setRoute={navigate}/>;
    if(route==="/accounts/tally-reco")    return <TallyReco branch={branch} setRoute={navigate}/>;
    // Payment Run / Batch Pay route removed — bulk supplier payment disabled by
    // policy (component kept in modules/payments; a direct URL now falls through).
    if(route==="/accounts/suspense")      return <SuspenseClearing branch={branch} setRoute={navigate}/>;
    if(route==="/accounts/month-end")     return <MonthEndChecklist branch={branch} setRoute={navigate}/>;
    // The owner's home IS the Owner Dashboard — the role-scoped My Dashboard is retired for
    // them (its widgets now live on the Owner Dashboard), so /dashboard renders the Owner
    // Dashboard directly. Every other role keeps the role-routed DashboardRouter.
    if(route==="/dashboard")          return isOwnerDashboardUser(currentUser)
      ? <OwnerCockpit branch={branch} setBranch={setBranch} setRoute={navigate} currentUser={currentUser} view="overview"/>
      : <DashboardRouter branch={branch} setBranch={setBranch} setRoute={navigate} currentUser={currentUser}/>;
    // Owner Dashboard — consolidated whole-company view. Restricted to the group
    // owner: the Super Admin whose email is afshin.dhanani@kingsgroupco.com (BOTH
    // role + email required). Non-owners hitting the URL get a "not available" card.
    if(route==="/dashboard/cockpit") return isOwnerDashboardUser(currentUser)
      ? <OwnerCockpit branch={branch} setBranch={setBranch} setRoute={navigate} currentUser={currentUser} view="cockpit"/>
      : <div style={{padding:30,maxWidth:560,margin:"40px auto",background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🔒</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>AD Cockpit</h2>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>This consolidated all-branch cockpit is restricted to the group owner.</p>
          <button onClick={()=>navigate("/dashboard")} style={{background:"#0d1326",color:"#fff",border:"none",padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>← Back to Dashboard</button>
        </div>;
    if(route==="/dashboard/owner")    return isOwnerDashboardUser(currentUser)
      ? <OwnerCockpit branch={branch} setBranch={setBranch} setRoute={navigate} currentUser={currentUser} view="overview"/>
      : <div style={{padding:30,maxWidth:560,margin:"40px auto",background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🔒</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>AD Dashboard (All)</h2>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>This consolidated all-branch dashboard is restricted to the group owner.</p>
          <button onClick={()=>navigate("/dashboard")} style={{background:"#0d1326",color:"#fff",border:"none",padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>← Back to Dashboard</button>
        </div>;
    // Governance & Exceptions — Approvals & Audit + Alerts as one board (two tabs) for the
    // roles that actually see it in the menu (Director / Super Admin = getMenu's `isDir`), so a
    // Director opening it and clicking the Alerts tab STAYS in the two-tab board (no one-way
    // exit). Every other role gets the plain Alerts board — never the central audit tab.
    if(route==="/dashboard/alerts")   return (currentUser?.role === 'Director' || currentUser?.role === 'Super Admin')
      ? <GovernanceBoard view="alerts" branch={branch} setRoute={navigate}/>
      : <AlertsDashboard branch={branch} setRoute={navigate}/>;
    if(route==="/dashboards/audit")   return <GovernanceBoard view="approvals" branch={branch} setRoute={navigate}/>;
    if(route==="/dashboards/capital") return <CapitalVsInvestmentLive branch={branch}/>; // Capital vs Investment (live from BS + P&L)
    // Director/Super-Admin dashboard suite (menu is role-gated in getMenu).
    if(/^\/dashboards\/(exec|profitability|cash|cash-forecast|arap|branch|balance-sheet|module-gp|sales|supplier|tax|expenses|performance|sales-target|gp-target|collections-target|budget-expense|yoy|customer-value)$/.test(route)) return <DirectorDash which={route.split('/')[2]} branch={branch} setRoute={navigate}/>;
    if(route==="/finance/targets") return <TargetsMaster branch={branch}/>;
    if(route==="/bookings/new")       return <SoPoGpVoucherEntry branch={branch} setRoute={navigate}/>;
    if(route==="/bookings/inter-branch") return <SoPoGpVoucherEntry branch={branch} setRoute={navigate} interBranch/>;
    // Unified Approvals — SO/PO/GP + Vouchers, each with Pending/Approved/Rejected/Deleted.
    if(route==="/transactions/approvals")          return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="sopogp"/>;
    if(route==="/transactions/voucher-approvals")  return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="vouchers"/>;
    // INB ▸ OUTGOING — deals THIS branch sells to another (its INB legs post in `branch`, so
    // the queue self-scopes). Two doors to the SAME queue, deliberately: this standalone
    // route is the pipeline's home under Inter Branch, while '/transactions/inb-approvals'
    // keeps opening it inside the Approvals shell (segment 'INB') — an outgoing INB deal is
    // an approval queue, so an approver doing their Approvals round must still find it there.
    if(route==="/inb/outgoing") return <InbOutgoing branch={branch} setRoute={navigate} currentUser={currentUser}/>;
    if(route==="/transactions/inb-approvals") return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="inbspg"/>;
    // Per-type approval screens: /transactions/approvals/<category> opens the split
    // screen for one gated voucher type (Receipt / Payment / … / ACM), bookmarkable.
    if(/^\/transactions\/approvals\/(receipt|payment|contra|journal|purchase-expense|debit-note|adm|acm)$/.test(route)) return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain={route.split('/').pop()}/>;
    if(/^\/bookings\/(pending|approved|rejected|deleted|list)$/.test(route)) return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="sopogp"/>;
    // Per-module Sale/Purchase ENTRY is retired — all product entry is via SO/PO/GP.
    // These routes now open the read-only Module Register (view + print invoices).
    if(/^\/sales\/(flight|holiday|hotel|visa|car|insurance|misc)$/.test(route))    return <ModuleRegister branch={branch} mode="sales"/>;
    if(/^\/purchase\/(flight|holiday|hotel|visa|car|insurance|misc)$/.test(route)) return <ModuleRegister branch={branch} mode="purchase"/>;
    if(route==="/finance/module-sales-register")    return <ModuleRegister branch={branch} mode="sales"/>;
    if(route==="/finance/module-purchase-register") return <ModuleRegister branch={branch} mode="purchase"/>;
    if(route==="/finance/module-register" || route==="/finance/module-sp-register") return <ModuleRegister branch={branch} mode="both"/>;
    if(route==="/receipts")           return <ReceiptVoucher branch={branch}/>;
    if(route==="/payments")           return <PaymentVoucher branch={branch}/>;
    if(route==="/purchase-expense")          return <PurchaseExpenseVoucher branch={branch} setRoute={navigate}/>;
    // Purchase-Expense pending/approved/etc. now live in the unified Voucher Approvals queue.
    if(/^\/purchase-expense\/(pending|approved|rejected|deleted)$/.test(route)) return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="purchase-expense"/>;
    if(route==="/debit-note")         return <DebitNoteVoucher branch={branch} setRoute={navigate}/>;
    // Debit-Note pending/approved/etc. share the unified Voucher Approvals queue.
    if(/^\/debit-note\/(pending|approved|rejected|deleted)$/.test(route)) return <UnifiedApprovals branch={branch} setRoute={navigate} currentUser={currentUser} initialDomain="debit-note"/>;
    // Refund / Reissue are now SO/PO/GP reversal modules — these routes open the
    // booking entry with the module preselected (the standalone RefundVoucher/
    // ReissueVoucher are retired; old links land on the new flow).
    if(route==="/finance/refund")     return <SoPoGpVoucherEntry branch={branch} setRoute={navigate} initialModule="RF"/>;
    if(route==="/finance/reissue")    return <SoPoGpVoucherEntry branch={branch} setRoute={navigate} initialModule="RI"/>;
    if(route==="/finance/refund-partial") return <RefundPartialVoucher branch={branch}/>;
    if(route==="/finance/adm-voucher") return <AdmVoucher branch={branch}/>;
    if(route==="/finance/acm-voucher") return <AcmVoucher branch={branch}/>;
    if(route==="/contra")             return <ContraVoucher branch={branch}/>;
    if(route==="/bank-reco")          return <BankReco branch={branch}/>;
    if(route==="/journal")            return <JournalEntry branch={branch}/>;
    if(route==="/import")               return <DataImportPage currentUser={currentUser}/>;
    if(route==="/day-book")           return <DayBookLive branch={branch}/>;
    if(route==="/accounts/statistics") return <Statistics branch={branch} setRoute={navigate}/>;
    if(route==="/finance/cash-book")  return <CashBookLive branch={branch}/>;
    if(route==="/ledger")             return <LedgerAcLive branch={branch}/>;
    if(route==="/trial-balance")      return <TrialBalanceLive branch={branch}/>;
    // GST/VAT return prep is per-branch GSTIN — without `branch` these
    // aggregated every branch's tax for full-scope users.
    if(route==="/tax/gstr1")          return <TaxGstr1 branch={branch}/>;
    if(route==="/tax/gstr3b")         return <TaxGstr3b branch={branch}/>;
    if(route==="/tax/tds")            return <TaxTdsTcs branch={branch}/>;
    if(route==="/tax/rcm")            return <TaxRcm branch={branch}/>;
    if(route==="/tax/vat")            return <TaxVat branch={branch}/>;
    if(route==="/tax/einvoice")       return <TaxEInvoice branch={branch}/>;
    if(route==="/reports/gp")        return <ReportGP branch={branch} setRoute={navigate}/>;
    // Unified statements: one P&L screen and one BS screen, view-switched
    // (Fiori · Classic · Vertical · Tally · TKF [· Schedule III · Consolidated]).
    // All legacy routes point here so existing links keep working.
    if(route==="/reports/pnl-tally")  return <PnLTallyLive branch={branch}/>;              // purpose-built Tally-format P&L (was aliased to Unified)
    if(route==="/reports/bs-tally")   return <BalanceSheetTallyLive branch={branch}/>;     // purpose-built Tally-format BS (was aliased to Unified)
    if(route==="/reports/pnl" || route==="/reports/pnl-modulewise") return <ProfitAndLossUnified branch={branch}/>;
    if(route==="/reports/bs" || route==="/reports/bs-modulewise") return <BalanceSheetUnified branch={branch}/>;
    if(route==="/reports/cf")         return <ReportCF branch={branch} setRoute={navigate}/>;   // was <ReportCF/> — no branch → always ₹/consolidated
    if(route==="/reports/rec")        return <ReceivablesLive branch={branch} setRoute={navigate}/>;
    if(route==="/reports/pay")        return <PayablesLive branch={branch} setRoute={navigate}/>;
    if(route==="/reports/sreg")       return <RegisterLive branch={branch} initial="sales"/>;
    if(route==="/reports/preg")       return <RegisterLive branch={branch} initial="purchase"/>;
    if(route==="/reports/inb-sreg")   return <RegisterLive branch={branch} initial="sales" inbOnly/>;
    if(route==="/reports/inb-preg")   return <RegisterLive branch={branch} initial="purchase" inbOnly/>;
    if(route==="/reports/invoice-gp") return <InvoiceGPLive branch={branch}/>;
    if(route==="/reports/sales-gp-analytics") return <SalesGpAnalytics branch={branch}/>;
    if(route==="/reports/branch")     return <ReportBranch branch={branch}/>;
    if(route==="/reports/pkg")        return <ReportPackagePnL/>;
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
    if(route==="/settings/preferences")  return <UxPreferences/>;
    if(route==="/reports/mis")            return <MisReport branch={branch}/>;
    if(route==="/reports/concentration")  return <ClientConcentration branch={branch}/>;
    if(route==="/reports/consolidated-bs")return <ConsolidatedBS setRoute={navigate} branch={branch}/>;
    if(route==="/reports/cashflow-forecast")return <CashFlowForecast branch={branch}/>;
    if(route==="/reports/supplier-360")   return <Supplier360 branch={branch}/>;
    if(route==="/reports/customer-360")   return <Customer360 branch={branch}/>;
    if(route==="/reports/tally-export")   return <TallyExport branch={branch}/>;
    if(route==="/masters/passports")      return <PassportManager branch={branch}/>;
    if(route==="/masters/markup")         return <MarkupRateSheet branch={branch}/>;
    if(route==="/masters/vendor-terms")   return <VendorTermsMaster branch={branch}/>;
    if(route==="/purchase/ticket-control")return <TicketControlRegister branch={branch}/>;
    if(route==="/purchase/bsp-import")    return <BspCsvImport branch={branch}/>;
    if(route==="/purchase/gds-import")    return <GdsPnrImport branch={branch} setRoute={navigate}/>;
    if(route==="/tax/reconciliation")     return <TaxReco branch={branch}/>;
    if(route==="/tax/gstr2b")             return <GstrRecon branch={branch}/>;
    if(route==="/tax/tds-certs")          return <TdsCertRegister branch={branch}/>;
    if(route==="/hr/salary-revision")     return <SalaryRevision branch={branch}/>;
    if(route==="/expense/budget")       return <ExpenseBudget branch={branch} setRoute={navigate}/>;
    if(route==="/reports/exp-bgt")      return <ReportExpenseBgt branch={branch} setRoute={navigate}/>;
    if(route==="/hr/employees")         return <HrEmployees branch={branch}/>;
    if(route==="/hr/shifts")            return <HrShifts branch={branch}/>;
    if(route==="/hr/attendance")        return <HrAttendance branch={branch}/>;
    if(route==="/hr/payroll")           return <HrPayroll branch={branch}/>;
    if(route==="/hr/payslips")          return <HrPayslips branch={branch}/>;
    if(route==="/settings/company")     return <SettingsCompany/>;
    if(route==="/settings/branches")     return <SettingsBranches/>;
    if(route==="/settings/users")        return <SettingsUsers/>;
    if(route==="/settings/audit")        return <SettingsAudit/>;
    // Chart-of-Accounts masters — 3 Tally-style doors (consolidated 2026-07-01):
    //   Groups (Create/Alter/Display) · Ledgers (Create/Alter/Display) · Chart of
    //   Accounts (tree, Display). The retired routes — /masters/subgroups (folded
    //   into Groups), /masters/groups-view, /masters/ledgers-view, /masters/accounts-info
    //   (overlapping read-only viewers) — were removed here.
    if(route==="/masters/groups")        return <GroupsMaster/>;                 // Groups door — Create/Alter/Display groups & sub-groups (3-tier)
    if(route==="/masters/ledgers")       return <LedgersMaster branch={branch}/>;// Ledgers door — live CRUD (cascading Group ▸ Sub-Group)
    if(route==="/masters/accounts-tree" || route==="/masters/chart-builder") return <AccountsTreeView branch={branch} setRoute={navigate} setBranch={setBranch}/>;  // Chart of Accounts (Display): Primary Group ▸ Group ▸ Sub-Group ▸ Ledger tree
    if(route==="/masters/voucher-types")   return <VoucherTypesMaster/>;
    if(route==="/masters/cost-categories") return <CostCategoriesMaster/>;
    if(route==="/masters/budgets")         return <BudgetsMaster branch={branch}/>;
    if(route==="/masters/scenarios")       return <ScenariosMaster/>;
    if(route==="/masters/customers")  return <CustomersMaster branch={branch}/>;
    if(route==="/masters/suppliers")  return <SuppliersMaster branch={branch}/>;
    if(route==="/masters/credit-facilities") return <CreditFacilitiesMaster branch={branch}/>;
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
    if(route==="/reports/cashbook")         return <CashBookLive branch={branch}/>;  /* legacy alias — Cash Book now lives under Finance ▸ Books */
    if(route==="/accounting/year-close")    return <YearEndClose branch={branch}/>;
    if(route==="/reports/destination")      return <DestinationIntelligence branch={branch}/>;
    if(route==="/reports/package-pl")       return <PackagePnL branch={branch}/>;
    if(route==="/hr/recruitment")           return <Recruitment branch={branch}/>;
    if(route==="/reports/budget")           return <BudgetPlanning branch={branch}/>;
    /* Intercompany billing IS the inter-branch (INB) flow — the old NotWired
       screen was retired 2026-07-10; the route now opens the live INB register. */
    if(route==="/accounting/intercompany")  return <InterBranchRegister branch={branch} setRoute={navigate}/>;
    if(route==="/masters/seats")            return <SeatInventory branch={branch}/>;
    if(route==="/hr/gratuity")              return <GratuityEstimateView branch={branch}/>;
    if(route==="/tax/eway")                 return <EWayBill branch={branch}/>;
        if(route==="/assets/register")                 return <FixedAssetRegister branch={branch} setRoute={navigate}/>;
        if(route==="/assets/depreciation")             return <AssetDepreciation branch={branch} setRoute={navigate}/>;
        if(route==="/assets/disposal")                 return <AssetDisposal branch={branch} setRoute={navigate}/>;
        if(route==="/assets/blocks")                   return <BlockOfAssets branch={branch} setRoute={navigate}/>;
        if(route==="/accounting/vendor-advances")      return <VendorAdvances branch={branch} setRoute={navigate}/>;
        if(route==="/accounting/loans")                return <LoanEmiRegister branch={branch} setRoute={navigate}/>;
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
        // The old PeriodLocking screen was a dead second lock UI (empty data, inert
        // buttons) — this route now serves the real TK period-lock admin instead.
        if(route==="/settings/period-lock")            return <TkPeriodLockPage/>;
        if(route==="/settings/approval-workflow")      return <ApprovalWorkflow branch={branch} setRoute={navigate}/>;
        if(route==="/approvals")                       return <PendingApprovals branch={branch} setRoute={navigate}/>;
        if(route==="/settings/banking-api")            return <BankingApiSettings branch={branch} setRoute={navigate}/>;
        if(route==="/settings/gsp-irp")                return <GspIrpSettings branch={branch} setRoute={navigate}/>;
        if(route==="/settings/page-access")            return <PageAccessControl currentUser={currentUser} setRoute={navigate}/>;
    // Developer Control — the engineering status console (what's wired / partial /
    // stub / dormant / pending across the whole ERP). SUPER-ADMIN ONLY: the menu
    // entry is role-gated in menus.js, and this route blocks everyone else even by
    // direct URL (the component re-checks the role too, as defense in depth).
    if(route==="/dev/control") return ['Super Admin','super_admin'].includes(currentUser?.role||'')
      ? <DevControlPage setRoute={navigate} currentUser={currentUser}/>
      : <div style={{padding:30,maxWidth:560,margin:"40px auto",background:"#fff",borderRadius:10,border:"1px solid #cdd1d8",textAlign:"center"}}>
          <div style={{fontSize:42,marginBottom:14}}>🔒</div>
          <h2 style={{margin:"0 0 8px",color:"#0d1326",fontSize:20}}>Developer Control</h2>
          <p style={{margin:"0 0 20px",color:"#5a6691",fontSize:13.5,lineHeight:1.5}}>This engineering console is restricted to the Super Admin.</p>
          <button onClick={()=>navigate("/dashboard")} style={{background:"#0d1326",color:"#fff",border:"none",padding:"10px 22px",borderRadius:6,fontWeight:600,cursor:"pointer"}}>← Back to Dashboard</button>
        </div>;
    return <Placeholder route={route} setRoute={navigate}/>;
  }

  /* If signed out, show the sign-out screen */
  if(!currentUser){
    // switchUser sets the user + auto-corrects the branch to one they can access.
    return <LoginScreen onSignIn={switchUser}/>;
  }

  return (
    <PrefsProvider enabled={!!currentUser}>
    <DockProvider>
    <HotkeysProvider>
    <NavContext.Provider value={navValue}>
    <ReferenceProvider>
    <>
      {/* Enterprise layout: collapsible sidebar + sticky app-bar (company + FY
          selectors, search, notifications, profile). Replaces TopBar + TopNav
          (retained in ./shell for reversibility). ContextBar (breadcrumb /
          back-forward) is pinned above the scrolling content via subBar. */}
      <AppShell
        branch={branch} setBranch={setBranch}
        route={route} setRoute={navigate}
        currentUser={currentUser} setCurrentUser={setUser}
        embed={embed}
        subBar={<ContextBar branch={branch} route={route}/>}
      >
        {/* App-wide Tally Export / Print / PDF toolbar — shown on every report,
            finance, tax & register screen. Excluded from the printout itself. */}
        <ReportActionBar route={route} branch={branch}/>
        <ErrorBoundary resetKey={route}>
          {/* Sales & Purchase are edit-only: new entries come via bulk Data Import (old-data upload).
              The 14 product entry forms stay reachable for reviewing/editing existing vouchers. */}
          {/^\/(sales|purchase)\/(flight|holiday|hotel|visa|car|insurance|misc)$/.test(route) && (
            <div style={{margin:"10px 10px 0",padding:"10px 14px",borderRadius:8,background:"#FFF7E6",
              border:"1px solid #F0C36D",color:"#7a5b12",fontSize:12,fontWeight:600,lineHeight:1.5}}>
              🔒 <b>Edit-only.</b> New Sales / Purchase entries are added in bulk via{" "}
              <a onClick={()=>navigate("/import")} style={{color:"#0070f2",cursor:"pointer",textDecoration:"underline"}}>Data Import</a>{" "}
              (upload old data with the template). Use this form to review or edit existing entries only.
            </div>
          )}
          {/* Suspense catches the lazy() page chunks while they download. */}
          <Suspense fallback={<RouteFallback/>}>
            <Page/>
          </Suspense>
        </ErrorBoundary>
      </AppShell>

      {/* Global overlays / hosts (mounted once) */}
      <GlobalFetchBar/>
      <PrintPreviewHost/>
      <ToastHost/>
      <RuleBlockHost/>
      <ConfirmHost/>
      <LedgerSwitcher branch={branch}/>
      <LedgerModalHost branch={branch}/>
      <BookingFolderHost branch={branch}/>
      <ShortcutHelp/>
    </>
    </ReferenceProvider>
    </NavContext.Provider>
    </HotkeysProvider>
    </DockProvider>
    </PrefsProvider>
  );
}

