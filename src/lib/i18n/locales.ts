export const CANONICAL_MYPAGE_LOCALES = [
    "ko",
    "en",
    "ja",
    "zh-CN",
    "zh-HK",
    "vi",
    "th",
    "id",
    "ms",
] as const;

export const EXTRA_SUPPORTED_LOCALES = [
    "es",
    "fr",
    "de",
    "ar",
    "pt",
    "ru",
] as const;

export const CANONICAL_SUPPORTED_LOCALES = [
    ...CANONICAL_MYPAGE_LOCALES,
    ...EXTRA_SUPPORTED_LOCALES,
] as const;

export type CanonicalLocaleCode = (typeof CANONICAL_SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: CanonicalLocaleCode = "en";
export const DEFAULT_CLIENT_LOCALE: CanonicalLocaleCode = "ko";
export const LOCALE_STORAGE_KEY = "ktrip_lang";

export const LEGACY_LOCALE_ALIASES: Record<string, CanonicalLocaleCode> = {
    jp: "ja",
    cn: "zh-CN",
    tw: "zh-HK",
    hk: "zh-HK",
};

export const RESOURCE_LOCALE_CODE_BY_CANONICAL: Record<CanonicalLocaleCode, string> = {
    ko: "ko",
    en: "en",
    ja: "jp",
    "zh-CN": "cn",
    "zh-HK": "tw",
    vi: "vi",
    th: "th",
    id: "id",
    ms: "ms",
    es: "es",
    fr: "fr",
    de: "de",
    ar: "ar",
    pt: "pt",
    ru: "ru",
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
        return "zh-HK";
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

    if (canonical === "zh-HK") {
        return "zh-TW";
    }

    return canonical;
}

export function isRtlLocale(input?: string | null): boolean {
    return resolveCanonicalLocale(input) === "ar";
}
