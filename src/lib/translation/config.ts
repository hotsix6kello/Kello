export const TRANSLATION_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-HK", "vi", "th", "id", "ms"] as const;
export const TRANSLATION_TARGET_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-HK", "vi", "th", "id", "ms"] as const;
export const TRANSLATION_DOMAINS = ["beauty", "restaurant"] as const;
export const TRANSLATION_CONTENT_TYPES = [
  "shop",
  "service",
  "description",
  "policy",
  "chat_message",
  "request_note",
  "reservation",
] as const;
export const TRANSLATION_MODES = ["static", "realtime", "structured"] as const;
export const TRANSLATION_STATUSES = ["pending", "translated", "failed"] as const;

export const BASE_TRANSLATION_LOCALE = "ko" as const;
export const DEFAULT_TRANSLATION_DOMAIN = "beauty" as const;
export const DEFAULT_SCHEMA_VERSION = "beauty-v1";
export const DEFAULT_GLOSSARY_VERSION = 1;
export const DEFAULT_TRANSLATION_VERSION = 1;
export const DEFAULT_BATCH_LIMIT = 25;
export const STATIC_CACHE_TTL_MS = 1000 * 60 * 60;
export const REALTIME_CACHE_TTL_MS = 1000 * 60 * 5;
export const CACHE_MAX_ENTRIES = 500;
export const STRUCTURED_TRANSLATABLE_PATHS = ["service_name", "notes"] as const;

export const TRANSLATION_TABLES = {
  contents: "translation_contents",
  versions: "translation_versions",
  glossary: "translation_glossary",
  batchJobs: "translation_batch_jobs",
} as const;

export function isSupportedTranslationLocale(value: string): value is (typeof TRANSLATION_LOCALES)[number] {
  return (TRANSLATION_LOCALES as readonly string[]).includes(value);
}

export function isSupportedTranslationTargetLocale(
  value: string,
): value is (typeof TRANSLATION_TARGET_LOCALES)[number] {
  return (TRANSLATION_TARGET_LOCALES as readonly string[]).includes(value);
}

export function getRequestedTargetLocales(locales?: readonly string[]) {
  const defaultTargetLocales = TRANSLATION_TARGET_LOCALES.filter((locale) => locale !== BASE_TRANSLATION_LOCALE);
  const requested = (locales ?? defaultTargetLocales).filter(isSupportedTranslationTargetLocale);
  return requested.length > 0 ? requested : [...defaultTargetLocales];
}

export function getTranslationEngineName() {
  if (process.env.TRANSLATION_PROVIDER_NAME) {
    return process.env.TRANSLATION_PROVIDER_NAME;
  }

  if (process.env.TRANSLATION_PROVIDER_URL) {
    return "http-generic";
  }

  return "mock";
}

export function getSupportedTranslationLocaleListLabel() {
  return TRANSLATION_LOCALES.join(", ");
}
