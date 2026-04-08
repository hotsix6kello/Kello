'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useTrip, ItineraryItem } from '@/lib/contexts/TripContext';
import type { LegacyBookingDraftFromSkeleton } from '@/lib/bookings/bookingFlowSkeleton/bridge';
import { createMockBookingImageUploadBridgeAdapter } from '@/lib/bookings/bookingFlowSkeleton/mockUploadBridgeAdapter';
import {
  type BookingImageUploadBridgeAdapter,
  type BookingImageUploadBridgeItem,
  type BookingUploadedImageResultCompletion,
} from '@/lib/bookings/bookingFlowSkeleton/uploadedImageResults';
import {
  resolveLegacySubmitStatusCopy,
  resolveLegacySubmitUiState,
} from '@/lib/bookings/bookingFlowSkeleton';
import type { LegacySubmitPreparationResult } from '@/lib/bookings/bookingFlowSkeleton/submitRunner';
import styles from './home.module.css';

interface SheetSearchResult {
  title: string;
  area: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  isGoogle?: boolean;
  [key: string]: unknown;
}

type DraftDebugPanelState = {
  draftReadyPayload: LegacyBookingDraftFromSkeleton | null;
  draftState: HomeBookingDraftDebugState | null;
  updatedAt: string;
};

type SubmitPreparationDebugState = {
  result: LegacySubmitPreparationResult;
  updatedAt: string;
};

type SubmitAttemptDebugState = {
  status: SkeletonSubmitAttemptStatus;
  message: string | null;
  errorSummary: string | null;
  updatedAt: string;
};

// Home Specific Components
import HomeTopNav from './components/home/HomeTopNav';
import HomeHero from './components/home/HomeHero';
import HomeBookingSection from './components/home/HomeBookingSection';

import HomeLocationSheet from './components/home/HomeLocationSheet';
import HomeModals from './components/home/HomeModals';
import HomeInterpreterEntry from './components/home/HomeInterpreterEntry';
import HomeBookingFlowEntry from './components/home/HomeBookingFlowEntry';
import {
  buildHomeBookingSkeletonDebugPanelDisplay,
  shouldShowSkeletonDraftDebugPanel,
} from './components/home/HomeBookingFlowEntry.helpers';
import type {
  HomeBookingSkeletonDebugPanelDisplay,
  HomeBookingSkeletonDebugPanelDisplayInput,
} from './components/home/HomeBookingFlowEntry.helpers';
import type {
  HomeBookingDraftDebugState,
  SkeletonSubmitAttemptStatus,
} from './components/home/HomeBookingFlowEntry.types';

import { 
  BEAUTY_CATEGORY_OPTIONS, 
  BeautyCategoryId
} from './components/home/constants';

const SKELETON_DEBUG_MOCK_UPLOADED_IMAGE_URLS = [
  'https://debug.local/mock-uploaded-image-1.jpg',
];

export default function HomePage() {
  const { t, i18n } = useTranslation('common');
  const { 
    itinerary, 
    selectedCategory: globalCategory,
    setSelectedCategory: setGlobalCategory,
    searchQuery: input,
    setDestinationInfo
  } = useTrip();

  const selectedCategory = globalCategory as BeautyCategoryId | null;
  const setSelectedCategory = setGlobalCategory as (category: BeautyCategoryId | null) => void;

  const router = useRouter();

  const hasSupabaseAuth = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const [userName, setUserName] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Navigation Sheet States
  const [openNavSheet, setOpenNavSheet] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navigation Search States
  const [selectedDest, setSelectedDest] = useState<{ title: string; area: string; lat: number; lng: number } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSearchingInSheet, setIsSearchingInSheet] = useState(false);
  const [sheetSearchResults] = useState<SheetSearchResult[]>([]);
  const [loadingNav, setLoadingNav] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingFlowMode, setBookingFlowMode] = useState<'legacy' | 'skeleton'>('legacy');
  const [isSkeletonFlowEnabled, setIsSkeletonFlowEnabled] = useState(false);
  const [isDraftDebugEnabled, setIsDraftDebugEnabled] = useState(false);
  const skeletonDraftDebugRef = useRef<LegacyBookingDraftFromSkeleton | null>(null);
  const [draftDebugPanelState, setDraftDebugPanelState] = useState<DraftDebugPanelState | null>(null);
  const [submitPreparationDebugState, setSubmitPreparationDebugState] =
    useState<SubmitPreparationDebugState | null>(null);
  const [submitAttemptDebugState, setSubmitAttemptDebugState] =
    useState<SubmitAttemptDebugState | null>(null);
  const [pendingMockImageUploadCompletions, setPendingMockImageUploadCompletions] = useState<
    BookingUploadedImageResultCompletion[]
  >([]);
  const [activeMockImageUploadCompletion, setActiveMockImageUploadCompletion] =
    useState<BookingUploadedImageResultCompletion | null>(null);
  const [bookingStoreContext, setBookingStoreContext] = useState<{
    storeId: string | null;
    storeName: string | null;
    region: string | null;
  }>({
    storeId: null,
    storeName: null,
    region: null,
  });

  // Typing suggestions disabled as requested

  const handleSelectPlace = async (place: { title: string; area: string; lat?: number; lng?: number; placeId?: string }) => {
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
          setDestinationInfo({
            name: selected.title,
            lat: selected.lat,
            lng: selected.lng
          });
          setIsSearchingInSheet(false);
          setOpenNavSheet(true);
        }
      } catch (err) {
        console.error('Failed to get place details', err);
      } finally {
        setLoadingNav(false);
      }
    } else {
      const selected = {
        title: place.title,
        area: place.area,
        lat: place.lat ?? 37.5665,
        lng: place.lng ?? 126.9780
      };
      setSelectedDest(selected);
      setDestinationInfo({
        name: selected.title,
        lat: selected.lat,
        lng: selected.lng
      });
      setIsSearchingInSheet(false);
      setOpenNavSheet(true);
    }
  };

  const nextDest = itinerary.find((item: ItineraryItem) => item.status === 'confirmed');

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
        nameKo: (nextDest as { location?: string; name: string }).location || nextDest.name,
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



  useEffect(() => {
    setIsHydrated(true);
    // 홈 화면 진입 시 카테고리 선택 상태를 초기화하여 강조 색상이 보이지 않도록 함
    setSelectedCategory(null);

    // [추가] URL 파라미터에 booking=true가 있으면 예약 플로우를 즉시 엽니다.
    const params = new URLSearchParams(window.location.search);
    const hasBookingQuery = params.get('booking') === 'true';
    const isSkeletonFlowQuery = hasBookingQuery && params.get('flow') === 'skeleton';
    const isDraftDebugQuery = shouldShowSkeletonDraftDebugPanel({
      isSkeletonFlowEnabled: isSkeletonFlowQuery,
      debugParam: params.get('debug'),
    });
    setBookingFlowMode(isSkeletonFlowQuery ? 'skeleton' : 'legacy');
    setIsSkeletonFlowEnabled(isSkeletonFlowQuery);
    setIsDraftDebugEnabled(isDraftDebugQuery);
    if (!isDraftDebugQuery) {
      setDraftDebugPanelState(null);
      setSubmitPreparationDebugState(null);
      setSubmitAttemptDebugState(null);
    }
    setBookingStoreContext({
      storeId: params.get('store_id'),
      storeName: params.get('business_name'),
      region: params.get('region'),
    });

    if (hasBookingQuery) {
      setIsBookingOpen(true);
      // 필터링된 카테고리가 있다면 설정 (예: 헤어)
      const cat = params.get('category');
      if (cat) setSelectedCategory(cat as BeautyCategoryId);
    }
  }, [setSelectedCategory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserName(parsed.name);
        } catch { }
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        localStorage.setItem('user', JSON.stringify({ name, email: user.email }));
        setUserName(name);
      } else {
        localStorage.removeItem('user');
        setUserName(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [hasSupabaseAuth]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUserName(null);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId as BeautyCategoryId);
    setIsBookingOpen(true);
  };

  const handleOpenInterpreter = () => {
    router.push('/interpreter');
  };

  const handleSkeletonDraftReady = useCallback((draft: LegacyBookingDraftFromSkeleton | null) => {
    skeletonDraftDebugRef.current = draft;
    if (!isDraftDebugEnabled || !draft) {
      return;
    }

    setDraftDebugPanelState((currentState) => ({
      draftReadyPayload: draft,
      draftState: currentState?.draftState ?? null,
      updatedAt: new Date().toISOString(),
    }));
  }, [isDraftDebugEnabled]);

  const handleDraftDebugStateChange = useCallback((draftState: HomeBookingDraftDebugState) => {
    if (!isDraftDebugEnabled) {
      return;
    }

    setDraftDebugPanelState((currentState) => ({
      draftReadyPayload: currentState?.draftReadyPayload ?? null,
      draftState,
      updatedAt: new Date().toISOString(),
    }));
  }, [isDraftDebugEnabled]);

  const handleSubmitPreparationChange = useCallback((result: LegacySubmitPreparationResult) => {
    if (!isDraftDebugEnabled) {
      return;
    }

    setSubmitPreparationDebugState({
      result,
      updatedAt: new Date().toISOString(),
    });
  }, [isDraftDebugEnabled]);

  const handleSubmitAttemptStateChange = useCallback(
    (state: {
      status: SkeletonSubmitAttemptStatus;
      message: string | null;
      errorSummary: string | null;
    }) => {
      if (!isDraftDebugEnabled) {
        return;
      }

      setSubmitAttemptDebugState({
        ...state,
        updatedAt: new Date().toISOString(),
      });
    },
    [isDraftDebugEnabled],
  );

  const mockImageUploadBridgeAdapter: BookingImageUploadBridgeAdapter = useMemo(
    () =>
      createMockBookingImageUploadBridgeAdapter({
        resolveUploadedUrl: (item) =>
          `https://debug.local/mock-bridge-upload/${item.stateKey}/${encodeURIComponent(item.draft.id)}`,
      }),
    [],
  );

  const handleImageUploadBridgeRequest = useCallback(
    (items: BookingImageUploadBridgeItem[]) => {
      if (!isSkeletonFlowEnabled || !isDraftDebugEnabled) {
        return;
      }

      void mockImageUploadBridgeAdapter(items).then((nextCompletions) => {
        if (nextCompletions.length === 0) {
          return;
        }

        setPendingMockImageUploadCompletions((currentQueue) => [
          ...currentQueue,
          ...nextCompletions,
        ]);
      });
    },
    [isDraftDebugEnabled, isSkeletonFlowEnabled, mockImageUploadBridgeAdapter],
  );

  useEffect(() => {
    if (isSkeletonFlowEnabled && isDraftDebugEnabled) {
      return;
    }

    setPendingMockImageUploadCompletions([]);
    setActiveMockImageUploadCompletion(null);
  }, [isDraftDebugEnabled, isSkeletonFlowEnabled]);

  useEffect(() => {
    if (activeMockImageUploadCompletion || pendingMockImageUploadCompletions.length === 0) {
      return;
    }

    const [nextCompletion, ...remainingQueue] = pendingMockImageUploadCompletions;
    setActiveMockImageUploadCompletion(nextCompletion);
    setPendingMockImageUploadCompletions(remainingQueue);
  }, [activeMockImageUploadCompletion, pendingMockImageUploadCompletions]);

  useEffect(() => {
    if (!activeMockImageUploadCompletion) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setActiveMockImageUploadCompletion(null);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [activeMockImageUploadCompletion]);

  const submitDebugUiState = useMemo(() => {
    if (!isSkeletonFlowEnabled || !isDraftDebugEnabled) {
      return null;
    }

    if (!submitPreparationDebugState) {
      return resolveLegacySubmitUiState(null);
    }

    return submitPreparationDebugState.result.uiState;
  }, [isDraftDebugEnabled, isSkeletonFlowEnabled, submitPreparationDebugState]);

  const submitDebugStatusCopy = useMemo(() => {
    if (!isSkeletonFlowEnabled || !isDraftDebugEnabled || !submitDebugUiState) {
      return null;
    }

    return resolveLegacySubmitStatusCopy(submitDebugUiState);
  }, [isDraftDebugEnabled, isSkeletonFlowEnabled, submitDebugUiState]);
  const uploadedImageUrlsOverride =
    isSkeletonFlowEnabled && isDraftDebugEnabled
      ? SKELETON_DEBUG_MOCK_UPLOADED_IMAGE_URLS
      : undefined;
  const skeletonDebugPanelDisplayInput: HomeBookingSkeletonDebugPanelDisplayInput = {
    draftReadyPayload: draftDebugPanelState?.draftReadyPayload,
    draftState: draftDebugPanelState?.draftState,
    updatedAt: draftDebugPanelState?.updatedAt,
    uploadedImageUrlsOverride,
    submitUiState: submitDebugUiState,
    submitStatusCopy: submitDebugStatusCopy,
    submitAttemptState: submitAttemptDebugState,
  };
  const skeletonDebugPanelDisplay: HomeBookingSkeletonDebugPanelDisplay = buildHomeBookingSkeletonDebugPanelDisplay(
    skeletonDebugPanelDisplayInput,
  );

  // body는 globals.css에서 overflow:hidden으로 영구 설정됨
  // JS에서 별도 제어 불필요

  const handleKRide = () => {
    if (!destInfo) return;
    const address = destInfo.nameKo || destInfo.name;
    const openApp = (sLat?: number, sLng?: number) => {
      let deeplink = `kride://route?dest_lat=${destInfo.lat}&dest_lng=${destInfo.lng}&dest_name=${encodeURIComponent(address)}`;
      if (sLat && sLng) deeplink += `&origin_lat=${sLat}&origin_lng=${sLng}&origin_name=${encodeURIComponent('My Location')}`;
      window.location.href = deeplink;
      setTimeout(() => {
        if (document.hidden) return;
        const ua = navigator.userAgent;
        const isiOS = ua.includes('iPhone') || ua.includes('iPad');
        const isAndroid = ua.includes('Android');
        if (isiOS) window.open('https://apps.apple.com/app/k-ride/id6478148574', '_blank');
        else if (isAndroid) window.open('https://play.google.com/store/apps/details?id=com.kakaomobility.kride', '_blank');
      }, 2500);
    };
    if (navigator.geolocation) {
      setLoadingNav(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLoadingNav(false); openApp(pos.coords.latitude, pos.coords.longitude); },
        () => { setLoadingNav(false); openApp(); },
        { timeout: 5000 }
      );
    } else openApp();
    setOpenNavSheet(false);
  };

  const handleTransit = (provider: 'kakao' | 'google' = 'google') => {
    if (!destInfo) return;
    const address = destInfo.name || destInfo.nameKo;
    const { lat, lng } = destInfo;
    const navigateToTransit = (sLat?: number, sLng?: number) => {
      if (provider === 'google') {
        const origin = sLat && sLng ? `${sLat},${sLng}` : 'My Location';
        const lang = i18n.language;
        window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(address)}&travelmode=transit&hl=${lang}`, '_blank');
      } else {
        const appUrl = sLat && sLng ? `kakaomap://route?sp=${sLat},${sLng}&ep=${lat},${lng}&by=PUBLICTRANSIT` : `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;
        const webUrl = sLat && sLng ? `https://map.kakao.com/link/from/My Location,${sLat},${sLng}/to/${encodeURIComponent(destInfo.nameKo)},${lat},${lng}` : `https://map.kakao.com/link/to/${encodeURIComponent(destInfo.nameKo)},${lat},${lng}`;
        window.location.href = appUrl;
        setTimeout(() => { if (!document.hidden) window.open(webUrl, '_blank'); }, 2500);
      }
    };
    if (navigator.geolocation) {
      setLoadingNav(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLoadingNav(false); navigateToTransit(pos.coords.latitude, pos.coords.longitude); },
        () => { setLoadingNav(false); navigateToTransit(); },
        { timeout: 5000 }
      );
    } else navigateToTransit();
    setOpenNavSheet(false);
  };

  const handleCopy = useCallback(async () => {
    if (!destInfo) return;
    await navigator.clipboard.writeText(destInfo.nameKo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [destInfo]);

  if (!isHydrated) {
    return <div className={styles.main} suppressHydrationWarning />;
  }

  return (
    <div className={styles.main}>
      <HomeTopNav 
        userName={userName} 
        onSignOut={handleSignOut} 
        t={t} 
      />

      <HomeHero 
        t={t} 
      />

      <HomeBookingSection 
        categories={BEAUTY_CATEGORY_OPTIONS}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        t={t}
      />





      <HomeLocationSheet 
        isOpen={openNavSheet}
        onClose={() => setOpenNavSheet(false)}
        isSearchingInSheet={isSearchingInSheet}
        input={input}
        sheetSearchResults={sheetSearchResults}
        destInfo={destInfo}
        onSelectPlace={handleSelectPlace}
        onOpenMap={() => { setOpenNavSheet(false); setIsMapOpen(true); }}
        onKRide={handleKRide}
        onTransit={handleTransit}
        onCopy={handleCopy}
        copied={copied}
        t={t}
      />

      <HomeModals 
        isMapOpen={isMapOpen}
        onMapClose={() => setIsMapOpen(false)}
        showCard={showCard}
        onCardClose={() => setShowCard(false)}
        destInfo={destInfo}
        onCopy={handleCopy}
        copied={copied}
        t={t}
      />

      <HomeInterpreterEntry 
        onOpenInterpreter={handleOpenInterpreter}
        t={t}
      />


      {loadingNav && (
        <div className={styles.toast}>
          {t('home.fetching_location', { defaultValue: 'Fetching location...' })}
        </div>
      )}

      <HomeBookingFlowEntry 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialCategory={selectedCategory}
        t={t}
        mode={bookingFlowMode}
        enableSkeletonMode={isSkeletonFlowEnabled}
        storeContext={bookingStoreContext}
        uploadedImageUrls={uploadedImageUrlsOverride}
        onImageUploadBridgeRequest={
          isSkeletonFlowEnabled && isDraftDebugEnabled ? handleImageUploadBridgeRequest : undefined
        }
        completedImageUploadResult={
          isSkeletonFlowEnabled && isDraftDebugEnabled ? activeMockImageUploadCompletion : null
        }
        onDraftReady={isSkeletonFlowEnabled && isDraftDebugEnabled ? handleSkeletonDraftReady : undefined}
        onDraftDebugStateChange={
          isSkeletonFlowEnabled && isDraftDebugEnabled ? handleDraftDebugStateChange : undefined
        }
        onSubmitPreparationChange={
          isSkeletonFlowEnabled && isDraftDebugEnabled ? handleSubmitPreparationChange : undefined
        }
        onSubmitAttemptStateChange={
          isSkeletonFlowEnabled && isDraftDebugEnabled ? handleSubmitAttemptStateChange : undefined
        }
      />

      {isSkeletonFlowEnabled && isDraftDebugEnabled ? (
        <aside
          style={{
            marginTop: 12,
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            background: '#f8fafc',
            padding: 10,
            fontSize: 12,
            color: '#334155',
          }}
        >
          <div style={{ fontWeight: 700 }}>{skeletonDebugPanelDisplay.title}</div>
          {skeletonDebugPanelDisplay.sections.map((section, sectionIndex) => (
            <div
              key={section.key}
              style={{ marginTop: sectionIndex === 0 ? 6 : 8, lineHeight: 1.5 }}
            >
              {section.lines.map((line, lineIndex) => (
                <div key={`${section.key}-${lineIndex}`}>{line}</div>
              ))}
            </div>
          ))}
        </aside>
      ) : null}

    </div>
  );
}
