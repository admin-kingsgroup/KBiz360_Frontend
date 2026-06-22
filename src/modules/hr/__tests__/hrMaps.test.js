import { fromLeaveDTO, toLeavePayload, leaveDays, fromJobDTO, toJobPayload, JOB_NEXT_STATUS } from '../hrMaps';

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
