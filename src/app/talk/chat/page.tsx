/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react/no-unescaped-entities, @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Mic, Smile, Send, Pencil, Trash2, Settings, X, Link2, Pin, BellOff, LogOut, Bell, Plus, Volume2, Maximize2, Clock, Car, Heart, Calendar, Hand, Edit3, MapPin, Sparkles, Info, Scissors, DollarSign } from 'lucide-react';
import DrawingModal from '@/app/components/DrawingModal';
import NotificationCenter from '@/app/components/home/NotificationCenter';
import { supabase } from '@/lib/supabaseClient';

type Message = {
  id: string;
  sender: 'visitor' | 'system';
  original: string;
  translated?: string;
  isTranslating?: boolean;
  timestamp?: Date;
  reaction?: string;
  read?: boolean;
  imageUrl?: string;
  icon?: string;
  mapQuery?: string | null;
};

const KelloTalkIcon = ({ size = 36, color = '#FF3377' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
    <defs>
      <mask id="talk-chat-mask-page">
        <rect x="0" y="0" width="100" height="100" fill="white" />
        <path d="M45 22C28.43 22 15 32.75 15 46C15 52.88 18.47 59.1 24 63.5L20.5 76L33.5 73.5C37.05 74.47 40.91 75 45 75C61.57 75 75 64.25 75 51C75 37.75 61.57 22 45 22Z" fill="black" />
      </mask>
    </defs>
    <path d="M45 22C28.43 22 15 32.75 15 46C15 52.88 18.47 59.1 24 63.5L20.5 76L33.5 73.5C37.05 74.47 40.91 75 45 75C61.57 75 75 64.25 75 51C75 37.75 61.57 22 45 22Z" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="34" cy="48" r="3" fill="currentColor" />
    <circle cx="45" cy="48" r="3" fill="currentColor" />
    <circle cx="56" cy="48" r="3" fill="currentColor" />
    <path d="M72 52C62.06 52 54 58.72 54 67C54 71.3 56.16 75.19 59.6 78.1L57 86L64.8 84.44C67 85.12 69.41 85.5 72 85.5C81.94 85.5 90 78.78 90 70.5C90 62.22 81.94 52 72 52Z" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" mask="url(#talk-chat-mask-page)" />
    <circle cx="65" cy="69" r="2.2" fill="currentColor" />
    <circle cx="72" cy="69" r="2.2" fill="currentColor" />
    <circle cx="79" cy="69" r="2.2" fill="currentColor" />
    <path d="M75 14C75 18 78 21 82 21C78 21 75 24 75 28C75 24 72 21 68 21C72 21 75 18 75 14Z" fill="currentColor" fillOpacity={0.6} />
    <path d="M86 25C86 28 88 30 91 30C88 30 86 32 86 35C86 32 84 30 81 30C84 30 86 28 86 25Z" fill="currentColor" fillOpacity={0.6} />
  </svg>
);

const DEFAULT_CHATS = [
  {
    id: "kello-center",
    name: "Kello Talk",
    avatarText: "K",
    avatarColor: "#B8913A",
    defaultMessages: [
      { id: 'welcome', sender: 'system', original: '안녕하세요! 저는 뷰티 서비스 이용을 도와드리는 한국인 친구 Kello입니다.\n무엇을 도와드릴까요?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true }
    ]
  },
  {
    id: "jenny-hair",
    name: "제니헤어살롱 (Jenny Hair Salon)",
    avatarText: "J",
    avatarColor: "#8C6A3C",
    defaultMessages: [
      { id: '1', sender: 'system', original: '안녕하세요! 제니헤어살롱입니다. 예약 문의해 주셔서 감사합니다.', translated: 'Hello! This is Jenny Hair Salon. Thank you for your reservation inquiry.', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), read: false },
      { id: '2', sender: 'system', original: '예약이 완료되었습니다. 내일 뵙겠습니다!', translated: 'Your reservation has been completed. See you tomorrow!', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: false }
    ]
  },
  {
    id: "gold-nail",
    name: "골드네일라운지 (Gold Nail Lounge)",
    avatarText: "G",
    avatarColor: "#6A5837",
    defaultMessages: [
      { id: '1', sender: 'visitor', original: '네일 디자인 추천해주실 수 있나요?', translated: 'Can you recommend a nail design?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(), read: true },
      { id: '2', sender: 'system', original: '디자인 시안 확인 부탁드려요.', translated: 'Please check the design draft.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(), read: true }
    ]
  },
  {
    id: "spa-aesthetic",
    name: "스파에스테틱 (Spa Aesthetic)",
    avatarText: "S",
    avatarColor: "#5A4C30",
    defaultMessages: [
      { id: '1', sender: 'system', original: '10분 늦으실 경우 automatic 취소됩니다.', translated: 'It will be automatically canceled if you are 10 minutes late.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), read: false }
    ]
  }
];

const COLORS = {
  bg: '#FFFFFF',
  header: '#FFFFFF',
  border: '#FFE4E6',
  primary: '#FF4D82',
  primaryLight: '#FFF0F3',
  opponentLight: '#F3F4F6',
  textMain: '#2A2624',
  textSub: '#8A847F',
  bubble: {
    visitor: '#FFFFFF',
    visitorText: '#2A2624',
    system: '#F3F4F6',
    systemText: '#5A544F',
  },
  sendEnabled: '#FF4D82',
  sendDisabled: '#E5E7EB',
};

const LOCAL_DICTIONARY: Record<string, { ko: string; icon: string }> = {
  "사진에 있는 스타일로 똑같이 가능한가요?": { ko: "사진에 있는 스타일로 똑같이 가능한가요?", icon: "📷" },
  "이 사진처럼 해주세요.": { ko: "이 사진처럼 해주세요.", icon: "📷" },
  "조금만 더 짧게 해주세요.": { ko: "조금만 더 짧게 해주세요.", icon: "✂️" },
  "숱 조금만 쳐주세요.": { ko: "숱 조금만 쳐주세요.", icon: "✂️" },
  "앞머리 다듬어주세요.": { ko: "앞머리 다듬어주세요.", icon: "✂️" },
  "너무 뜨거워요.": { ko: "너무 뜨거워요.", icon: "🌡️" },
  "조금 아파요.": { ko: "조금 아파요.", icon: "🌡️" },
  "물이 차가워요.": { ko: "물이 차가워요.", icon: "🌡️" },
  "전부 해서 얼마인가요?": { ko: "전부 해서 얼마인가요?", icon: "💳" },
  "카드 결제 할게요.": { ko: "카드 결제 할게요.", icon: "💳" },
  "예약 방법은 어떻게 되나요?": { ko: "예약 방법은 어떻게 되나요?", icon: "📅" },
  "How do I make a booking?": { ko: "예약 방법은 어떻게 되나요?", icon: "📅" },
  "예약 변경이나 취소는 어떻게 하나요?": { ko: "예약 변경이나 취소는 어떻게 하나요?", icon: "📅" },
  "How can I change or cancel my booking?": { ko: "예약 변경이나 취소는 어떻게 하나요?", icon: "📅" },
  "보통 시술 시간은 얼마나 걸리나요?": { ko: "보통 시술 시간은 얼마나 걸리나요?", icon: "⏱️" },
  "How long does the service usually take?": { ko: "보통 시술 시간은 얼마나 걸리나요?", icon: "⏱️" },
  "샵 위치와 찾아가는 방법을 알려주세요.": { ko: "샵 위치와 찾아가는 방법을 알려주세요.", icon: "📍" },
  "Please tell me the shop location and how to get there.": { ko: "샵 위치와 찾아가는 방법을 알려주세요.", icon: "📍" }
};

const SUGGESTION_ICONS: Record<string, React.ComponentType<any>> = {
  "얼마나 걸릴까요?": Clock,
  "주차 가능한가요?": Car,
  "감사합니다.": Heart,
  "예약 시간 변경 가능한가요?": Calendar,
  "예약 시간 변경 가능할까요?": Calendar,
  "안녕하세요!": Hand,
  "고맙습니다.": Smile,
};

const LANGUAGES = [
  { code: 'ko', label: '한국어', short: 'KOR' },
  { code: 'en', label: 'English', short: 'ENG' },
  { code: 'zh', label: '中文', short: 'CHN' },
  { code: 'ja', label: '日本語', short: 'JPN' },
  { code: 'vi', label: 'Tiếng Việt', short: 'VIE' },
  { code: 'th', label: 'ภาษาไทย', short: 'THA' },
];

const QUICK_CATEGORIES = [
  { id: 'style', icon: '📷', label: 'Style', phrases: ['사진에 있는 스타일로 똑같이 가능한가요?', '이 사진처럼 해주세요.'] },
  { id: 'detail', icon: '✂️', label: 'Detail', phrases: ['조금만 더 짧게 해주세요.', '숱 조금만 쳐주세요.', '앞머리 다듬어주세요.'] },
  { id: 'comfort', icon: '🌡️', label: 'Comfort', phrases: ['너무 뜨거워요.', '조금 아파요.', '물이 차가워요.'] },
  { id: 'payment', icon: '💳', label: 'Payment', phrases: ['전부 해서 얼마인가요?', '카드 결제 할게요.'] }
];

const StaffPinkTranslationArea = ({
  originalText,
  fallbackText,
  handleTTS,
}: {
  originalText: string;
  fallbackText?: string;
  handleTTS: (text: string, lang: string) => void;
}) => {
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originalText) return;

    // 1. 이미 한국어 텍스트인 경우 즉시 할당
    const isOriginalKo = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(originalText);
    if (isOriginalKo) {
      setTranslatedText(originalText);
      return;
    }
    const isFallbackKo = fallbackText && /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(fallbackText);
    if (isFallbackKo) {
      setTranslatedText(fallbackText);
      return;
    }

    // 2. 로컬 사전(LOCAL_DICTIONARY)에서 매칭되는 한글 번역 조회
    let matchedKo = "";
    if (LOCAL_DICTIONARY[originalText]) {
      matchedKo = LOCAL_DICTIONARY[originalText].ko;
    } else {
      for (const [key, value] of Object.entries(LOCAL_DICTIONARY)) {
        if (key.toLowerCase() === originalText.toLowerCase() || value.ko.toLowerCase() === originalText.toLowerCase()) {
          matchedKo = value.ko;
          break;
        }
      }
    }

    if (matchedKo) {
      setTranslatedText(matchedKo);
      return;
    }

    // v2: 이전 캐시(번역 실패 시 원문 저장된 값) 제거
    const OLD_CACHE_KEY = `kello_cache_auto_ko_${originalText}`;
    localStorage.removeItem(OLD_CACHE_KEY);

    const cacheKey = `kello_cache_auto_ko_v2_${originalText}`;
    const cached = localStorage.getItem(cacheKey);
    // 캐시 값이 실제 한국어인지 검증 - 아니면 재번역
    const cachedIsKo = cached && /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(cached);
    if (cachedIsKo) {
      setTranslatedText(cached!);
      return;
    }
    if (cached) {
      // 잘못된 캐시 삭제 후 재번역
      localStorage.removeItem(cacheKey);
    }

    const doTranslate = async () => {
      setLoading(true);
      try {
        let session = null;
        try {
          if (typeof supabase !== 'undefined' && supabase.auth) {
            const { data } = await supabase.auth.getSession();
            session = data?.session;
          }
        } catch (authErr) {
          console.warn("Supabase auth session fetch error, proceeding without token:", authErr);
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/talk/chat-translate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: originalText, sourceLocale: 'auto', targetLocale: 'ko', persist: false }),
        });
        const data = await res.json();
        if (data.translatedText) {
          // 실제 한국어일 때만 캐시 저장
          const isKoResult = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(data.translatedText);
          if (isKoResult) {
            localStorage.setItem(cacheKey, data.translatedText);
          }
          setTranslatedText(data.translatedText);
        } else {
          setTranslatedText(fallbackText || originalText);
        }
      } catch (err) {
        console.error(err);
        setTranslatedText(fallbackText || originalText);
      } finally {
        setLoading(false);
      }
    };

    doTranslate();
  }, [originalText, fallbackText]);

  const displayPinkText = translatedText || fallbackText || originalText;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ color: COLORS.primary, fontSize: '0.9rem', fontWeight: 500, flex: 1, marginRight: 8, textAlign: 'left', wordBreak: 'break-word' }}>
        {loading ? <span style={{ opacity: 0.6 }}>번역 중...</span> : displayPinkText}
      </div>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          handleTTS(displayPinkText, 'ko');
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          marginBottom: -2
        }}
        title="Listen"
      >
        <Volume2 size={16} color={COLORS.textSub} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default function TalkChatPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopIdFromUrl = searchParams.get('shopId') || 'kello-center';
  const [shopId, setShopId] = useState('kello-center');
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const moveSuggestion = (index: number, direction: 'prev' | 'next') => {
    setQuickSuggestions(prev => {
      const newArr = [...prev];
      const targetIdx = direction === 'prev' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIdx];
      newArr[targetIdx] = temp;
      return newArr;
    });
  };
  const [isEditingSuggestions, setIsEditingSuggestions] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isEditingSuggestions) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditingSuggestions) return;
    e.preventDefault();
    if (draggedOverIndex !== index) {
      setDraggedOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (!isEditingSuggestions || draggedIndex === null) return;
    setQuickSuggestions(prev => {
      const newArr = [...prev];
      const draggedItem = newArr[draggedIndex];
      newArr.splice(draggedIndex, 1);
      newArr.splice(targetIndex, 0, draggedItem);
      return newArr;
    });
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const [isAiRecommending, setIsAiRecommending] = useState(false);
  const [kelloActiveTab, setKelloActiveTab] = useState('예약');
  const [kelloAiAnswer, setKelloAiAnswer] = useState<string | null>(null);
  const [isStaffShowMode, setIsStaffShowMode] = useState(false);
  const [showViewerTip, setShowViewerTip] = useState(true);
  const [selectedQuickCategory, setSelectedQuickCategory] = useState<string | null>(null);
  const [drawingImage, setDrawingImage] = useState<string | null>(null);
  const [liveTranslation, setLiveTranslation] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffModalText, setStaffModalText] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [shopName, setShopName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sourceLocale, setSourceLocale] = useState('ko');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    const loadUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.avatar_url && isMounted) {
        setUserAvatarUrl(profileData.avatar_url);
      }
    };
    void loadUserProfile();
    return () => { isMounted = false; };
  }, []);

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t('talk_ui.speech_not_supported', { defaultValue: 'This browser does not support speech recognition.' }));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = sourceLocale === 'ko' ? 'ko-KR' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + (prev ? ' ' : '') + transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };
  const [targetLocale, setTargetLocale] = useState('en');
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [hoveredReactionId, setHoveredReactionId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; date: string; read: boolean; type?: string; shopId?: string }>>([
    { id: 'noti-1', text: '제니헤어살롱: 예약이 확정되었습니다! (내일 오전 11:00)', date: '방금 전', read: false, type: 'reservation', shopId: 'jenny-hair' },
    { id: 'noti-2', text: '골드네일라운지: 디자인 시안 확인 부탁드립니다.', date: '10분 전', read: false, type: 'chat', shopId: 'gold-nail' },
    { id: 'noti-3', text: '스파에스테틱: 10분 이상 지각 시 자동 취소될 수 있습니다.', date: '1시간 전', read: true, type: 'warning', shopId: 'spa-aesthetic' },
  ]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'edit' | 'delete' | null;
    messageId: string | null;
  }>({
    isOpen: false,
    type: null,
    messageId: null,
  });
  const [pinnedShops, setPinnedShops] = useState<string[]>([]);
  const [mutedShops, setMutedShops] = useState<string[]>([]);
  const [hiddenShops, setHiddenShops] = useState<string[]>([]);
  const [otherUnreadCount, setOtherUnreadCount] = useState(0);
  const [incomingAlert, setIncomingAlert] = useState<{ show: boolean; shopName: string; shopId: string; message: string } | null>(null);
  const [shopContextMenu, setShopContextMenu] = useState<{ x: number; y: number; shopId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState('');

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 150;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const REACTIONS = ['👍', '❤️', '😊', '😂', '🙏', '👏', '🔥', '✨', '😍', '🤔'];

  const handleReaction = (emoji: string) => {
    const id = `reaction-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id, sender: 'visitor', original: emoji, translated: emoji, isTranslating: false, timestamp: new Date() },
    ]);
    setShowEmojiPicker(false);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx === -1) return prev;

      const idsToRemove = [id];
      for (let i = idx + 1; i < prev.length; i++) {
        const nextMsg = prev[i];
        if (nextMsg.sender !== 'visitor') {
          idsToRemove.push(nextMsg.id);
        } else {
          break;
        }
      }
      return prev.filter(m => !idsToRemove.includes(m.id));
    });
  };

  const handleEditMessage = (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (msg) {
      setInputText(msg.original);
      handleDeleteMessage(id);
    }
  };

  const handleReactToMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction: m.reaction ? undefined : '❤️' } : m));
  };

  const handleConfirmAction = () => {
    if (!confirmModal.messageId) return;
    if (confirmModal.type === 'delete') {
      handleDeleteMessage(confirmModal.messageId);
    } else if (confirmModal.type === 'edit') {
      handleEditMessage(confirmModal.messageId);
    }
    setConfirmModal({ isOpen: false, type: null, messageId: null });
  };

  const getUnreadTotal = () => {
    let total = 0;
    DEFAULT_CHATS.forEach(shop => {
      if (shop.id === 'kello-center') return;
      try {
        const stored = localStorage.getItem(`kello_chats_${shop.id}`);
        if (stored) {
          const msgs = JSON.parse(stored);
          total += msgs.filter((m: any) => m.sender === 'system' && !m.read).length;
        }
      } catch { }
    });
    return total;
  };

  const updateUnreadTotal = () => {
    const unread = getUnreadTotal();
    setOtherUnreadCount(unread);
    window.dispatchEvent(new CustomEvent('update-unread-count', { detail: unread }));
  };

  useEffect(() => {
    try {
      setPinnedShops(JSON.parse(localStorage.getItem('kello_pinned') || '[]'));
      setMutedShops(JSON.parse(localStorage.getItem('kello_muted') || '[]'));
      setHiddenShops(JSON.parse(localStorage.getItem('kello_hidden') || '[]'));
    } catch { }
    updateUnreadTotal();
  }, [shopId, showLinkModal]);

  useEffect(() => {
    const handleClickOutside = () => setShopContextMenu(null);
    if (shopContextMenu) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [shopContextMenu]);

  useEffect(() => {
    if (shopId !== 'kello-center') return;
    const timer = setTimeout(() => {
      const shopKey = 'kello_chats_jenny-hair';
      let currentMsgs = [];
      try {
        currentMsgs = JSON.parse(localStorage.getItem(shopKey) || '[]');
      } catch { }

      const newMsg = {
        id: `simulated-${Date.now()}`,
        sender: 'system',
        original: '안녕하세요! 문의하신 디자인 시안 발송해 드렸습니다. 확인 부탁드립니다.',
        translated: 'Hello! We have sent the design draft you requested. Please check it.',
        timestamp: new Date().toISOString(),
        read: false
      };

      localStorage.setItem(shopKey, JSON.stringify([...currentMsgs, newMsg]));
      updateUnreadTotal();

      setNotifications(prev => [
        {
          id: `noti-${Date.now()}`,
          text: t('talk_page.simulated_notification', { defaultValue: 'Jenny Hair Salon: Hello! We have sent the design draft you requested. Please check it.' }),
          date: t('common.time.just_now', { defaultValue: 'Just now' }),
          read: false,
          type: 'chat',
          shopId: 'jenny-hair'
        },
        ...prev
      ]);
    }, 7000);

    return () => clearTimeout(timer);
  }, [shopId, t]);

  const toggleShopPin = (id: string) => {
    setPinnedShops(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem('kello_pinned', JSON.stringify(next));
      return next;
    });
  };

  const toggleShopMute = (id: string) => {
    setMutedShops(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem('kello_muted', JSON.stringify(next));
      return next;
    });
    updateUnreadTotal();
  };

  const leaveShopRoom = (id: string) => {
    setHiddenShops(prev => {
      const next = [...prev, id];
      localStorage.setItem('kello_hidden', JSON.stringify(next));
      return next;
    });
    localStorage.removeItem(`kello_chats_${id}`);
    updateUnreadTotal();
  };

  // Load shop data on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('shopId') || 'jenny-hair';
    setShopId(id);

    const namesMap: Record<string, string> = {
      'kello-center': 'Kello Talk',
      'jenny-hair': '제니헤어살롱 (Jenny Hair Salon)',
      'gold-nail': '골드네일라운지 (Gold Nail Lounge)',
      'spa-aesthetic': '스파에스테틱 (Spa Aesthetic)',
    };
    setShopName(namesMap[id] || t("talk_ui.default_shop_name"));

    setQuickSuggestions([
      "얼마나 걸릴까요?",
      "예약 시간 변경 가능한가요?",
      "주차 가능한가요?",
      "안녕하세요!",
      "감사합니다.",
      "고맙습니다."
    ]);

    if (typeof window !== 'undefined' && !localStorage.getItem('kello_chats_reset_v4')) {
      localStorage.removeItem('kello_chats_kello-center');
      localStorage.setItem('kello_chats_reset_v4', 'true');
    }

    const stored = localStorage.getItem(`kello_chats_${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((m: Omit<Message, 'timestamp'> & { timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsed);
      } catch {
        setMessages([]);
      }
    } else {
      const defaultShop = DEFAULT_CHATS.find(s => s.id === id);
      let defaultMsgs: Message[] = defaultShop ? defaultShop.defaultMessages.map(m => ({
        ...m,
        sender: m.sender as 'system' | 'visitor',
        timestamp: new Date(m.timestamp)
      })) : [];

      if (id === 'kello-center') {
        defaultMsgs = [{
          id: 'welcome',
          sender: 'system',
          original: '안녕! 난 뷰티서비스 이용을 도와주는 한국인 친구 Kello야.\n무엇을 도와줄까?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          read: true
        }];
      }

      setMessages(defaultMsgs);
    }
    isLoaded.current = true;
  }, [shopIdFromUrl]);

  // Close suggestions edit mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isEditingSuggestions && suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setIsEditingSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingSuggestions]);

  // Mark system messages as read
  useEffect(() => {
    const unreadExist = messages.some(m => m.sender === 'system' && !m.read);
    if (unreadExist && shopId) {
      setMessages(prev => prev.map(m => m.sender === 'system' ? { ...m, read: true } : m));
    }
  }, [messages, shopId]);

  // Save to localStorage when messages change and update global unread count
  useEffect(() => {
    if (isLoaded.current && shopId) {
      localStorage.setItem(`kello_chats_${shopId}`, JSON.stringify(messages));

      // Update global unread count
      const ids = ['jenny-hair', 'gold-nail', 'spa-aesthetic'];
      let total = 0;
      ids.forEach(id => {
        if (id === shopId) {
          total += messages.filter(m => m.sender === 'system' && !m.read).length;
        } else {
          const stored = localStorage.getItem(`kello_chats_${id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Message[];
              total += parsed.filter((m) => m.sender === 'system' && !m.read).length;
            } catch { }
          } else {
            const defaultShop = DEFAULT_CHATS.find(s => s.id === id);
            if (defaultShop) {
              total += defaultShop.defaultMessages.filter(m => m.sender === 'system' && !m.read).length;
            }
          }
        }
      });
      window.dispatchEvent(new CustomEvent('update-unread-count', { detail: total }));
    }
  }, [messages, shopId]);

  const handleAiRecommend = async () => {
    setIsAiRecommending(true);
    await new Promise(r => setTimeout(r, 1200));
    setQuickSuggestions(prev => {
      const newSuggestions = ['얼마나 걸릴까요?', '예약 시간 변경 가능한가요?', '주차 가능한가요?'];
      const uniqueNew = newSuggestions.filter(s => !prev.includes(s));
      return [...uniqueNew, ...prev].slice(0, 10);
    });
    setIsAiRecommending(false);
  };

  const handleSwapLangs = () => {
    setSourceLocale(targetLocale);
    setTargetLocale(sourceLocale);
    setShowSourcePicker(false);
    setShowTargetPicker(false);
  };

  const sourceLang = LANGUAGES.find((l) => l.code === sourceLocale) ?? LANGUAGES[0];
  const targetLang = LANGUAGES.find((l) => l.code === targetLocale) ?? LANGUAGES[1];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTextToSpeech = (text: string, lang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 스마트 언어 판별: 텍스트에 한글이 하나라도 포함되어 있으면 무조건 한국어 발음 지정
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
    const resolvedLang = hasKorean ? 'ko-KR' : (lang.toLowerCase().startsWith('ko') ? 'ko-KR' : 'en-US');
    
    utterance.lang = resolvedLang;

    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => 
      v.lang.toLowerCase() === resolvedLang.toLowerCase() || 
      v.lang.toLowerCase().replace('_', '-').startsWith(resolvedLang.toLowerCase())
    );
    if (!voice && resolvedLang.startsWith('ko')) {
      voice = voices.find(v => v.lang.includes('ko'));
    }
    if (!voice && resolvedLang.startsWith('en')) {
      voice = voices.find(v => v.lang.includes('en'));
    }
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  // Live translation for staff show mode
  useEffect(() => {
    if (!isStaffShowMode || !inputText.trim()) {
      setLiveTranslation('');
      return;
    }
    const timer = setTimeout(async () => {
      try {
        let session = null;
        try {
          if (typeof supabase !== 'undefined' && supabase.auth) {
            const { data } = await supabase.auth.getSession();
            session = data?.session;
          }
        } catch (authErr) {
          console.warn("Supabase auth error in live translation:", authErr);
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/talk/chat-translate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: inputText, sourceLocale: 'auto', targetLocale: 'ko' }),
        });
        const data = await res.json();
        setLiveTranslation(data.translatedText || '');
      } catch (err) {
        console.error(err);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [inputText, isStaffShowMode, sourceLocale, targetLocale]);

  const sendMessage = async (text: string) => {
    if (!text || isSending) return;

    const id = Date.now().toString();
    const matchedDict = LOCAL_DICTIONARY[text];
    const defaultIcon = matchedDict ? matchedDict.icon : '💬';

    setMessages((prev) => [...prev, { id, sender: 'visitor', original: text, isTranslating: true, timestamp: new Date(), icon: defaultIcon }]);
    setIsSending(true);
    inputRef.current?.focus();

    const activeTargetLocale = targetLocale;
    let translatedText = '';

    if (matchedDict) {
      translatedText = matchedDict.ko;
    } else {
      const cacheKey = `kello_cache_${sourceLocale}_${activeTargetLocale}_${text}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        translatedText = cached;
      }
    }

    if (translatedText) {
      await new Promise(r => setTimeout(r, 400));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, translated: translatedText, isTranslating: false } : m
        )
      );
    } else {
      try {
        const { data: { session: translateSession } } = await supabase.auth.getSession();
        const res = await fetch('/api/talk/chat-translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(translateSession?.access_token ? { Authorization: `Bearer ${translateSession.access_token}` } : {}),
          },
          body: JSON.stringify({ message: text, sourceLocale: 'auto', targetLocale: activeTargetLocale }),
        });
        const data = await res.json();
        translatedText = data.translatedText ?? t('talk_ui.translation_failed');

        if (data.translatedText) {
          const cacheKey = `kello_cache_${sourceLocale}_${activeTargetLocale}_${text}`;
          localStorage.setItem(cacheKey, translatedText);
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, translated: translatedText, isTranslating: false } : m
          )
        );
      } catch (err) {
        console.error(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, translated: t('talk_ui.translation_failed_msg'), isTranslating: false } : m
          )
        );
      }
    }

    if (shopId === 'kello-center') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessages((prev) => [
          ...prev,
          {
            id: `kello-login-${Date.now()}`,
            sender: 'system',
            original: sourceLocale === 'ko'
              ? t('talk_ui.login_required_chat')
              : 'Please log in to chat with Kello AI. Once you log in, you can continue right where you left off!',
            timestamp: new Date(),
            read: true
          }
        ]);
        setIsSending(false);
        return;
      }

      try {
        const aiRes = await fetch('/api/talk/kello-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ message: text, category: kelloActiveTab })
        });
        const aiData = await aiRes.json();

        await new Promise(r => setTimeout(r, 600));

        setMessages((prev) => [
          ...prev,
          {
            id: `kello-reply-${Date.now()}`,
            sender: 'system',
            original: aiData.reply ?? aiData.replyKo ?? '',
            timestamp: new Date(),
            read: true,
            mapQuery: aiData.mapQuery || null,
          }
        ]);
      } catch (err) {
        console.error("Kello AI Error", err);
      }
    }

    setIsSending(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText('');
    if (inputRef.current) {
      inputRef.current.style.height = '24px';
    }
    sendMessage(text);
  };

  const handleRegenerateKello = async (msgId: string) => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;

    let visitorText = '';
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].sender === 'visitor') {
        visitorText = messages[i].original;
        break;
      }
    }
    if (!visitorText) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert(t("talk_ui.login_required_chat"));
      return;
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranslating: true, translated: undefined } : m));

    try {
      const aiRes = await fetch('/api/talk/kello-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: visitorText }),
      });
      const data = await aiRes.json();
      if (data.replyKo) {
        setMessages(prev => prev.map(m => m.id === msgId ? {
          ...m,
          original: sourceLocale === 'ko' ? data.replyKo : data.replyEn,
          translated: undefined,
          isTranslating: false
        } : m));
      } else {
        throw new Error('No reply');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        translated: t('talk_ui.translation_failed_msg'),
        isTranslating: false
      } : m));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setDrawingImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    const scrollContainer = document.querySelector('.scroll-container') as HTMLElement;
    if (scrollContainer) {
      const originalPadding = scrollContainer.style.paddingBottom;
      scrollContainer.style.paddingBottom = '0px';
      return () => {
        scrollContainer.style.paddingBottom = originalPadding;
      };
    }
  }, []);

  const isKello = shopId === 'kello-center';
  const pageBg = isKello ? '#FFFFFF' : '#F2EFE9';
  const headerBg = isKello ? COLORS.header : '#EBE6DA';



  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        paddingBottom: 'var(--nav-height, 72px)',
        boxSizing: 'border-box',
        background: pageBg,
        fontFamily: "'Pretendard', 'Inter', sans-serif",
      }}
    >
      {/* Global Overlays for click-away */}
      {showNotificationsDropdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowNotificationsDropdown(false)} />
      )}
      {shopContextMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setShopContextMenu(null)} />
      )}
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          height: '60px',
          boxSizing: 'border-box',
          background: headerBg,
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isKello && (
            <button
              type="button"
              onClick={() => router.push('/talk/chat?shopId=kello-center')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              aria-label={t("common.back")}
            >
              <ChevronLeft size={24} color={COLORS.textMain} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isKello ? (
              <KelloTalkIcon size={36} color="#000000" />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: COLORS.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: COLORS.primary, flexShrink: 0 }}>
                {shopName.charAt(0)}
              </div>
            )}
             <div style={{ fontWeight: 600, fontSize: '1.15rem', color: COLORS.textMain }}>
              {isKello ? (
                <span>
                  <span style={{ color: '#000000' }}>Kello</span>톡
                </span>
              ) : shopName}
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Show to Staff Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFF',
            padding: '4px 10px',
            borderRadius: 20,
            border: `1px solid #FFE4E6`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            position: 'relative'
          }}>
            <style>{`
              @keyframes tooltipPopBounce {
                0% { transform: scale(0.6) translateY(8px); opacity: 0; }
                50% { transform: scale(1.04) translateY(-3px); }
                80% { transform: scale(0.98) translateY(1px); }
                100% { transform: scale(1) translateY(0); opacity: 1; }
              }
              @keyframes tooltipFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
              }
            `}</style>

            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textMain }}>{t('talk_page.korean_viewer_mode')}</span>
            <button
              type="button"
              onClick={() => setIsStaffShowMode(!isStaffShowMode)}
              style={{
                width: 32,
                height: 18,
                borderRadius: 9,
                background: isStaffShowMode ? COLORS.primary : '#E5E7EB',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                padding: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                left: isStaffShowMode ? 16 : 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#FFF',
                transition: 'left 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }} />
            </button>

            {/* 💡 직원에게 보여주려면 한국어 뷰어모드를 켜세요. 팝업 (연노랑 배경) */}
            {showViewerTip && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: -10,
                zIndex: 100,
                pointerEvents: 'none',
              }}>
                <div style={{
                  background: '#FFFDF0',
                  color: '#854D0E',
                  padding: '6px 18px 6px 8px',
                  borderRadius: '12px',
                  border: '1px solid #FEF08A',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  width: 'fit-content',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'auto',
                  position: 'relative',
                  animation: 'tooltipPopBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both, tooltipFloat 2s ease-in-out infinite',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: -6,
                    right: 18,
                    transform: 'rotate(45deg)',
                    width: 10,
                    height: 10,
                    background: '#FFFDF0',
                    borderLeft: '1px solid #FEF08A',
                    borderTop: '1px solid #FEF08A',
                  }} />
                  <div style={{ whiteSpace: 'nowrap', lineHeight: 1.5 }}>
                    💡 한국인 직원에게 보여주려면
                  </div>
                  <div style={{ whiteSpace: 'nowrap', lineHeight: 1.5 }}>
                    <span style={{ color: COLORS.primary, fontWeight: 700 }}>한국어 뷰어 모드</span>를 활성화 하세요.
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowViewerTip(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      zIndex: 10
                    }}
                    title={t("talk_ui.close_aria")}
                  >
                    <X size={11} color="#854D0E" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 제휴업체 연결하기 아이콘 버튼 */}
          <button
            type="button"
            onClick={() => {
              setShowLinkModal(true);
            }}
            style={{
              position: 'relative',
              width: 32,
              height: 32,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#1F1F1F',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            title="뷰티 매장 연결하기"
          >
            <Link2 size={22} strokeWidth={1.5} />
          </button>

          {/* 알림 센터 연동 (홈화면과 동일한 기능 및 아이콘) */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <NotificationCenter />
          </div>
        </div>
      </header>

      {/* Full width incoming alert banner under header */}
      {incomingAlert && incomingAlert.show && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIncomingAlert(null);
            router.push(`/talk/chat?shopId=${incomingAlert.shopId}`);
          }}
          style={{
            width: '100%',
            background: COLORS.primaryLight,
            borderBottom: `1px solid ${COLORS.border}`,
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 90,
            boxSizing: 'border-box',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <style>{`
            @keyframes slideDown {
              from { transform: translateY(-100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.primary }}>{t('talk_ui.new_message')}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {incomingAlert.shopName.split(' ')[0]}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {incomingAlert.message}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: '0.7rem', color: COLORS.primary, fontWeight: 700 }}>{t('talk_ui.go')} &gt;</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIncomingAlert(null);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
            >
              <X size={16} color={COLORS.textSub} />
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <section
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          position: 'relative'
        }}
        onClick={() => { setShowSourcePicker(false); setShowTargetPicker(false); setShowEmojiPicker(false); }}
      >
        {/* Watermark Background */}
        {shopId !== 'kello-center' && (
          <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1, pointerEvents: 'none', textAlign: 'center', width: '85%', zIndex: 0 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8, color: COLORS.primary }}>💡 Kello Tip</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, wordBreak: 'keep-all', color: COLORS.textMain }}>{t("talk_ui.beauty_tip")}</div>
          </div>
        )}





        {/* 2. Kello 웰컴 카드 (welcome) */}
        {shopId === 'kello-center' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: 4, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '20px 20px 16px 20px',
              boxShadow: '0 8px 24px rgba(255, 77, 130, 0.04)',
              border: '1px solid #FFE4E6',
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#000000', display: 'flex', alignItems: 'center', gap: 6 }}>
                    안녕하세요! 저는 <span style={{ color: COLORS.primary }}>Kello</span>입니다 👋
                  </span>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.25 }}>
                    무엇을 도와드릴까요?
                  </h2>
                </div>
                {/* K 캐릭터 이미지 (박스 내부 우측 상단, 투명 필터 적용 및 크기 확대) */}
                <div style={{ width: 165, height: 135, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  <img
                    src="/images/talk/kello_character.png"
                    alt="Kello"
                    style={{ width: '100%', height: '120%', objectFit: 'contain', mixBlendMode: 'multiply', filter: 'brightness(1.02) contrast(1.02)', marginTop: 10 }}
                  />
                </div>
              </div>

              {/* Kello에게 물어보세요 – 6탭 + 질문카드 + AI 답변 */}
              <div style={{ background: '#FFF8F9', borderRadius: '16px', padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color={COLORS.primary} style={{ flexShrink: 0, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1F2937' }}>
                    <span style={{ color: COLORS.primary }}>Kello</span>에게 물어보세요
                  </span>
                </div>

                {/* 6개 탭 */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: '예약', icon: Calendar },
                    { label: '뷰티스타일 추천', icon: Sparkles },
                    { label: '업체 추천', icon: MapPin },
                    { label: '가격 안내', icon: DollarSign },
                    { label: '시술 정보', icon: Scissors },
                    { label: '이용 안내', icon: Info },
                  ].map(tabItem => {
                    const IconComponent = tabItem.icon;
                    return (
                      <button
                        key={tabItem.label}
                        type="button"
                        onClick={() => { setKelloActiveTab(tabItem.label); }}
                        style={{
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1px solid ${kelloActiveTab === tabItem.label ? COLORS.primary : '#FFE4E6'}`,
                          background: kelloActiveTab === tabItem.label ? COLORS.primary : '#FFFFFF',
                          color: kelloActiveTab === tabItem.label ? '#FFF' : '#374151',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <IconComponent size={11} strokeWidth={2.5} />
                        {tabItem.label}
                      </button>
                    );
                  })}
                </div>

                {/* 탭별 추천 질문 카드 */}
                {(() => {
                  const tabQuestions: Record<string, { icon: React.ComponentType<any>; label: string; q: string }[]> = {
                    '예약': [
                      { icon: Calendar, label: '예약 문의', q: '예약 가능한 시간 알려줘' },
                      { icon: Pencil, label: '예약 변경·취소', q: '예약 취소하고 싶어요' },
                      { icon: Clock, label: '시술 시간 안내', q: '시술 시간은 얼마나 걸리나요?' },
                      { icon: MapPin, label: '위치 안내', q: '샵 위치 알려줘' },
                    ],
                    '뷰티스타일 추천': [
                      { icon: Sparkles, label: '얼굴형 추천', q: '얼굴형에 맞는 머리 추천해줘' },
                      { icon: Sparkles, label: '계절별 추천', q: '여름 헤어 추천해줘' },
                      { icon: Heart, label: '피부 타입별', q: '피부 타입별 관리 추천해줘' },
                      { icon: Smile, label: '스타일 취향', q: '내추럴한 스타일 추천해줘' },
                    ],
                    '업체 추천': [
                      { icon: MapPin, label: '지역 추천', q: '제주도 피부관리 추천해줘' },
                      { icon: Scissors, label: '헤어샵 추천', q: '근처 헤어샵 알려줘' },
                      { icon: Sparkles, label: '네일샵 추천', q: '네일샵 추천해줘' },
                      { icon: Info, label: '에스테틱 추천', q: '에스테틱 추천해줘' },
                    ],
                    '가격 안내': [
                      { icon: DollarSign, label: '염색 가격', q: '염색 가격 얼마인가요?' },
                      { icon: DollarSign, label: '필러 가격', q: '필러 가격 알려줘' },
                      { icon: DollarSign, label: '네일 가격', q: '젤네일 가격 얼마예요?' },
                      { icon: DollarSign, label: '피부관리 가격', q: '피부관리 가격 범위 알려줘' },
                    ],
                    '시술 정보': [
                      { icon: Scissors, label: '커트 시술 정보', q: '커트 시술 과정 알려줘' },
                      { icon: Info, label: '염색 주의사항', q: '염색 후 주의사항 알려줘' },
                      { icon: Sparkles, label: '두피 케어', q: '두피 케어 시술 정보 알려줘' },
                      { icon: Info, label: '스킨케어', q: '스킨케어 시술 종류 알려줘' },
                    ],
                    '이용 안내': [
                      { icon: Info, label: 'Kello 예약 방법', q: 'Kello 앱 예약 방법 알려줘' },
                      { icon: Calendar, label: '알림 설정', q: '예약 알림은 어떻게 설정하나요?' },
                      { icon: DollarSign, label: '결제 방법', q: '결제는 어떻게 하나요?' },
                      { icon: Sparkles, label: '쿠폰·혜택', q: '쿠폰이나 혜택은 어떻게 받나요?' },
                    ],
                  };
                  const questions = tabQuestions[kelloActiveTab] ?? [];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {questions.map(item => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => { sendMessage(item.label); }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #FFE4E6',
                            borderRadius: '12px',
                            padding: '10px 8px',
                            fontSize: '0.72rem',
                            color: '#374151',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 8,
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.background = '#FFF5F7'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#FFE4E6'; e.currentTarget.style.background = '#FFFFFF'; }}
                        >
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#FFF5F7',
                            color: COLORS.primary,
                            flexShrink: 0
                          }}>
                            <item.icon size={13} strokeWidth={2.5} />
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{item.label}</span>
                            <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{item.q}"</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* 2. 날짜 디바이더 (사용자가 메시지를 보냈을 때에만 노출) */}
        {messages.filter(m => m.id !== 'welcome').length > 0 && (
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            <span style={{ fontSize: '0.75rem', color: COLORS.textSub, whiteSpace: 'nowrap' }}>
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          </div>
        )}

        {messages.filter(m => m.id !== 'welcome').map((msg) => {
          const isSystem = msg.sender === 'system';
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isSystem ? 'flex-start' : 'flex-end', width: '100%' }}>
              {isSystem ? (
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, maxWidth: msg.id === 'welcome' ? '92%' : '85%' }}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    {/* Kello 동그란 K캐릭터 프로필 아이콘 */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      border: `1px solid #FFE4E6`,
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      marginTop: 2
                    }}>
                      <img
                        src="/images/talk/kello_character.png"
                        alt="K"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', filter: 'brightness(1.02) contrast(1.02)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ background: isKello ? '#FFF5F7' : COLORS.bubble.system, color: COLORS.bubble.systemText, padding: '10px 16px', borderRadius: '4px 20px 20px 20px', fontSize: msg.id === 'welcome' ? '0.81rem' : '0.85rem', textAlign: 'left', position: 'relative' }}>
                        {(isStaffShowMode || (msg.translated && !msg.isTranslating)) && (
                          <div style={{ position: 'absolute', top: -10, right: -10, opacity: (isStaffShowMode || hoveredMessageId === msg.id) ? 1 : 0, transition: 'opacity 0.2s', zIndex: 10 }}>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setStaffModalText(isStaffShowMode ? (msg.original || '') : (msg.translated || '')); setShowStaffModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }} title={t("talk_ui.large_view")}>
                              <Maximize2 size={14} color={isStaffShowMode ? COLORS.primary : "#F59E0B"} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                        {msg.imageUrl && (
                          <div style={{ marginBottom: 4 }}>
                            <img src={msg.imageUrl} alt="attached" style={{ maxWidth: '100%', borderRadius: 8, objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontWeight: 700, textAlign: 'left', wordBreak: 'break-word', whiteSpace: 'pre-wrap', flex: 1 }}>
                            {msg.translated || (msg.isTranslating ? <TranslatingDots /> : msg.original)}
                          </div>
                          {isStaffShowMode && msg.translated && (
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleTextToSpeech(msg.translated!, sourceLocale); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }} title={t("talk_ui.listen_aria")}>
                              <Volume2 size={16} color={COLORS.textSub} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>

                        {isStaffShowMode && (
                          <StaffPinkTranslationArea
                            originalText={msg.original || ''}
                            fallbackText={msg.translated || ''}
                            handleTTS={handleTextToSpeech}
                          />
                        )}

                        {msg.mapQuery && (
                          <div style={{ marginTop: 8, borderTop: '1px dashed rgba(255, 77, 130, 0.15)', paddingTop: 8, display: 'flex', justifyContent: 'flex-start' }}>
                            <button
                              type="button"
                              onClick={() => router.push(`/explore?q=${encodeURIComponent(msg.mapQuery!)}`)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                borderRadius: '12px',
                                border: '1px solid #FFE4E6',
                                background: '#FFFFFF',
                                color: COLORS.primary,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#FFF5F7';
                                e.currentTarget.style.borderColor = COLORS.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FFFFFF';
                                e.currentTarget.style.borderColor = '#FFE4E6';
                              }}
                            >
                              <MapPin size={12} strokeWidth={2.5} />
                              지도에서 위치 확인하기 &gt;
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 2, marginLeft: 2 }}>
                      <span style={{ fontSize: '0.65rem', color: COLORS.textSub, whiteSpace: 'nowrap' }}>
                        {msg.timestamp ? msg.timestamp.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) : new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, maxWidth: '85%' }}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingBottom: 2, marginRight: 2, marginBottom: 33 }}>
                      <span style={{ fontSize: '0.65rem', color: COLORS.textSub, whiteSpace: 'nowrap' }}>
                        {msg.timestamp ? msg.timestamp.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) : new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div
                        style={{
                          background: COLORS.bubble.visitor,
                          padding: '12px 16px',
                          borderRadius: '16px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                          border: `1px solid ${COLORS.border}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          minWidth: 180,
                          position: 'relative',
                          textAlign: 'left'
                        }}
                      >
                        {isStaffShowMode && msg.translated && !msg.isTranslating && (
                          <div style={{ position: 'absolute', top: -10, left: -10, zIndex: 10 }}>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setStaffModalText(msg.translated || ''); setShowStaffModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }} title={t("talk_ui.large_view")}>
                              <Maximize2 size={14} color={COLORS.primary} strokeWidth={2.5} style={{ transform: 'rotate(90deg)' }} />
                            </button>
                          </div>
                        )}
                        {msg.imageUrl && (
                          <div style={{ marginBottom: msg.original ? 4 : 0 }}>
                            <img src={msg.imageUrl} alt="attached" style={{ maxWidth: '100%', borderRadius: 8, objectFit: 'cover', display: 'block' }} />
                          </div>
                        )}
                        {msg.original ? (
                          msg.isTranslating ? (
                            <div style={{ padding: '8px 4px' }}><TranslatingDots /></div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#111', flex: 1, wordBreak: 'break-word', lineHeight: 1.4 }}>
                                  {isStaffShowMode ? msg.original : (msg.translated || msg.original)}
                                </span>
                                {isStaffShowMode && (!isStaffShowMode || !msg.translated) && (
                                  <button type="button" onMouseDown={(e) => { e.preventDefault(); handleTextToSpeech(msg.translated || msg.original, targetLocale); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }} title={t("talk_ui.listen_aria")}>
                                    <Volume2 size={16} color={COLORS.textSub} strokeWidth={2.5} />
                                  </button>
                                )}
                              </div>
                              {isStaffShowMode && (
                                <StaffPinkTranslationArea
                                  originalText={msg.original || ''}
                                  fallbackText={msg.translated || ''}
                                  handleTTS={handleTextToSpeech}
                                />
                              )}
                              {!isStaffShowMode && msg.original && msg.original !== msg.translated && (
                                <div style={{ fontSize: '0.75rem', color: COLORS.textSub, wordBreak: 'break-word', paddingLeft: 2, marginTop: 4 }}>
                                  {msg.original}
                                </div>
                              )}
                            </>
                          )
                        ) : null}

                      </div>
                      <div style={{
                        display: 'flex',
                        gap: 4,
                        marginTop: 4,
                        opacity: hoveredMessageId === msg.id ? 1 : 0,
                        pointerEvents: hoveredMessageId === msg.id ? 'auto' : 'none',
                        transition: 'opacity 0.15s',
                        background: 'rgba(255,255,255,0.92)',
                        borderRadius: 12,
                        padding: '3px 5px',
                        boxShadow: hoveredMessageId === msg.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                        alignSelf: 'flex-end',
                      }}>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setConfirmModal({ isOpen: true, type: 'edit', messageId: msg.id }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }} aria-label={t("talk_ui.edit_action")}>
                          <Pencil size={15} color={COLORS.textSub} strokeWidth={2.5} />
                        </button>
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setConfirmModal({ isOpen: true, type: 'delete', messageId: msg.id }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }} aria-label={t("talk_ui.delete_action")}>
                          <Trash2 size={15} color={COLORS.textSub} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* 구글 동그란 프로필 대신 사람 실루엣 혹은 연동된 마이프로필 아이콘 */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      marginTop: 2
                    }}>
                      {userAvatarUrl ? (
                        <img
                          src={userAvatarUrl}
                          alt="Profile"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#B8913A', width: '55%', height: '55%', display: 'block' }}>
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </section>

      {/* Input Area */}
      <footer
        style={{
          position: 'relative',
          padding: '14px 4px 10px 4px',
          background: COLORS.header,
          borderTop: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        {/* Toggle Button Overlapping Section Top Line */}
        {isStaffShowMode && (
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            style={{
              position: 'absolute',
              top: -11,
              left: '50%',
              transform: 'translateX(-50%)',
              background: COLORS.header,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '12px',
              width: 36,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: COLORS.textSub,
              zIndex: 10,
              boxShadow: '0 -2px 4px rgba(0,0,0,0.02)',
            }}
            title={showSuggestions ? t("talk_ui.collapse") : t("talk_ui.expand")}
          >
            <ChevronLeft size={14} style={{ transform: showSuggestions ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
          </button>
        )}

        {isStaffShowMode && showSuggestions && (
          <div ref={suggestionsRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, paddingBottom: 4 }}>
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8 }}>
              {/* Suggestions Container - Kept as horizontal scroll in both modes */}
              <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  flex: 1,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}
              >
                {/* Left Arrow Button */}
                {isHovered && (
                  <button
                    type="button"
                    onClick={() => handleScroll('left')}
                    style={{
                      position: 'absolute',
                      left: 4,
                      zIndex: 30,
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                      color: COLORS.textMain,
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)'; }}
                  >
                    &lt;
                  </button>
                )}

                <div
                  ref={scrollRef}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    paddingRight: 4,
                    paddingTop: 6,
                    paddingBottom: 6,
                    scrollBehavior: 'smooth'
                  }}
                >
                  {[0, 1].map(rowIndex => (
                    <div key={rowIndex} style={{ display: 'flex', gap: 8, width: 'max-content', alignItems: 'center' }}>
                      {rowIndex === 0 && (
                        <button
                          type="button"
                          onClick={() => setIsEditingSuggestions(!isEditingSuggestions)}
                          style={{
                            background: isEditingSuggestions ? COLORS.primary : '#FFFFFF',
                            color: isEditingSuggestions ? '#FFF' : COLORS.textSub,
                            border: `1px solid ${isEditingSuggestions ? COLORS.primary : COLORS.border}`,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: isEditingSuggestions ? 'default' : 'pointer', // 클릭 후 호버시 흰색 손가락 커서 안 뜨게 default 고정
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                          title={t("talk_ui.manage_phrases")}
                        >
                          <Settings size={14} />
                        </button>
                      )}
                      {quickSuggestions.filter((_, i) => i % 2 === rowIndex).map((text) => {
                        const IconComponent = SUGGESTION_ICONS[text] || Smile;
                        const originalIndex = quickSuggestions.indexOf(text);
                        const isOver = draggedOverIndex === originalIndex && draggedIndex !== originalIndex;
                        return (
                          <div
                            key={text}
                            draggable={isEditingSuggestions}
                            onDragStart={(e) => handleDragStart(e, originalIndex)}
                            onDragOver={(e) => handleDragOver(e, originalIndex)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, originalIndex)}
                            style={{
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              flexShrink: 0,
                              opacity: draggedIndex === originalIndex ? 0.4 : 1,
                              cursor: isEditingSuggestions ? 'default' : 'pointer',
                            }}
                          >
                            {/* 드래그 오버 시 삽입 위치 세로막대 미리보기 */}
                            {isOver && (
                              <div style={{
                                width: 4,
                                height: 32,
                                backgroundColor: COLORS.primary,
                                borderRadius: 2,
                                marginRight: 6,
                                animation: 'pulse 1s infinite',
                                flexShrink: 0
                              }} />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!isEditingSuggestions) {
                                  setInputText(text);
                                }
                              }}
                              style={{
                                background: '#FFFFFF',
                                color: COLORS.textMain,
                                border: `1px solid ${isEditingSuggestions && isOver ? COLORS.primary : COLORS.border}`,
                                borderRadius: '20px',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                cursor: isEditingSuggestions ? 'default' : 'pointer', // 클릭 후 호버시 흰색 손가락 커서 안 뜨게 default 고정
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                              }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', color: COLORS.primary }}>
                                <IconComponent size={16} strokeWidth={2} />
                              </span>
                              <span>{text}</span>
                            </button>
                            {isEditingSuggestions && (
                              <button
                                type="button"
                                onClick={() => setQuickSuggestions(prev => prev.filter(s => s !== text))}
                                style={{
                                  position: 'absolute',
                                  right: -4,
                                  top: -6,
                                  background: '#FFFFFF',
                                  border: '1px solid #EF4444',
                                  borderRadius: '50%',
                                  width: 16,
                                  height: 16,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                  zIndex: 20
                                }}
                                title={t('talk_ui.delete')}
                              >
                                <X size={10} strokeWidth={3.5} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Right Arrow Button */}
                {isHovered && (
                  <button
                    type="button"
                    onClick={() => handleScroll('right')}
                    style={{
                      position: 'absolute',
                      right: 4,
                      zIndex: 30,
                      background: 'rgba(255, 255, 255, 0.75)',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                      color: COLORS.textMain,
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)'; }}
                  >
                    &gt;
                  </button>
                )}
              </div>
            </div>

            {/* Edit Input (Below if active) */}
            {isEditingSuggestions && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4, padding: '0 4px' }}>
                <input
                  type="text"
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSuggestion.trim()) {
                      setQuickSuggestions(prev => [...prev, newSuggestion.trim()]);
                      setNewSuggestion('');
                    }
                  }}
                  placeholder={t("talk_ui.new_phrase_placeholder")}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '16px', border: `1px solid ${COLORS.border}`, fontSize: '0.8rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSuggestion.trim()) {
                      setQuickSuggestions(prev => [...prev, newSuggestion.trim()]);
                      setNewSuggestion('');
                    }
                  }}
                  style={{ background: COLORS.primary, color: '#fff', border: 'none', borderRadius: '16px', padding: '0 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('talk_ui.add_phrase', { defaultValue: 'Add' })}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Live Translation Preview */}
        {isStaffShowMode && inputText.trim() && (
          <div style={{
            background: COLORS.primaryLight,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 8,
            fontSize: '0.85rem',
            color: COLORS.primary,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ flex: 1, marginRight: 8 }}>{t('talk_ui.translation_label')}: {liveTranslation || t('talk_ui.translating')}</span>
            <button
              type="button"
              onClick={() => {
                if (liveTranslation) {
                  setStaffModalText(liveTranslation);
                  setShowStaffModal(true);
                }
              }}
              style={{
                background: COLORS.primary,
                color: '#FFF',
                border: 'none',
                borderRadius: 12,
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('common.actions.view', { defaultValue: 'View' })}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 5 }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: COLORS.primary, display: 'flex' }} aria-label={t("talk_ui.attach_image")}>
              <Plus size={24} strokeWidth={2} />
            </button>
          </div>

          <form
            onSubmit={handleSend}
            style={{ flex: 1, display: 'flex', alignItems: 'flex-end', background: COLORS.bg, borderRadius: 20, padding: '6px 6px 6px 14px', border: `1px solid ${COLORS.border}`, gap: 8 }}
          >
            <button type="button" onClick={startSpeechRecognition} style={{ background: 'none', border: 'none', padding: 2, paddingBottom: 5, cursor: 'pointer', color: isRecording ? '#EF4444' : COLORS.primary, display: 'flex' }} aria-label={t("talk_ui.voice_input")}><Mic size={20} strokeWidth={2} /></button>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = '24px';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as any);
                }
              }}
              placeholder={t("talk_ui.message_placeholder")}
              disabled={isSending}
              rows={1}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', color: COLORS.textMain, minWidth: 0, resize: 'none', height: 24, padding: '3px 0', fontFamily: 'inherit', lineHeight: '18px', overflowY: 'auto' }}
            />

            <div style={{ position: 'relative', display: 'flex' }}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ background: 'none', border: 'none', padding: 2, paddingBottom: 5, cursor: 'pointer', color: COLORS.textSub, display: 'flex' }}
                aria-label={t("talk_ui.emoji")}
              >
                <Smile size={20} strokeWidth={1.5} />
              </button>
              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '32px',
                  right: '0px',
                  background: '#FFFFFF',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  padding: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  display: 'flex',
                  gap: '6px',
                  zIndex: 1000,
                  whiteSpace: 'nowrap'
                }}>
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(emoji)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.25rem',
                        cursor: 'pointer',
                        padding: '4px',
                        transition: 'transform 0.1s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              style={{
                background: inputText.trim() && !isSending ? COLORS.sendEnabled : COLORS.sendDisabled,
                border: 'none',
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() && !isSending ? 'pointer' : 'not-allowed',
                color: '#fff',
                transition: 'background 0.2s',
                flexShrink: 0
              }}
              aria-label={t("talk_ui.send_aria")}
            >
              <Send size={16} style={{ marginLeft: 2, marginTop: 1 }} strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </footer>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            padding: '16px',
            borderRadius: '16px',
            width: '80%',
            maxWidth: '290px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 600, color: COLORS.textMain }}>
              {confirmModal.type === 'edit' ? t('talk_ui.edit_message') : t('talk_ui.delete_message')}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: COLORS.textSub, lineHeight: 1.4, wordBreak: 'keep-all' }}>
              {confirmModal.type === 'edit'
                ? t('talk_ui.edit_confirm')
                : t('talk_ui.delete_confirm')}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModal({ isOpen: false, type: null, messageId: null })}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${COLORS.border}`,
                  background: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: COLORS.textSub,
                  cursor: 'pointer',
              }}
            >
                {t('common.actions.cancel', { defaultValue: '취소' })}
              </button>
              <button
                onClick={handleConfirmAction}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: COLORS.primary,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
              }}
            >
                {t('common.actions.confirm', { defaultValue: '확인' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Screen Card Modal */}
      {showStaffModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#FDFDF5',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}>
          {/* Scrollable Content Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 24px 16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStaffModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: COLORS.textSub,
                  padding: 8,
                }}
                aria-label={t("talk_ui.close_aria")}
              >
                <X size={28} />
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: 250 }}>
              <div style={{
                background: '#FFFFFF',
                border: `2px solid ${COLORS.primary}`,
                borderRadius: 24,
                padding: '40px 24px',
                width: '100%',
                boxShadow: '0 12px 40px rgba(184, 145, 58, 0.12)',
                boxSizing: 'border-box',
                position: 'relative',
              }}>
                <button
                  type="button"
                  onClick={() => handleTextToSpeech(staffModalText, targetLocale)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 20,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: COLORS.primary,
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                  title={t("talk_ui.listen_aria")}
                >
                  <Volume2 size={24} strokeWidth={2.5} />
                </button>

                <p style={{
                  margin: '0 0 24px 0',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: COLORS.primary,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  {t('talk_page.show_to_staff', { defaultValue: 'Show to staff' })}
                </p>

                <h2 style={{
                  margin: 0,
                  fontSize: '2.2rem',
                  fontWeight: 800,
                  color: COLORS.textMain,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}>
                  {staffModalText}
                </h2>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Button with Safe Area Padding */}
          <div style={{ padding: '0 24px 24px 24px' }}>
            <button
              onClick={() => setShowStaffModal(false)}
              style={{
                width: '100%',
                background: COLORS.primary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 16,
                padding: '16px',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(184, 145, 58, 0.2)',
              }}
            >
              {t('common.actions.go_back', { defaultValue: 'Go Back' })}
            </button>
          </div>
        </div>
      )}

      {/* Link Selector Modal */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '16px',
            width: '85%',
            maxWidth: '340px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh',
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: COLORS.textMain, textAlign: 'center' }}>
              뷰티 매장 연결하기
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: COLORS.textSub, textAlign: 'center', lineHeight: 1.4 }}>
              제휴된 뷰티 매장을 연결하여 대화할 수 있습니다.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: COLORS.textSub,
                fontSize: '0.8rem',
                lineHeight: 1.5
              }}>
                현재 연결 가능한 뷰티 매장이 없습니다.<br />곧 제휴 매장이 연결될 예정입니다.
              </div>
            </div>

            <button
              onClick={() => setShowLinkModal(false)}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '10px',
                borderRadius: 10,
                border: 'none',
                background: COLORS.primaryLight,
                color: COLORS.primary,
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('common.actions.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      )}


      {/* Shop Context Menu Modal */}
      {shopContextMenu && (
        <div
          style={{
            position: 'fixed',
            top: shopContextMenu.y,
            left: shopContextMenu.x - 100,
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            borderRadius: 12,
            padding: 8,
            zIndex: 2001,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 150,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { toggleShopPin(shopContextMenu.shopId); setShopContextMenu(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: COLORS.textMain, borderRadius: 8, transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = COLORS.primaryLight}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <Pin size={14} />
            {pinnedShops.includes(shopContextMenu.shopId) ? t('talk_ui.unpin_message') : t('talk_ui.pin_message')}
          </button>
          <button
            onClick={() => { toggleShopMute(shopContextMenu.shopId); setShopContextMenu(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: COLORS.textMain, borderRadius: 8, transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = COLORS.primaryLight}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <BellOff size={14} />
            {mutedShops.includes(shopContextMenu.shopId) ? t('talk_ui.notifications_on') : t('talk_ui.notifications_off')}
          </button>
          <button
            onClick={() => { leaveShopRoom(shopContextMenu.shopId); setShopContextMenu(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', color: '#EF4444', borderRadius: 8, transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <LogOut size={14} />
            {t('talk_ui.leave_chat')}
          </button>
        </div>
      )}

      {/* Drawing Modal */}
      {drawingImage && (
        <DrawingModal
          imageUrl={drawingImage}
          onClose={() => setDrawingImage(null)}
          onSend={(drawnImageUrl) => {
            const id = Date.now().toString();
            setMessages((prev) => [...prev, { id, sender: 'visitor', original: '', imageUrl: drawnImageUrl, timestamp: new Date() }]);
            setDrawingImage(null);

            if (shopId === 'kello-center') {
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  { id: `kello-reply-${Date.now()}`, sender: 'system', original: sourceLocale === 'ko' ? '사진을 확인했어요! 어떤 도움이 필요하신가요?' : 'I checked the photo! How can I help you?', timestamp: new Date(), read: true }
                ]);
              }, 1000);
            }
          }}
        />
      )}
    </div>
  );
}

function TranslatingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.primary, animation: `dotBounce 1s ${i * 0.2}s infinite`, display: 'inline-block' }}
        />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </span>
  );
}


