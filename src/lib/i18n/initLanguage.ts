import type { CanonicalLocaleCode } from "./locales";
import { AUTO_INIT_FLAG, LOCALE_STORAGE_KEY, MANUAL_SELECTION_FLAG } from "./locales";
import { changeLanguage } from "./client";

const COUNTRY_TO_LOCALE: Record<string, CanonicalLocaleCode> = {
    KR: "ko",
    JP: "ja",
    TH: "th",
    VN: "vi",
    CN: "zh-CN",
    TW: "zh-TW",
    SA: "ar", AE: "ar", EG: "ar", IQ: "ar", JO: "ar",
    KW: "ar", LB: "ar", OM: "ar", QA: "ar", YE: "ar",
};

function resolveNavLocale(lang: string): CanonicalLocaleCode | null {
    const s = lang.trim().replace(/_/g, "-").toLowerCase();
    if (s === "ko" || s.startsWith("ko-")) return "ko";
    if (s === "en" || s.startsWith("en-")) return "en";
    if (s === "ja" || s.startsWith("ja-")) return "ja";
    if (s === "th" || s.startsWith("th-")) return "th";
    if (s === "vi" || s.startsWith("vi-")) return "vi";
    if (s === "ar" || s.startsWith("ar-")) return "ar";
    // zh-Hant, zh-TW, zh-HK → zh-TW
    if (s === "zh-tw" || s.startsWith("zh-tw-") ||
        s === "zh-hk" || s.startsWith("zh-hk-") ||
        s === "zh-hant" || s.startsWith("zh-hant-")) return "zh-TW";
    // zh-Hans, zh-CN, zh → zh-CN
    if (s === "zh-cn" || s.startsWith("zh-cn-") ||
        s === "zh-hans" || s.startsWith("zh-hans-") ||
        s === "zh") return "zh-CN";
    return null;
}

function detectFromNavigator(): CanonicalLocaleCode | null {
    if (typeof navigator === "undefined") return null;
    const langs = navigator.languages?.length
        ? [...navigator.languages]
        : navigator.language ? [navigator.language] : [];
    for (const lang of langs) {
        const resolved = resolveNavLocale(lang);
        if (resolved !== null) return resolved;
    }
    return null;
}

async function detectFromIP(): Promise<CanonicalLocaleCode | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
        const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
        if (!res.ok) return null;
        const data: { country_code?: string } = await res.json();
        // 매핑된 국가 → 해당 언어, 매핑되지 않은 국가 → 영어
        return data.country_code ? (COUNTRY_TO_LOCALE[data.country_code] ?? "en") : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * 앱 최초 진입 시 1회만 실행되는 자동 언어 감지 함수.
 *
 * 우선순위:
 * 0. 사용자 수동 선택 기록(MANUAL_SELECTION_FLAG)이 있으면 즉시 종료
 * 1. navigator.language 기반 감지
 * 2. IP 지오로케이션 (ipapi.co)
 * 기본값: en
 */
export async function initLanguage(): Promise<void> {
    if (typeof window === "undefined") return;

    // 사용자가 직접 언어를 선택한 적 있으면 덮어쓰지 않음
    if (localStorage.getItem(MANUAL_SELECTION_FLAG)) return;

    // 최초 1회만 실행
    if (localStorage.getItem(AUTO_INIT_FLAG)) return;

    // 1순위: IP 기반 지오로케이션 — 접속 국가로 언어 결정
    // 매핑된 국가 → 해당 언어, 매핑 없는 국가 → "en" 반환
    let detected: CanonicalLocaleCode | null = await detectFromIP();

    // 2순위: IP 호출 자체 실패 시에만 기기 언어 설정으로 폴백
    if (!detected) {
        detected = detectFromNavigator();
    }

    // 기본값: en
    const finalLocale: CanonicalLocaleCode = detected ?? "en";

    // reload 이전에 플래그 저장 (reload 후 재실행 방지)
    localStorage.setItem(AUTO_INIT_FLAG, "1");

    // 현재 적용 언어와 다를 때만 변경 (불필요한 reload 방지)
    const currentLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (currentLocale !== finalLocale) {
        changeLanguage(finalLocale);
    }
}
