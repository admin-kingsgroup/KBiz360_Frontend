/* Pure mapping between the live employee API (/api/employees) DTO and the field
   names the HR Employee Master screen renders. Kept in its own module so the
   wiring contract (field names that must match the backend DTO + validator) is
   unit-testable without importing the heavy HR legacy.jsx bundle.

   Backend DTO  : empId, department, designation, phone,  joinDate, status('active'|'inactive')
   UI shape     : id,    dept,       desig,       mobile, joined,   status('Active'|'Inactive')
   _id is preserved for update/delete; numeric salary fields share the same names. */

const NUM_FIELDS = ['basic', 'hra', 'da', 'travel', 'medical', 'pf', 'esi', 'tds'];

export const BLANK_EMP = {
  _id: null, id: '', name: '', branch: '', dept: '', desig: '',
  joined: '', exit: '', dob: '', mobile: '', email: '', status: 'Active',
  shiftId: '', shiftCode: '',
  basic: 0, hra: 0, da: 0, travel: 0, medical: 0, pf: 0, esi: 0, tds: 0,
};

// Backend DTO → UI row.
export function fromEmpDTO(e = {}) {
  const row = {
    _id: e.id, id: e.empId, name: e.name || '', branch: e.branch || '',
    dept: e.department || '', desig: e.designation || '', grade: e.grade || '',
    joined: e.joinDate || '', exit: e.exitDate || '', dob: e.dob || '', mobile: e.phone || '', email: e.email || '',
    status: e.status === 'inactive' ? 'Inactive' : 'Active',
    shiftId: e.shiftId || '', shiftCode: e.shiftCode || '',
  };
  for (const k of NUM_FIELDS) row[k] = +e[k] || 0;
  return row;
}

// UI form → backend payload (matches employees.validator + model).
export function toEmpPayload(f = {}) {
  const body = {
    empId: f.id, name: f.name, branch: f.branch,
    department: f.dept, designation: f.desig, grade: f.grade || '',
    joinDate: f.joined, exitDate: f.exit, dob: f.dob, phone: f.mobile, email: f.email,
    status: f.status === 'Inactive' ? 'inactive' : 'active',
    shiftId: f.shiftId || '', shiftCode: f.shiftCode || '',
  };
  for (const k of NUM_FIELDS) body[k] = +f[k] || 0;
  return body;
}
