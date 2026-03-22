'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import styles from './interpreter.module.css';
import {
  getLocaleDisplayLabel,
  getSpeechLocale,
  INTERPRETER_SUPPORTED_LOCALES,
} from '@/lib/translator/catalog.ts';
import {
  normalizeInterpreterTextInput,
} from '@/lib/translator/interpreterUi.ts';
import type { ConciergeLocale, SpeakerRole } from '@/lib/translator/types.ts';
import { LOCALE_STORAGE_KEY, resolveCanonicalLocale } from '@/lib/i18n/locales.ts';
import { LANGUAGE_CHANGED_EVENT } from '@/lib/i18n/client.tsx';

const STAFF_LOCALE: ConciergeLocale = 'ko';
const FALLBACK_CUSTOMER_LOCALE: ConciergeLocale = 'en';
const MAX_RECORDING_MS = 10000;
const MIN_RECORDING_MS = 700;

type InterpreterMessage = {
  id: string;
  speaker: SpeakerRole;
  sourceText: string;
  translatedText: string;
  statusLabel: string;
  sourceLang: ConciergeLocale;
  targetLang: ConciergeLocale;
  inputType: 'voice' | 'text';
  canReplay: boolean;
};

type InterpreterTranslateResponse =
  | {
      ok: true;
      translatedText: string;
      provider: string;
    }
  | {
      ok: false;
      error: string;
    };

type InterpreterTranscribeResponse =
  | {
      ok: true;
      text: string;
      provider: string;
    }
  | {
      ok: false;
      error: string;
    };

function getTimestampLabel() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAudioFileName(mimeType: string) {
  if (mimeType.includes('mp4')) {
    return 'interpreter-recording.m4a';
  }

  if (mimeType.includes('mpeg')) {
    return 'interpreter-recording.mp3';
  }

  return 'interpreter-recording.webm';
}

function createInterpreterMessage(params: {
  speaker: SpeakerRole;
  sourceText: string;
  translatedText: string;
  statusLabel: string;
  sourceLang: ConciergeLocale;
  targetLang: ConciergeLocale;
  inputType: 'voice' | 'text';
  canReplay: boolean;
}) {
  return {
    id: `${params.speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...params,
  } satisfies InterpreterMessage;
}

function resolveCustomerLocale(appLocale?: string | null): ConciergeLocale {
  const canonical = resolveCanonicalLocale(appLocale, FALLBACK_CUSTOMER_LOCALE);

  if (INTERPRETER_SUPPORTED_LOCALES.includes(canonical as ConciergeLocale)) {
    return canonical as ConciergeLocale;
  }

  return FALLBACK_CUSTOMER_LOCALE;
}

export default function InterpreterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeName = searchParams.get('storeName');
  const serviceName = searchParams.get('serviceName');
  const { t, i18n } = useTranslation('common');
  const [customerLocale, setCustomerLocale] = useState<ConciergeLocale>(() =>
    resolveCustomerLocale(i18n.resolvedLanguage ?? i18n.language),
  );
  const staffLocale = STAFF_LOCALE;

  const [messages, setMessages] = useState<InterpreterMessage[]>([]);
  const [customerInput, setCustomerInput] = useState('');
  const [staffInput, setStaffInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [recordingRole, setRecordingRole] = useState<SpeakerRole | null>(null);
  const [transcribingRole, setTranscribingRole] = useState<SpeakerRole | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeRecordingRoleRef = useRef<SpeakerRole | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncCustomerLocale = (nextLocale?: string | null) => {
      setCustomerLocale(resolveCustomerLocale(nextLocale ?? i18n.resolvedLanguage ?? i18n.language));
    };

    syncCustomerLocale();

    const handleLanguageChanged = (nextLanguage: string) => {
      syncCustomerLocale(nextLanguage);
    };

    const handleWindowLanguageChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale?: string }>;
      syncCustomerLocale(customEvent.detail?.locale);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) {
        syncCustomerLocale(event.newValue);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    window.addEventListener(LANGUAGE_CHANGED_EVENT, handleWindowLanguageChanged as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleWindowLanguageChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [i18n]);

  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia);

    setVoiceSupported(isSupported);

    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      activeRecordingRoleRef.current = null;
      recordingStartedAtRef.current = null;
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.SpeechSynthesisUtterance === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      setTtsSupported(false);
      return;
    }

    const synthesis = window.speechSynthesis;
    const syncVoices = () => {
      setAvailableVoices(synthesis.getVoices());
    };

    setTtsSupported(true);
    syncVoices();
    synthesis.addEventListener('voiceschanged', syncVoices);

    return () => {
      synthesis.cancel();
      synthesis.removeEventListener('voiceschanged', syncVoices);
    };
  }, []);

  const releaseRecorder = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    activeRecordingRoleRef.current = null;
    recordingStartedAtRef.current = null;
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  };

  const getLocalesForSpeaker = (speaker: SpeakerRole) => {
    return speaker === 'customer'
      ? { sourceLang: customerLocale, targetLang: staffLocale }
      : { sourceLang: staffLocale, targetLang: customerLocale };
  };

  const findMatchingVoice = (locale: ConciergeLocale) => {
    const requestedLang = getSpeechLocale(locale).toLowerCase();
    const requestedBase = requestedLang.split('-')[0];
    const normalizeVoiceLang = (value: string) => value.toLowerCase().replaceAll('_', '-');

    return (
      availableVoices.find((voice) => normalizeVoiceLang(voice.lang) === requestedLang) ??
      availableVoices.find((voice) => {
        const voiceLang = normalizeVoiceLang(voice.lang);
        return voiceLang === requestedBase || voiceLang.startsWith(`${requestedBase}-`);
      }) ??
      availableVoices[0] ??
      null
    );
  };

  const speakTranslatedText = (text: string, locale: ConciergeLocale) => {
    const normalizedText = normalizeInterpreterTextInput(text);

    if (
      !normalizedText ||
      typeof window === 'undefined' ||
      typeof window.SpeechSynthesisUtterance === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(normalizedText);
      const voice = findMatchingVoice(locale);

      utterance.lang = getSpeechLocale(locale);
      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Interpreter speech replay failed.', error);
    }
  };

  const stopSpeechPlayback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const requestInterpreterTranslation = async (params: {
    sourceText: string;
    sourceLang: ConciergeLocale;
    targetLang: ConciergeLocale;
  }) => {
    const response = await fetch('/api/interpreter/translate', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as InterpreterTranslateResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.ok ? 'interpreter_translate_failed' : data.error);
    }

    return data.translatedText;
  };

  const appendInterpreterMessage = (message: InterpreterMessage) => {
    setMessages((previous) => [...previous, message]);
  };

  const submitInterpreterMessage = async (params: {
    speaker: SpeakerRole;
    inputType: 'voice' | 'text';
    sourceText: string;
  }) => {
    const normalizedSourceText = normalizeInterpreterTextInput(params.sourceText);
    if (!normalizedSourceText || isTranslating) {
      return false;
    }

    const { sourceLang, targetLang } = getLocalesForSpeaker(params.speaker);

    setIsTranslating(true);
    setTranslationError(null);
    setVoiceError(null);
    setVoiceStatus(null);

    try {
      const translatedText = await requestInterpreterTranslation({
        sourceText: normalizedSourceText,
        sourceLang,
        targetLang,
      });

      appendInterpreterMessage(
        createInterpreterMessage({
          speaker: params.speaker,
          sourceText: normalizedSourceText,
          translatedText,
          statusLabel: `${t('interpreter_page.translated_status')} ${getTimestampLabel()}`,
          sourceLang,
          targetLang,
          inputType: params.inputType,
          canReplay: true,
        }),
      );
      speakTranslatedText(translatedText, targetLang);
      return true;
    } catch (error) {
      console.error('Interpreter translation failed.', error);
      appendInterpreterMessage(
        createInterpreterMessage({
          speaker: params.speaker,
          sourceText: normalizedSourceText,
          translatedText: normalizedSourceText,
          statusLabel: `${t('interpreter_page.source_only_status')} ${getTimestampLabel()}`,
          sourceLang,
          targetLang,
          inputType: params.inputType,
          canReplay: false,
        }),
      );
      setTranslationError(t('interpreter_page.translation_failed_error'));
      return true;
    } finally {
      setIsTranslating(false);
    }
  };

  const submitVoiceRecording = async (speaker: SpeakerRole, audioBlob: Blob) => {
    const { sourceLang } = getLocalesForSpeaker(speaker);
    const mimeType = audioBlob.type || 'audio/webm';
    const formData = new FormData();
    const audioFile = new File([audioBlob], getAudioFileName(mimeType), {
      type: mimeType,
    });

    formData.append('audio', audioFile);
    formData.append('language', sourceLang);

    setVoiceError(null);
    setTranslationError(null);
    setVoiceStatus(t('interpreter_page.voice_recognizing'));

    try {
      const response = await fetch('/api/interpreter/transcribe', {
        method: 'POST',
        cache: 'no-store',
        body: formData,
      });

      const data = (await response.json()) as InterpreterTranscribeResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'interpreter_transcribe_failed' : data.error);
      }

      const normalizedText = normalizeInterpreterTextInput(data.text);
      if (!normalizedText || normalizedText.length < 2) {
        setVoiceError(t('interpreter_page.voice_unrecognized_error'));
        setVoiceStatus(null);
        return;
      }

      setTranscribingRole(null);
      setVoiceStatus(null);
      await submitInterpreterMessage({
        speaker,
        inputType: 'voice',
        sourceText: normalizedText,
      });
    } catch (error) {
      console.error('Interpreter transcription failed.', error);
      setVoiceStatus(null);
      setVoiceError(t('interpreter_page.voice_failed_error'));
    } finally {
      setTranscribingRole(null);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return;
    }

    const finishedRole = activeRecordingRoleRef.current;
    setRecordingRole(null);
    setTranscribingRole(finishedRole);
    setVoiceStatus(t('interpreter_page.voice_recognizing'));
    mediaRecorderRef.current.stop();
  };

  const startRecording = async (speaker: SpeakerRole) => {
    if (!voiceSupported || isPreparingRecording || recordingRole || transcribingRole || isTranslating) {
      return;
    }

    try {
      setIsPreparingRecording(true);
      setVoiceError(null);
      setTranslationError(null);
      setVoiceStatus(t('interpreter_page.mic_permission_status'));
      stopSpeechPlayback();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      activeRecordingRoleRef.current = speaker;
      recordingStartedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finishedRole = activeRecordingRoleRef.current;
        const recordingStartedAt = recordingStartedAtRef.current;
        const durationMs = recordingStartedAt ? Date.now() - recordingStartedAt : 0;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        releaseRecorder();

        if (!finishedRole) {
          setTranscribingRole(null);
          setVoiceStatus(null);
          return;
        }

        if (audioBlob.size === 0) {
          setTranscribingRole(null);
          setVoiceStatus(null);
          setVoiceError(t('interpreter_page.voice_failed_error'));
          return;
        }

        if (durationMs > 0 && durationMs < MIN_RECORDING_MS) {
          setTranscribingRole(null);
          setVoiceStatus(null);
          setVoiceError(t('interpreter_page.voice_too_short_error'));
          return;
        }

        void submitVoiceRecording(finishedRole, audioBlob);
      };

      mediaRecorder.start();
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, MAX_RECORDING_MS);

      setIsPreparingRecording(false);
      setVoiceStatus(t('interpreter_page.recording_status', { seconds: MAX_RECORDING_MS / 1000 }));
      setRecordingRole(speaker);
    } catch {
      releaseRecorder();
      setIsPreparingRecording(false);
      setRecordingRole(null);
      setTranscribingRole(null);
      setVoiceStatus(null);
      setVoiceError(t('interpreter_page.mic_unsupported_error'));
    }
  };

  const handleSpeakButtonClick = (speaker: SpeakerRole) => {
    if (recordingRole === speaker) {
      stopRecording();
      return;
    }

    void startRecording(speaker);
  };

  const handleReplayMessage = (message: InterpreterMessage) => {
    if (!message.canReplay || isNonVoiceActionDisabled) {
      return;
    }

    speakTranslatedText(message.translatedText, message.targetLang);
  };

  const handleCustomerSend = async () => {
    if (recordingRole || transcribingRole) {
      return;
    }

    const normalized = normalizeInterpreterTextInput(customerInput);
    if (!normalized) {
      setTranslationError(t('interpreter_page.input_required_customer'));
      return;
    }

    const submitted = await submitInterpreterMessage({
      speaker: 'customer',
      inputType: 'text',
      sourceText: normalized,
    });

    if (submitted) {
      setCustomerInput('');
    }
  };

  const handleStaffSend = async () => {
    if (recordingRole || transcribingRole) {
      return;
    }

    const normalized = normalizeInterpreterTextInput(staffInput);
    if (!normalized) {
      setTranslationError(t('interpreter_page.input_required_staff'));
      return;
    }

    const submitted = await submitInterpreterMessage({
      speaker: 'staff',
      inputType: 'text',
      sourceText: normalized,
    });

    if (submitted) {
      setStaffInput('');
    }
  };

  const isNonVoiceActionDisabled =
    isTranslating || isPreparingRecording || recordingRole !== null || transcribingRole !== null;
  const isCustomerRecording = recordingRole === 'customer';
  const isStaffRecording = recordingRole === 'staff';
  const customerSpeakDisabled =
    !voiceSupported ||
    isPreparingRecording ||
    transcribingRole !== null ||
    isTranslating ||
    (recordingRole !== null && !isCustomerRecording);
  const staffSpeakDisabled =
    !voiceSupported ||
    isPreparingRecording ||
    transcribingRole !== null ||
    isTranslating ||
    (recordingRole !== null && !isStaffRecording);
  const customerSpeakLabel =
    isPreparingRecording
      ? t('interpreter_page.mic_preparing')
      : transcribingRole === 'customer'
        ? t('interpreter_page.customer_transcribing')
        : isCustomerRecording
          ? t('interpreter_page.customer_recording')
          : isTranslating
            ? t('interpreter_page.translating')
            : t('interpreter_page.customer_speak_btn');
  const staffSpeakLabel =
    isPreparingRecording
      ? t('interpreter_page.mic_preparing')
      : transcribingRole === 'staff'
        ? t('interpreter_page.staff_transcribing')
        : isStaffRecording
          ? t('interpreter_page.staff_recording')
          : isTranslating
            ? t('interpreter_page.translating')
            : t('interpreter_page.staff_speak_btn');
  const customerLanguageLabel = getLocaleDisplayLabel(customerLocale);
  const staffLanguageLabel = getLocaleDisplayLabel(staffLocale);

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <button className={styles.backBtn} type="button" onClick={handleBack}>
          {t('interpreter_page.back')}
        </button>
      </div>

      {storeName && (
        <div className={styles.visitorContext}>
          <span style={{ fontSize: '1.2rem' }}>📍</span>
          <p style={{ margin: 0 }}>
            {storeName && serviceName
              ? t('beauty_bookings.interpreter_visit_service_context', { storeName, serviceName })
              : t('beauty_bookings.interpreter_visit_context', { storeName })}
          </p>
        </div>
      )}

      <section className={styles.titleSection}>
        <h1 className={styles.title}>{t('interpreter_page.title')}</h1>
        <p className={styles.subtitle}>
          {t('interpreter_page.subtitle')}
        </p>
        <p className={styles.onboardingNote}>
          {t('interpreter_page.onboarding')}
        </p>
      </section>

      <section className={styles.languageSection}>
        <div className={styles.langTopRow}>
          <div className={styles.langCard} style={{ cursor: 'default' }}>
            <span className={styles.langRole}>{t('interpreter_page.customer_lang')}</span>
            <strong className={styles.langCurrent}>{customerLanguageLabel}</strong>
          </div>
          <div className={styles.langCard} style={{ cursor: 'default' }}>
            <span className={styles.langRole}>{t('interpreter_page.staff_lang')}</span>
            <strong className={styles.langCurrent}>{staffLanguageLabel}</strong>
          </div>
        </div>
      </section>

      <section className={styles.actionSection}>
        <div className={styles.actionCard}>
          <div className={styles.langRole}>{`${customerLanguageLabel} -> ${staffLanguageLabel}`}</div>
          <button
            className={`${styles.speakBtn} ${styles.customerBtn} ${isCustomerRecording ? styles.recordingActive : ''}`}
            type="button"
            onClick={() => handleSpeakButtonClick('customer')}
            disabled={customerSpeakDisabled}
          >
            {customerSpeakLabel}
          </button>
          <label className={styles.langRole} htmlFor="customer-text-input">
            {t('interpreter_page.customer_input_label')}
          </label>
          <div className={styles.inputRow}>
            <input
              id="customer-text-input"
              className={styles.textInput}
              type="text"
              placeholder={t('interpreter_page.customer_placeholder')}
              value={customerInput}
              onChange={(event) => setCustomerInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing && !isNonVoiceActionDisabled) {
                  void handleCustomerSend();
                }
              }}
            />
            <button
              className={styles.sendBtn}
              type="button"
              onClick={() => void handleCustomerSend()}
              disabled={isNonVoiceActionDisabled}
            >
              {t('interpreter_page.send')}
            </button>
          </div>
        </div>

        <div className={styles.actionCard}>
          <div className={styles.langRole}>{`${staffLanguageLabel} -> ${customerLanguageLabel}`}</div>
          <button
            className={`${styles.speakBtn} ${styles.staffBtn} ${isStaffRecording ? styles.recordingActive : ''}`}
            type="button"
            onClick={() => handleSpeakButtonClick('staff')}
            disabled={staffSpeakDisabled}
          >
            {staffSpeakLabel}
          </button>
          <label className={styles.langRole} htmlFor="staff-text-input">
            {t('interpreter_page.staff_input_label')}
          </label>
          <div className={styles.inputRow}>
            <input
              id="staff-text-input"
              className={styles.textInput}
              type="text"
              placeholder={t('interpreter_page.staff_placeholder')}
              value={staffInput}
              onChange={(event) => setStaffInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing && !isNonVoiceActionDisabled) {
                  void handleStaffSend();
                }
              }}
            />
            <button
              className={styles.sendBtn}
              type="button"
              onClick={() => void handleStaffSend()}
              disabled={isNonVoiceActionDisabled}
            >
              {t('interpreter_page.send')}
            </button>
          </div>
        </div>
      </section>

      <div className={styles.placeholderBox}>
        <p className={styles.placeholderText}>
          {voiceSupported
            ? t('interpreter_page.voice_supported_hint')
            : t('interpreter_page.voice_not_supported_hint')}
        </p>
      </div>

      {voiceStatus ? <p className={styles.sttStatusLabel}>{voiceStatus}</p> : null}
      {voiceError ? <p className={styles.errorText}>{voiceError}</p> : null}
      {isTranslating ? <p className={styles.translatingText}>{t('interpreter_page.translating_status')}</p> : null}
      {translationError ? <p className={styles.errorText}>{translationError}</p> : null}

      <section className={styles.conversationArea}>
        {messages.length === 0 ? (
          <div className={styles.placeholderBox}>
            <p className={styles.placeholderText}>
              {t('interpreter_page.empty_history_hint')}
            </p>
          </div>
        ) : (
          <div className={styles.messageList}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.messageItem} ${
                  message.speaker === 'customer' ? styles.messageCustomer : styles.messageStaff
                }`}
              >
                <div className={styles.messageHeader}>
                  <span className={styles.messageRole}>
                    {message.speaker === 'customer' ? t('interpreter_page.customer_role') : t('interpreter_page.staff_role')}
                  </span>
                  <span className={styles.timestamp}>{message.statusLabel}</span>
                </div>
                <p className={styles.sourceText}>{message.sourceText}</p>
                <div className={styles.translatedRow}>
                  <p className={styles.translatedText}>{message.translatedText}</p>
                  {message.canReplay ? (
                    <button
                      className={styles.replayBtn}
                      type="button"
                      aria-label={t('interpreter_page.replay_btn_label')}
                      title={
                        ttsSupported
                          ? t('interpreter_page.replay_btn_label')
                          : t('interpreter_page.replay_not_supported_hint')
                      }
                      onClick={() => handleReplayMessage(message)}
                      disabled={!ttsSupported || isNonVoiceActionDisabled}
                    >
                      {t('interpreter_page.play')}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
