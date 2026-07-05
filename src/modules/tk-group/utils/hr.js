// ─── TK GROUP CENTRAL · HR governance shaping (pure) ─────────────────────────
// HR control items raised centrally → Farhan + Owner change-request (governance).

export const HR_KINDS = [
  { key: 'new_hire', label: 'New hire / headcount' },
  { key: 'salary_revision', label: 'Salary revision' },
  { key: 'payroll_release', label: 'Payroll release' },
  { key: 'other', label: 'Other HR change' },
];

export function hrKindLabel(key) {
  return (HR_KINDS.find((k) => k.key === key) || {}).label || key;
}

export function isHrValid({ kind, subject }) {
  return !!kind && !!subject && !!String(subject).trim();
}
