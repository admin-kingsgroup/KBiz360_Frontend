// errMessage turns a backend error PAYLOAD into the single human line shown in the
// toast. The wiring that matters for the future-date block: express-validator
// failures arrive as { errors: [{ msg, path }] } with NO top-level `message`, so the
// helper must surface errors[0].msg ("Date cannot be in the future …") instead of a
// useless generic "Request failed." — otherwise the reason is lost on the manual
// voucher path (its route runs the validator → 400 { errors }).
import { errMessage } from '../core/apiError';

describe('errMessage — backend error payload → toast line', () => {
  test('service-layer error { message } is surfaced verbatim (booking / voucher service 422)', () => {
    expect(errMessage({ success: false, message: 'Date cannot be in the future — only today or a past date is allowed' }))
      .toBe('Date cannot be in the future — only today or a past date is allowed');
  });

  test('express-validator { errors: [{ msg }] } surfaces the first field message (voucher 400)', () => {
    const payload = { success: false, errors: [{ msg: 'Date cannot be in the future — only today or a past date is allowed', path: 'date' }] };
    expect(errMessage(payload)).toBe('Date cannot be in the future — only today or a past date is allowed');
  });

  test('message wins over an errors array when both are present', () => {
    expect(errMessage({ message: 'Specific reason', errors: [{ msg: 'other' }] })).toBe('Specific reason');
  });

  test('empty / unknown object falls back to a generic line, never raw JSON', () => {
    expect(errMessage({ success: false })).toBe('Request failed.');
    expect(errMessage({ errors: [] })).toBe('Request failed.');
  });

  test('a plain string payload is returned as-is', () => {
    expect(errMessage('Boom')).toBe('Boom');
  });

  test('null payload yields an empty string', () => {
    expect(errMessage(null)).toBe('');
  });
});
