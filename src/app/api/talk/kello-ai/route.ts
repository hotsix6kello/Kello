import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";
import crypto from "crypto";

export const runtime = "nodejs";

const BEAUTY_CATEGORIES = ["예약", "뷰티스타일 추천", "업체 추천", "가격 안내", "시술 정보", "이용 안내"];

// 1. 개인정보 보호 (PII Masking)
function maskPII(text: string): string {
  let masked = text;
  // 전화번호 마스킹 (010-XXXX-XXXX, 02-XXX-XXXX 등)
  masked = masked.replace(/(01[016789][- ]?\d{3,4}[- ]?\d{4})|(\d{2,3}[- ]?\d{3,4}[- ]?\d{4})/g, "[PHONE]");
  // 이메일 마스킹
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // 결제/카드 정보 마스킹 (16자리 카드 번호 등)
  masked = masked.replace(/\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g, "[CARD]");
  return masked;
}

// 2. 언어 자동 감지
function detectLanguage(text: string): string {
  // 일본어 문자셋 검출 (Hiragana & Katakana)
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  // 중국어 문자셋 검출 (한자가 일정량 포함되어 있고, 한국어나 일본어가 주가 아닐 때)
  if (/[\u4e00-\u9fa5]/.test(text) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return "zh";
  // 영어 및 라틴 알파벳이 주요 구성이고 한글이 없는 경우
  if (/[a-zA-Z]/.test(text) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return "en";
  return "ko";
}

// 3. 질문 정규화 (유사 질문 매핑 및 룰베이스 표준화)
function normalizeQuestion(text: string): string {
  let cleaned = text.trim().toLowerCase();
  // 특수문자 제거
  cleaned = cleaned.replace(/[?!\.,~@#$%^&*()_+\-=\[\]{};':"\\|<>\/]/g, "");
  // 다중 공백 제거
  cleaned = cleaned.replace(/\s+/g, "");

  // 룰베이스 매핑 (유사 의미 질문을 특정 표준 키워드로 통일)
  if (cleaned.includes("예약") && (cleaned.includes("방법") || cleaned.includes("어떻게") || cleaned.includes("하고싶") || cleaned.includes("문의") || cleaned.includes("등록"))) {
    return "standard_booking_method";
  }
  if (cleaned.includes("예약") && (cleaned.includes("취소") || cleaned.includes("변경") || cleaned.includes("수정") || cleaned.includes("미루"))) {
    return "standard_booking_cancel_change";
  }
  if (cleaned.includes("시간") && (cleaned.includes("얼마나") || cleaned.includes("소요") || cleaned.includes("소요시간") || cleaned.includes("걸려"))) {
    return "standard_service_duration";
  }
  if (cleaned.includes("위치") || cleaned.includes("어디") || cleaned.includes("주소") || cleaned.includes("지도") || cleaned.includes("경로") || cleaned.includes("찾아가")) {
    return "standard_shop_location";
  }
  if (cleaned.includes("가격") || cleaned.includes("얼마") || cleaned.includes("비용") || cleaned.includes("요금")) {
    return "standard_service_price";
  }
  if (cleaned.includes("kello") || cleaned.includes("어플") || cleaned.includes("앱") || cleaned.includes("이용")) {
    return "standard_kello_app_info";
  }

  return cleaned;
}

// 4. 질문 SHA-256 해시 생성
function generateHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

const SYSTEM_PROMPT = `
You are Kello Beauty Booking AI Assistant.

Role:
- Beauty reservation guidance (booking, change, cancel, treatment time)
- Beauty style recommendations (face shape, season, skin type)
- Salon recommendations (by category and region)
- Price guidance (average price ranges, MUST include "Prices may vary by salon")
- Treatment information (process, precautions, duration)
- App usage guidance (how to use Kello)

CRITICAL LANGUAGE RULE:
- ALWAYS reply in the EXACT SAME LANGUAGE as the user's question.
- If the user writes in English → reply in English.
- If the user writes in Korean → reply in Korean.
- If the user writes in Japanese → reply in Japanese.
- If the user writes in Chinese → reply in Chinese.
- NEVER switch to a different language.

Answer principles:
1. Be friendly but concise and accurate (3-5 sentences max)
2. Never guarantee medical diagnosis or certain effects
3. Never fabricate unregistered salon information
4. For off-topic questions, reply only with: "Kello specializes in beauty booking services 😊 I can help with reservations, treatments, and salons. For other inquiries, please contact customer support." (IN THE USER'S LANGUAGE)

For treatment duration questions:
- If user doesn't specify the treatment type, ask which treatment they're curious about before answering.

For salon recommendations:
- If recommending a specific salon, include its name as 'mapQuery' for map search. If no salon mentioned, set mapQuery to null.

Return ONLY a raw JSON object (no markdown, no code block):
{
  "reply": "friendly answer in the user's language",
  "isOffTopic": false,
  "mapQuery": "salon name for map search or null"
}
`;

export async function POST(request: Request) {
  try {
    const { message, category } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // 1. 개인정보 보호 & 마스킹
    const maskedMessage = maskPII(message);

    // 2. 언어 자동 감지
    const lang = detectLanguage(maskedMessage);

    // 3. 질문 정규화 및 해시 생성
    const normalized = normalizeQuestion(maskedMessage);
    const questionHash = generateHash(normalized);

    // Supabase Server Client 안전 초기화 (비로그인 예외 방지)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null;
    try {
      supabase = getSupabaseServerClient();
    } catch (e) {
      console.warn("Supabase server client init bypassed (guest session):", e);
    }

    // 4. 캐시 우선 조회
    if (supabase) {
      try {
        const { data: cacheData } = await supabase
          .from("ai_answer_cache")
          .select("answer")
          .eq("question_hash", questionHash)
          .eq("language", lang)
          .maybeSingle();

        if (cacheData?.answer) {
          const parsed = JSON.parse(cacheData.answer);
          return NextResponse.json({
            reply: parsed.reply,
            isOffTopic: parsed.isOffTopic,
            mapQuery: parsed.mapQuery,
            cached: true
          });
        }
      } catch (cacheFetchErr) {
        console.error("Cache read error:", cacheFetchErr);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.TRANSLATION_PROVIDER_API_KEY;

    let reply = "";
    let isOffTopic = false;
    let mapQuery: string | null = null;

    if (!apiKey) {
      reply = lang === "ja" 
        ? "こんにちは！ KelloビューティーAIアシスタントです。ご予約や施術、サロンのご案内를 지원합니다😊"
        : lang === "zh"
        ? "您好！我是 Kello 美容 AI 助手。我可以帮您解答有关预约、项目和门店的咨询 😊"
        : lang === "en"
        ? "Hello! I'm Kello Beauty AI Assistant. I'm here to help with bookings, services, and shops 😊"
        : "안녕하세요! Kello 뷰티 AI 도우미입니다. 예약, 시술, 업체 관련 질문을 도와드릴게요 😊";
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      // 이 API Key가 전용으로 허용하는 gemini-2.5-flash 모델 사용
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const categoryContext = category && BEAUTY_CATEGORIES.includes(category)
        ? `\n현재 사용자가 선택한 카테고리: ${category}`
        : "";

      const langContext = `\n[중요] 사용자의 언어인 "${lang}"에 완전히 최적화하여 답변을 생성하십시오.`;
      const prompt = `${SYSTEM_PROMPT}${categoryContext}${langContext}\n\n사용자 질문: "${maskedMessage}"`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        let cleaned = text
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleaned = jsonMatch[0];

        try {
          const parsed = JSON.parse(cleaned);
          reply = parsed.reply ?? "";
          isOffTopic = parsed.isOffTopic === true;
          mapQuery = parsed.mapQuery || null;
        } catch {
          reply = cleaned;
        }
      } catch (geminiApiError) {
        console.error("Gemini API generate content failed (Quota limits):", geminiApiError);
        // API 한도 초과(429) 또는 에러 발생 시 친절한 기본 fallback 텍스트 제공
        reply = lang === "ja" 
          ? "こんにちは！ KelloビューティーAIアシスタント입니다.ご予約や施術、サロンのご案内를 지원합니다😊"
          : lang === "zh"
          ? "您好！我是 Kello 美容 AI 助手。我可以帮您解答有关预约、项目和门店의 안내를 도와드릴게요 😊"
          : lang === "en"
          ? "Hello! I'm Kello Beauty AI Assistant. I'm here to help with bookings, treatments, and salons 😊"
          : "안녕하세요! Kello 뷰티 AI 도우미입니다. 예약, 시술, 업체 관련 질문을 도와드릴게요 😊";
      }

      // 5. 답변 캐싱 저장
      if (supabase) {
        try {
          const payloadToCache = JSON.stringify({ reply, isOffTopic, mapQuery });
          await supabase.from("ai_answer_cache").upsert({
            question_hash: questionHash,
            question: normalized,
            category: category ?? null,
            language: lang,
            answer: payloadToCache,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "question_hash,language"
          });
        } catch (cacheInsertErr) {
          console.error("Cache save error:", cacheInsertErr);
        }
      }
    }

    // 6. 질문 로깅
    if (supabase) {
      try {
        await supabase.from("ai_questions").insert({
          question: maskedMessage,
          category: category ?? null,
          answer: reply,
        });
      } catch { /* DB 저장 실패는 무시 */ }
    }

    return NextResponse.json({ reply, isOffTopic, mapQuery, cached: false });
  } catch (error) {
    console.error("Kello AI Error:", error);
    return NextResponse.json({
      reply: "죄송합니다. 잠시 후 다시 시도해주세요.",
      isOffTopic: false,
      mapQuery: null,
      cached: false
    });
  }
}
