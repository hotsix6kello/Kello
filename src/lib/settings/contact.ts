const INTERNATIONAL_PHONE_ALLOWED_PATTERN = /^\+[0-9\s()-]+$/;
const INTERNATIONAL_PHONE_DIGIT_COUNT_MIN = 8;
const INTERNATIONAL_PHONE_DIGIT_COUNT_MAX = 15;

export interface PhoneCountryOption {
  id: string;
  label: string;
  dialCode: string;
  exampleNationalNumber: string;
  trunkPrefix?: string;
}

export interface StructuredPhoneInput {
  countryId: string;
  nationalNumber: string;
}

export const DEFAULT_PHONE_COUNTRY_ID = "KR";

const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { id: "KR", label: "대한민국 (+82)", dialCode: "+82", exampleNationalNumber: "01012345678", trunkPrefix: "0" },
  { id: "US", label: "미국/캐나다 (+1)", dialCode: "+1", exampleNationalNumber: "4155550100" },
  { id: "JP", label: "일본 (+81)", dialCode: "+81", exampleNationalNumber: "09012345678", trunkPrefix: "0" },
  { id: "CN", label: "중국 (+86)", dialCode: "+86", exampleNationalNumber: "13800138000" },
  { id: "HK", label: "홍콩 (+852)", dialCode: "+852", exampleNationalNumber: "91234567" },
  { id: "TW", label: "대만 (+886)", dialCode: "+886", exampleNationalNumber: "0912345678", trunkPrefix: "0" },
  { id: "SG", label: "싱가포르 (+65)", dialCode: "+65", exampleNationalNumber: "81234567" },
  { id: "TH", label: "태국 (+66)", dialCode: "+66", exampleNationalNumber: "0812345678", trunkPrefix: "0" },
  { id: "VN", label: "베트남 (+84)", dialCode: "+84", exampleNationalNumber: "0912345678", trunkPrefix: "0" },
  { id: "PH", label: "필리핀 (+63)", dialCode: "+63", exampleNationalNumber: "09171234567", trunkPrefix: "0" },
  { id: "ID", label: "인도네시아 (+62)", dialCode: "+62", exampleNationalNumber: "081234567890", trunkPrefix: "0" },
  { id: "AU", label: "호주 (+61)", dialCode: "+61", exampleNationalNumber: "0412345678", trunkPrefix: "0" },
  { id: "GB", label: "영국 (+44)", dialCode: "+44", exampleNationalNumber: "07123456789", trunkPrefix: "0" },
  { id: "FR", label: "프랑스 (+33)", dialCode: "+33", exampleNationalNumber: "0612345678", trunkPrefix: "0" },
  { id: "DE", label: "독일 (+49)", dialCode: "+49", exampleNationalNumber: "015123456789", trunkPrefix: "0" },
];

const PHONE_COUNTRY_OPTIONS_BY_ID = new Map(
  PHONE_COUNTRY_OPTIONS.map((option) => [option.id, option] as const)
);

const PHONE_COUNTRY_OPTIONS_BY_DIAL_CODE_LENGTH = [...PHONE_COUNTRY_OPTIONS].sort((left, right) => {
  return right.dialCode.replace(/\D/g, "").length - left.dialCode.replace(/\D/g, "").length;
});

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

export function normalizePhoneNationalNumberInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function getPhoneCountryOptions(): PhoneCountryOption[] {
  return PHONE_COUNTRY_OPTIONS;
}

export function getPhoneCountryById(countryId: string): PhoneCountryOption {
  return PHONE_COUNTRY_OPTIONS_BY_ID.get(countryId) ?? PHONE_COUNTRY_OPTIONS_BY_ID.get(DEFAULT_PHONE_COUNTRY_ID)!;
}

export function normalizeStructuredPhoneInput(countryId: string, nationalNumber: string): string | null {
  const country = getPhoneCountryById(countryId);
  const digitsOnly = normalizePhoneNationalNumberInput(nationalNumber);

  if (!digitsOnly) {
    return null;
  }

  let compactNationalNumber = digitsOnly;

  if (country.trunkPrefix && compactNationalNumber.startsWith(country.trunkPrefix)) {
    compactNationalNumber = compactNationalNumber.slice(country.trunkPrefix.length);
  }

  if (!compactNationalNumber) {
    return null;
  }

  return normalizeInternationalPhoneInput(`${country.dialCode}${compactNationalNumber}`);
}

export function parseStructuredPhoneInput(value: string | null | undefined): StructuredPhoneInput {
  const normalizedValue = typeof value === "string" ? normalizeInternationalPhoneInput(value) : null;

  if (!normalizedValue) {
    return {
      countryId: DEFAULT_PHONE_COUNTRY_ID,
      nationalNumber: "",
    };
  }

  const compactDigits = normalizedValue.slice(1);
  const matchedCountry = PHONE_COUNTRY_OPTIONS_BY_DIAL_CODE_LENGTH.find((option) => {
    return compactDigits.startsWith(option.dialCode.replace(/\D/g, ""));
  });

  if (!matchedCountry) {
    return {
      countryId: DEFAULT_PHONE_COUNTRY_ID,
      nationalNumber: compactDigits,
    };
  }

  const dialCodeDigits = matchedCountry.dialCode.replace(/\D/g, "");
  let nationalNumber = compactDigits.slice(dialCodeDigits.length);

  if (matchedCountry.trunkPrefix && nationalNumber && !nationalNumber.startsWith(matchedCountry.trunkPrefix)) {
    nationalNumber = `${matchedCountry.trunkPrefix}${nationalNumber}`;
  }

  return {
    countryId: matchedCountry.id,
    nationalNumber,
  };
}

export function isInternationalPhoneInputValid(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return normalizeInternationalPhoneInput(value) !== null;
}
