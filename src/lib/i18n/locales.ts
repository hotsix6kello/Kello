export const CANONICAL_SUPPORTED_LOCALES = [
    "ko",
    "en",
    "ja",
    "zh-CN",
    "zh-TW",
    "vi",
    "th",
    "ar",
] as const;

export type CanonicalLocaleCode = (typeof CANONICAL_SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: CanonicalLocaleCode = "ko";
export const DEFAULT_CLIENT_LOCALE: CanonicalLocaleCode = "ko";
export const LOCALE_STORAGE_KEY = "kello_lang";

export const LEGACY_LOCALE_ALIASES: Record<string, CanonicalLocaleCode> = {
    jp: "ja",
    cn: "zh-CN",
    tw: "zh-TW",
    hk: "zh-TW",
    "zh-HK": "zh-TW",
};

export const RESOURCE_LOCALE_CODE_BY_CANONICAL: Record<CanonicalLocaleCode, string> = {
    ko: "ko",
    en: "en",
    ja: "ja",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    vi: "vi",
    th: "th",
    ar: "ar",
};

export function resolveCanonicalLocale(
    input?: string | null,
    fallback: CanonicalLocaleCode = DEFAULT_LOCALE
): CanonicalLocaleCode {
    if (!input) return fallback;

    const normalized = input.trim().replace(/_/g, "-");
    if (!normalized) return fallback;

    const lower = normalized.toLowerCase();

    if (lower === "jp" || lower === "ja" || lower.startsWith("ja-")) {
        return "ja";
    }

    if (
        lower === "cn" ||
        lower === "zh" ||
        lower === "zh-cn" ||
        lower.startsWith("zh-cn")
    ) {
        return "zh-CN";
    }

    if (
        lower === "tw" ||
        lower === "hk" ||
        lower === "zh-tw" ||
        lower.startsWith("zh-tw") ||
        lower === "zh-hk" ||
        lower.startsWith("zh-hk")
    ) {
        return "zh-TW";
    }

    const base = lower.split("-")[0];
    if (CANONICAL_SUPPORTED_LOCALES.includes(base as CanonicalLocaleCode)) {
        return base as CanonicalLocaleCode;
    }

    return fallback;
}

export function toResourceLocaleCode(input?: string | null): string {
    const canonical = resolveCanonicalLocale(input);
    return RESOURCE_LOCALE_CODE_BY_CANONICAL[canonical];
}

export function toGoogleMapsLanguageCode(input?: string | null): string {
    const canonical = resolveCanonicalLocale(input);
    return canonical;
}

export function isRtlLocale(input?: string | null): boolean {
    return resolveCanonicalLocale(input) === "ar";
}
