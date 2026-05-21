import {
  AP_AGEING_SUMMARY,
  AR_AGEING_SUMMARY,
  BANK_ACCOUNTS_DATA,
  BRANCH_PL_HEATMAP,
  PERIOD_CLOSE_DATA,
  RECON_STATUS_DATA,
  REVENUE_TREND_12M,
  TOP_CUSTOMERS_DATA,
  TOP_SUPPLIERS_DATA,
  VARIANCE_FLAGS_DATA,
} from '../../../core/helpers';
import {
  CASH_FORECAST_13W,
  FY_TARGETS_DATA,
  KEY_ALERTS_DATA,
} from '../../../core/data';

export const getBankAccounts = async () => BANK_ACCOUNTS_DATA;
export const getRevenueTrend = async () => REVENUE_TREND_12M;
export const getFyTargets = async () => FY_TARGETS_DATA;
export const getBranchHeatmap = async () => BRANCH_PL_HEATMAP;
export const getKeyAlerts = async () => KEY_ALERTS_DATA;
export const getTopCustomers = async () => TOP_CUSTOMERS_DATA;
export const getTopSuppliers = async () => TOP_SUPPLIERS_DATA;
export const getCashForecast = async () => CASH_FORECAST_13W;
export const getPeriodClose = async () => PERIOD_CLOSE_DATA;
export const getArAgeingSummary = async () => AR_AGEING_SUMMARY;
export const getApAgeingSummary = async () => AP_AGEING_SUMMARY;
export const getReconStatus = async () => RECON_STATUS_DATA;
export const getVarianceFlags = async () => VARIANCE_FLAGS_DATA;
