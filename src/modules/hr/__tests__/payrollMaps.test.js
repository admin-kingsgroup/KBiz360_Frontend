/* Wiring contract between the server-side payroll engine DTOs and the HR
   screens (register rows, payslips, challans, self-service identity). */
import {
  fromPayrollLineDTO, payrollTotalsFromDTO, challanDueDate,
  emailOfUser, currentUserEmail, matchEmployeeByEmail,
  fyOfMonth, form16Summary,
} from '../payrollMaps';

describe('fromPayrollLineDTO', () => {
  it('maps the server line fields onto the legacy register row names', () => {
    const row = fromPayrollLineDTO({
      empId: 'BOM-EMP-002', empName: 'Asha', department: 'Accounts', designation: 'Executive',
      basic: 20000, hra: 8000, da: 2000, travel: 1500, medical: 1250, special: 4750, gross: 32750,
      lwpDays: 1, lwpDed: 1260, pfEmployee: 2400, pfEmployer: 2400, eps: 1250,
      esiEligible: false, esiEmployee: 0, esiEmployer: 0,
      profTax: 200, tds: 500, totalDeductions: 4360, net: 28390,
      month: '2026-07', branch: 'BOM',
    });
    expect(row.id).toBe('BOM-EMP-002');
    expect(row.name).toBe('Asha');
    expect(row.desig).toBe('Executive');
    expect(row.empPF).toBe(2400);
    expect(row.empPFr).toBe(2400);
    expect(row.eps).toBe(1250);
    expect(row.empESI).toBe(0);
    expect(row.esiEligible).toBe(false);
    expect(row.profTax).toBe(200);
    expect(row.lwpDed).toBe(1260);
    expect(row.net).toBe(28390);
    expect(row.month).toBe('2026-07');
  });

  it('defaults every numeric column to 0 on a sparse line', () => {
    const row = fromPayrollLineDTO({ empId: 'X' });
    expect(row.gross).toBe(0);
    expect(row.net).toBe(0);
    expect(row.empPF).toBe(0);
    expect(row.esiEligible).toBe(false);
  });
});

describe('payrollTotalsFromDTO', () => {
  it('maps server totals (pfEmployee/…) to the footer names (empPF/…)', () => {
    const t = payrollTotalsFromDTO({
      gross: 100, basic: 50, hra: 20, special: 30, pfEmployee: 6, pfEmployer: 6, eps: 4,
      esiEmployee: 1, esiEmployer: 3, profTax: 2, lwpDed: 0, tds: 5, net: 86,
      esiEligibleCount: 2, headcount: 3,
    });
    expect(t).toMatchObject({ gross: 100, basic: 50, empPF: 6, empPFr: 6, empESI: 1, empESIr: 3, profTax: 2, tds: 5, net: 86, esiEligibleCount: 2, headcount: 3 });
  });
});

describe('challanDueDate', () => {
  it('is the 15th of the following month', () => {
    expect(challanDueDate('2026-06')).toBe('2026-07-15');
  });
  it('rolls December into January of the next year', () => {
    expect(challanDueDate('2025-12')).toBe('2026-01-15');
  });
});

describe('self-service identity resolution', () => {
  const emps = [
    { id: 'BOM-EMP-001', name: 'A', email: 'Asha@Kingsgroupco.com' },
    { id: 'BOM-EMP-002', name: 'B', email: '' },
  ];

  it('matches employee email case-insensitively', () => {
    expect(matchEmployeeByEmail(emps, 'asha@kingsgroupco.com')?.id).toBe('BOM-EMP-001');
    expect(matchEmployeeByEmail(emps, ' ASHA@KINGSGROUPCO.COM ')?.id).toBe('BOM-EMP-001');
  });

  it('never matches a blank email (employees without email stay unlinked)', () => {
    expect(matchEmployeeByEmail(emps, '')).toBeNull();
    expect(matchEmployeeByEmail(emps, undefined)).toBeNull();
  });

  it('returns null when no employee carries the email', () => {
    expect(matchEmployeeByEmail(emps, 'nobody@kingsgroupco.com')).toBeNull();
  });

  it('reads the logged-in email from the kb360-user localStorage mirror', () => {
    localStorage.setItem('kb360-user', JSON.stringify({ email: 'me@kingsgroupco.com', role: 'Accountant' }));
    expect(currentUserEmail()).toBe('me@kingsgroupco.com');
    localStorage.removeItem('kb360-user');
    expect(currentUserEmail()).toBe('');
  });

  it('emailOfUser falls back to username and tolerates junk', () => {
    expect(emailOfUser({ username: 'x@y.z' })).toBe('x@y.z');
    expect(emailOfUser(null)).toBe('');
  });
});

describe('Form 16 summary from persisted payslips', () => {
  const slip = (month, over = {}) => fromPayrollLineDTO({ empId: 'E', month, gross: 1000, pfEmployee: 100, profTax: 20, tds: 50, net: 830, ...over });

  it('fyOfMonth follows the Indian Apr–Mar year', () => {
    expect(fyOfMonth('2025-04')).toBe('2025-26');
    expect(fyOfMonth('2026-03')).toBe('2025-26');
    expect(fyOfMonth('2026-04')).toBe('2026-27');
  });

  it('sums only the months inside the chosen FY', () => {
    const slips = [slip('2026-03'), slip('2026-04'), slip('2026-05', { tds: 70 })];
    const s = form16Summary(slips, '2026-27');
    expect(s.months).toBe(2);
    expect(s.gross).toBe(2000);
    expect(s.tds).toBe(120);
  });

  it('is empty for an FY with no processed months', () => {
    expect(form16Summary([slip('2026-04')], '2024-25').months).toBe(0);
  });
});
