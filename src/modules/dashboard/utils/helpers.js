export const formatCurrency = (currencySymbol, value) =>
  currencySymbol + Number(Math.round(value || 0)).toLocaleString(
    (currencySymbol === '₹' || currencySymbol === '₨' || currencySymbol === 'Rs') ? 'en-IN' : 'en-US');

export const formatPercentDelta = (n) =>
  (n >= 0 ? '+' : '') + n + '%';

export const growthPct = (current, previous) =>
  previous > 0 ? +(((current - previous) / previous) * 100).toFixed(1) : null;

export const safeRatio = (numerator, denominator) =>
  denominator > 0 ? +((numerator / denominator) * 100).toFixed(1) : 0;
