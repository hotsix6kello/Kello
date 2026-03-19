'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import styles from './interpreter.module.css';
import {
  getLocaleDisplayLabel,
  getSpeechLocale,
  INTERPRETER_SUPPORTED_LOCALES,
} from '@/lib/translator/catalog.ts';
import { normalizeInterpreterTextInput } from '@/lib/translator/interpreterUi.ts';
import type { ConciergeLocale, SpeakerRole } from '@/lib/translator/types.ts';

const DEFAULT_CUSTOMER_LOCALE: ConciergeLocale = 'en';
const DEFAULT_STAFF_LOCALE: ConciergeLocale = 'ko';
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
  inputType: 'voice' | 'text' | 'quick-phrase';
  canReplay: boolean;
};

type QuickPhrase = {
  id: string;
  translations: Record<ConciergeLocale, string>;
};

type InterpreterMessageEntry = {
  speaker: SpeakerRole;
  inputType: InterpreterMessage['inputType'];
  sourceText: string;
  sourceLang: ConciergeLocale;
  targetLang: ConciergeLocale;
  translations?: Record<ConciergeLocale, string>;
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

type QuickPhraseGroupId =
  | 'consultation'
  | 'haircut'
  | 'styling'
  | 'during-service'
  | 'finishing';

const QUICK_PHRASE_GROUPS: Array<{
  id: QuickPhraseGroupId;
  label: string;
  customerPhrases: QuickPhrase[];
  staffPhrases: QuickPhrase[];
}> = [
  {
    id: 'consultation',
    label: '상담',
    customerPhrases: [
      {
        id: 'sensitive-skin',
        translations: {
          ko: '피부가 예민해서 자극이 적었으면 좋겠어요.',
          en: 'I have sensitive skin, so please use gentle products.',
          ja: '肌が敏感なほうです。',
          'zh-CN': '我的皮肤比较敏感。',
          'zh-HK': '我的皮膚比較敏感，希望盡量溫和一點。',
          vi: 'Da tôi khá nhạy cảm, mong dùng sản phẩm dịu nhẹ giúp tôi.',
          th: 'ผิวของฉันค่อนข้างแพ้ง่าย รบกวนใช้ผลิตภัณฑ์ที่อ่อนโยนหน่อยนะคะ',
          id: 'Kulit saya sensitif, jadi tolong gunakan produk yang lembut.',
          ms: 'Kulit saya sensitif, jadi tolong gunakan produk yang lembut.',
        },
      },
    ],
    staffPhrases: [
      {
        id: 'consult-bangs',
        translations: {
          ko: '앞머리는 어떤 느낌으로 해드릴까요?',
          en: 'How would you like your bangs styled?',
          ja: '前髪はどのようにいたしましょうか。',
          'zh-CN': '刘海想怎么处理呢？',
          'zh-HK': '瀏海想要什麼感覺呢？',
          vi: 'Bạn muốn để mái kiểu nào?',
          th: 'หน้าม้าอยากได้ทรงแบบไหนคะ',
          id: 'Anda ingin poni seperti apa?',
          ms: 'Anda mahu poni gaya macam mana?',
        },
      },
    ],
  },
  {
    id: 'haircut',
    label: '커트 / 앞머리',
    customerPhrases: [
      {
        id: 'shorter-bangs',
        translations: {
          ko: '앞머리를 조금만 더 짧게 해 주세요.',
          en: 'Please trim my bangs a little shorter.',
          ja: '前髪をもっと短くしたいです。',
          'zh-CN': '我想把刘海剪得更短一点。',
          'zh-HK': '請把瀏海再修短一點。',
          vi: 'Làm ơn cắt mái ngắn hơn một chút.',
          th: 'ช่วยตัดหน้าม้าให้สั้นลงอีกนิดได้ไหมคะ',
          id: 'Tolong rapikan poni saya sedikit lebih pendek.',
          ms: 'Tolong potong poni saya sedikit lebih pendek.',
        },
      },
      {
        id: 'keep-length',
        translations: {
          ko: '전체 길이는 너무 짧아지지 않게 해 주세요.',
          en: 'Please keep the overall length.',
          ja: '全体の長さはそのままでお願いします。',
          'zh-CN': '请保持整体长度。',
          'zh-HK': '整體長度請不要剪得太短。',
          vi: 'Xin đừng cắt tổng thể quá ngắn.',
          th: 'ความยาวรวมอย่าตัดสั้นเกินไปนะคะ',
          id: 'Tolong jangan potong keseluruhan rambut terlalu pendek.',
          ms: 'Tolong jangan potong keseluruhan rambut terlalu pendek.',
        },
      },
    ],
    staffPhrases: [
      {
        id: 'desired-length',
        translations: {
          ko: '어느 정도 길이로 남겨드릴까요?',
          en: 'How much length would you like to keep?',
          ja: '長さはどのくらいをご希望ですか？',
          'zh-CN': '长度想保留到什么程度呢？',
          'zh-HK': '想保留到大概什麼長度呢？',
          vi: 'Bạn muốn giữ lại độ dài khoảng bao nhiêu?',
          th: 'อยากเหลือความยาวประมาณไหนคะ',
          id: 'Anda ingin menyisakan panjang kira-kira seberapa banyak?',
          ms: 'Anda mahu kekalkan panjang kira-kira sejauh mana?',
        },
      },
    ],
  },
  {
    id: 'styling',
    label: '스타일링 / 볼륨',
    customerPhrases: [
      {
        id: 'less-volume',
        translations: {
          ko: '옆쪽 볼륨은 조금 덜 살려 주세요.',
          en: 'Please keep the sides less voluminous.',
          ja: '横のボリュームは少なめがいいです。',
          'zh-CN': '我希望两侧的蓬松感少一点。',
          'zh-HK': '兩側的蓬鬆感請少一點。',
          vi: 'Phần hai bên xin để bớt phồng một chút.',
          th: 'ด้านข้างช่วยให้พองน้อยลงหน่อยนะคะ',
          id: 'Tolong buat volume di bagian samping lebih sedikit.',
          ms: 'Tolong kurangkan volume di bahagian tepi.',
        },
      },
    ],
    staffPhrases: [
      {
        id: 'reduce-volume',
        translations: {
          ko: '옆쪽 볼륨은 조금 줄여드릴까요?',
          en: 'Would you like me to reduce the volume on the sides?',
          ja: '横のボリュームは抑えましょうか？',
          'zh-CN': '两侧的蓬松感要帮您减一点吗？',
          'zh-HK': '兩側的蓬鬆感要幫您減少一點嗎？',
          vi: 'Tôi giảm độ phồng ở hai bên cho bạn một chút nhé?',
          th: 'ให้ลดวอลลุ่มด้านข้างลงอีกหน่อยไหมคะ',
          id: 'Apakah Anda ingin saya kurangi volume di bagian samping?',
          ms: 'Adakah anda mahu saya kurangkan volume di bahagian tepi?',
        },
      },
    ],
  },
  {
    id: 'during-service',
    label: '시술 중',
    customerPhrases: [
      {
        id: 'natural-finish',
        translations: {
          ko: '자연스럽게 마무리해 주세요.',
          en: 'Please keep the finish natural.',
          ja: 'できるだけ自然にしてください。',
          'zh-CN': '请尽量做得自然一点。',
          'zh-HK': '請幫我做得自然一點。',
          vi: 'Xin hãy hoàn thiện thật tự nhiên giúp tôi.',
          th: 'ช่วยทำให้ดูเป็นธรรมชาติหน่อยนะคะ',
          id: 'Tolong hasil akhirnya dibuat senatural mungkin.',
          ms: 'Tolong buat hasil akhirnya nampak semula jadi.',
        },
      },
    ],
    staffPhrases: [
      {
        id: 'wait-moment',
        translations: {
          ko: '잠시만 기다려 주세요.',
          en: 'Please wait a moment.',
          ja: '少々お待ちください。',
          'zh-CN': '请稍等一下。',
          'zh-HK': '請稍等一下。',
          vi: 'Vui lòng đợi một chút.',
          th: 'กรุณารอสักครู่นะคะ',
          id: 'Mohon tunggu sebentar.',
          ms: 'Sila tunggu sebentar.',
        },
      },
      {
        id: 'tell-discomfort',
        translations: {
          ko: '불편하시면 바로 말씀해 주세요.',
          en: 'Please tell me right away if you feel uncomfortable.',
          ja: '不快でしたらすぐに言ってください。',
          'zh-CN': '如果您觉得不舒服，请马上告诉我。',
          'zh-HK': '如果覺得不舒服，請馬上告訴我。',
          vi: 'Nếu thấy khó chịu, xin hãy nói ngay cho tôi biết.',
          th: 'ถ้ารู้สึกไม่สบายตรงไหน รบกวนบอกได้เลยนะคะ',
          id: 'Jika ada bagian yang terasa tidak nyaman, tolong beri tahu saya segera.',
          ms: 'Jika anda rasa tidak selesa, tolong beritahu saya segera.',
        },
      },
    ],
  },
  {
    id: 'finishing',
    label: '마무리 확인',
    customerPhrases: [
      {
        id: 'check-result',
        translations: {
          ko: '마지막 상태를 한 번 더 확인하고 싶어요.',
          en: 'I would like to check the final result once more.',
          ja: '仕上がりをもう一度確認したいです。',
          'zh-CN': '我想再确认一下最终效果。',
          'zh-HK': '我想再確認一次最後的效果。',
          vi: 'Tôi muốn kiểm tra lại kết quả cuối cùng một lần nữa.',
          th: 'ขอเช็กผลลัพธ์สุดท้ายอีกครั้งได้ไหมคะ',
          id: 'Saya ingin memeriksa hasil akhirnya sekali lagi.',
          ms: 'Saya mahu semak hasil akhirnya sekali lagi.',
        },
      },
    ],
    staffPhrases: [
      {
        id: 'check-mirror',
        translations: {
          ko: '거울로 한 번 확인해 주세요.',
          en: 'Please take a look in the mirror.',
          ja: '鏡でご確認ください。',
          'zh-CN': '请您通过镜子确认一下。',
          'zh-HK': '請先照鏡子確認一下。',
          vi: 'Vui lòng xem thử trong gương nhé.',
          th: 'รบกวนดูในกระจกอีกครั้งนะคะ',
          id: 'Silakan lihat hasilnya di cermin.',
          ms: 'Sila lihat hasilnya di cermin.',
        },
      },
    ],
  },
];

function getTimestampLabel() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSafeFallbackTranslatedText(entry: InterpreterMessageEntry) {
  if (entry.translations?.[entry.targetLang]) {
    return entry.translations[entry.targetLang];
  }

  return `[${getLocaleDisplayLabel(entry.targetLang)}] ${entry.sourceText}`;
}

function createInterpreterMessage(
  entry: InterpreterMessageEntry,
  translatedText: string,
  statusPrefix = '번역 완료',
  canReplay = false,
): InterpreterMessage {
  return {
    id: `${entry.speaker}-${Date.now()}`,
    speaker: entry.speaker,
    sourceText: entry.sourceText,
    translatedText,
    statusLabel: `${statusPrefix} ${getTimestampLabel()}`,
    sourceLang: entry.sourceLang,
    targetLang: entry.targetLang,
    inputType: entry.inputType,
    canReplay,
  };
}

function getMicrophoneErrorText(error: unknown) {
  const domLikeError = error as { name?: unknown } | null;
  const errorName = typeof domLikeError?.name === 'string' ? domLikeError.name : '';

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    return '마이크 권한이 필요합니다. 브라우저 주소창에서 마이크를 허용한 뒤 다시 시도해 주세요. 어려우면 텍스트 입력을 사용하세요.';
  }

  if (errorName === 'NotFoundError') {
    return '사용 가능한 마이크를 찾지 못했습니다. 기기 연결을 확인하거나 텍스트 입력을 사용하세요.';
  }

  return '녹음을 시작하지 못했습니다. 주변 소음을 줄이고 다시 시도하거나 텍스트 입력을 사용하세요.';
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

function getRecognitionRetryMessage() {
  return '음성이 또렷하게 인식되지 않았어요. 한 문장씩 짧게 다시 말씀해 주세요. 필요하면 텍스트 입력을 사용하세요.';
}

function getTranslationFallbackMessage() {
  return '번역이 잠시 불안정해 원문을 함께 보여드렸어요. 필요하면 짧게 다시 말씀하거나 텍스트 입력을 사용하세요.';
}

export default function InterpreterPage() {
  const router = useRouter();
  const [customerLocale, setCustomerLocale] = useState<ConciergeLocale>(DEFAULT_CUSTOMER_LOCALE);
  const [staffLocale, setStaffLocale] = useState<ConciergeLocale>(DEFAULT_STAFF_LOCALE);
  const [messages, setMessages] = useState<InterpreterMessage[]>([]);
  const [customerInput, setCustomerInput] = useState('');
  const [staffInput, setStaffInput] = useState('');
  const [activeQuickGroup, setActiveQuickGroup] = useState<QuickPhraseGroupId>('consultation');
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

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  };

  const activeQuickPhraseGroup =
    QUICK_PHRASE_GROUPS.find((group) => group.id === activeQuickGroup) ?? QUICK_PHRASE_GROUPS[0];

  const getLocalesForSpeaker = (speaker: SpeakerRole) => {
    return speaker === 'customer'
      ? { sourceLang: customerLocale, targetLang: staffLocale }
      : { sourceLang: staffLocale, targetLang: customerLocale };
  };

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

  const appendInterpreterMessage = (
    entry: InterpreterMessageEntry,
    translatedText: string,
    statusPrefix = '번역 완료',
    canReplay = false,
  ) => {
    setMessages((previous) => [
      ...previous,
      createInterpreterMessage(entry, translatedText, statusPrefix, canReplay),
    ]);
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
    } catch {
      // Keep TTS failures non-blocking for the interpreter flow.
    }
  };

  const stopSpeechPlayback = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
  };

  const requestInterpreterTranslation = async (entry: InterpreterMessageEntry) => {
    const response = await fetch('/api/interpreter/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        sourceText: entry.sourceText,
        sourceLang: entry.sourceLang,
        targetLang: entry.targetLang,
      }),
    });

    const data = (await response.json()) as InterpreterTranslateResponse;

    if (!response.ok || !data.ok) {
      throw new Error(data.ok ? 'interpreter_translate_failed' : data.error);
    }

    return data;
  };

  const resolveTranslatedText = async (entry: InterpreterMessageEntry) => {
    if (entry.translations?.[entry.targetLang]) {
      return {
        translatedText: entry.translations[entry.targetLang],
        statusPrefix: '번역 완료',
      };
    }

    const response = await requestInterpreterTranslation(entry);

    return {
      translatedText: response.translatedText,
      statusPrefix: '번역 완료',
    };
  };

  const submitInterpreterMessage = async (params: {
    speaker: SpeakerRole;
    inputType: InterpreterMessage['inputType'];
    sourceText: string;
    translations?: Record<ConciergeLocale, string>;
  }) => {
    const normalizedSourceText = normalizeInterpreterTextInput(params.sourceText);
    if (!normalizedSourceText || isTranslating) return false;

    const { sourceLang, targetLang } = getLocalesForSpeaker(params.speaker);
    const entry: InterpreterMessageEntry = {
      speaker: params.speaker,
      inputType: params.inputType,
      sourceText: normalizedSourceText,
      sourceLang,
      targetLang,
      translations: params.translations,
    };

    setIsTranslating(true);
    setTranslationError(null);
    setVoiceError(null);
    setVoiceStatus(null);

    try {
      const translation = await resolveTranslatedText(entry);

      appendInterpreterMessage(entry, translation.translatedText, translation.statusPrefix, true);
      speakTranslatedText(translation.translatedText, entry.targetLang);
      return true;
    } catch (error) {
      console.error('Interpreter translation failed.', error);
      appendInterpreterMessage(entry, buildSafeFallbackTranslatedText(entry), '원문 유지');
      setTranslationError(getTranslationFallbackMessage());
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
    setVoiceStatus('음성 인식 중...');

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
        setVoiceError(getRecognitionRetryMessage());
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
      setVoiceError(getRecognitionRetryMessage());
    } finally {
      setTranscribingRole(null);
    }
  };

  const startRecording = async (speaker: SpeakerRole) => {
    if (!voiceSupported || isPreparingRecording || recordingRole || transcribingRole || isTranslating) {
      return;
    }

    try {
      setIsPreparingRecording(true);
      setVoiceError(null);
      setTranslationError(null);
      setVoiceStatus('마이크 권한 확인 중...');
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
          setVoiceError(getRecognitionRetryMessage());
          return;
        }

        if (durationMs > 0 && durationMs < MIN_RECORDING_MS) {
          setTranscribingRole(null);
          setVoiceStatus(null);
          setVoiceError('조금 더 길게, 한 문장씩 말씀해 주세요. 인식이 잘 안되면 텍스트 입력을 사용하세요.');
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
      setVoiceError(null);
      setTranslationError(null);
      setVoiceStatus(`녹음 중... 최대 ${MAX_RECORDING_MS / 1000}초까지 가능해요.`);
      setRecordingRole(speaker);
    } catch (error) {
      releaseRecorder();
      setIsPreparingRecording(false);
      setRecordingRole(null);
      setTranscribingRole(null);
      setVoiceStatus(null);
      setVoiceError(getMicrophoneErrorText(error));
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return;
    }

    const finishedRole = activeRecordingRoleRef.current;
    setRecordingRole(null);
    setTranscribingRole(finishedRole);
    setVoiceStatus('음성 인식 중...');
    mediaRecorderRef.current.stop();
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

  const appendQuickPhraseMessage = (speaker: SpeakerRole, phrase: QuickPhrase) => {
    if (recordingRole || transcribingRole) {
      return;
    }

    const { sourceLang } = getLocalesForSpeaker(speaker);

    void submitInterpreterMessage({
      speaker,
      inputType: 'quick-phrase',
      sourceText: phrase.translations[sourceLang] ?? phrase.translations.ko,
      translations: phrase.translations,
    });
  };

  const handleCustomerSend = async () => {
    if (recordingRole || transcribingRole) {
      return;
    }

    const submitted = await submitInterpreterMessage({
      speaker: 'customer',
      inputType: 'text',
      sourceText: customerInput,
    });

    if (submitted) {
      setCustomerInput('');
    }
  };

  const handleStaffSend = async () => {
    if (recordingRole || transcribingRole) {
      return;
    }

    const submitted = await submitInterpreterMessage({
      speaker: 'staff',
      inputType: 'text',
      sourceText: staffInput,
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
      ? '마이크 준비 중...'
      : transcribingRole === 'customer'
      ? '고객 음성 인식 중...'
      : isCustomerRecording
        ? '고객 녹음 중... 탭하여 종료'
        : isTranslating
          ? '번역 중...'
          : '고객이 말하기';
  const staffSpeakLabel =
    isPreparingRecording
      ? '마이크 준비 중...'
      : transcribingRole === 'staff'
      ? '직원 음성 인식 중...'
      : isStaffRecording
        ? '직원 녹음 중... 탭하여 종료'
        : isTranslating
          ? '번역 중...'
          : '직원이 말하기';

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <button className={styles.backBtn} type="button" onClick={handleBack}>
          ← 이전으로
        </button>
      </div>

      <section className={styles.titleSection}>
        <h1 className={styles.title}>실시간 통역 도우미</h1>
        <p className={styles.subtitle}>
          고객과 직원이 서로의 언어로 대화할 수 있도록 도와드립니다
        </p>
        <p className={styles.onboardingNote}>
          한 사람씩 짧게 말씀해 주세요. 녹음은 최대 10초까지 가능하며, 인식이 잘 안되면 텍스트 입력이나 quick phrase를 사용하면 더 안정적입니다.
        </p>
      </section>

      <section className={styles.languageSection}>
      <section className={styles.languageSection}>
        <div className={styles.langTopRow}>
          <div className={styles.langCard} style={{ cursor: 'default', border: 'none', background: 'transparent' }}>
            <span className={styles.langRole}>고객 언어</span>
            <div className={styles.langButtonGrid}>
              {INTERPRETER_SUPPORTED_LOCALES.map((l) => (
                <button
                  key={l}
                  className={`${styles.langButton} ${customerLocale === l ? styles.langButtonActive : ''}`}
                  onClick={() => setCustomerLocale(l)}
                  disabled={isNonVoiceActionDisabled}
                >
                  {getLocaleDisplayLabel(l)}
                </button>
              ))}
            </div>
          </div>

          <button
            className={styles.langSwapBtn}
            onClick={() => {
              const temp = customerLocale;
              setCustomerLocale(staffLocale);
              setStaffLocale(temp);
            }}
            disabled={isNonVoiceActionDisabled}
          >
            ↔
          </button>

          <div className={styles.langCard} style={{ cursor: 'default', border: 'none', background: 'transparent' }}>
            <span className={styles.langRole}>직원 언어</span>
            <div className={styles.langButtonGrid}>
              {INTERPRETER_SUPPORTED_LOCALES.map((l) => (
                <button
                  key={l}
                  className={`${styles.langButton} ${staffLocale === l ? styles.langButtonStaffActive : ''}`}
                  onClick={() => setStaffLocale(l)}
                  disabled={isNonVoiceActionDisabled}
                >
                  {getLocaleDisplayLabel(l)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      </section>

      <section className={styles.contextSection}>
        <div className={styles.contextScroll}>
          {QUICK_PHRASE_GROUPS.map((group) => (
            <button
              key={group.id}
              className={`${styles.contextChip} ${
                activeQuickGroup === group.id ? styles.contextActive : ''
              }`}
              type="button"
              onClick={() => setActiveQuickGroup(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.actionSection}>
        <div className={styles.actionCard}>
          <div className={styles.langRole}>
            {getLocaleDisplayLabel(customerLocale)} to {getLocaleDisplayLabel(staffLocale)}
          </div>
          <button
            className={`${styles.speakBtn} ${styles.customerBtn} ${isCustomerRecording ? styles.recordingActive : ''}`}
            type="button"
            onClick={() => handleSpeakButtonClick('customer')}
            disabled={customerSpeakDisabled}
          >
            {customerSpeakLabel}
          </button>
          <div className={styles.quickPhraseScroll}>
            {activeQuickPhraseGroup.customerPhrases.map((phrase) => (
              <button
                key={phrase.id}
                className={styles.quickPhraseChip}
                type="button"
                onClick={() => appendQuickPhraseMessage('customer', phrase)}
                disabled={isNonVoiceActionDisabled}
              >
                {phrase.translations[customerLocale] ?? phrase.translations.ko}
              </button>
            ))}
          </div>
          <label className={styles.langRole} htmlFor="customer-text-input">
            고객 텍스트 입력
          </label>
          <div className={styles.inputRow}>
            <input
              id="customer-text-input"
              className={styles.textInput}
              type="text"
              placeholder="고객 메시지를 직접 입력하세요"
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
              전송
            </button>
          </div>
        </div>

        <div className={styles.actionCard}>
          <div className={styles.langRole}>
            {getLocaleDisplayLabel(staffLocale)} to {getLocaleDisplayLabel(customerLocale)}
          </div>
          <button
            className={`${styles.speakBtn} ${styles.staffBtn} ${isStaffRecording ? styles.recordingActive : ''}`}
            type="button"
            onClick={() => handleSpeakButtonClick('staff')}
            disabled={staffSpeakDisabled}
          >
            {staffSpeakLabel}
          </button>
          <div className={styles.quickPhraseScroll}>
            {activeQuickPhraseGroup.staffPhrases.map((phrase) => (
              <button
                key={phrase.id}
                className={styles.quickPhraseChip}
                type="button"
                onClick={() => appendQuickPhraseMessage('staff', phrase)}
                disabled={isNonVoiceActionDisabled}
              >
                {phrase.translations[staffLocale] ?? phrase.translations.ko}
              </button>
            ))}
          </div>
          <label className={styles.langRole} htmlFor="staff-text-input">
            직원 텍스트 입력
          </label>
          <div className={styles.inputRow}>
            <input
              id="staff-text-input"
              className={styles.textInput}
              type="text"
              placeholder="직원 메시지를 직접 입력하세요"
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
              전송
            </button>
          </div>
        </div>
      </section>

      <div className={styles.placeholderBox}>
        <p className={styles.placeholderText}>
          {voiceSupported
            ? '말하기 버튼을 눌러 시작하고 다시 눌러 종료하세요. 인식이 잘 안되면 짧게 다시 말하거나 텍스트 입력을 사용하세요.'
            : '이 브라우저에서는 음성 녹음이 지원되지 않습니다. 텍스트 입력과 quick phrase를 사용하세요.'}
        </p>
      </div>
      {voiceStatus ? <p className={styles.sttStatusLabel}>{voiceStatus}</p> : null}
      {voiceError ? <p className={styles.errorText}>{voiceError}</p> : null}
      {isTranslating ? (
        <p className={styles.translatingText}>서버에서 번역 문구를 준비하고 있습니다.</p>
      ) : null}
      {translationError ? <p className={styles.errorText}>{translationError}</p> : null}

      <section className={styles.conversationArea}>
        {messages.length === 0 ? (
          <div className={styles.placeholderBox}>
            <p className={styles.placeholderText}>
              아직 대화가 없습니다. 말하기 버튼, quick phrase, 텍스트 입력으로 상담 문장을 바로 전달해 보세요.
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
                    {message.speaker === 'customer' ? '고객' : '직원'}
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
                      aria-label="번역 음성 다시 듣기"
                      title={
                        ttsSupported
                          ? '번역 음성 다시 듣기'
                          : '이 브라우저에서는 음성 재생을 지원하지 않습니다'
                      }
                      onClick={() => handleReplayMessage(message)}
                      disabled={!ttsSupported || isNonVoiceActionDisabled}
                    >
                      🔊
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
