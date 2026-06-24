'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';

import { type SharedBusiness, useTrip } from '@/lib/contexts/TripContext';
import { toGoogleMapsLanguageCode } from '@/lib/i18n/locales';
import { supabase } from '@/lib/supabaseClient';
import { Search, Mic, CornerUpRight, MapPin, X, Bookmark, Share2, Phone, MessageSquare, Copy, Calendar, Sparkles, Scissors, Hand, Paintbrush, Eye, Flame, Flower2, Send, ChevronLeft, ChevronRight } from 'lucide-react';

type Coordinates = {
  lat: number;
  lng: number;
};

type PartnerResult = {
  id: string;
  shop_name: string;
  shop_name_en: string | null;
  address: string | null;
  address_en: string | null;
  lat: number;
  lng: number;
  category: string | null;
  main_image_url: string | null;
  supports_english: boolean;
  distance_m: number;
};

type NearbyPlaceResult = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
};

type Category = 'hair' | 'nail' | 'makeup' | 'lash' | 'waxing' | 'aesthetic' | 'beauty';
type StatusMsg = 'login_required' | 'location_denied' | 'no_results' | 'api_error' | null;

type AutocompleteSuggestion = {
  place_id: string;
  label: string;
  main_text: string;
  secondary_text: string | null;
};

type AutocompleteDetail = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
};

// --- Places API 결과 클라이언트 캐시 ---
// 모듈 레벨 Map: 페이지 재방문(클라이언트 라우팅) 간 유지, 새로고침 시 초기화
type PlacesCacheEntry = { places: NearbyPlaceResult[]; expiresAt: number };
const placesCache = new Map<string, PlacesCacheEntry>();
const PLACES_CACHE_TTL_MS = 5 * 60 * 1000; // 5분

// lat/lng를 소수점 3자리(±약 55m)로 반올림해 캐시 키 생성
function makePlacesCacheKey(lat: number, lng: number, category: Category): string {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}:${category}`;
}
// ------------------------------------


const DEFAULT_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 };
const DEFAULT_RADIUS_METERS = 50000;

const CATEGORY_MARKER: Record<Category, { label: string; color: string }> = {
  hair:      { label: '헤', color: '#f24f8d' },
  nail:      { label: '네', color: '#a855f7' },
  makeup:    { label: '메', color: '#e11d48' },
  lash:      { label: '속', color: '#ec4899' },
  waxing:    { label: '왁', color: '#f97316' },
  aesthetic: { label: '에', color: '#0ea5e9' },
  beauty:    { label: '뷰', color: '#FF4D82' },
};

const CATEGORIES: { key: Category; labelKey: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }> }[] = [
  { key: 'hair',      labelKey: 'explore_map.hair',      icon: Scissors },
  { key: 'nail',      labelKey: 'explore_map.nail',      icon: Hand },
  { key: 'makeup',    labelKey: 'explore_map.makeup',    icon: Paintbrush },
  { key: 'lash',      labelKey: 'explore_map.lash',      icon: Eye },
  { key: 'waxing',    labelKey: 'explore_map.waxing',    icon: Flame },
  { key: 'aesthetic', labelKey: 'explore_map.aesthetic', icon: Flower2 },
];

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

const chipStyle = {
  border: '1px solid #FFE4E6',
  borderRadius: 999,
  padding: '8px 14px',
  background: '#FFFFFF',
  color: '#64748B',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
  boxShadow: '0 4px 12px rgba(255, 77, 130, 0.02)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'all 0.2s',
};

const chipActiveStyle = {
  ...chipStyle,
  background: '#FFF0F3',
  color: '#FF4D82',
  border: '1px solid #FF4D82',
};

// 현재 위치 마커: 파란 핀 + 흰 원 (공원/POI 아이콘과 명확히 구분)
function getCurrentLocationIcon(): google.maps.Icon | undefined {
  if (typeof window === 'undefined' || !window.google?.maps?.Size || !window.google?.maps?.Point) {
    return undefined;
  }
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42S32 28 32 16C32 7.16 24.84 0 16 0Z"
        fill="#1a73e8" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`,
  );
  return {
    url: `data:image/svg+xml;charset=UTF-8,${svg}`,
    scaledSize: new window.google.maps.Size(32, 42),
    anchor: new window.google.maps.Point(16, 42),
  };
}

// 장소 카테고리 마커: 컬러 원
function getMarkerIcon(color: string): google.maps.Symbol | undefined {
  if (typeof window === 'undefined' || !window.google?.maps?.SymbolPath) {
    return undefined;
  }
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    scale: 9,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  };
}

function toSharedBusiness(partner: PartnerResult): SharedBusiness {
  return {
    id: partner.id,
    store_id: partner.id,
    source: 'partner',
    name: partner.shop_name,
    displayName: { text: partner.shop_name },
    address: partner.address ?? '',
    formattedAddress: partner.address ?? '',
    lat: partner.lat,
    lng: partner.lng,
    location: { latitude: partner.lat, longitude: partner.lng },
    category: partner.category ?? 'beauty',
    image_url: partner.main_image_url ?? undefined,
  };
}

export default function ExplorePage() {
  const { setSharedBusinesses } = useTrip();
  const { t, i18n } = useTranslation('common');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const mapRef = useRef<google.maps.Map | null>(null);
  const chipScrollRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);


  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: mapsApiKey,
    language: toGoogleMapsLanguageCode(i18n.language),
  });

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [partners, setPartners] = useState<PartnerResult[]>([]);
  const [places, setPlaces] = useState<NearbyPlaceResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('hair');
  const [activeTab, setActiveTab] = useState<string>('my_location');
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isBottomHovered, setIsBottomHovered] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // 칩 스크롤 드래그를 위한 마우스 이벤트 상태
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragActive(true);
    setDragStartX(e.pageX - (chipScrollRef.current?.offsetLeft ?? 0));
    setDragScrollLeft(chipScrollRef.current?.scrollLeft ?? 0);
  };

  const handleDragLeaveOrEnd = () => {
    setIsDragActive(false);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragActive) return;
    e.preventDefault();
    const x = e.pageX - (chipScrollRef.current?.offsetLeft ?? 0);
    const walk = (x - dragStartX) * 1.5; // 스크롤 감도
    if (chipScrollRef.current) {
      chipScrollRef.current.scrollLeft = dragScrollLeft - walk;
    }
  };

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSessionToken(data.session?.access_token ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPartners = useCallback(
    async (location: Coordinates) => {
      if (!sessionToken) return;
      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          radius: String(DEFAULT_RADIUS_METERS),
          category: 'beauty',
        });
        const res = await fetch(`/api/explore/partners?${params.toString()}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) throw new Error('partners_fetch_failed');
        const data = (await res.json()) as { partners?: PartnerResult[] };
        const nextPartners = data.partners ?? [];
        setPartners(nextPartners);
        setSharedBusinesses(nextPartners.map(toSharedBusiness));
      } catch (error) {
        console.error('[explore] partner fetch failed', error);
      }
    },
    [sessionToken, setSharedBusinesses],
  );

  const fetchNearbyPlaces = useCallback(
    async (category: Category, location: Coordinates) => {
      if (!sessionToken) return;
      setStatusMsg(null);

      // 캐시 히트 시 API 호출 없이 즉시 반환
      const cacheKey = makePlacesCacheKey(location.lat, location.lng, category);
      const cached = placesCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        setPlaces(cached.places);
        setActiveCategory(category);
        if (cached.places.length === 0) setStatusMsg('no_results');
        return;
      }

      setIsLoadingPlaces(true);
      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          category,
        });
        const url = `/api/places/nearby?${params.toString()}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });

        const data = (await res.json()) as { places?: NearbyPlaceResult[]; error?: string; detail?: string };
        if (!res.ok) {
          console.error('[explore] API error', { status: res.status, error: data.error, detail: data.detail });
          setPlaces([]);
          setStatusMsg('api_error');
          return;
        }

        const nextPlaces = data.places ?? [];
        placesCache.set(cacheKey, { places: nextPlaces, expiresAt: Date.now() + PLACES_CACHE_TTL_MS });
        setPlaces(nextPlaces);
        setActiveCategory(category);
        if (nextPlaces.length === 0) setStatusMsg('no_results');
      } catch (error) {
        console.error('[explore] nearby places fetch exception', error);
        setPlaces([]);
        setStatusMsg('api_error');
      } finally {
        setIsLoadingPlaces(false);
      }
    },
    [sessionToken],
  );

  // 내 위치: 지도 이동 + 마커만. 카테고리 탭을 눌러야 주변 장소 검색.
  const requestCurrentLocation = useCallback(() => {
    setActiveTab('my_location');
    setSelectedPlace(null);
    if (!navigator.geolocation) return;
    setStatusMsg(null);
    setPlaces([]);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(nextLocation);
        setCenter(nextLocation);
        if (mapRef.current) {
          mapRef.current.setZoom(15);
          mapRef.current.panTo(nextLocation);
          mapRef.current.setCenter(nextLocation);
        }
        if (sessionToken) {
          void fetchPartners(nextLocation);
        }
      },
      () => {
        setStatusMsg('location_denied');
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  }, [fetchPartners, sessionToken]);

  // Auto-trigger when sessionToken becomes available (login).
  useEffect(() => {
    if (!sessionToken) return;
    requestCurrentLocation();
  }, [requestCurrentLocation, sessionToken]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 자동완성 실제 요청 (debounce·즉시 양쪽에서 호출)
  const fetchSuggestions = useCallback(async (query: string): Promise<AutocompleteSuggestion[]> => {
    if (!query.trim() || !sessionToken) { setSearchSuggestions([]); return []; }
    try {
      const params = new URLSearchParams({ input: query.trim() });
      const res = await fetch(`/api/explore/place-autocomplete?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
      const list = data.suggestions ?? [];
      setSearchSuggestions(list);
      return list;
    } catch { return []; }
  }, [sessionToken]);

  // 타이핑 중 debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSearchSuggestions([]); return; }
    debounceRef.current = setTimeout(() => void fetchSuggestions(value), 320);
  };

  // Enter / 돋보기: debounce 취소 → 즉시 요청 → 첫 결과 선택
  const handleSearchSubmit = async () => {
    if (!searchInput.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const list = searchSuggestions.length > 0
      ? searchSuggestions
      : await fetchSuggestions(searchInput);
    if (list.length > 0) void handleSuggestionSelect(list[0]);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchInput('');
    setSearchSuggestions([]);
  };

  const handleSuggestionSelect = async (suggestion: AutocompleteSuggestion) => {
    if (!sessionToken) return;
    try {
      const params = new URLSearchParams({ place_id: suggestion.place_id });
      const res = await fetch(`/api/explore/place-autocomplete?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { place?: AutocompleteDetail };
      if (!data.place) return;
      const nextLocation = { lat: data.place.lat, lng: data.place.lng };
      setCenter(nextLocation);
      mapRef.current?.panTo(nextLocation);
      mapRef.current?.setZoom(15);
      closeSearch();
      void fetchNearbyPlaces(activeCategory, nextLocation);
    } catch { /* ignore */ }
  };

  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // Always updates active tab. Shows login hint instead of fetching when not logged in.
  // Uses the map's actual current center (reflects user panning) via mapRef.
  useEffect(() => {
    if (!sessionToken) return;
    if (initialQuery) {
      setSearchInput(initialQuery);
      setIsSearchOpen(true);
      void (async () => {
        const list = await fetchSuggestions(initialQuery);
        if (list.length > 0) {
          void handleSuggestionSelect(list[0]);
        }
      })();
    } else {
      requestCurrentLocation();
    }
  }, [requestCurrentLocation, sessionToken, initialQuery, fetchSuggestions]);
  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    if (!sessionToken) {
      setStatusMsg('login_required');
      return;
    }
    const mapCenter = mapRef.current?.getCenter();
    const searchLocation = mapCenter
      ? { lat: mapCenter.lat(), lng: mapCenter.lng() }
      : currentLocation ?? center;
    void fetchNearbyPlaces(category, searchLocation);
  };

  const sortedPlaces = useMemo(() => {
    const refLoc = currentLocation ?? center;
    return [...places].sort((a, b) => {
      const distA = haversineMeters(refLoc, { lat: a.lat, lng: a.lng });
      const distB = haversineMeters(refLoc, { lat: b.lat, lng: b.lng });
      return distA - distB;
    });
  }, [places, currentLocation, center]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      zoomControl: false,
      styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
    }),
    [],
  );

  const markerMeta = CATEGORY_MARKER[activeCategory];
  const showBottomSection = isLoadingPlaces || places.length > 0 || statusMsg !== null;

  if (!mounted) return null;

  return (
    <main
      style={{
        position: 'relative',
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        background: '#f7f1ea',
      }}
    >
      {/* Map */}
      <section style={{ position: 'absolute', inset: 0 }}>
        {mapsApiKey && isLoaded && !loadError ? (
          <GoogleMap
            center={center}
            zoom={14}
            mapContainerStyle={{ width: '100%', height: '100%' }}
            options={mapOptions}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {currentLocation && (
              <MarkerF
                position={currentLocation}
                icon={getCurrentLocationIcon()}
                title="현재 위치"
              />
            )}
            {partners.map((partner) => (
              <MarkerF
                key={partner.id}
                position={{ lat: partner.lat, lng: partner.lng }}
                label={{ text: 'K', color: '#ffffff', fontWeight: '900', fontSize: '11px' }}
                icon={getMarkerIcon('#f24f8d')}
                onClick={() => setCenter({ lat: partner.lat, lng: partner.lng })}
              />
            ))}
            {places.map((place) => (
              <MarkerF
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
                label={{ text: markerMeta.label, color: '#ffffff', fontWeight: '900', fontSize: '11px' }}
                icon={getMarkerIcon(markerMeta.color)}
                onClick={() => setCenter({ lat: place.lat, lng: place.lng })}
              />
            ))}
          </GoogleMap>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              background: '#efe7dc',
              color: '#66584b',
              textAlign: 'center',
              fontWeight: 700,
            }}
          >
            {loadError
              ? 'Failed to load Google Maps.'
              : 'NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is required.'}
          </div>
        )}
      </section>

      {/* 바깥 닫기 레이어 */}
      {isSearchOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'auto' }}
          onClick={closeSearch}
        />
      )}

      {/* 상단 바: 통합 헤더 구조 */}
      <section
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          padding: '16px 16px 0',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* 첫 번째 행: 검색창 + 길찾기 버튼 */}
        <div style={{ display: 'flex', gap: '8px', width: '100%', pointerEvents: 'auto' }}>
          {/* 검색 바 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 24,
              background: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(255, 77, 130, 0.06)',
              border: '1.5px solid #FF4D82',
            }}
          >
            <button
              type="button"
              onClick={() => void handleSearchSubmit()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              aria-label="검색"
            >
              <Search size={18} color="#FF4D82" strokeWidth={2.5} />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearchSubmit(); }}
              placeholder={t('explore_page.partner_search_placeholder')}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#2A2624',
                background: 'transparent',
                minWidth: 0,
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#8f8274',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: 4,
                }}
                aria-label="지우기"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              aria-label="음성인식"
            >
              <Mic size={18} color="#FF4D82" strokeWidth={2.5} />
            </button>
          </div>

          {/* 검색 제출 버튼 */}
          <button
            type="button"
            onClick={() => void handleSearchSubmit()}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '16px',
              background: '#FF4D82',
              border: 'none',
              boxShadow: '0 4px 12px rgba(255, 77, 130, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            aria-label="검색"
          >
            <Search size={20} color="#FFFFFF" strokeWidth={2.5} />
          </button>
        </div>

        {/* 자동완성 결과 */}
        {isSearchOpen && searchSuggestions.length > 0 && (
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 12px 26px rgba(40,31,22,0.14)',
              pointerEvents: 'auto',
            }}
          >
            {searchSuggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onClick={() => void handleSuggestionSelect(s)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #f0e6da',
                  padding: '12px 14px',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', color: '#2f2923', fontSize: 14 }}>
                  {s.main_text}
                </strong>
                {s.secondary_text && (
                  <span style={{ display: 'block', color: '#8f8274', fontSize: 12, marginTop: 2 }}>
                    {s.secondary_text}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 웹킷 스크롤바 숨김 인라인 스타일 태그 */}
        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none !important;
          }
        `}} />

        {/* 두 번째 행: 칩 바 */}
        <div
          ref={chipScrollRef}
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '2px 2px 4px',
            pointerEvents: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            cursor: isDragActive ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onMouseDown={handleDragStart}
          onMouseLeave={handleDragLeaveOrEnd}
          onMouseUp={handleDragLeaveOrEnd}
          onMouseMove={handleDragMove}
          onWheel={(e) => {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY + e.deltaX;
          }}
        >
          {/* 내 위치 칩 */}
          <button
            type="button"
            style={activeTab === 'my_location' ? chipActiveStyle : chipStyle}
            onClick={requestCurrentLocation}
          >
            <MapPin size={13} color={activeTab === 'my_location' ? '#FF4D82' : '#64748B'} strokeWidth={2.5} />
            {t('explore_map.my_location')}
          </button>

          {/* AI 추천 칩 */}
          <button
            type="button"
            style={activeTab === 'ai_recommendation' ? chipActiveStyle : chipStyle}
            onClick={() => {
              setActiveTab('ai_recommendation');
              setSelectedPlace(null);
              const refLoc = currentLocation ?? center;
              void fetchNearbyPlaces('beauty', refLoc);
            }}
          >
            <Sparkles size={13} color={activeTab === 'ai_recommendation' ? '#FF4D82' : '#64748B'} strokeWidth={2.5} />
            AI추천
          </button>

          {/* 카테고리 칩 목록 */}
          {CATEGORIES.map(({ key, labelKey, icon: IconComponent }) => (
            <button
              key={key}
              type="button"
              style={activeTab === key ? chipActiveStyle : chipStyle}
              onClick={() => {
                setActiveTab(key);
                setSelectedPlace(null);
                handleCategoryChange(key);
              }}
            >
              <IconComponent size={13} color={activeTab === key ? '#FF4D82' : '#64748B'} strokeWidth={2.5} />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </section>

      {/* Bottom section: 지도 위에 오버레이 — 배경 없이 카드/메시지만 떠 있음 */}
      {showBottomSection && !selectedPlace && (
        <section
          onMouseEnter={() => setIsBottomHovered(true)}
          onMouseLeave={() => setIsBottomHovered(false)}
          style={{
            position: 'absolute',
            bottom: '0px',
            left: 0,
            right: 0,
            height: '170px',
            maxHeight: '170px',
            background: 'transparent',
            boxShadow: 'none',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
            pointerEvents: 'none',
            border: 'none',
            paddingBottom: '0px',
            transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >

          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {/* 가로 카드 리스트 스크롤 영역 */}
          <div
            ref={bottomScrollRef}
            className="hide-scrollbar"
            style={{
              flex: 1,
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: '0 20px 2px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: '14px',
              WebkitOverflowScrolling: 'touch',
              pointerEvents: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {isLoadingPlaces ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8f8274', fontSize: '13px', fontWeight: 600 }}>
                {t('explore_map.loading', { defaultValue: 'Loading...' })}
              </div>
            ) : statusMsg !== null && places.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#5b5146', fontSize: '13px', fontWeight: 600 }}>
                {statusMsg === 'login_required'
                  ? t('explore_map.login_required')
                  : statusMsg === 'no_results'
                  ? t('explore_map.no_results', { defaultValue: '주변 1.5km 내에 장소가 없어요.' })
                  : statusMsg === 'api_error'
                  ? t('explore_map.api_error', { defaultValue: '장소 검색에 실패했습니다.' })
                  : t('explore_map.location_denied')}
              </div>
            ) : (
              sortedPlaces.map((place) => {
                const dist =
                  currentLocation != null
                    ? haversineMeters(currentLocation, { lat: place.lat, lng: place.lng })
                    : null;
                const mapsUrl =
                  place.googleMapsUri ??
                  `https://www.google.com/maps/search/?api=1&query_place_id=${place.id}`;

                // 샵 이름에 따른 영업 상태 결정 로직
                let businessStatusText = t('explore_page.status_open');
                let businessStatusColor = '#2A2624';
                let businessStatusWeight = 800;
                if (place.name.includes('에스테틱') || place.name.includes('스파')) {
                  businessStatusText = t('explore_page.status_closed');
                  businessStatusColor = '#EF4444';
                  businessStatusWeight = 700;
                } else if (place.name.includes('벨라') || place.name.includes('라포레')) {
                  businessStatusText = t('explore_page.status_not_open_yet');
                  businessStatusColor = '#94A3B8';
                  businessStatusWeight = 500;
                }

                return (
                  <div
                    key={place.id}
                    onClick={() => {
                      setCenter({ lat: place.lat, lng: place.lng });
                      mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
                    }}
                    style={{
                      flexShrink: 0,
                      width: '290px',
                      height: '152px',
                      background: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1.5px solid #FFE4E6',
                      padding: '12px 14px 0 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      gap: '4px',
                      boxShadow: '0 4px 12px rgba(255, 77, 130, 0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 상단 정보 영역 (컨텐츠와 이미지의 2열 배치) */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                          <h4 
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(mapsUrl, '_blank');
                              setCenter({ lat: place.lat, lng: place.lng });
                              mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
                            }}
                            style={{ 
                              margin: 0, 
                              fontSize: '14px', 
                              fontWeight: 800, 
                              color: '#2A2624', 
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '120px'
                            }}
                          >
                            {place.name}
                          </h4>
                          <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
                            {activeTab === 'hair' ? '헤어샵' :
                             activeTab === 'nail' ? '네일샵' :
                             activeTab === 'massage' ? '마사지' :
                             activeTab === 'makeup' ? '메이크업' : '뷰티샵'}
                          </span>
                        </div>

                        {/* 별점 및 영업 상태 & 거리 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#FF4D82', fontWeight: 700 }}>★ {place.rating?.toFixed(1) ?? '4.5'}</span>
                          <span style={{ color: '#94A3B8' }}>({place.userRatingCount ?? '80'})</span>
                          <span style={{ color: '#CBD5E1' }}>·</span>
                          <span style={{ color: businessStatusColor, fontWeight: businessStatusWeight }}>
                            {businessStatusText}
                          </span>
                          {dist != null && (
                            <>
                              <span style={{ color: '#CBD5E1' }}>·</span>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>
                                {formatDistance(dist)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* 주소 단독 - 클릭시 복사 */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (place.address) {
                              void navigator.clipboard.writeText(place.address);
                              triggerToast(t('explore_page.address_copied'));
                            }
                          }}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            fontSize: '10px', 
                            color: '#64748B', 
                            minWidth: 0, 
                            marginTop: '2px',
                            cursor: 'pointer',
                          }}
                          title="클릭하여 주소 복사"
                        >
                          <span style={{ whiteSpace: 'normal', wordBreak: 'keep-all', textDecoration: 'underline', textDecorationColor: '#E2E8F0' }}>
                            {place.address}
                          </span>
                        </div>
                      </div>

                      {/* 우측 이미지 썸네일 */}
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '10px',
                          backgroundImage: 'url("https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=150")',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          flexShrink: 0
                        }}
                      />
                    </div>

                    {/* 하단 액션 버튼 영역 */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: '#FFF0F3',
                        borderTop: '1px solid #FFE4E6',
                        margin: '2px -14px 0 -14px',
                        padding: '10px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        color: '#FF4D82',
                        fontSize: '11px',
                        fontWeight: 800,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        width: 'calc(100% + 28px)',
                      }}
                    >
                      지도에서 열기
                      <Send size={12} strokeWidth={2.5} />
                    </a>
                  </div>
                );
              })
            )}
          </div>

          {/* 좌우 슬라이드 화살표 버튼 (PC 호버시 노출) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              bottomScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
            }}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #FFE4E6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FF4D82',
              opacity: isBottomHovered ? 0.9 : 0,
              transition: 'opacity 0.2s, background 0.2s',
              zIndex: 30,
              pointerEvents: isBottomHovered ? 'auto' : 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
            aria-label="이전 업체"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              bottomScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #FFE4E6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FF4D82',
              opacity: isBottomHovered ? 0.9 : 0,
              transition: 'opacity 0.2s, background 0.2s',
              zIndex: 30,
              pointerEvents: isBottomHovered ? 'auto' : 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
            aria-label="다음 업체"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </section>
      )}

      {/* 1/2 높이 업체 상세 바텀시트 */}
      {selectedPlace && (
        <section
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '52dvh',
            maxHeight: '52dvh',
            background: '#FFFFFF',
            borderRadius: '24px 24px 0 0',
            boxShadow: '0 -8px 32px rgba(255, 77, 130, 0.12)',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: 'auto',
            border: '1.5px solid #FFE4E6',
          }}
        >
          {/* 바텀시트 드래그용 핸들바 데코레이션 */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
            <div style={{ width: 42, height: 5, borderRadius: 999, background: '#FFE4E6' }} />
          </div>

          {/* 본문 스크롤 컨테이너 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* 타이틀 영역 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2A2624' }}>
                  {selectedPlace.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#FF4D82', fontWeight: 700 }}>
                    ★ {selectedPlace.rating != null ? selectedPlace.rating.toFixed(1) : '4.5'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    ({selectedPlace.userRatingCount != null ? selectedPlace.userRatingCount.toLocaleString() : '182'})
                  </span>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#CBD5E1' }} />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    {selectedPlace.category ? selectedPlace.category : '헤어살롱'}
                  </span>
                </div>
              </div>

              {/* 액션 및 닫기 버튼 그룹 */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    background: '#FFF0F3', border: 'none', borderRadius: '50%',
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#FF4D82'
                  }}
                  aria-label="저장"
                >
                  <Bookmark size={18} fill="#FF4D82" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  style={{
                    background: '#FFF0F3', border: 'none', borderRadius: '50%',
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#FF4D82'
                  }}
                  aria-label="공유"
                >
                  <Share2 size={18} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlace(null)}
                  style={{
                    background: '#F1F5F9', border: 'none', borderRadius: '50%',
                    width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#64748B'
                  }}
                  aria-label="닫기"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* 메인 퀵 액션 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={selectedPlace.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query_place_id=${selectedPlace.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '12px 0', borderRadius: '14px', background: '#FF4D82',
                  color: '#FFFFFF', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(255, 77, 130, 0.15)', textAlign: 'center'
                }}
              >
                <CornerUpRight size={16} strokeWidth={2.5} />
                {t('explore_page.btn_directions')}
              </a>
              <a
                href="tel:02-1234-5678"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '12px 0', borderRadius: '14px', background: '#FFF0F3',
                  border: '1.5px solid #FFE4E6', color: '#FF4D82', fontSize: '13px',
                  fontWeight: 700, textDecoration: 'none', textAlign: 'center'
                }}
              >
                <Phone size={15} strokeWidth={2.5} />
                {t('explore_page.btn_call')}
              </a>
              <a
                href="/talk/chat"
                style={{
                  flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', padding: '12px 0', borderRadius: '14px', background: '#FFF0F3',
                  border: '1.5px solid #FFE4E6', color: '#FF4D82', fontSize: '13px',
                  fontWeight: 700, textDecoration: 'none', textAlign: 'center'
                }}
              >
                <MessageSquare size={15} strokeWidth={2.5} />
                {t('explore_page.btn_dm')}
              </a>
            </div>

            {/* 이미지 갤러리 영역 (구조만 참고) */}
            <div style={{ display: 'flex', gap: '8px', height: '140px' }}>
              <div
                style={{
                  flex: 1.8,
                  borderRadius: '16px',
                  backgroundImage: 'url("https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    borderRadius: '12px',
                    backgroundImage: 'url("https://images.unsplash.com/photo-1605497746444-190d543aba0a?q=80&w=200")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    borderRadius: '12px',
                    backgroundImage: 'url("https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=200")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              </div>
            </div>

            {/* 상세 정보 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', color: '#475569', borderTop: '1px solid #FFE4E6', paddingTop: '16px' }}>
              
              {/* 주소 및 복사 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#2A2624', width: '56px', flexShrink: 0 }}>주소</span>
                  <span style={{ color: '#64748B', lineHeight: 1.4 }}>{selectedPlace.address ?? '제공된 주소가 없습니다.'}</span>
                </div>
                {selectedPlace.address && (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(selectedPlace.address);
                      triggerToast(t('explore_page.address_copied'));
                    }}
                    style={{
                      background: '#FFF0F3',
                      border: '1px solid #FFE4E6',
                      color: '#FF4D82',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      flexShrink: 0
                    }}
                  >
                    <Copy size={11} />
                  </button>
                )}
              </div>

              {/* 휴무일 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 800, color: '#2A2624', width: '56px', flexShrink: 0 }}>{t('explore_page.status_closed')}</span>
                <span style={{ color: '#FF4D82', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} />
                  매주 월요일 정기 휴무
                </span>
              </div>

              {/* 전화번호 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 800, color: '#2A2624', width: '56px', flexShrink: 0 }}>전화번호</span>
                <span style={{ color: '#64748B' }}>02-1234-5678</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 토스트 알림 컴포넌트 */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(42, 38, 36, 0.95)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '30px',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            animation: 'fadeInOut 2s ease-in-out forwards',
            whiteSpace: 'nowrap',
          }}
        >
          {toastMsg}
        </div>
      )}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
      `}</style>
    </main>
  );
}
