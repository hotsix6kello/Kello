import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../../../public/locales/en/common.json";
import ko from "../../../public/locales/ko/common.json";
import jp from "../../../public/locales/jp/common.json";
import cn from "../../../public/locales/cn/common.json";
import tw from "../../../public/locales/tw/common.json";
import es from "../../../public/locales/es/common.json";
import fr from "../../../public/locales/fr/common.json";
import de from "../../../public/locales/de/common.json";
import th from "../../../public/locales/th/common.json";
import vi from "../../../public/locales/vi/common.json";
import ar from "../../../public/locales/ar/common.json";
import id from "../../../public/locales/id/common.json";
import ms from "../../../public/locales/ms/common.json";
import pt from "../../../public/locales/pt/common.json";
import ru from "../../../public/locales/ru/common.json";

import {
    CANONICAL_SUPPORTED_LOCALES,
    DEFAULT_CLIENT_LOCALE,
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    isRtlLocale,
    resolveCanonicalLocale,
} from "@/lib/i18n/locales";


const resources = {
    en: { common: en },
    ko: { common: ko },
    ja: { common: jp },
    "zh-CN": { common: cn },
    "zh-HK": { common: tw },
    es: { common: es },
    fr: { common: fr },
    de: { common: de },
    th: { common: th },
    vi: { common: vi },
    ar: { common: ar },
    id: { common: id },
    ms: { common: ms },
    pt: { common: pt },
    ru: { common: ru },
};

// Always initialize with "en" so SSR and the first client render
// produce identical HTML. The real user locale is applied after hydration.
if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
        resources,
        lng: DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...CANONICAL_SUPPORTED_LOCALES],
        ns: ["common"],
        defaultNS: "common",
        interpolation: { escapeValue: false },
    });
}

export default i18n;

export function initClientLanguage() {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) {
        applyLanguage(stored);
        return;
    }

    applyLanguage(
        navigator.language
            ? resolveCanonicalLocale(navigator.language, DEFAULT_CLIENT_LOCALE)
            : DEFAULT_CLIENT_LOCALE
    );
}

function applyLanguage(lang: string) {
    const canonical = resolveCanonicalLocale(lang, DEFAULT_CLIENT_LOCALE);

    i18n.changeLanguage(canonical);
    localStorage.setItem(LOCALE_STORAGE_KEY, canonical);
    document.documentElement.dir = isRtlLocale(canonical) ? "rtl" : "ltr";
    document.documentElement.lang = canonical;
}

export function changeLanguage(lang: string) {
    applyLanguage(lang);
    if (typeof window !== "undefined") {
        window.location.reload();
    }
}
