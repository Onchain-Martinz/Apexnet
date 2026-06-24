// Format-only check — no DB lookup, no existence check. Deliberately simple:
// real-time UI feedback while typing, not the source of truth for whether an
// email is acceptable (zod's .email() in each form's submit schema is that).
const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(value: string): boolean {
  return EMAIL_FORMAT_REGEX.test(value.trim());
}
