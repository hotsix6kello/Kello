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



// Home Specific Components
import HomeTopNav from './components/home/HomeTopNav';
import HomeHero from './components/home/HomeHero';
import HomeBookingSection from './components/home/HomeBookingSection';

import HomeLocationSheet from './components/home/HomeLocationSheet';
import HomeModals from './components/home/HomeModals';
import HomeInterpreterEntry from './components/home/HomeInterpreterEntry';

import { 
  BEAUTY_CATEGORY_OPTIONS, 
  MOCK_PLACES, 
  BeautyCategoryId
} from './components/home/constants';

export default function HomePage() {
  const { t, i18n } = useTranslation('common');
  const { 
    itinerary, 
    selectedCategory: globalCategory,
    setSelectedCategory: setGlobalCategory,
    searchQuery: input,
    setSearchQuery: setInput,
    setDestinationInfo
  } = useTrip();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.morning');
    if (hour < 18) return t('common.afternoon');
    return t('common.evening');
  };

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



  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
    router.push(`/explore?category=beauty&beautyCategory=${categoryId}`);
  };

  const handleOpenInterpreter = () => {
    router.push('/interpreter');
  };

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

  if (!isHydrated) {
    return <main className={styles.main} suppressHydrationWarning />;
  }

  return (
    <main className={styles.main}>
      <HomeTopNav 
        userName={userName} 
        onSignOut={handleSignOut} 
        greeting={getGreeting()}
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
        onSelectCategory={handleCategorySelect}
        onStartBooking={() => {
          if (selectedCategory) {
            router.push(`/explore?category=beauty&beautyCategory=${selectedCategory}`);
          }
        }}
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

    </main>
  );
}
