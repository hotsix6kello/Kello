'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useTrip, ItineraryItem } from '@/lib/contexts/TripContext';
import { MOCK_ITEMS } from './explore/mock/data';

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

interface GooglePrediction {
  placePrediction: {
    structuredFormat: {
      mainText: { text: string };
      secondaryText?: { text: string };
    };
    placeId: string;
  };
}

interface RecommendedPlan {
  id: string;
  duration: number;
  title: string;
  label: string;
  icon: string;
  items: Array<Omit<ItineraryItem, 'id'> & { id: string; [key: string]: unknown }>;
}

// Home Specific Components
import HomeTopNav from './components/home/HomeTopNav';
import HomeHero from './components/home/HomeHero';
import HomeBookingSection from './components/home/HomeBookingSection';
import HomeRecommendedPlans from './components/home/HomeRecommendedPlans';
import HomeSupportSection from './components/home/HomeSupportSection';
import HomeLocationSheet from './components/home/HomeLocationSheet';
import HomeModals from './components/home/HomeModals';
import HomeInterpreterEntry from './components/home/HomeInterpreterEntry';

import { 
  BEAUTY_CATEGORY_OPTIONS, 
  MOCK_PLACES, 
  ASSURANCE_ITEMS,
  BeautyCategoryId
} from './components/home/constants';

export default function HomePage() {
  const { t, i18n } = useTranslation('common');
  const { 
    itinerary, 
    setItinerary, 
    tripDays: days,
    setTripDays: setDays,
    selectedCategory: globalCategory,
    setSelectedCategory: setGlobalCategory,
    searchQuery: input,
    setSearchQuery: setInput,
    setDestinationInfo
  } = useTrip();

  const selectedCategory = globalCategory as BeautyCategoryId | null;
  const setSelectedCategory = setGlobalCategory as (category: BeautyCategoryId | null) => void;

  const router = useRouter();

  const hasSupabaseAuth = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const [userName, setUserName] = useState<string | null>(null);

  // Navigation Sheet States
  const [openNavSheet, setOpenNavSheet] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navigation Search States
  const [selectedDest, setSelectedDest] = useState<{ title: string; area: string; lat: number; lng: number } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSearchingInSheet, setIsSearchingInSheet] = useState(false);
  const [sheetSearchResults, setSheetSearchResults] = useState<SheetSearchResult[]>([]);
  const [loadingNav, setLoadingNav] = useState(false);

  // Merge MOCK_PLACES with MOCK_ITEMS for broader search
  const ALL_SEARCH_ITEMS = useMemo(() => {
    const items = MOCK_ITEMS.map(i => {
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

  const nextDest = itinerary.find(item => item.status === 'confirmed');

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

  const RECOMMENDED_PLANS = useMemo<RecommendedPlan[]>(() => [
    {
      id: 'plan-2d',
      duration: 2,
      title: t('home.plans.2d.title', { defaultValue: '2 Days: Seoul Essential' }),
      label: t('home.plans.2d.label', { defaultValue: '2 Days' }),
      icon: '⚡',
      items: [
        { id: 'p1-1', name: t('explore_items.airport_arrival', { defaultValue: 'Incheon Airport Arrival' }), time: '10:00', lat: 37.4602, lng: 126.4407, day: 1, slot: 'am', status: 'confirmed' as const, type: 'attraction', area: 'Incheon', price: '0', desc: 'Welcome to Korea' },
        { id: 'p1-2', name: t('explore_items.hotel_checkin', { defaultValue: 'Conrad Seoul (Hotel)' }), time: '13:00', lat: 37.5252, lng: 126.9254, day: 1, slot: 'pm', status: 'confirmed' as const, type: 'attraction', area: 'Yeouido', price: '300,000', desc: 'Luxury stay' },
        { id: 'f2', name: t('explore_items.f2.title', { defaultValue: 'Gold Pig BBQ (Dinner)' }), time: '18:30', lat: 37.5540, lng: 127.0140, day: 1, slot: 'night', status: 'draft' as const, type: 'food', area: 'Yaksu', price: '20,000' },
        { id: 'a1', name: t('explore_items.a1.title', { defaultValue: 'Gyeongbokgung Palace' }), time: '10:00', lat: 37.5796, lng: 126.9770, day: 2, slot: 'am', status: 'draft' as const, type: 'attraction', area: 'Jongno', price: '3,000' },
        { id: 'b1', name: t('explore_items.b1.title', { defaultValue: 'Jenny House Beauty' }), time: '14:30', lat: 37.5240, lng: 127.0440, day: 2, slot: 'pm', status: 'draft' as const, type: 'beauty', area: 'Cheongdam', price: '150,000' }
      ]
    },
    {
      id: 'plan-3d',
      duration: 3,
      title: t('home.plans.3d.title', { defaultValue: '3 Days: K-Culture & Style' }),
      label: t('home.plans.3d.label', { defaultValue: '3 Days' }),
      icon: '✨',
      items: [
        { id: 'p2-1', name: t('explore_items.airport_arrival', { defaultValue: 'Incheon Airport Arrival' }), time: '09:00', lat: 37.4602, lng: 126.4407, day: 1, slot: 'am', status: 'confirmed' as const, type: 'attraction', area: 'Incheon', price: '0' },
        { id: 'p2-2', name: t('explore_items.hotel_checkin', { defaultValue: 'Hotel in Myeongdong' }), time: '12:00', lat: 37.5635, lng: 126.9837, day: 1, slot: 'pm', status: 'confirmed' as const, type: 'attraction', area: 'Myeongdong', price: '200,000' },
        { id: 'f1', name: t('explore_items.f1.title', { defaultValue: 'Plant Cafe Seoul' }), time: '14:00', lat: 37.5340, lng: 126.9940, day: 1, slot: 'pm', status: 'draft' as const, type: 'food', area: 'Itaewon', price: '15,000' },
        { id: 'e2', name: t('explore_items.e2.title', { defaultValue: 'Nanta Show Myeongdong' }), time: '17:00', lat: 37.5645, lng: 126.9845, day: 1, slot: 'night', status: 'draft' as const, type: 'event', area: 'Myeongdong', price: '40,000' },
        { id: 'a1', name: t('explore_items.a1.title', { defaultValue: 'Gyeongbokgung Palace' }), time: '10:00', lat: 37.5796, lng: 126.9770, day: 2, slot: 'am', status: 'draft' as const, type: 'attraction', area: 'Jongno', price: '3,000' },
        { id: 'b2', name: t('explore_items.b2.title', { defaultValue: 'PPEUM Clinic Gangnam' }), time: '14:00', lat: 37.4980, lng: 127.0276, day: 2, slot: 'pm', status: 'draft' as const, type: 'beauty', area: 'Gangnam', price: '50,000' },
        { id: 'e1', name: t('explore_items.e1.title', { defaultValue: 'PSY Water Show' }), time: '19:00', lat: 37.5148, lng: 127.0736, day: 2, slot: 'night', status: 'draft' as const, type: 'event', area: 'Jamsil', price: '140,000' },
        { id: 'a2', name: t('explore_items.a2.title', { defaultValue: 'Lotte World Tower' }), time: '11:00', lat: 37.5125, lng: 127.1025, day: 3, slot: 'am', status: 'draft' as const, type: 'attraction', area: 'Jamsil', price: '27,000' },
        { id: 'f3', name: t('explore_items.f3.title', { defaultValue: 'Seafood Market' }), time: '14:00', lat: 37.5140, lng: 126.9240, day: 3, slot: 'pm', status: 'draft' as const, type: 'food', area: 'Nampo', price: '40,000' }
      ]
    },
    {
      id: 'plan-5d',
      duration: 5,
      title: t('home.plans.5d.title', { defaultValue: '5 Days: The Grand Tour' }),
      label: t('home.plans.5d.label', { defaultValue: '5 Days' }),
      icon: '🏯',
      items: [
        { id: 'p3-1', name: t('explore_items.airport_arrival', { defaultValue: 'Incheon Airport Arrival' }), time: '10:00', lat: 37.4602, lng: 126.4407, day: 1, slot: 'am', status: 'confirmed' as const, type: 'attraction', area: 'Incheon', price: '0' },
        { id: 'p3-2', name: t('explore_items.hotel_checkin', { defaultValue: 'Stay in Hanok Village' }), time: '14:00', lat: 37.5826, lng: 126.9836, day: 1, slot: 'pm', status: 'confirmed' as const, type: 'attraction', area: 'Jongno', price: '150,000' },
        { id: 'a1', name: t('explore_items.a1.title', { defaultValue: 'Gyeongbokgung Palace' }), time: '10:00', lat: 37.5796, lng: 126.9770, day: 2, slot: 'am', status: 'draft' as const, type: 'attraction', area: 'Jongno', price: '3,000' },
        { id: 'fs1', name: t('explore_items.fs1.title', { defaultValue: 'Seoul Lantern Festival' }), time: '19:00', lat: 37.5724, lng: 126.9768, day: 2, slot: 'night', status: 'draft' as const, type: 'festival', area: 'Gwanghwamun', price: 'Free' },
        { id: 'b1', name: t('explore_items.b1.title', { defaultValue: 'Jenny House Beauty' }), time: '11:00', lat: 37.5240, lng: 127.0440, day: 3, slot: 'am', status: 'draft' as const, type: 'beauty', area: 'Cheongdam', price: '150,000' },
        { id: 'f2', name: t('explore_items.f2.title', { defaultValue: 'Gold Pig BBQ' }), time: '18:00', lat: 37.5540, lng: 127.0140, day: 3, slot: 'night', status: 'draft' as const, type: 'food', area: 'Yaksu', price: '20,000' },
        { id: 'a2', name: t('explore_items.a2.title', { defaultValue: 'Lotte World Tower' }), time: '14:30', lat: 37.5125, lng: 127.1025, day: 4, slot: 'pm', status: 'draft' as const, type: 'attraction', area: 'Jamsil', price: '27,000' },
        { id: 'f1', name: t('explore_items.f1.title', { defaultValue: 'Plant Cafe Seoul' }), time: '12:00', lat: 37.5340, lng: 126.9940, day: 5, slot: 'am', status: 'draft' as const, type: 'food', area: 'Itaewon', price: '15,000' }
      ]
    }
  ], [t]);

  const filteredPlans = useMemo(() => {
    return RECOMMENDED_PLANS.filter(p => p.duration === days);
  }, [RECOMMENDED_PLANS, days]);

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

  const handleStartBooking = () => {
    if (!selectedCategory) return;
    router.push(`/explore?category=beauty&beautyCategory=${selectedCategory}`);
  };

  const handleOpenInterpreter = () => {
    router.push('/interpreter');
  };

  const selectedOption = BEAUTY_CATEGORY_OPTIONS.find((option) => option.id === selectedCategory) ?? null;

  // homeTrans was unused and contained any/returnObjects: true warning potential

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    const isKo = i18n.language?.startsWith('ko');
    if (hour < 12) return isKo ? '좋은 아침입니다' : 'Good morning';
    if (hour < 18) return isKo ? '좋은 오후입니다' : 'Good afternoon';
    return isKo ? '좋은 저녁입니다' : 'Good evening';
  };

  const handleStart = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) { router.push('/explore'); return; }
    setLoadingNav(true);
    const localFiltered = ALL_SEARCH_ITEMS.filter(p => {
      const q = trimmedInput.toLowerCase();
      return (p.title?.toLowerCase().includes(q)) || (p.area?.toLowerCase().includes(q)) || (p.searchTerms?.includes(q));
    });
    let results = [...localFiltered];
    try {
      const lang = i18n.language || 'en';
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: trimmedInput, language: lang }),
      });
      const data = await res.json();
      const googleResults = (data.suggestions || []).map((s: GooglePrediction) => ({
        title: s.placePrediction.structuredFormat.mainText.text,
        area: s.placePrediction.structuredFormat.secondaryText?.text || '',
        placeId: s.placePrediction.placeId,
        isGoogle: true
      }));
      results = [...results, ...googleResults];
    } catch (err) { console.error('Google Search failed', err); }
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

  const handleApplyPlan = (plan: RecommendedPlan) => {
    const formattedItems = plan.items.map((item) => ({ 
      ...item, 
      id: `${plan.id}_${item.id}_${Date.now()}` 
    } as ItineraryItem));
    setDays(plan.duration);
    setItinerary(formattedItems);
    router.push('/planner');
  };

  const handleCreateCustomPlan = () => {
    setDays(days);
    setItinerary([]);
    router.push('/planner');
  };

  return (
    <main className={styles.main}>
      <HomeTopNav 
        userName={userName} 
        onSignOut={handleSignOut} 
        t={t} 
      />

      <HomeHero 
        userName={userName} 
        greeting={getGreeting()} 
        t={t} 
      />

      <HomeBookingSection 
        categories={BEAUTY_CATEGORY_OPTIONS}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        input={input}
        onInputChange={setInput}
        onInputClear={() => setInput('')}
        onStart={handleStart}
        days={days}
        onDaysChange={setDays}
        onStartBooking={handleStartBooking}
        showSuggestions={showSuggestions}
        suggestions={[]} // Suggestions disabled as per original code effect
        onSelectPlace={handleSelectPlace}
        selectedOption={selectedOption}
        t={t}
      />

      <HomeRecommendedPlans 
        plans={filteredPlans}
        days={days}
        onApplyPlan={handleApplyPlan}
        onCreateCustomPlan={handleCreateCustomPlan}
        t={t}
      />

      <HomeSupportSection 
        assuranceItems={ASSURANCE_ITEMS}
        onOpenInterpreter={handleOpenInterpreter}
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
        <div className={styles.toast} style={{ bottom: '120px', background: 'var(--primary)', color: 'white' }}>
          {t('home.fetching_location', { defaultValue: 'Fetching location...' })}
        </div>
      )}

      <div style={{ height: 100 }} />
    </main>
  );
}
