import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// ──────────────────────────────────────────────────────────────────────────
// 언어 라벨 – 프롬프트 안에서 자연어로 지시하기 위한 매핑
// ──────────────────────────────────────────────────────────────────────────
const LANGUAGE_LABELS: Record<string, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  "zh-CN": "Simplified Chinese",
  "zh-HK": "Traditional Chinese (Hong Kong)",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
};

// ──────────────────────────────────────────────────────────────────────────
// 허용되는 텍스트 종류 (admin 내부 메모, 마케팅 문구 등은 이 route에서 처리 안 함)
// ──────────────────────────────────────────────────────────────────────────
const ALLOWED_CONTENT_TYPES = [
  "customerRequest",
  "alternativeOfferNote",
  "changeReason",
  "cancelReason",
  "notificationMessage",
  "bookingSupportMessage",
] as const;
type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

function isAllowedContentType(v: string): v is AllowedContentType {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(v);
}

// ──────────────────────────────────────────────────────────────────────────
// 프롬프트 정책 (코드 내 명시)
// - 고객용 뷰티 예약 맥락에 맞는 자연스러운 번역
// - 가격/숫자/시간/날짜는 절대 임의 변경 금지
// - 매장명·서비스 고유명사는 원문 유지
// - 과한 의역 금지 – 원문의 뜻과 톤 그대로 살리기
// - 번역 결과 텍스트만 반환 (설명, 인용부호, 추가 문장 금지)
// ──────────────────────────────────────────────────────────────────────────
function buildPrompt(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  contentType: AllowedContentType,
): string {
  const contextNote = {
    customerRequest: "a customer's special request note for a beauty salon booking",
    alternativeOfferNote: "a beauty salon's note offering an alternative booking schedule",
    changeReason: "a customer's reason for requesting a booking change",
    cancelReason: "a customer's reason for cancelling a booking",
    notificationMessage: "a notification message about a beauty booking status update",
    bookingSupportMessage: "a support message related to a beauty booking",
  }[contentType];

  return `You are a professional translator for a beauty booking concierge app.

Context: Translate the following text from ${sourceLanguage} to ${targetLanguage}.
This text is: ${contextNote}.

Translation rules (strictly follow all):
1. Do NOT change any prices, numbers, times, or dates.
2. Preserve shop names, service names, and proper nouns as-is.
3. Use natural, polite customer-facing language. Avoid stiff literal translation.
4. Do NOT add explanations, quotes, or extra sentences.
5. Return ONLY the translated text.

Text to translate:
${text}`;
}

// ──────────────────────────────────────────────────────────────────────────
// 인-메모리 캐시 (같은 텍스트 + 같은 대상 언어 반복 호출 방지)
// 과한 캐시는 금지 – 단순 Map + 최대 200 항목
// ──────────────────────────────────────────────────────────────────────────
const translationCache = new Map<string, string>();
const CACHE_MAX = 200;

function getCacheKey(text: string, targetLocale: string, contentType: string) {
  return `${targetLocale}::${contentType}::${text.trim()}`;
}

// ──────────────────────────────────────────────────────────────────────────
// POST /api/translate/beauty
// Body: { text: string, targetLocale: string, contentType: string, sourceLocale?: string }
// ──────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: unknown;
      targetLocale?: unknown;
      contentType?: unknown;
      sourceLocale?: unknown;
    };

    // ── 1. 입력 검증 ──────────────────────────────────────────
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const targetLocale = typeof body.targetLocale === "string" ? body.targetLocale.trim() : "";
    const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "";
    const sourceLocale = typeof body.sourceLocale === "string" ? body.sourceLocale.trim() : "ko";

    if (!text) {
      // 빈 텍스트는 오류 없이 원문 그대로 반환
      return NextResponse.json({ translatedText: text, fallback: true });
    }

    if (!targetLocale || !LANGUAGE_LABELS[targetLocale]) {
      return NextResponse.json({ error: "unsupported_target_locale" }, { status: 400 });
    }

    if (!contentType || !isAllowedContentType(contentType)) {
      return NextResponse.json({ error: "unsupported_content_type" }, { status: 400 });
    }

    // ── 2. 원문과 대상 언어가 같으면 즉시 반환 ────────────────
    if (sourceLocale === targetLocale) {
      return NextResponse.json({ translatedText: text, fallback: true });
    }

    // ── 3. 인-메모리 캐시 확인 ────────────────────────────────
    const cacheKey = getCacheKey(text, targetLocale, contentType);
    const cached = translationCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ translatedText: cached, cached: true });
    }

    // ── 4. GEMINI_API_KEY 확인 ────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // API 키 미설정 → 조용히 원문 fallback
      return NextResponse.json({ translatedText: text, fallback: true });
    }

    // ── 5. Gemini 호출 ────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const sourceLanguage = LANGUAGE_LABELS[sourceLocale] ?? sourceLocale;
    const targetLanguage = LANGUAGE_LABELS[targetLocale];
    const prompt = buildPrompt(text, sourceLanguage, targetLanguage, contentType);

    const result = await model.generateContent(prompt);
    const translatedText = result.response.text().trim();

    if (!translatedText) {
      return NextResponse.json({ translatedText: text, fallback: true });
    }

    // ── 6. 캐시 저장 (초과 시 가장 오래된 항목 제거) ──────────
    if (translationCache.size >= CACHE_MAX) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return NextResponse.json({ translatedText });
  } catch (error) {
    // ── 7. 오류 시 조용히 fallback – 예약 흐름 보호 ──────────
    console.error("[translate/beauty] error:", error);
    // body에서 text를 다시 꺼낼 수 없으므로 fallback 신호만 반환
    return NextResponse.json({ fallback: true, error: "translation_unavailable" }, { status: 200 });
  }
}
