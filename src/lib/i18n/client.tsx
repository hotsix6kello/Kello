import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../../../public/locales/en/common.json";
import enBeautyExplore from "../../../public/locales/en/beauty_explore.json";
import koCommon from "../../../public/locales/ko/common.json";
import koBeautyExplore from "../../../public/locales/ko/beauty_explore.json";
import jpCommon from "../../../public/locales/jp/common.json";
import jpBeautyExplore from "../../../public/locales/jp/beauty_explore.json";
import cnCommon from "../../../public/locales/cn/common.json";
import cnBeautyExplore from "../../../public/locales/cn/beauty_explore.json";
import twCommon from "../../../public/locales/tw/common.json";
import twBeautyExplore from "../../../public/locales/tw/beauty_explore.json";
import esCommon from "../../../public/locales/es/common.json";
import esBeautyExplore from "../../../public/locales/es/beauty_explore.json";
import frCommon from "../../../public/locales/fr/common.json";
import frBeautyExplore from "../../../public/locales/fr/beauty_explore.json";
import deCommon from "../../../public/locales/de/common.json";
import deBeautyExplore from "../../../public/locales/de/beauty_explore.json";
import thCommon from "../../../public/locales/th/common.json";
import thBeautyExplore from "../../../public/locales/th/beauty_explore.json";
import viCommon from "../../../public/locales/vi/common.json";
import viBeautyExplore from "../../../public/locales/vi/beauty_explore.json";
import arCommon from "../../../public/locales/ar/common.json";
import arBeautyExplore from "../../../public/locales/ar/beauty_explore.json";
import idCommon from "../../../public/locales/id/common.json";
import idBeautyExplore from "../../../public/locales/id/beauty_explore.json";
import msCommon from "../../../public/locales/ms/common.json";
import msBeautyExplore from "../../../public/locales/ms/beauty_explore.json";
import ptCommon from "../../../public/locales/pt/common.json";
import ptBeautyExplore from "../../../public/locales/pt/beauty_explore.json";
import ruCommon from "../../../public/locales/ru/common.json";
import ruBeautyExplore from "../../../public/locales/ru/beauty_explore.json";

import {
    CANONICAL_SUPPORTED_LOCALES,
    DEFAULT_CLIENT_LOCALE,
    DEFAULT_LOCALE,
    LOCALE_STORAGE_KEY,
    resolveCanonicalLocale,
} from "@/lib/i18n/locales";


const localeResources = {
    en: { common: enCommon, beauty_explore: enBeautyExplore },
    ko: { common: koCommon, beauty_explore: koBeautyExplore },
    ja: { common: jpCommon, beauty_explore: jpBeautyExplore },
    "zh-CN": { common: cnCommon, beauty_explore: cnBeautyExplore },
    "zh-HK": { common: twCommon, beauty_explore: twBeautyExplore },
    es: { common: esCommon, beauty_explore: esBeautyExplore },
    fr: { common: frCommon, beauty_explore: frBeautyExplore },
    de: { common: deCommon, beauty_explore: deBeautyExplore },
    th: { common: thCommon, beauty_explore: thBeautyExplore },
    vi: { common: viCommon, beauty_explore: viBeautyExplore },
    ar: { common: arCommon, beauty_explore: arBeautyExplore },
    id: { common: idCommon, beauty_explore: idBeautyExplore },
    ms: { common: msCommon, beauty_explore: msBeautyExplore },
    pt: { common: ptCommon, beauty_explore: ptBeautyExplore },
    ru: { common: ruCommon, beauty_explore: ruBeautyExplore },
} as const;

const resources = localeResources;
export const LANGUAGE_CHANGED_EVENT = "kello-language-changed";

function getInitialI18nLanguage() {
    if (typeof document !== "undefined") {
        return resolveCanonicalLocale(document.documentElement.lang, DEFAULT_CLIENT_LOCALE);
    }

    return DEFAULT_CLIENT_LOCALE;
}

if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
        resources,
        lng: getInitialI18nLanguage(),
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...CANONICAL_SUPPORTED_LOCALES],
        ns: ["common", "beauty_explore"],
        defaultNS: "common",
        interpolation: { escapeValue: false },
    });
}

export default i18n;

export function syncI18nLanguage(lang?: string | null) {
    const canonical = resolveCanonicalLocale(lang, DEFAULT_CLIENT_LOCALE);

    if (i18n.resolvedLanguage !== canonical) {
        i18n.changeLanguage(canonical);
    }

    return canonical;
}

// serverLocale: locale hint passed from the server (via LanguageInitializer prop).
// Priority: serverLocale > localStorage > navigator.language > DEFAULT_CLIENT_LOCALE
export function initClientLanguage(serverLocale?: string) {
    if (typeof window === "undefined") return;

    if (serverLocale) {
        applyLanguage(serverLocale);
        return;
    }

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
    const canonical = syncI18nLanguage(lang);
    localStorage.setItem(LOCALE_STORAGE_KEY, canonical);
    document.cookie = `${LOCALE_STORAGE_KEY}=${canonical}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dir = "ltr";
    document.documentElement.lang = canonical;
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { locale: canonical } }));
}

export function changeLanguage(lang: string) {
    applyLanguage(lang);
    if (typeof window !== "undefined") {
        window.location.reload();
    }
}
