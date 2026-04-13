import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import koCommon from "../../../public/locales/ko/common.json";
import koBeautyExplore from "../../../public/locales/ko/beauty_explore.json";
import enCommon from "../../../public/locales/en/common.json";
import enBeautyExplore from "../../../public/locales/en/beauty_explore.json";
import jaCommon from "../../../public/locales/ja/common.json";
import jaBeautyExplore from "../../../public/locales/ja/beauty_explore.json";
import zhCNCommon from "../../../public/locales/zh-CN/common.json";
import zhCNBeautyExplore from "../../../public/locales/zh-CN/beauty_explore.json";
import zhTWCommon from "../../../public/locales/zh-TW/common.json";
import zhTWBeautyExplore from "../../../public/locales/zh-TW/beauty_explore.json";
import thCommon from "../../../public/locales/th/common.json";
import thBeautyExplore from "../../../public/locales/th/beauty_explore.json";
import viCommon from "../../../public/locales/vi/common.json";
import viBeautyExplore from "../../../public/locales/vi/beauty_explore.json";
import arCommon from "../../../public/locales/ar/common.json";
import arBeautyExplore from "../../../public/locales/ar/beauty_explore.json";

import {
    CANONICAL_SUPPORTED_LOCALES,
    DEFAULT_CLIENT_LOCALE,
    DEFAULT_LOCALE,
    isRtlLocale,
    LOCALE_STORAGE_KEY,
    resolveCanonicalLocale,
} from "@/lib/i18n/locales";


const localeResources = {
    ko: { common: koCommon, beauty_explore: koBeautyExplore },
    en: { common: enCommon, beauty_explore: enBeautyExplore },
    ja: { common: jaCommon, beauty_explore: jaBeautyExplore },
    "zh-CN": { common: zhCNCommon, beauty_explore: zhCNBeautyExplore },
    "zh-TW": { common: zhTWCommon, beauty_explore: zhTWBeautyExplore },
    th: { common: thCommon, beauty_explore: thBeautyExplore },
    vi: { common: viCommon, beauty_explore: viBeautyExplore },
    ar: { common: arCommon, beauty_explore: arBeautyExplore },
} as const;

const resources = localeResources;
export const LANGUAGE_CHANGED_EVENT = "kello-language-changed";

if (!i18n.isInitialized) {
    // 서버 환경이나 초기 렌더링 시에는 html lang 우선 참작. 
    // 실제 동기화는 initClientLanguage에서 덮어씀
    const fallbackInitialLang = typeof document !== "undefined" 
        ? resolveCanonicalLocale(document.documentElement.lang, DEFAULT_CLIENT_LOCALE)
        : DEFAULT_CLIENT_LOCALE;

    i18n.use(initReactI18next).init({
        resources,
        lng: fallbackInitialLang,
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

// 서버가 확정해준 locale만 사용하여 초기화 진행
export function initClientLanguage(serverLocale: string) {
    if (typeof window === "undefined") return;

    const canonical = syncI18nLanguage(serverLocale);
    
    // HTML lang/dir 동기화 방어 패스
    document.documentElement.dir = isRtlLocale(canonical) ? "rtl" : "ltr";
    document.documentElement.lang = canonical;

    // 초기 접속 시 보조 스토리지에도 동기화만 수행 (쿠키 갱신은 middleware에 위임되므로 불필요)
    localStorage.setItem(LOCALE_STORAGE_KEY, canonical);

    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { locale: canonical } }));
}

// 사용자가 명시적으로 언어를 변경했을 때만 Cookie/Storage 갱신 및 Reload
export function changeLanguage(lang: string) {
    const canonical = resolveCanonicalLocale(lang, DEFAULT_CLIENT_LOCALE);
    
    // 기기 귀속 저장을 위해 쿠키와 스토리지를 동시 업데이트
    localStorage.setItem(LOCALE_STORAGE_KEY, canonical);
    document.cookie = `${LOCALE_STORAGE_KEY}=${canonical}; path=/; max-age=31536000; samesite=lax`;
    
    if (typeof window !== "undefined") {
        window.location.reload();
    }
}
