const INTERNATIONAL_PHONE_ALLOWED_PATTERN = /^\+[0-9\s()-]+$/;
const INTERNATIONAL_PHONE_DIGIT_COUNT_MIN = 8;
const INTERNATIONAL_PHONE_DIGIT_COUNT_MAX = 15;

export function sanitizeSnsInput(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

export function normalizeInternationalPhoneInput(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!INTERNATIONAL_PHONE_ALLOWED_PATTERN.test(trimmedValue)) {
    return null;
  }

  const digitsOnly = trimmedValue.replace(/\D/g, "");

  if (!trimmedValue.startsWith("+")) {
    return null;
  }

  if (digitsOnly.length < INTERNATIONAL_PHONE_DIGIT_COUNT_MIN) {
    return null;
  }

  if (digitsOnly.length > INTERNATIONAL_PHONE_DIGIT_COUNT_MAX) {
    return null;
  }

  if (digitsOnly.startsWith("0")) {
    return null;
  }

  return `+${digitsOnly}`;
}

export function isInternationalPhoneInputValid(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return normalizeInternationalPhoneInput(value) !== null;
}
