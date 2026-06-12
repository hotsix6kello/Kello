'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useTrip, ItineraryItem } from '@/lib/contexts/TripContext';
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

// Home Specific Components
import HomeTopNav from './components/home/HomeTopNav';
import HomeHeroBanner from './components/home/HomeHeroBanner';
import HomeHero from './components/home/HomeHero';
import HomeBookingSection from './components/home/HomeBookingSection';

import HomeLocationSheet from './components/home/HomeLocationSheet';
import HomeModals from './components/home/HomeModals';
import HomeBookingFlowEntry from './components/home/HomeBookingFlowEntry';
import WelcomeCouponPopup from './components/home/WelcomeCouponPopup';
import ReferralCodePopup from './components/home/ReferralCodePopup';

import {
  BEAUTY_CATEGORY_OPTIONS,
  BeautyCategoryId
} from './components/home/constants';

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

  const hasSupabaseAuth = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userName, setUserName] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralToast, setReferralToast] = useState<string | null>(null);

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

  // Typing suggestions disabled as requested

  const handleSelectPlace = async (place: { title: string; area: string; lat?: number; lng?: number; placeId?: string }) => {
    if (place.placeId && !place.lat) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t('common.login_required_for_feature'));
        return;
      }

      setLoadingNav(true);
      try {
        const lang = i18n.language || 'en';
        const res = await fetch(`/api/places/details?placeId=${place.placeId}&language=${lang}`, {
          headers: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });
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

    const cat = params.get('category');
    const nextCategory = cat ? (cat as BeautyCategoryId) : null;

    if (hasBookingQuery) {
      setIsBookingOpen(true);
      // 필터링된 카테고리가 있다면 설정 (예: 헤어)
      if (nextCategory) setSelectedCategory(nextCategory);
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setShowWelcomePopup(true);
      } else {
        const hidePopup = localStorage.getItem('hideReferralPopup') === 'true';
        if (!hidePopup) {
          const { data } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_id', session.user.id)
            .limit(1);
          if (!data || data.length === 0) {
            setShowReferralPopup(true);
          }
        }
      }
    });
  }, []);

  const handleWelcomeClose = () => {
    setShowWelcomePopup(false);
  };

  const handleReferralClose = () => {
    setShowReferralPopup(false);
  };

  const handleReferralNeverShow = () => {
    localStorage.setItem('hideReferralPopup', 'true');
    setShowReferralPopup(false);
  };

  const handleReferralSubmit = async (code: string) => {
    setReferralError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/referral/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();
      if (result.success) {
        setShowReferralPopup(false);
        setReferralToast('추천인 코드가 적용되었습니다! 5% 쿠폰이 발급되었어요 🎉');
        setTimeout(() => setReferralToast(null), 3000);
      } else {
        setReferralError(result.error ?? '알 수 없는 오류가 발생했습니다.');
      }
    } catch {
      setReferralError('일시적인 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUserName(null);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const nextCategory = categoryId as BeautyCategoryId;
    setSelectedCategory(nextCategory);
    setIsBookingOpen(true);
  };



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
      {/* ── 독립 헤더 영역 ── */}
      <header className={styles.siteHeader}>
        <HomeTopNav />
      </header>

      {/* ── 다국어 메인 배너 ── */}
      <HomeHeroBanner />

      {/* ── 카테고리 아이콘 행 ── */}
      <div id="beauty-booking">
        <HomeBookingSection
          categories={BEAUTY_CATEGORY_OPTIONS}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          t={t}
        />
      </div>

      {/* ── 슬라이드 갤러리 (카테고리 아래로 이동) ── */}
      <HomeHero
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
      />

      {showWelcomePopup && (
        <WelcomeCouponPopup onClose={handleWelcomeClose} />
      )}

      {showReferralPopup && (
        <ReferralCodePopup
          onClose={handleReferralClose}
          onNeverShowAgain={handleReferralNeverShow}
          onSubmit={handleReferralSubmit}
          errorMessage={referralError ?? undefined}
        />
      )}

      {referralToast && (
        <div className={styles.toast}>{referralToast}</div>
      )}
    </div>
  );
}
