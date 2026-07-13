/* ════════════════════════════════════════════════════════════════════
   Settings feature — public barrel
   ════════════════════════════════════════════════════════════════════
   BUSINESS SUB-MODULE REORG (2026-07-13): screens are grouped by business
   sub-module — matching the nav menu's MENU_SETTINGS groups — into
   organization/, compliance-workflow/, integrations/, tools/ and
   admin-power/ folders. `legacy.jsx` and `pageAccess.jsx` are now thin
   re-export shims (SettingsUsers / PageAccessControl moved into
   organization/, but modules/tk-group/pages.jsx and App.jsx import them
   directly from those exact old paths as separate lazy-loaded chunks).
   pages/company.jsx (SettingsCompany) isn't a MENU_SETTINGS item — left
   untouched at its original path.
   ──────────────────────────────────────────────────────────────────── */

export { SettingsCompany } from './pages/company';

// ── Business sub-module regroup — organization/ ──────────────────────────────
export { SettingsBranches } from './organization/branches';
export { SettingsUsers } from './organization/users';
export { PageAccessControl } from './organization/pageAccess';

// ── Business sub-module regroup — compliance-workflow/ ───────────────────────
export { ApprovalWorkflow } from './compliance-workflow/approvalWorkflow';
export { StatutoryFilingRegister } from './compliance-workflow/statutoryFilingRegister';
export { DelegationsManager } from './compliance-workflow/delegationsManager';

// ── Business sub-module regroup — integrations/ ──────────────────────────────
export { ApiKeySettings } from './integrations/apiKeys';
export { GspIrpSettings } from './integrations/gspIrp';
export { BankingApiSettings } from './integrations/bankingApi';

// ── Business sub-module regroup — tools/ ─────────────────────────────────────
export { SettingsAudit } from './tools/audit';

// ── Business sub-module regroup — admin-power/ ───────────────────────────────
export { DocTemplateEditor } from './admin-power/docTemplateEditor';
export { EmailSMSTemplates } from './admin-power/emailSmsTemplates';
export { ApprovalMatrixBuilder } from './admin-power/approvalMatrixBuilder';
export { CustomFieldsManager } from './admin-power/customFieldsManager';
export { FieldAccessControl } from './admin-power/fieldAccessControl';
export { BulkUserOperations } from './admin-power/bulkUserOperations';
export { PermissionsMatrix } from './admin-power/permissionsMatrix';
export { BrandingSettings } from './admin-power/brandingSettings';
