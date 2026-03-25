'use client';

import { useState } from 'react';

import styles from './HomeTranslatorHub.module.css';
import { getLocaleLabel, INTERPRETER_SUPPORTED_LOCALES } from '@/lib/translator/catalog.ts';
import { useTranslation } from 'react-i18next';
import type {
  ConciergeLocale,
  ConciergeResponse,
} from '@/lib/translator/types.ts';

import { InShopInterpreterMvp } from './interpreter';

type TranslatorMode = 'booking' | 'interpreter';

export default function HomeTranslatorHub() {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<TranslatorMode>('interpreter');

  return (
    <section className={styles.section}>
      <div className={styles.eyebrow}>{t('translator_hub.eyebrow')}</div>
      <div className={styles.headerGrid}>
        <h2 className={styles.title}>{t('translator_hub.title')}</h2>
        <p className={styles.subtitle}>
          {t('translator_hub.subtitle')}
        </p>
      </div>

      <div className={styles.modeTabs}>
        <button
          className={`${styles.modeButton} ${mode === 'booking' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('booking')}
        >
          <span className={styles.modeButtonTitle}>{t('translator_hub.mode_booking_title')}</span>
          <span className={styles.modeButtonDesc}>
            {t('translator_hub.mode_booking_desc')}
          </span>
        </button>
        <button
          className={`${styles.modeButton} ${mode === 'interpreter' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('interpreter')}
        >
          <span className={styles.modeButtonTitle}>{t('translator_hub.mode_interpreter_title')}</span>
          <span className={styles.modeButtonDesc}>
            {t('translator_hub.mode_interpreter_desc')}
          </span>
        </button>
      </div>

      {mode === 'booking' ? <BookingConciergePanel /> : <InShopInterpreterMvp />}
    </section>
  );
}

function BookingConciergePanel() {
  const { t } = useTranslation('common');
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
        <h3 className={styles.cardTitle}>{t('interpreter_ui_v2.customer_input_title')}</h3>
        <p className={styles.cardDesc}>
          {t('interpreter_ui_v2.customer_input_desc')}
        </p>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label>{t('interpreter_ui.customer_language')}</label>
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
            <label>{t('interpreter_ui_v2.session_id')}</label>
            <input className={styles.input} value={sessionId ?? t('interpreter_ui_v2.new_session')} readOnly />
          </div>
        </div>

        <div className={styles.field}>
          <label>{t('interpreter_ui_v2.inquiry_content')}</label>
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>

        <div className={styles.quickRow}>
          <button className={styles.quickChip} onClick={() => void handleSubmit('How much is scalp care?')}>
            {t('interpreter_ui_v2.quick_chips.price')}
          </button>
          <button className={styles.quickChip} onClick={() => void handleSubmit('Can I book lash extension on 2026-03-18 at 14:00?')}>
            {t('interpreter_ui_v2.quick_chips.availability')}
          </button>
          <button className={styles.quickChip} onClick={() => void handleSubmit('Please change my booking to 2026-03-19 16:00')}>
            {t('interpreter_ui_v2.quick_chips.change')}
          </button>
          <button className={styles.quickChip} onClick={() => void handleSubmit('Please cancel my booking')}>
            {t('interpreter_ui_v2.quick_chips.cancel')}
          </button>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={() => void handleSubmit()} disabled={loading}>
            {loading ? t('interpreter_ui_v2.status.processing') : t('interpreter_ui_v2.execute_concierge', { defaultValue: 'Concierge 실행' })}
          </button>
        </div>
      </div>

      <div className={styles.panelCard}>
        <h3 className={styles.cardTitle}>{t('interpreter_ui_v2.tool_response_title')}</h3>
        <p className={styles.cardDesc}>
          {t('interpreter_ui_v2.tool_response_desc')}
        </p>

        {!result ? (
          <div className={styles.notice}>{t('interpreter_ui_v2.no_response')}</div>
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
