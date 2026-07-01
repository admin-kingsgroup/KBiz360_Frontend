import { fromLeaveDTO, toLeavePayload, leaveDays, fromLeaveBalanceDTO, toLeaveBalancePayload, leaveBucketOf, takenFor, fromShiftDTO, toShiftPayload, weeklyOffForShift, fromJobDTO, toJobPayload, JOB_NEXT_STATUS, fromLoanDTO, toLoanPayload, fromRevisionDTO, toRevisionPayload } from '../hrMaps';

describe('Employee loan ↔ /api/employee-loans wiring', () => {
  const DTO = { id: 'L1', name: 'Aa', empCode: 'E1', designation: 'Ops', branch: 'BOM',
    type: 'Salary Advance', principal: 50000, emi: 5000, emiCount: 10, paid: 3, disbursedDate: '2026-02-01' };

  test('outstanding is derived (principal − paid×emi), never trusted from the wire', () => {
    expect(fromLoanDTO(DTO).outstanding).toBe(35000);       // 50000 − 3×5000
    expect(fromLoanDTO({ ...DTO, paid: 10 }).outstanding).toBe(0);
    expect(fromLoanDTO({ ...DTO, paid: 99 }).outstanding).toBe(0); // floored at 0
  });

  test('toLoanPayload sends numeric fields and drops derived/system fields', () => {
    const p = toLoanPayload({ ...fromLoanDTO(DTO), principal: '60000' });
    expect(p.principal).toBe(60000);
    expect(p).not.toHaveProperty('outstanding');
    expect(p).not.toHaveProperty('id');
  });
});

describe('Salary revision ↔ /api/salary-revisions wiring', () => {
  const DTO = { id: 'R1', empId: 'E1', empName: 'Aa', branch: 'BOM', date: '2025-04-01', basic: 44000, increment: 4000, pct: 10, reason: 'review' };
  test('round-trips with numeric coercion', () => {
    const p = toRevisionPayload({ ...fromRevisionDTO(DTO), basic: '48000' });
    expect(p).toMatchObject({ empId: 'E1', empName: 'Aa', branch: 'BOM', date: '2025-04-01', increment: 4000, pct: 10, reason: 'review' });
    expect(p.basic).toBe(48000);
    expect(p).not.toHaveProperty('id');
  });
});

describe('Leave request ↔ /api/leave-requests wiring', () => {
  const DTO = {
    id: 'abc', empId: 'BOM-EMP-002', employee: 'Priya Nair', branch: 'BOM',
    type: 'Sick Leave', from: '2026-05-04', to: '2026-05-06', days: 3,
    reason: 'fever', status: 'pending',
  };

  test('fromLeaveDTO maps employee→empName and Title-Cases status', () => {
    const r = fromLeaveDTO(DTO);
    expect(r.empName).toBe('Priya Nair');
    expect(r.status).toBe('Pending');
    expect(r.days).toBe(3);
  });

  test('toLeavePayload restores employee field + lowercases status enum', () => {
    const p = toLeavePayload(fromLeaveDTO({ ...DTO, status: 'approved' }));
    expect(p.employee).toBe('Priya Nair');
    expect(p.status).toBe('approved');           // backend enum, not 'Approved'
    expect(p).not.toHaveProperty('empName');
    expect(p).not.toHaveProperty('id');
  });

  test('approve/reject round-trip keeps the backend status enum valid', () => {
    const row = fromLeaveDTO(DTO);
    expect(toLeavePayload({ ...row, status: 'Approved' }).status).toBe('approved');
    expect(toLeavePayload({ ...row, status: 'Rejected' }).status).toBe('rejected');
  });

  test('leaveDays is inclusive and floors at 1', () => {
    expect(leaveDays('2026-05-04', '2026-05-06')).toBe(3);
    expect(leaveDays('2026-05-04', '2026-05-04')).toBe(1);
    expect(leaveDays('2026-05-06', '2026-05-04')).toBe(1); // reversed → still ≥1
    expect(leaveDays('', '')).toBe(1);
  });
});

describe('Leave balance ↔ /api/leave-balances wiring + derived "taken"', () => {
  test('fromLeaveBalanceDTO applies the 18/12/6 defaults only when a field is absent', () => {
    expect(fromLeaveBalanceDTO({ id: 'b1', empId: 'e1', year: '2026' })).toMatchObject({ annual: 18, sick: 12, casual: 6 });
    expect(fromLeaveBalanceDTO({ id: 'b1', empId: 'e1', year: '2026', annual: 0, sick: 5 })).toMatchObject({ annual: 0, sick: 5, casual: 6 });
  });

  test('toLeaveBalancePayload coerces to numbers + drops id', () => {
    const p = toLeaveBalancePayload({ id: 'b1', empId: 'e1', empName: 'Asha', branch: 'BOM', year: 2026, annual: '20', sick: '10', casual: '8' });
    expect(p).toMatchObject({ empId: 'e1', branch: 'BOM', year: '2026', annual: 20, sick: 10, casual: 8 });
    expect(p).not.toHaveProperty('id');
  });

  test('leaveBucketOf maps enum + UI labels; unpaid/LWP → null', () => {
    expect(leaveBucketOf('Casual')).toBe('casual');
    expect(leaveBucketOf('Casual Leave')).toBe('casual');
    expect(leaveBucketOf('Sick Leave')).toBe('sick');
    expect(leaveBucketOf('Earned')).toBe('annual');
    expect(leaveBucketOf('Annual Leave')).toBe('annual');
    expect(leaveBucketOf('LWP')).toBeNull();
    expect(leaveBucketOf('Unpaid')).toBeNull();
  });

  test('takenFor sums APPROVED days per bucket for the employee/year only', () => {
    const reqs = [
      { empId: 'e1', type: 'Casual Leave', from: '2026-05-04', days: 2, status: 'Approved' },
      { empId: 'e1', type: 'Sick Leave', from: '2026-06-01', days: 3, status: 'Approved' },
      { empId: 'e1', type: 'Casual Leave', from: '2026-07-01', days: 1, status: 'Pending' },   // pending → ignored
      { empId: 'e1', type: 'Annual Leave', from: '2025-12-30', days: 4, status: 'Approved' },   // prior year → ignored
      { empId: 'e2', type: 'Casual Leave', from: '2026-05-04', days: 5, status: 'Approved' },   // other emp → ignored
    ];
    expect(takenFor(reqs, 'e1', '2026')).toEqual({ annual: 0, sick: 3, casual: 2 });
  });
});

describe('Shift ↔ /api/shifts wiring', () => {
  const DTO = { id: 's1', name: 'General', code: 'GEN', branch: 'BOM', startTime: '09:30', endTime: '18:30',
    breakMins: 60, graceMins: 10, weeklyOff: [0], nightShift: false, active: true };

  test('fromShiftDTO round-trips with numeric/array coercion + defaults', () => {
    const s = fromShiftDTO(DTO);
    expect(s).toMatchObject({ name: 'General', code: 'GEN', branch: 'BOM', weeklyOff: [0], active: true });
    expect(fromShiftDTO({}).weeklyOff).toEqual([0]);       // default Sunday-off
    expect(fromShiftDTO({ active: false }).active).toBe(false);
  });

  test('toShiftPayload keeps only valid day-of-week ints in weeklyOff', () => {
    const p = toShiftPayload({ ...DTO, weeklyOff: [0, 6, 7, -1, '5'] });
    expect(p.weeklyOff).toEqual([0, 6, 5]);                // 7 and -1 dropped, '5' coerced
    expect(p).not.toHaveProperty('id');
  });

  test('weeklyOffForShift resolves the employee shift, else Sunday-only fallback', () => {
    const byId = { s1: fromShiftDTO({ ...DTO, weeklyOff: [5] }) };   // Friday off (Gulf pattern)
    expect(weeklyOffForShift('s1', byId)).toEqual([5]);
    expect(weeklyOffForShift('', byId)).toEqual([0]);               // unassigned → Sunday
    expect(weeklyOffForShift('nope', byId)).toEqual([0]);           // unknown id → Sunday
  });
});

describe('Job opening ↔ /api/job-openings wiring', () => {
  const DTO = {
    id: 'j1', title: 'Senior Travel Consultant', department: 'Operations', branch: 'BOM',
    status: 'open', location: 'Mumbai', jobType: 'Full-time', salaryRange: '₹35K–50K/mo',
    applicants: 12, skills: 'GDS, ticketing', openedAt: '2026-05-01',
  };

  test('fromJobDTO maps department→dept, jobType→type, salaryRange→salary, label-cases status', () => {
    const j = fromJobDTO(DTO);
    expect(j.dept).toBe('Operations');
    expect(j.type).toBe('Full-time');
    expect(j.salary).toBe('₹35K–50K/mo');
    expect(j.applicants).toBe(12);
    expect(j.status).toBe('Open');
  });

  test('toJobPayload restores backend field names + lowercase status', () => {
    const p = toJobPayload(fromJobDTO({ ...DTO, status: 'interviewing' }));
    expect(p.department).toBe('Operations');
    expect(p.jobType).toBe('Full-time');
    expect(p.salaryRange).toBe('₹35K–50K/mo');
    expect(p.status).toBe('interviewing');
    expect(p).not.toHaveProperty('dept');
  });

  test('on-hold survives the round-trip (label ↔ code)', () => {
    expect(fromJobDTO({ ...DTO, status: 'on-hold' }).status).toBe('On-hold');
    expect(toJobPayload({ ...fromJobDTO(DTO), status: 'On-hold' }).status).toBe('on-hold');
  });

  test('applicants typed as a string coerces to a number for the API', () => {
    expect(toJobPayload({ ...fromJobDTO(DTO), applicants: '7' }).applicants).toBe(7);
  });

  test('the lifecycle advances Open → Interviewing → Hired → Closed', () => {
    expect(JOB_NEXT_STATUS.Open).toBe('Interviewing');
    expect(JOB_NEXT_STATUS.Interviewing).toBe('Hired');
    expect(JOB_NEXT_STATUS.Hired).toBe('Closed');
    expect(JOB_NEXT_STATUS.Closed).toBe('Closed');
  });
});
