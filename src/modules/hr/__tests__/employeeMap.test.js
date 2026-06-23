import { fromEmpDTO, toEmpPayload, BLANK_EMP } from '../employeeMap';

/* A representative DTO exactly as /api/employees returns it (see backend
   employees.dto.js + seed.js). */
const DTO = {
  id: '665f0000000000000000abcd',
  empId: 'BOM-EMP-002',
  name: 'Priya Nair',
  designation: 'Sr. Travel Consultant',
  department: 'Sales',
  branch: 'BOM',
  email: 'priya@travkings.com',
  phone: '+91 98200 22222',
  dob: '1992-03-14',
  joinDate: '2022-07-15',
  basic: 42000, hra: 16800, da: 4200, travel: 3000, medical: 1500,
  pf: 5040, esi: 0, tds: 2100,
  status: 'active',
};

describe('HR Employee Master ↔ /api/employees wiring', () => {
  test('fromEmpDTO maps backend field names to the UI shape', () => {
    const row = fromEmpDTO(DTO);
    expect(row._id).toBe(DTO.id);            // mongo _id kept for update/delete
    expect(row.id).toBe('BOM-EMP-002');      // human empId shown as "Emp ID"
    expect(row.dept).toBe('Sales');
    expect(row.desig).toBe('Sr. Travel Consultant');
    expect(row.mobile).toBe('+91 98200 22222');
    expect(row.joined).toBe('2022-07-15');
    expect(row.status).toBe('Active');       // 'active' → 'Active'
    expect(row.basic).toBe(42000);
  });

  test('inactive status normalises to the UI label', () => {
    expect(fromEmpDTO({ ...DTO, status: 'inactive' }).status).toBe('Inactive');
  });

  test('toEmpPayload produces exactly the fields the validator/model require', () => {
    const payload = toEmpPayload(fromEmpDTO(DTO));
    // Required by employees.validator: empId, name, branch
    expect(payload.empId).toBe('BOM-EMP-002');
    expect(payload.name).toBe('Priya Nair');
    expect(payload.branch).toBe('BOM');
    // status must be the backend enum, not the UI label
    expect(payload.status).toBe('active');
    // backend field names, not UI names
    expect(payload).toHaveProperty('department', 'Sales');
    expect(payload).toHaveProperty('designation', 'Sr. Travel Consultant');
    expect(payload).toHaveProperty('phone', '+91 98200 22222');
    expect(payload).toHaveProperty('joinDate', '2022-07-15');
    expect(payload).not.toHaveProperty('dept');
    expect(payload).not.toHaveProperty('_id');
  });

  test('round-trips DTO → UI → payload without losing or corrupting data', () => {
    const payload = toEmpPayload(fromEmpDTO(DTO));
    expect(payload).toMatchObject({
      empId: DTO.empId, name: DTO.name, branch: DTO.branch,
      department: DTO.department, designation: DTO.designation,
      phone: DTO.phone, joinDate: DTO.joinDate, dob: DTO.dob, email: DTO.email,
      basic: DTO.basic, hra: DTO.hra, da: DTO.da, travel: DTO.travel,
      medical: DTO.medical, pf: DTO.pf, esi: DTO.esi, tds: DTO.tds,
      status: 'active',
    });
  });

  test('string salary inputs (from <input type=number>) coerce to numbers for the API', () => {
    const edited = { ...BLANK_EMP, id: 'X', name: 'Y', branch: 'BOM', basic: '50000', hra: '', tds: '1200' };
    const payload = toEmpPayload(edited);
    expect(payload.basic).toBe(50000);   // not the string "50000"
    expect(payload.hra).toBe(0);          // empty → 0
    expect(payload.tds).toBe(1200);
    expect(typeof payload.basic).toBe('number');
  });

  test('a new blank employee yields an active-status payload with zeroed salary', () => {
    const payload = toEmpPayload({ ...BLANK_EMP, id: 'BOM-EMP-099', name: 'New Hire', branch: 'AMD' });
    expect(payload.status).toBe('active');
    expect(payload.basic).toBe(0);
    expect(payload.branch).toBe('AMD');
  });
});
