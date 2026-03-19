'use client';

import { useState } from 'react';

import styles from './HomeTranslatorHub.module.css';
import { getLocaleLabel, INTERPRETER_SUPPORTED_LOCALES } from '@/lib/translator/catalog.ts';
import type {
  ConciergeLocale,
  ConciergeResponse,
} from '@/lib/translator/types.ts';

import { InShopInterpreterMvp } from './interpreter';

type TranslatorMode = 'booking' | 'interpreter';

export default function HomeTranslatorHub() {
  const [mode, setMode] = useState<TranslatorMode>('interpreter');

  return (
    <section className={styles.section}>
      <div className={styles.eyebrow}>Home Translator Hub</div>
      <div className={styles.headerGrid}>
        <h2 className={styles.title}>추천 플랜 아래에서 바로 예약 번역과 매장 통역을 시작합니다.</h2>
        <p className={styles.subtitle}>
          Booking concierge mode는 예약 문의와 생성·변경·취소를 구조화해서 처리하고,
          in-shop interpreter mode는 push-to-talk와 text fallback을 함께 제공해 현장에서 바로 테스트할 수 있습니다.
        </p>
      </div>

      <div className={styles.modeTabs}>
        <button
          className={`${styles.modeButton} ${mode === 'booking' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('booking')}
        >
          <span className={styles.modeButtonTitle}>1. Booking Concierge Mode</span>
          <span className={styles.modeButtonDesc}>
            예약 문의, availability 확인, 예약 생성·변경·취소, structured output 저장
          </span>
        </button>
        <button
          className={`${styles.modeButton} ${mode === 'interpreter' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('interpreter')}
        >
          <span className={styles.modeButtonTitle}>2. In-Shop Interpreter MVP</span>
          <span className={styles.modeButtonDesc}>
            push-to-talk, server STT, server translation, 원문/번역 동시 표시, text fallback
          </span>
        </button>
      </div>

      {mode === 'booking' ? <BookingConciergePanel /> : <InShopInterpreterMvp />}
    </section>
  );
}

function BookingConciergePanel() {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [customerLocale, setCustomerLocale] = useState<ConciergeLocale>('en');
  const [message, setMessage] = useState(
    'Can I book lash extension on 2026-03-18 at 14:00? note: natural style please.',
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConciergeResponse | null>(null);

  async function handleSubmit(prefill?: string) {
    const nextMessage = prefill ?? message;
    if (!nextMessage.trim()) {
      return;
    }

    setLoading(true);

    const response = await fetch('/api/translator/concierge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        customerLocale,
        message: nextMessage,
      }),
    });

    const data = (await response.json()) as ConciergeResponse | { error: string };
    if ('error' in data) {
      setLoading(false);
      return;
    }

    setSessionId(data.sessionId);
    setResult(data);
    setMessage('');
    setLoading(false);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelCard}>
        <h3 className={styles.cardTitle}>고객 문의 입력</h3>
        <p className={styles.cardDesc}>
          한국어, 영어, 일본어, 중국어 간체/번체, 베트남어, 태국어, 인도네시아어, 말레이어로 문의할 수 있습니다.
          예약 가능 여부는 서버에서 availability tool을 먼저 호출합니다.
        </p>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label>고객 언어</label>
            <select
              className={styles.select}
              value={customerLocale}
              onChange={(event) => setCustomerLocale(event.target.value as ConciergeLocale)}
            >
              {INTERPRETER_SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {getLocaleLabel(locale)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>세션 ID</label>
            <input className={styles.input} value={sessionId ?? '신규 세션'} readOnly />
          </div>
        </div>

        <div className={styles.field}>
          <label>문의 내용</label>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className={styles.quickRow}>
          <button className={styles.quickChip} onClick={() => void handleSubmit('How much is scalp care?')}>
            가격 문의
          </button>
          <button className={styles.quickChip} onClick={() => void handleSubmit('Can I book lash extension on 2026-03-18 at 14:00?')}>
            예약 가능 여부
          </button>
          <button className={styles.quickChip} onClick={() => void handleSubmit('Please change my booking to 2026-03-19 16:00')}>
            예약 변경
          </button>
          <button className={styles.quickChip} onClick={() => void handleSubmit('Please cancel my booking')}>
            예약 취소
          </button>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? '처리 중...' : 'Concierge 실행'}
          </button>
        </div>
      </div>

      <div className={styles.panelCard}>
        <h3 className={styles.cardTitle}>도구 기반 응답</h3>
        <p className={styles.cardDesc}>
          응답은 availability / booking tool 결과를 바탕으로 생성되고, structured output과 함께 저장됩니다.
        </p>

        {!result ? (
          <div className={styles.notice}>아직 응답이 없습니다. 좌측에서 문의를 보내 주세요.</div>
        ) : (
          <div className={styles.responseCard}>
            <div className={styles.responseBubble}>
              <div className={styles.responseTitle}>Localized Response</div>
              <p className={styles.responseText}>{result.responseLocalized}</p>
            </div>

            <div className={styles.metaBox}>
              <div className={styles.metaTitle}>Structured Output</div>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaItemLabel}>intent</span>
                  <span className={styles.metaItemValue}>{result.structuredOutput.intent}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaItemLabel}>service_name</span>
                  <span className={styles.metaItemValue}>{result.structuredOutput.service_name ?? '-'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaItemLabel}>requested_date</span>
                  <span className={styles.metaItemValue}>{result.structuredOutput.requested_date ?? '-'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaItemLabel}>requested_time</span>
                  <span className={styles.metaItemValue}>{result.structuredOutput.requested_time ?? '-'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaItemLabel}>notes</span>
                  <span className={styles.metaItemValue}>{result.structuredOutput.notes ?? '-'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaItemLabel}>savedEventId</span>
                  <span className={styles.metaItemValue}>{result.savedEventId}</span>
                </div>
              </div>
            </div>

            <div className={styles.toolList}>
              {result.tools.map((tool, index) => (
                <div key={`${tool.tool}_${index}`} className={styles.toolCard}>
                  <div className={styles.toolCardHeader}>
                    <span className={styles.toolName}>{tool.tool}</span>
                    <span className={styles.toolStatus}>grounded</span>
                  </div>
                  <pre className={styles.toolJson}>{JSON.stringify(tool.output, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
