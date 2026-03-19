'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useTrip } from '@/lib/contexts/TripContext';
import { MOCK_ITEMS } from './explore/mock/data';

import LanguagePicker from './components/LanguagePicker';
import CurrencySelector from './components/CurrencySelector';
import WeatherWidget from './components/WeatherWidget';
import styles from './home.module.css';
import ExploreMap from './explore/components/ExploreMap';

type BeautyCategoryId = 'hair' | 'nail' | 'esthetic' | 'waxing' | 'makeup' | 'lash';

type BeautyCategoryOption = {
  id: BeautyCategoryId;
  code: string;
  label: string;
  english: string;
  note: string;
  summary: string;
};

const BEAUTY_CATEGORY_OPTIONS: BeautyCategoryOption[] = [
  {
    id: 'hair',
    code: 'HAIR',
    label: '헤어',
    english: 'Hair',
    note: '커트, 펌, 염색, 드라이',
    summary: '스타일 체인지부터 가벼운 손질까지 가장 빠르게 예약을 시작할 수 있어요.',
  },
  {
    id: 'nail',
    code: 'NAIL',
    label: '네일',
    english: 'Nail',
    note: '젤네일, 케어, 연장',
    summary: '원하는 무드와 디자인을 정하고 가볍게 예약 단계로 넘어갈 수 있어요.',
  },
  {
    id: 'esthetic',
    code: 'CARE',
    label: '에스테틱',
    english: 'Esthetic',
    note: '피부관리, 윤곽, 진정 케어',
    summary: '피부 상태와 원하는 관리 목적에 맞춰 매장을 비교하고 예약할 수 있어요.',
  },
  {
    id: 'waxing',
    code: 'WAX',
    label: '왁싱',
    english: 'Waxing',
    note: '페이스, 바디, 브라질리언',
    summary: '부위와 일정에 맞는 매장을 빠르게 찾고 예약 흐름으로 이어집니다.',
  },
  {
    id: 'makeup',
    code: 'MAKE',
    label: '메이크업',
    english: 'Makeup',
    note: '데일리, 촬영, 웨딩',
    summary: '행사 일정에 맞는 메이크업 서비스를 선택하고 바로 예약을 시작할 수 있어요.',
  },
  {
    id: 'lash',
    code: 'LASH',
    label: '속눈썹',
    english: 'Lash',
    note: '연장, 펌, 언더래쉬',
    summary: '자연스러운 연장부터 볼륨 스타일링까지 원하는 메뉴로 바로 연결됩니다.',
  },
];

const MOCK_PLACES = [
  { title: '롯데백화점 본점', area: '서울특별시 중구 남대문로 81', lat: 37.5647, lng: 126.9818 },
  { title: '롯데월드타워', area: '서울특별시 송파구 올림픽로 300', lat: 37.5125, lng: 127.1025 },
  { title: '롯데월드 어드벤처', area: '서울특별시 송파구 올림픽로 240', lat: 37.5111, lng: 127.0982 },
  { title: '롯데호텔 서울', area: '서울특별시 중구 을지로 30', lat: 37.5657, lng: 126.9808 },
  { title: '남산타워 (N서울타워)', area: '서울특별시 용산구 남산공원길 105', lat: 37.5512, lng: 126.9882 },
  { title: '남대문 시장', area: '서울특별시 중구 남대문시장4길 21', lat: 37.5591, lng: 126.9776 },
  { title: '경복궁', area: '서울특별시 종로구 사직로 161', lat: 37.5796, lng: 126.9770 },
  { title: '명동 예술극장', area: '서울특별시 중구 명동길 35', lat: 37.5645, lng: 126.9845 }
];

const ASSURANCE_ITEMS = [
  {
    title: '한눈에 카테고리 선택',
    description: '첫 화면에서 원하는 서비스를 먼저 고르고 예약 흐름으로 바로 진입합니다.',
  },
  {
    title: '언어 걱정 없는 예약',
    description: '필요할 때 실시간 통역 도우미로 매장과 자연스럽게 대화할 수 있습니다.',
  },
  {
    title: '모바일 우선 예약 동선',
    description: '한 손으로도 선택하기 쉬운 카드형 버튼과 큰 CTA로 전환을 높였습니다.',
  },
];

export default function HomePage() {
  const { t, i18n } = useTranslation('common');
  const { tripStatus, itinerary, setItinerary, setTripDays } = useTrip();
  const router = useRouter();

  const hasSupabaseAuth = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const [input, setInput] = useState('');
  const [days, setDays] = useState(3);
  const [activeValueIdx, setActiveValueIdx] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BeautyCategoryId | null>(null);

  // Navigation Sheet States
  const [openNavSheet, setOpenNavSheet] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navigation Search States
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSearchingInSheet, setIsSearchingInSheet] = useState(false);
  const [sheetSearchResults, setSheetSearchResults] = useState<any[]>([]);
  const [loadingNav, setLoadingNav] = useState(false);

  // Merge MOCK_PLACES with MOCK_ITEMS for broader search
  const ALL_SEARCH_ITEMS = useMemo(() => {
    const items = MOCK_ITEMS.map(i => {
      // Get current language translation
      const transTitle = t(`explore_items.${i.id}.title`, { defaultValue: i.title });
      const transArea = t(`explore_items.${i.id}.area`, { defaultValue: i.area });

      return {
        id: i.id,
        title: transTitle !== `explore_items.${i.id}.title` ? transTitle : i.title,
        area: transArea !== `explore_items.${i.id}.area` ? transArea : i.area,
        searchTerms: [i.title, transTitle, i.area, transArea].join(' ').toLowerCase(),
        lat: i.lat || 37.5665,
        lng: i.lng || 126.9780
      };
    });

    const mappedPlaces = MOCK_PLACES.map(p => ({
      ...p,
      searchTerms: [p.title, p.area].join(' ').toLowerCase()
    }));

    return [...mappedPlaces, ...items];
  }, [t]);

  // Typing suggestions disabled as requested
  useEffect(() => {
    setShowSuggestions(false);
  }, [input]);

  const handleSelectPlace = async (place: any) => {
    // If it's a Google Place (prediction), fetch details for coordinates
    if (place.placeId && !place.lat) {
      setLoadingNav(true);
      try {
        const lang = i18n.language || 'en';
        const res = await fetch(`/api/places/details?placeId=${place.placeId}&language=${lang}`);
        const data = await res.json();
        if (data && data.location) {
          const selected = {
            title: data.displayName?.text || place.title,
            area: data.formattedAddress || place.area,
            lat: data.location.latitude,
            lng: data.location.longitude
          };
          setSelectedDest(selected);
          setIsSearchingInSheet(false);
          setOpenNavSheet(true);
        }
      } catch (err) {
        console.error('Failed to get place details', err);
      } finally {
        setLoadingNav(false);
      }
    } else {
      setSelectedDest(place);
      setIsSearchingInSheet(false);
      setOpenNavSheet(true);
    }
  };

  // Get next destination for navigation
  const nextDest = itinerary.find(item => item.status === 'confirmed');

  // The effective destination for the sheet
  const destInfo = useMemo(() => {
    if (selectedDest) {
      return {
        name: selectedDest.title,
        nameKo: selectedDest.area || selectedDest.title,
        lat: selectedDest.lat || 37.5665,
        lng: selectedDest.lng || 126.9780,
        travelMinutes: 20
      };
    }
    if (nextDest) {
      return {
        name: nextDest.name,
        nameKo: (nextDest as any).location || nextDest.name,
        lat: nextDest.lat,
        lng: nextDest.lng,
        travelMinutes: 20
      };
    }
    return {
      name: 'Gyeongbokgung Palace',
      nameKo: '서울특별시 종로구 사직로 161',
      lat: 37.5796,
      lng: 126.9770,
      travelMinutes: 15
    };
  }, [selectedDest, nextDest]);

  const navSearchResults = useMemo(() => {
    if (!navSearchQuery.trim()) return [];
    return MOCK_ITEMS.filter(item =>
      item.title.toLowerCase().includes(navSearchQuery.toLowerCase()) ||
      item.area.toLowerCase().includes(navSearchQuery.toLowerCase())
    ).slice(0, 5);
  }, [navSearchQuery]);

  const VALUE_PROPS = [
    {
      icon: '🗺️',
      key: 'navigation',
      path: '/navigation',
      label: tripStatus !== 'idle' ? t(`fab.${tripStatus.replace('-', '_')}`, { defaultValue: t('home.value_props.navigation.title') }) : t('home.value_props.navigation.title')
    },
    { icon: '🎫', key: 'booking', path: '/explore', label: t('home.value_props.booking.title') },
    { icon: '🗓️', key: 'itinerary', path: '/planner', label: t('home.value_props.itinerary.title') },
  ];

  const RECOMMENDED_PLANS = [
    {
      id: 'plan-2d',
      duration: 2,
      title: t('home.plans.2d.title', { defaultValue: '2 Days: Seoul Essential' }),
      label: t('home.plans.2d.label', { defaultValue: '2 Days' }),
      icon: '⚡',
      items: [
        { id: 'p1-1', name: t('explore_items.airport_arrival', { defaultValue: 'Incheon Airport Arrival' }), time: '10:00', lat: 37.4602, lng: 126.4407, day: 1, slot: 'am', status: 'confirmed', type: 'attraction', area: 'Incheon', price: '0', desc: 'Welcome to Korea' },
        { id: 'p1-2', name: t('explore_items.hotel_checkin', { defaultValue: 'Conrad Seoul (Hotel)' }), time: '13:00', lat: 37.5252, lng: 126.9254, day: 1, slot: 'pm', status: 'confirmed', type: 'attraction', area: 'Yeouido', price: '300,000', desc: 'Luxury stay' },
        { id: 'f2', name: t('explore_items.f2.title', { defaultValue: 'Gold Pig BBQ (Dinner)' }), time: '18:30', lat: 37.5540, lng: 127.0140, day: 1, slot: 'night', status: 'draft', type: 'food', area: 'Yaksu', price: '20,000' },
        { id: 'a1', name: t('explore_items.a1.title', { defaultValue: 'Gyeongbokgung Palace' }), time: '10:00', lat: 37.5796, lng: 126.9770, day: 2, slot: 'am', status: 'draft', type: 'attraction', area: 'Jongno', price: '3,000' },
        { id: 'b1', name: t('explore_items.b1.title', { defaultValue: 'Jenny House Beauty' }), time: '14:30', lat: 37.5240, lng: 127.0440, day: 2, slot: 'pm', status: 'draft', type: 'beauty', area: 'Cheongdam', price: '150,000' }
      ]
    },
    {
      id: 'plan-3d',
      duration: 3,
      title: t('home.plans.3d.title', { defaultValue: '3 Days: K-Culture & Style' }),
      label: t('home.plans.3d.label', { defaultValue: '3 Days' }),
      icon: '✨',
      items: [
        { id: 'p2-1', name: t('explore_items.airport_arrival', { defaultValue: 'Incheon Airport Arrival' }), time: '09:00', lat: 37.4602, lng: 126.4407, day: 1, slot: 'am', status: 'confirmed', type: 'attraction', area: 'Incheon', price: '0' },
        { id: 'p2-2', name: t('explore_items.hotel_checkin', { defaultValue: 'Hotel in Myeongdong' }), time: '12:00', lat: 37.5635, lng: 126.9837, day: 1, slot: 'pm', status: 'confirmed', type: 'attraction', area: 'Myeongdong', price: '200,000' },
        { id: 'f1', name: t('explore_items.f1.title', { defaultValue: 'Plant Cafe Seoul' }), time: '14:00', lat: 37.5340, lng: 126.9940, day: 1, slot: 'pm', status: 'draft', type: 'food', area: 'Itaewon', price: '15,000' },
        { id: 'e2', name: t('explore_items.e2.title', { defaultValue: 'Nanta Show Myeongdong' }), time: '17:00', lat: 37.5645, lng: 126.9845, day: 1, slot: 'night', status: 'draft', type: 'event', area: 'Myeongdong', price: '40,000' },
        { id: 'a1', name: t('explore_items.a1.title', { defaultValue: 'Gyeongbokgung Palace' }), time: '10:00', lat: 37.5796, lng: 126.9770, day: 2, slot: 'am', status: 'draft', type: 'attraction', area: 'Jongno', price: '3,000' },
        { id: 'b2', name: t('explore_items.b2.title', { defaultValue: 'PPEUM Clinic Gangnam' }), time: '14:00', lat: 37.4980, lng: 127.0276, day: 2, slot: 'pm', status: 'draft', type: 'beauty', area: 'Gangnam', price: '50,000' },
        { id: 'e1', name: t('explore_items.e1.title', { defaultValue: 'PSY Water Show' }), time: '19:00', lat: 37.5148, lng: 127.0736, day: 2, slot: 'night', status: 'draft', type: 'event', area: 'Jamsil', price: '140,000' },
        { id: 'a2', name: t('explore_items.a2.title', { defaultValue: 'Lotte World Tower' }), time: '11:00', lat: 37.5125, lng: 127.1025, day: 3, slot: 'am', status: 'draft', type: 'attraction', area: 'Jamsil', price: '27,000' },
        { id: 'f3', name: t('explore_items.f3.title', { defaultValue: 'Seafood Market' }), time: '14:00', lat: 37.5140, lng: 126.9240, day: 3, slot: 'pm', status: 'draft', type: 'food', area: 'Nampo', price: '40,000' }
      ]
    },
    {
      id: 'plan-5d',
      duration: 5,
      title: t('home.plans.5d.title', { defaultValue: '5 Days: The Grand Tour' }),
      label: t('home.plans.5d.label', { defaultValue: '5 Days' }),
      icon: '🏯',
      items: [
        { id: 'p3-1', name: t('explore_items.airport_arrival', { defaultValue: 'Incheon Airport Arrival' }), time: '10:00', lat: 37.4602, lng: 126.4407, day: 1, slot: 'am', status: 'confirmed', type: 'attraction', area: 'Incheon', price: '0' },
        { id: 'p3-2', name: t('explore_items.hotel_checkin', { defaultValue: 'Stay in Hanok Village' }), time: '14:00', lat: 37.5826, lng: 126.9836, day: 1, slot: 'pm', status: 'confirmed', type: 'attraction', area: 'Jongno', price: '150,000' },
        { id: 'a1', name: t('explore_items.a1.title', { defaultValue: 'Gyeongbokgung Palace' }), time: '10:00', lat: 37.5796, lng: 126.9770, day: 2, slot: 'am', status: 'draft', type: 'attraction', area: 'Jongno', price: '3,000' },
        { id: 'fs1', name: t('explore_items.fs1.title', { defaultValue: 'Seoul Lantern Festival' }), time: '19:00', lat: 37.5724, lng: 126.9768, day: 2, slot: 'night', status: 'draft', type: 'festival', area: 'Gwanghwamun', price: 'Free' },
        { id: 'b1', name: t('explore_items.b1.title', { defaultValue: 'Jenny House Beauty' }), time: '11:00', lat: 37.5240, lng: 127.0440, day: 3, slot: 'am', status: 'draft', type: 'beauty', area: 'Cheongdam', price: '150,000' },
        { id: 'f2', name: t('explore_items.f2.title', { defaultValue: 'Gold Pig BBQ' }), time: '18:00', lat: 37.5540, lng: 127.0140, day: 3, slot: 'night', status: 'draft', type: 'food', area: 'Yaksu', price: '20,000' },
        { id: 'a2', name: t('explore_items.a2.title', { defaultValue: 'Lotte World Tower' }), time: '14:30', lat: 37.5125, lng: 127.1025, day: 4, slot: 'pm', status: 'draft', type: 'attraction', area: 'Jamsil', price: '27,000' },
        { id: 'f1', name: t('explore_items.f1.title', { defaultValue: 'Plant Cafe Seoul' }), time: '12:00', lat: 37.5340, lng: 126.9940, day: 5, slot: 'am', status: 'draft', type: 'food', area: 'Itaewon', price: '15,000' }
      ]
    }
  ];

  const filteredPlans = useMemo(() => {
    return RECOMMENDED_PLANS.filter(p => p.duration === days);
  }, [RECOMMENDED_PLANS, days]);


  useEffect(() => {
    // Read localStorage immediately for fast initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserName(parsed.name);
        } catch (e) { }
      }
    }

    // Keep in sync with Supabase session in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User';
        localStorage.setItem('user', JSON.stringify({ name, email: user.email }));
        setUserName(name);
      } else {
        localStorage.removeItem('user');
        setUserName(null);
      }
    });

    let isMounted = true;
    let unsubscribe = () => {};

    const syncSession = async () => {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;

          if (session?.user) {
            const user = session.user;
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'User';
            setUserName(name);
            return;
          }

          setUserName(null);
        });

        unsubscribe = () => subscription.unsubscribe();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          const user = session.user;
          setUserName(
            user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'User',
          );
          return;
        }

        setUserName(null);
      } catch {
        if (isMounted) {
          setUserName(null);
        }
      }
    };

    void syncSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [hasSupabaseAuth]);

  const handleSignOut = async () => {
    if (!hasSupabaseAuth) return;

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      await supabase.auth.signOut();
    } finally {
      setUserName(null);
    }
  };

  const handleStartBooking = () => {
    if (!selectedCategory) {
      return;
    }

    router.push(`/explore?category=beauty&beautyCategory=${selectedCategory}`);
  };

  const handleOpenInterpreter = () => {
    router.push('/interpreter');
  };

  const selectedOption =
    BEAUTY_CATEGORY_OPTIONS.find((option) => option.id === selectedCategory) ?? null;
  // Safe translation helper
  const homeTrans = (key: string, defaultValue?: string): any => {
    const defaultVal = defaultValue || key;
    return t(`home_new.${key}`, { defaultValue: defaultVal, returnObjects: true });
  };

  // Lock scroll when modal is open
  useEffect(() => {
    if (openNavSheet || isMapOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [openNavSheet, isMapOpen]);

  const handleKRide = () => {
    if (!destInfo) return;
    const address = destInfo.nameKo || destInfo.name;

    const openApp = (sLat?: number, sLng?: number) => {
      let deeplink = `kride://route?dest_lat=${destInfo.lat}&dest_lng=${destInfo.lng}&dest_name=${encodeURIComponent(address)}`;
      if (sLat && sLng) {
        deeplink += `&origin_lat=${sLat}&origin_lng=${sLng}&origin_name=${encodeURIComponent('My Location')}`;
      }

      window.location.href = deeplink;

      setTimeout(() => {
        if (document.hidden) return;
        const ua = navigator.userAgent;
        const isiOS = ua.includes('iPhone') || ua.includes('iPad');
        const isAndroid = ua.includes('Android');

        if (isiOS) {
          window.open('https://apps.apple.com/app/k-ride/id6478148574', '_blank');
        } else if (isAndroid) {
          window.open('https://play.google.com/store/apps/details?id=com.kakaomobility.kride', '_blank');
        }
      }, 2500);
    };

    if (navigator.geolocation) {
      setLoadingNav(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoadingNav(false);
          openApp(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setLoadingNav(false);
          openApp();
        },
        { timeout: 5000 }
      );
    } else {
      openApp();
    }

    setOpenNavSheet(false);
  };

  const handleTransit = (provider: 'kakao' | 'google' = 'google') => {
    if (!destInfo) return;
    const address = destInfo.name || destInfo.nameKo; // Priority to English name for Google
    const lat = destInfo.lat;
    const lng = destInfo.lng;

    const navigateToTransit = (sLat?: number, sLng?: number) => {
      if (provider === 'google') {
        const origin = sLat && sLng ? `${sLat},${sLng}` : 'My Location';
        const lang = i18n.language;
        const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(address)}&travelmode=transit&hl=${lang}`;
        window.open(googleUrl, '_blank');
      } else {
        const appUrl = sLat && sLng
          ? `kakaomap://route?sp=${sLat},${sLng}&ep=${lat},${lng}&by=PUBLICTRANSIT`
          : `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;

        const webUrl = sLat && sLng
          ? `https://map.kakao.com/link/from/My Location,${sLat},${sLng}/to/${encodeURIComponent(destInfo.nameKo)},${lat},${lng}`
          : `https://map.kakao.com/link/to/${encodeURIComponent(destInfo.nameKo)},${lat},${lng}`;

        window.location.href = appUrl;
        setTimeout(() => {
          if (document.hidden) return;
          window.open(webUrl, '_blank');
        }, 2500);
      }
    };

    if (navigator.geolocation) {
      setLoadingNav(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoadingNav(false);
          navigateToTransit(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setLoadingNav(false);
          navigateToTransit();
        },
        { timeout: 5000 }
      );
    } else {
      navigateToTransit();
    }

    setOpenNavSheet(false);
  };

  const handleCopy = useCallback(async () => {
    if (!destInfo) return;
    await navigator.clipboard.writeText(destInfo.nameKo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [destInfo]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const isKo = i18n.language?.startsWith('ko');
    if (hour < 12) return isKo ? '좋은 아침입니다' : 'Good morning';
    if (hour < 18) return isKo ? '좋은 오후입니다' : 'Good afternoon';
    return isKo ? '좋은 저녁입니다' : 'Good evening';
  };

  const handleStart = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) {
      router.push('/explore');
      return;
    }

    setLoadingNav(true);

    // 1. Local Mock Search combining translations
    const localFiltered = ALL_SEARCH_ITEMS.filter(p => {
      const q = trimmedInput.toLowerCase();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.area && p.area.toLowerCase().includes(q)) ||
        (p.searchTerms && p.searchTerms.includes(q))
      );
    });

    let results = [...localFiltered];

    // 2. Global Google Places Search
    try {
      const lang = i18n.language || 'en';
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmedInput, language: lang }),
      });
      const data = await res.json();

      const googleResults = (data.suggestions || []).map((s: any) => ({
        title: s.placePrediction.structuredFormat.mainText.text,
        area: s.placePrediction.structuredFormat.secondaryText?.text || '',
        placeId: s.placePrediction.placeId,
        isGoogle: true
      }));

      results = [...results, ...googleResults];
    } catch (err) {
      console.error('Google Search failed', err);
    }

    setLoadingNav(false);

    if (results.length > 0) {
      setSheetSearchResults(results);
      setIsSearchingInSheet(true);
      setOpenNavSheet(true);
      setSelectedDest(null);
    } else {
      router.push(`/explore?city=${encodeURIComponent(trimmedInput)}&days=${days}`);
    }
  };

  const handleApplyPlan = (plan: any) => {
    const formattedItems = plan.items.map((item: any) => ({
      ...item,
      id: `${plan.id}_${item.id}_${Date.now()}`
    }));
    setTripDays(plan.duration);
    setItinerary(formattedItems);
    router.push('/planner');
  };

  const handleCreateCustomPlan = () => {
    setTripDays(days);
    setItinerary([]); // Start with empty itinerary
    router.push('/planner');
  };

  return (
    <main className={styles.main}>
      <div className={styles.topNav}>
        <LanguagePicker compact />
        <div style={{ flexGrow: 1 }} />
        <WeatherWidget />
        <CurrencySelector />
        {!userName ? (
          <div className={styles.navAuthWrap}>
            <button className={styles.navBtn} onClick={() => router.push('/auth/signup')}>{t('common.signup')}</button>
            <button className={`${styles.navBtn} ${styles.navBtnPrimary}`} onClick={() => router.push('/auth/login')}>{t('common.login')}</button>
          </div>
        ) : (
          <button className={styles.navBtn} onClick={handleSignOut}>
            {userName}님 👋
          </button>
        )}
      </div>

      <div className={styles.backgroundEffects}>
        <div className={styles.orbPurple} />
        <div className={styles.orbBlue} />
      </div>

      <section className={styles.heroSection}>
        <Image src="/kello-logo.png" alt="Kello" width={124} height={28} className={styles.heroLogo} priority />
        <div className={styles.heroEyebrow}>{t('home_beauty.hero.eyebrow')}</div>
        <h1 className={styles.heroTitle}>
          {userName ? (
            <span suppressHydrationWarning>{getGreeting()}, {userName}님! 👋</span>
          ) : (
            t('home_beauty.hero.title')
          )}
        </h1>
        <p className={styles.heroSubtitle}>
          {t('home_beauty.hero.subtitle')}
        </p>
      </section>

      <section className={styles.bookingShell}>
        <div className={styles.bookingCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>{t('home_beauty.booking.step')}</span>
            <h2 className={styles.sectionTitle}>{t('home_beauty.booking.title')}</h2>
            <p className={styles.sectionDescription}>
              {t('home_beauty.booking.description')}
            </p>
          </div>

          <div className={styles.categoryGrid}>
            {BEAUTY_CATEGORY_OPTIONS.map((option) => {
              const isActive = selectedCategory === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.categoryButton} ${isActive ? styles.categoryButtonActive : ''}`}
                  onClick={() => setSelectedCategory(option.id)}
                >
                  <span className={styles.categoryCode}>{option.code}</span>
                  <span className={styles.categoryLabel}>{t(`home_beauty.categories.${option.id}.label`)}</span>
                  <span className={styles.categoryEnglish}>{option.english}</span>
                  <span className={styles.categoryNote}>{t(`home_beauty.categories.${option.id}.note`)}</span>
                </button>
              );
            })}
          </div>

          <section className={styles.inputSection}>
            <div className={styles.inputLabel}>{t('home.input_label')}</div>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>📍</span>
              <input
                className={styles.inputField}
                placeholder={t('home.input_placeholder')}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (e.nativeEvent.isComposing) return;
                    handleStart();
                  }
                }}
              />
              {input && <button className={styles.inputClear} onClick={() => setInput('')}>✕</button>}

              {showSuggestions && suggestions.length > 0 && (
                <div className={styles.suggestions}>
                  {suggestions.map((p, idx) => (
                    <div key={idx} className={styles.suggestionItem} onClick={() => handleSelectPlace(p)}>
                      <span className={styles.suggestIcon}>🏢</span>
                      <div className={styles.suggestText}>
                        <div className={styles.suggestName}>{p.title}</div>
                        <div className={styles.suggestSub}>{p.area}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.daysSliderSection}>
              <div className={styles.daysSliderInfo}>
                <span className={styles.daysLabel}>{t('home.days_label')}</span>
                <span className={styles.daysValue}>{days}{t('common.day_unit', { defaultValue: 'd' })}</span>
              </div>
              <div className={styles.sliderContainer}>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className={styles.daysRangeInput}
                />
                <div className={styles.sliderTicks}>
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <span key={d} className={`${styles.tick} ${days === d ? styles.tickActive : ''}`} onClick={() => setDays(d)}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
            <button className={styles.ctaBtn} onClick={handleStart}>
              <span>{t('home.create_trip_cta')}</span><span className={styles.ctaArrow}>→</span>
            </button>
          </section>

          <div className={styles.selectionPanel}>
            <span className={styles.selectionEyebrow}>{t('home_beauty.selection.eyebrow')}</span>
            {selectedOption ? (
              <div className={styles.selectionRow}>
                <div>
                  <h3 className={styles.selectionTitle}>{t(`home_beauty.categories.${selectedOption.id}.label`)}</h3>
                  <p className={styles.selectionDescription}>{t(`home_beauty.categories.${selectedOption.id}.summary`)}</p>
                </div>
                <div className={styles.selectionTagRow}>
                  <span className={styles.selectionTag}>{t('home_beauty.selection.tags.mobile')}</span>
                  <span className={styles.selectionTag}>{t('home_beauty.selection.tags.comparison')}</span>
                  <span className={styles.selectionTag}>{t('home_beauty.selection.tags.inquiry')}</span>
                </div>
              </div>
            ) : (
              <div className={styles.selectionEmpty}>
                {t('home_beauty.selection.empty')}
              </div>
            )}
          </div>

          <div className={styles.ctaSection}>
            <p className={styles.ctaHint}>
              {t('home_beauty.cta.hint')}
            </p>
            <button
              className={styles.mainCtaBtn}
              type="button"
              disabled={!selectedCategory}
              onClick={handleStartBooking}
            >
              {t('home_beauty.cta.button')}
              <span className={styles.arrowIcon}>→</span>
            </button>
          </div>
        </div>
      </section>

      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>{t('home.recommended_plans', { defaultValue: 'Recommended Trip Plans' })}</h2>
        <div className={styles.featuredGrid}>
          {filteredPlans.map(plan => (
            <button key={plan.id} className={styles.featuredCard} onClick={() => handleApplyPlan(plan)}>
              <span className={styles.featuredIcon}>{plan.icon}</span>
              <div className={styles.planInfo}>
                <span className={styles.featuredLabel}>{plan.label}</span>
                <span className={styles.planTitle}>{plan.title}</span>
              </div>
            </button>
          ))}
          <button
            className={`${styles.featuredCard} ${styles.requestCard}`}
            onClick={handleCreateCustomPlan}
          >
            <span className={styles.featuredIcon}>✍️</span>
            <div className={styles.planInfo}>
              <span className={styles.featuredLabel}>{t('home.plans.request_custom_label', { defaultValue: 'Custom' })}</span>
              <span className={styles.planTitle}>{t('home.plans.request_custom_title', { days, defaultValue: `Create My Own ${days}-Day Plan` })}</span>
            </div>
          </button>
        </div>
      </section>

      <section className={styles.supportSection}>
        <article className={styles.interpreterCard}>
          <span className={styles.interpreterEyebrow}>{t('home_beauty.interpreter.eyebrow')}</span>
          <h2 className={styles.interpreterTitle}>{t('home_beauty.interpreter.title')}</h2>
          <p className={styles.interpreterDescription}>
            {t('home_beauty.interpreter.description')}
          </p>
          <button className={styles.secondaryBtn} type="button" onClick={handleOpenInterpreter}>
            {t('home_beauty.interpreter.button')}
          </button>
        </article>

        <div className={styles.assuranceGrid}>
          {ASSURANCE_ITEMS.map((item, index) => (
            <article key={item.title} className={styles.assuranceCard}>
              <h3 className={styles.assuranceTitle}>{t(`home_beauty.assurance.items.${index}.title`)}</h3>
              <p className={styles.assuranceDescription}>{t(`home_beauty.assurance.items.${index}.desc`)}</p>
            </article>
          ))}
        </div>
      </section>

      {openNavSheet && (
        <div className={styles.overlay} onClick={() => setOpenNavSheet(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            {isSearchingInSheet ? (
              <div className={styles.sheetSearchSection}>
                <div className={styles.sheetHeader} style={{ border: 'none', paddingBottom: '0' }}>
                  <div className={styles.sheetTitle}>검색 결과</div>
                  <div className={styles.sheetSubtitle}>'{input}'에 대한 {sheetSearchResults.length}개의 결과</div>
                </div>
                <div className={styles.sheetResultList} style={{ maxHeight: '65vh', overflowY: 'auto', padding: '0 24px 20px' }}>
                  {sheetSearchResults.map((item, idx) => (
                    <div key={idx} className={styles.searchResultItem} onClick={() => handleSelectPlace(item)}>
                      <span style={{ marginRight: '16px', fontSize: '1.4rem', opacity: 0.7 }}>📍</span>
                      <div style={{ flex: 1 }}>
                        <div className={styles.searchResultTitle}>{item.title}</div>
                        <div className={styles.searchResultArea}>{item.area}</div>
                      </div>
                      <span style={{ color: 'var(--gray-300)', fontSize: '1.2rem' }}>→</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className={styles.sheetHeader}>
                  <div className={styles.sheetTitle}>{destInfo.name}</div>
                  <div className={styles.sheetSubtitle}>{destInfo.nameKo}</div>
                </div>

                <div className={styles.quickChoices} style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <button className={styles.choiceBtn} onClick={() => { setOpenNavSheet(false); setIsMapOpen(true); }} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.choiceIcon}>📍</div>
                    <div className={styles.choiceLabel}>위치 보기</div>
                    <div className={styles.choiceSubText}>지도에서 상세 위치 확인</div>
                  </button>
                  <button className={styles.choiceBtn} onClick={handleKRide}>
                    <div className={styles.choiceIcon}>🚕</div>
                    <div className={styles.choiceLabel}>K.Ride</div>
                    <div className={styles.choiceSubText}>택시 호출하기</div>
                  </button>
                  <button className={styles.choiceBtn} onClick={() => handleTransit('google')}>
                    <div className={styles.choiceIcon}>🚇</div>
                    <div className={styles.choiceLabel}>{t('fab.transit')}</div>
                    <div className={styles.choiceSubText}>Google Maps</div>
                  </button>
                  <button className={styles.choiceBtn} onClick={() => handleTransit('google')} style={{ gridColumn: 'span 2', flexDirection: 'row', padding: '16px' }}>
                    <div className={styles.choiceIcon} style={{ width: '40px', height: '40px', fontSize: '20px' }}>
                      <img src="https://www.google.com/images/branding/product/ico/maps15_bnuw32.ico" width="24" height="24" alt="G" />
                    </div>
                    <div style={{ textAlign: 'left', flex: 1, paddingLeft: '12px' }}>
                      <div className={styles.choiceLabel}>Google Maps Transit</div>
                      <div className={styles.choiceSubText}>글로벌 유저용 다국어 길찾기</div>
                    </div>
                  </button>
                </div>
              </>
            )}

            <div className={styles.footerActions}>
              {destInfo && !isSearchingInSheet && (
                <button className={styles.footerBtn} onClick={handleCopy}>
                  <span>📋 {copied ? t('fab.copy_done') : t('fab.copy')}</span>
                </button>
              )}
              <button className={styles.footerBtn} onClick={() => setOpenNavSheet(false)}>{t('fab.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {isMapOpen && destInfo && (
        <div className={styles.modalOverlay} onClick={() => setIsMapOpen(false)}>
          <div className={styles.mapModal} onClick={e => e.stopPropagation()}>
            <div className={styles.mapModalHeader}>
              <div className={styles.mapModalInfo}>
                <div className={styles.mapModalTitle}>{destInfo.nameKo}</div>
                <div className={styles.mapModalAddr}>{destInfo.name}</div>
              </div>
              <button className={styles.mapCloseBtn} onClick={() => setIsMapOpen(false)}>✕</button>
            </div>
            <div className={styles.mapContainer}>
              {/* @ts-ignore */}
              <ExploreMap
                items={[]}
                center={{ lat: destInfo.lat, lng: destInfo.lng, name: destInfo.nameKo }}
                onItemClick={() => { }}
                zoom={15}
              />
            </div>
          </div>
        </div>
      )}

      {showCard && (
        <div className={styles.overlay} onClick={() => setShowCard(false)}>
          <div className={styles.addressCard} onClick={e => e.stopPropagation()}>
            <div className={styles.cardTitle}>{t('fab.card_modal_title')}</div>
            <div className={styles.cardAddress}>{destInfo.nameKo}</div>
            <div className={styles.cardName}>{destInfo.name}</div>
            <button className={styles.cardCopyBtn} onClick={handleCopy}>{copied ? t('fab.copy_done') : t('fab.copy')}</button>
            <button className={styles.cardCloseBtn} onClick={() => setShowCard(false)}>{t('fab.cancel')}</button>
          </div>
        </div>
      )}

      {loadingNav && (
        <div className={styles.toast} style={{ bottom: '120px', background: 'var(--primary)', color: 'white' }}>
          {t('home.fetching_location', { defaultValue: 'Fetching location...' })}
        </div>
      )}

      <section className={styles.interpreterEntrySection}>
        <div className={styles.interpreterEntryCard}>
          <h2 className={styles.interpreterEntryTitle}>
            {homeTrans('interpreter_entry.title', '실시간 통역 도우미')}
          </h2>
          <p className={styles.interpreterEntryDescription}>
            {homeTrans('interpreter_entry.description', '매장에서 직원과 손쉽게 대화해보세요')}
          </p>
          <button className={styles.mainCtaBtn} onClick={handleOpenInterpreter}>
            {homeTrans('interpreter_entry.cta', '통역기 시작하기')}
          </button>
        </div>
      </section>

      <div style={{ height: 100 }} />
    </main>
  );
}
