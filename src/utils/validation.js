/**
 * Shared validation rules for the Jibunai 3-gate authentication.
 *
 * These rules mirror the server (`Portfolio/backend/api/serializers.py`).
 * The client validates early for instant feedback; the server always
 * re-validates — never trust the client.
 */

/**
 * Secret code: 4 to 8 characters, ANY symbol / letter / number allowed.
 * Empty or whitespace-only codes are rejected.
 */
export const SECRET_CODE_MIN = 4;
export const SECRET_CODE_MAX = 8;
export const SECRET_CODE_REGEX = /^.{4,8}$/;

export function validateSecretCode(value) {
  if (value == null) return 'Secret code is required.';
  const code = String(value).trim();
  if (!code) return 'Secret code is required.';
  if (code.length < SECRET_CODE_MIN || code.length > SECRET_CODE_MAX) {
    return `Secret code must be between ${SECRET_CODE_MIN} and ${SECRET_CODE_MAX} characters.`;
  }
  return null;
}

export function validateRequired(value, field) {
  const str = String(value == null ? '' : value).trim();
  if (!str) return `${field} is required.`;
  return null;
}

export function validateUsername(value) {
  const err = validateRequired(value, 'Username');
  if (err) return err;
  const str = String(value).trim();
  if (str.length < 3) return 'Username must be at least 3 characters.';
  if (/[^a-zA-Z0-9_-]/.test(str)) {
    return 'Username can only contain letters, numbers, underscores and hyphens.';
  }
  return null;
}

export function validateDateOfBirth(value) {
  if (!value) return 'Date of birth is required.';
  const dob = new Date(value);
  const today = new Date();
  if (isNaN(dob.getTime())) return 'Invalid date of birth.';
  if (dob > today) return 'Date of birth cannot be in the future.';
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  if (age < 13) return 'You must be at least 13 years old.';
  return null;
}
