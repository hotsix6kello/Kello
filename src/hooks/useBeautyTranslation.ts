'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * useBeautyTranslation
 * 고객용 beauty 자유문장을 /api/translate/beauty 경유로 번역하는 훅.
 *
 * 동작 방식:
 * - 동일한 (text + targetLocale + contentType) 조합은 로컬 캐시로 반복 호출 방지
 * - API 오류 발생 시 원문 그대로 반환 (fallback) – 예약 흐름 절대 안 깨짐
 * - 번역 중 별도 전역 로딩 상태 없음 (UI 스피너 최소화)
 */

export type BeautyContentType =
  | 'customerRequest'
  | 'alternativeOfferNote'
  | 'changeReason'
  | 'cancelReason'
  | 'notificationMessage'
  | 'bookingSupportMessage';

interface TranslateOptions {
  text: string;
  targetLocale: string;
  contentType: BeautyContentType;
  sourceLocale?: string;
}

interface UseBeautyTranslationReturn {
  translate: (opts: TranslateOptions) => Promise<string>;
  isTranslating: boolean;
}

export function useBeautyTranslation(): UseBeautyTranslationReturn {
  const [isTranslating, setIsTranslating] = useState(false);
  // 로컬 캐시: key = `${targetLocale}::${contentType}::${text}`
  const cache = useRef<Map<string, string>>(new Map());

  const translate = useCallback(async (opts: TranslateOptions): Promise<string> => {
    const { text, targetLocale, contentType, sourceLocale = 'ko' } = opts;

    // 빈 텍스트 – 즉시 반환
    if (!text?.trim()) return text;

    // 원문 언어 = 대상 언어 – 번역 불필요
    if (sourceLocale === targetLocale) return text;

    const cacheKey = `${targetLocale}::${contentType}::${text.trim()}`;
    const cached = cache.current.get(cacheKey);
    if (cached) return cached;

    setIsTranslating(true);

    try {
      const res = await fetch('/api/translate/beauty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale, contentType, sourceLocale }),
      });

      const body = (await res.json().catch(() => null)) as
        | { translatedText?: string; fallback?: boolean }
        | null;

      const result = body?.translatedText?.trim() || text;

      // 캐시 저장 (최대 100개)
      if (cache.current.size >= 100) {
        const firstKey = cache.current.keys().next().value;
        if (firstKey) cache.current.delete(firstKey);
      }
      cache.current.set(cacheKey, result);

      return result;
    } catch {
      // 실패 시 원문 fallback – 화면 안 깨짐
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return { translate, isTranslating };
}
