'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';

import { type SharedBusiness, useTrip } from '@/lib/contexts/TripContext';
import { supabase } from '@/lib/supabaseClient';

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

type Category = 'food' | 'beauty' | 'stay';
type StatusMsg = 'login_required' | 'location_denied' | 'no_results' | null;

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
  food: { label: '맛', color: '#22a06b' },
  beauty: { label: '뷰', color: '#f24f8d' },
  stay: { label: '숙', color: '#c58a12' },
};

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
  border: '1px solid rgba(188, 148, 78, 0.32)',
  borderRadius: 999,
  padding: '9px 13px',
  background: 'rgba(255, 255, 255, 0.92)',
  color: '#5b5146',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap' as const,
  boxShadow: '0 6px 18px rgba(41, 32, 23, 0.08)',
  cursor: 'pointer',
};

const chipActiveStyle = {
  ...chipStyle,
  background: '#c4942f',
  color: '#fff',
  border: '1px solid #c4942f',
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
  const { t } = useTranslation('common');
  const mapRef = useRef<google.maps.Map | null>(null);

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: mapsApiKey,
  });

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [partners, setPartners] = useState<PartnerResult[]>([]);
  const [places, setPlaces] = useState<NearbyPlaceResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('beauty');
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg>(null);

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
        const res = await fetch(`/api/places/nearby?${params.toString()}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!res.ok) throw new Error('places_fetch_failed');
        const data = (await res.json()) as { places?: NearbyPlaceResult[] };
        const nextPlaces = data.places ?? [];

        // 성공 결과를 캐시에 저장
        placesCache.set(cacheKey, { places: nextPlaces, expiresAt: Date.now() + PLACES_CACHE_TTL_MS });

        setPlaces(nextPlaces);
        setActiveCategory(category);
        if (nextPlaces.length === 0) setStatusMsg('no_results');
      } catch (error) {
        console.error('[explore] nearby places failed', error);
        setPlaces([]);
        setStatusMsg('no_results');
      } finally {
        setIsLoadingPlaces(false);
      }
    },
    [sessionToken],
  );

  // Geolocation runs regardless of login state.
  // If logged in → fetches nearby places.
  // If not logged in → moves map + shows marker only, then shows login hint.
  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setStatusMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(nextLocation);
        setCenter(nextLocation);
        mapRef.current?.setZoom(15);

        if (sessionToken) {
          void fetchPartners(nextLocation);
          void fetchNearbyPlaces(activeCategory, nextLocation);
        } else {
          setStatusMsg('login_required');
        }
      },
      () => {
        setStatusMsg('location_denied');
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  // activeCategory intentionally excluded: only re-run when session/fetch fns change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPartners, fetchNearbyPlaces, sessionToken]);

  // Auto-trigger when sessionToken becomes available (login).
  useEffect(() => {
    if (!sessionToken) return;
    requestCurrentLocation();
  }, [requestCurrentLocation, sessionToken]);

  // Always updates active tab. Shows login hint instead of fetching when not logged in.
  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    if (!sessionToken) {
      setStatusMsg('login_required');
      return;
    }
    void fetchNearbyPlaces(category, currentLocation ?? center);
  };

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      zoomControl: true,
      styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
    }),
    [],
  );

  const markerMeta = CATEGORY_MARKER[activeCategory];
  const showBottomSection = isLoadingPlaces || places.length > 0 || statusMsg !== null;

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

      {/* Category chips */}
      <section
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          padding: '16px 16px 0',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '2px 2px 2px',
            pointerEvents: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <button type="button" style={chipStyle} onClick={requestCurrentLocation}>
            {t('explore_map.my_location')}
          </button>
          <button
            type="button"
            style={activeCategory === 'food' ? chipActiveStyle : chipStyle}
            onClick={() => handleCategoryChange('food')}
          >
            {t('explore_map.food')}
          </button>
          <button
            type="button"
            style={activeCategory === 'beauty' ? chipActiveStyle : chipStyle}
            onClick={() => handleCategoryChange('beauty')}
          >
            {t('explore_map.beauty')}
          </button>
          <button
            type="button"
            style={activeCategory === 'stay' ? chipActiveStyle : chipStyle}
            onClick={() => handleCategoryChange('stay')}
          >
            {t('explore_map.stay')}
          </button>
        </div>
      </section>

      {/* Bottom section: loading / status message / place cards */}
      {showBottomSection && (
        <section
          style={{
            position: 'absolute',
            bottom: 'var(--nav-height, 72px)',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'linear-gradient(to top, rgba(247,241,234,0.98) 70%, transparent)',
            paddingTop: 16,
          }}
        >
          {isLoadingPlaces ? (
            <div style={{ padding: '16px 20px 20px', color: '#8f8274', fontSize: 13, fontWeight: 600 }}>
              {t('explore_map.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : statusMsg !== null && places.length === 0 ? (
            <div
              style={{
                margin: '0 16px 20px',
                padding: '14px 18px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.97)',
                boxShadow: '0 4px 14px rgba(40,31,22,0.10)',
                border: '1px solid rgba(215,200,181,0.7)',
                color: '#5b5146',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {statusMsg === 'login_required'
                ? t('explore_map.login_required')
                : statusMsg === 'no_results'
                ? t('explore_map.no_results', { defaultValue: '주변 1.5km 내에 장소가 없어요.' })
                : t('explore_map.location_denied')}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                padding: '4px 16px 20px',
                scrollbarWidth: 'none',
              }}
            >
              {places.map((place) => {
                const dist =
                  currentLocation != null
                    ? haversineMeters(currentLocation, { lat: place.lat, lng: place.lng })
                    : null;
                const mapsUrl =
                  place.googleMapsUri ??
                  `https://www.google.com/maps/search/?api=1&query_place_id=${place.id}`;

                return (
                  <div
                    key={place.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCenter({ lat: place.lat, lng: place.lng })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setCenter({ lat: place.lat, lng: place.lng });
                    }}
                    style={{
                      flexShrink: 0,
                      width: 210,
                      background: '#fff',
                      borderRadius: 16,
                      boxShadow: '0 6px 18px rgba(40,31,22,0.12)',
                      border: '1px solid rgba(215,200,181,0.6)',
                      padding: '14px 14px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: '#2d2823',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {place.name}
                    </span>

                    {place.address && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#8f8274',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}
                      >
                        {place.address}
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      {place.rating != null && (
                        <span style={{ fontSize: 12, color: '#c4942f', fontWeight: 700 }}>
                          ★ {place.rating.toFixed(1)}
                        </span>
                      )}
                      {place.userRatingCount != null && (
                        <span style={{ fontSize: 11, color: '#aaa9a6' }}>
                          ({place.userRatingCount.toLocaleString()})
                        </span>
                      )}
                      {dist != null && (
                        <span style={{ fontSize: 11, color: '#b89045', marginLeft: 'auto' }}>
                          {formatDistance(dist)}
                        </span>
                      )}
                    </div>

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'block',
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#4285f4',
                        textDecoration: 'none',
                        padding: '5px 0',
                        borderRadius: 8,
                        background: '#f0f4ff',
                        border: '1px solid #d0dcff',
                        textAlign: 'center',
                      }}
                    >
                      {t('explore_map.open_maps')}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
