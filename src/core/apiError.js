// Turn a backend error PAYLOAD into the single human line shown in a toast. Kept in
// its own module (no import.meta / axios deps) so it stays unit-testable — api.js
// imports it for the response interceptor.
export function errMessage(data) {
  if (data == null) return '';
  if (typeof data === 'string') {
    try { return JSON.parse(data).message || data; } catch { return data; }
  }
  // Prefer a human message; never dump the raw JSON payload (it leaks internal shape
  // and reads as gibberish in a toast). Fall back to a generic line.
  if (typeof data === 'object') {
    if (data.message) return data.message;
    if (data.error) return data.error;
    // express-validator failures arrive as { errors: [{ msg, path, ... }] } with NO
    // top-level message — surface the first field's message (e.g. "Date cannot be in
    // the future …") instead of a generic, useless "Request failed." line.
    if (Array.isArray(data.errors) && data.errors.length) {
      const e0 = data.errors[0];
      return (e0 && (e0.msg || e0.message)) || 'Request failed.';
    }
    return 'Request failed.';
  }
  return String(data);
}
