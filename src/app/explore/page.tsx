'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';

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
  types: string[];
};

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

type ActiveList = 'beauty' | 'restaurant' | 'lodging';

const DEFAULT_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 };
const DEFAULT_RADIUS_METERS = 50000;

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
};

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatDistance(distance: number | null | undefined) {
  if (!isValidCoordinate(distance)) return '';
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)}km`;
}

function getMarkerIcon(color: string): google.maps.Symbol | undefined {
  if (typeof window === 'undefined' || !window.google?.maps?.SymbolPath) {
    return undefined;
  }

  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    scale: 8,
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
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { setSharedBusinesses, setLastSelectedStoreId } = useTrip();

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: mapsApiKey,
  });

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [needsLoginToExplore, setNeedsLoginToExplore] = useState(false);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [searchBaseLocation, setSearchBaseLocation] = useState<Coordinates | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [partners, setPartners] = useState<PartnerResult[]>([]);
  const [places, setPlaces] = useState<NearbyPlaceResult[]>([]);
  const [activeList, setActiveList] = useState<ActiveList>('beauty');
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeBaseLocation = searchBaseLocation ?? currentLocation ?? center;

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;

      const token = data.session?.access_token ?? null;
      setSessionToken(token);
      setNeedsLoginToExplore(!token);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPartners = useCallback(
    async (location: Coordinates) => {
      if (!sessionToken) {
        setNeedsLoginToExplore(true);
        return;
      }

      setLoadingMessage('주변 K-Beauty 제휴샵을 찾는 중입니다.');
      setNotice(null);

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

        if (!res.ok) {
          if (res.status === 401) setNeedsLoginToExplore(true);
          throw new Error('partners_fetch_failed');
        }

        const data = (await res.json()) as { partners?: PartnerResult[] };
        const nextPartners = data.partners ?? [];
        setPartners(nextPartners);
        setPlaces([]);
        setActiveList('beauty');
        setSharedBusinesses(nextPartners.map(toSharedBusiness));
      } catch (error) {
        console.error('[explore] partner fetch failed', error);
        setNotice('제휴샵 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setLoadingMessage(null);
      }
    },
    [sessionToken, setSharedBusinesses],
  );

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    setLoadingMessage('현재 위치를 확인하는 중입니다.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentLocation(nextLocation);
        setSearchBaseLocation(null);
        setLocationDenied(false);
        setCenter(nextLocation);
        setLoadingMessage(null);
        void fetchPartners(nextLocation);
      },
      () => {
        setLocationDenied(true);
        setCenter(DEFAULT_CENTER);
        setLoadingMessage(null);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  }, [fetchPartners]);

  useEffect(() => {
    if (!sessionToken) return;
    requestCurrentLocation();
  }, [requestCurrentLocation, sessionToken]);

  const handleSuggestionSearch = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const input = searchInput.trim();
    if (!input || !sessionToken) {
      if (!sessionToken) setNeedsLoginToExplore(true);
      return;
    }

    setLoadingMessage('검색 후보를 불러오는 중입니다.');
    setNotice(null);

    try {
      const params = new URLSearchParams({ input });
      const res = await fetch(`/api/explore/place-autocomplete?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) {
        throw new Error('autocomplete_failed');
      }

      const data = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
      setSuggestions(data.suggestions ?? []);
      if ((data.suggestions ?? []).length === 0) {
        setNotice('검색 후보가 없습니다. 숙소명이나 지역명을 조금 더 구체적으로 입력해주세요.');
      }
    } catch (error) {
      console.error('[explore] autocomplete failed', error);
      setNotice('숙소/지역 검색을 불러오지 못했습니다.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const handleSuggestionSelect = async (suggestion: AutocompleteSuggestion) => {
    if (!sessionToken) {
      setNeedsLoginToExplore(true);
      return;
    }

    setLoadingMessage('선택한 위치로 이동하는 중입니다.');
    setNotice(null);

    try {
      const params = new URLSearchParams({ place_id: suggestion.place_id });
      const res = await fetch(`/api/explore/place-autocomplete?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) {
        throw new Error('place_detail_failed');
      }

      const detail = (await res.json()) as { place?: AutocompleteDetail };
      if (!detail.place) {
        throw new Error('place_detail_missing');
      }

      const nextLocation = { lat: detail.place.lat, lng: detail.place.lng };
      setCenter(nextLocation);
      setSearchBaseLocation(nextLocation);
      setSearchInput(detail.place.name);
      setSuggestions([]);
      await fetchPartners(nextLocation);
    } catch (error) {
      console.error('[explore] place detail failed', error);
      setNotice('선택한 위치 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const fetchNearbyPlaces = async (type: 'restaurant' | 'lodging') => {
    if (!sessionToken) {
      setNeedsLoginToExplore(true);
      return;
    }

    const location = activeBaseLocation;
    setLoadingMessage(type === 'restaurant' ? '주변 맛집을 찾는 중입니다.' : '주변 숙소를 찾는 중입니다.');
    setNotice(null);

    try {
      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        type,
      });

      const res = await fetch(`/api/explore/places/nearby?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) {
        throw new Error('places_fetch_failed');
      }

      const data = (await res.json()) as { places?: NearbyPlaceResult[] };
      setPlaces(data.places ?? []);
      setActiveList(type);
    } catch (error) {
      console.error('[explore] nearby places failed', error);
      setNotice('주변 장소 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const handleQuoteClick = (partner: PartnerResult) => {
    setLastSelectedStoreId(partner.id);
    router.push(
      `/?booking=true&business_name=${encodeURIComponent(partner.shop_name)}&store_id=${encodeURIComponent(
        partner.id,
      )}&store_source=partner`,
    );
  };

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      zoomControl: true,
      styles: [
        {
          featureType: 'poi.business',
          stylers: [{ visibility: 'off' }],
        },
      ],
    }),
    [],
  );

  const visiblePlaces = activeList === 'beauty' ? [] : places;
  const activeTitle =
    activeList === 'beauty' ? 'Kello 제휴 뷰티샵' : activeList === 'restaurant' ? '주변 맛집' : '주변 숙소';
  const resultCount = activeList === 'beauty' ? partners.length : places.length;
  const hasResults = resultCount > 0;
  const showEmptyBeauty = !needsLoginToExplore && !loadingMessage && activeList === 'beauty' && partners.length === 0;
  const showEmptyPlaces = !needsLoginToExplore && !loadingMessage && activeList !== 'beauty' && places.length === 0;

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
        <form
          onSubmit={handleSuggestionSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px 8px 14px',
            borderRadius: 24,
            background: '#fff',
            boxShadow: '0 12px 28px rgba(40, 31, 22, 0.16)',
            border: '1px solid rgba(215, 200, 181, 0.8)',
            pointerEvents: 'auto',
          }}
        >
          <span aria-hidden="true" style={{ color: '#b89045', fontSize: 16 }}>
            🔎
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="숙소명, 호텔, 지역을 검색해보세요"
            style={{
              minWidth: 0,
              flex: 1,
              border: 'none',
              outline: 'none',
              color: '#2d2823',
              fontSize: 14,
              fontWeight: 650,
              background: 'transparent',
            }}
          />
          <button
            type="submit"
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '9px 14px',
              background: '#c4942f',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            검색
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '10px 2px 2px',
            pointerEvents: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          <button type="button" style={chipStyle} onClick={requestCurrentLocation}>
            내 위치
          </button>
          <button type="button" style={chipStyle} onClick={() => void fetchPartners(activeBaseLocation)}>
            뷰티샵
          </button>
          <button type="button" style={chipStyle} onClick={() => void fetchNearbyPlaces('restaurant')}>
            맛집
          </button>
          <button type="button" style={chipStyle} onClick={() => void fetchNearbyPlaces('lodging')}>
            숙소
          </button>
        </div>

        {suggestions.length > 0 && (
          <div
            style={{
              marginTop: 8,
              borderRadius: 18,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 12px 26px rgba(40, 31, 22, 0.14)',
              pointerEvents: 'auto',
            }}
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                onClick={() => void handleSuggestionSelect(suggestion)}
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
                <strong style={{ display: 'block', color: '#2f2923', fontSize: 14 }}>{suggestion.main_text}</strong>
                {suggestion.secondary_text && (
                  <span style={{ display: 'block', color: '#8f8274', fontSize: 12, marginTop: 3 }}>
                    {suggestion.secondary_text}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ position: 'absolute', inset: 0, paddingBottom: 96 }}>
        {mapsApiKey && isLoaded && !loadError ? (
          <GoogleMap
            center={center}
            zoom={14}
            mapContainerStyle={{ width: '100%', height: '100%' }}
            options={mapOptions}
            onDragEnd={() => {
              setSuggestions([]);
            }}
          >
            {currentLocation && (
              <MarkerF
                position={currentLocation}
                label={{ text: '나', color: '#ffffff', fontWeight: '800', fontSize: '11px' }}
                icon={getMarkerIcon('#2f80ed')}
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
            {visiblePlaces.map((place) => (
              <MarkerF
                key={place.id}
                position={{ lat: place.lat, lng: place.lng }}
                label={{
                  text: activeList === 'restaurant' ? '맛' : '숙',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '11px',
                }}
                icon={getMarkerIcon(activeList === 'restaurant' ? '#22a06b' : '#c58a12')}
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
            지도 표시를 위해 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY가 필요합니다.
          </div>
        )}
      </section>

      <section
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 82,
          zIndex: 30,
          padding: '0 14px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            borderRadius: '24px 24px 0 0',
            background: hasResults ? 'rgba(255, 252, 248, 0.96)' : 'transparent',
            boxShadow: hasResults ? '0 -16px 34px rgba(48, 37, 27, 0.16)' : 'none',
            border: hasResults ? '1px solid rgba(218, 204, 187, 0.86)' : 'none',
            padding: hasResults ? '14px 14px 14px' : 0,
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              borderRadius: hasResults ? 0 : 24,
              background: hasResults ? 'transparent' : 'rgba(255, 252, 248, 0.96)',
              boxShadow: hasResults ? 'none' : '0 -12px 28px rgba(48, 37, 27, 0.14)',
              border: hasResults ? 'none' : '1px solid rgba(218, 204, 187, 0.86)',
              padding: hasResults ? 0 : '12px 14px 14px',
            }}
          >
            <div style={{ width: 38, height: 4, borderRadius: 999, background: '#d5c5b2', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: '#2d2823', fontSize: 16, fontWeight: 900 }}>{activeTitle}</h2>
              <span style={{ color: '#967d61', fontSize: 12, fontWeight: 800 }}>{resultCount}곳</span>
            </div>

            {needsLoginToExplore && (
              <div style={{ marginTop: 12, padding: 16, borderRadius: 18, background: '#fff5f2', color: '#6b352b' }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>로그인이 필요합니다.</strong>
                <p style={{ margin: '0 0 12px', fontSize: 13 }}>로그인하면 내 주변 Kello 제휴샵을 볼 수 있어요.</p>
                <button
                  type="button"
                  onClick={() => router.push('/auth/login?redirect=/explore')}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '10px 18px',
                    background: '#c4942f',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  로그인하기
                </button>
              </div>
            )}

            {!needsLoginToExplore && locationDenied && (
              <div style={{ marginTop: 10, padding: '11px 14px', borderRadius: 16, background: '#fff7e8', color: '#6b5537', fontSize: 13, lineHeight: 1.5 }}>
                위치 권한을 허용하면 내 주변 매장을 볼 수 있어요. 또는 숙소명/지역을 검색해 주변 K-Beauty
                제휴샵을 찾아보세요.
              </div>
            )}

            {loadingMessage && (
              <p style={{ margin: '12px 0 0', color: '#806f5d', fontSize: 13, fontWeight: 700 }}>{loadingMessage}</p>
            )}
            {notice && <p style={{ margin: '12px 0 0', color: '#9a5b30', fontSize: 13, fontWeight: 700 }}>{notice}</p>}
            {showEmptyBeauty && !locationDenied && (
              <p style={{ margin: '10px 0 0', color: '#897967', fontSize: 13 }}>
                이 위치 주변에 표시할 Kello 제휴 뷰티샵이 아직 없습니다.
              </p>
            )}
            {showEmptyPlaces && (
              <p style={{ margin: '10px 0 0', color: '#897967', fontSize: 13 }}>
                맛집 또는 숙소 칩을 누르면 주변 장소를 불러옵니다.
              </p>
            )}
          </div>

          {!needsLoginToExplore && activeList === 'beauty' && partners.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 12,
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: 2,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {partners.map((partner) => (
                <article
                  key={partner.id}
                  style={{
                    flex: '0 0 calc(100% - 26px)',
                    maxWidth: 360,
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    borderRadius: 18,
                    border: '1px solid #eadccc',
                    background: '#fff',
                    padding: 14,
                    scrollSnapAlign: 'start',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: 'block',
                        color: '#2f2923',
                        fontSize: 15,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {partner.shop_name}
                    </strong>
                    <span style={{ display: 'block', color: '#897967', fontSize: 12, marginTop: 4 }}>
                      {partner.address ?? '주소 정보 없음'}
                    </span>
                    <span style={{ display: 'block', color: '#c4942f', fontSize: 12, marginTop: 5, fontWeight: 800 }}>
                      {formatDistance(partner.distance_m)}
                      {partner.supports_english ? ' · English OK' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuoteClick(partner)}
                    style={{
                      alignSelf: 'center',
                      border: 'none',
                      borderRadius: 999,
                      padding: '10px 12px',
                      background: '#f05d8f',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    견적 문의하기
                  </button>
                </article>
              ))}
            </div>
          )}

          {!needsLoginToExplore && activeList !== 'beauty' && places.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 12,
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: 2,
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {places.map((place) => (
                <article
                  key={place.id}
                  style={{
                    flex: '0 0 calc(100% - 26px)',
                    maxWidth: 360,
                    borderRadius: 18,
                    border: '1px solid #eadccc',
                    background: '#fff',
                    padding: 14,
                    scrollSnapAlign: 'start',
                  }}
                >
                  <strong style={{ display: 'block', color: '#2f2923', fontSize: 15 }}>{place.name}</strong>
                  <span style={{ display: 'block', color: '#897967', fontSize: 12, marginTop: 4 }}>
                    {place.address ?? '주소 정보 없음'}
                  </span>
                  {place.rating !== null && (
                    <span style={{ display: 'block', color: '#c4942f', fontSize: 12, marginTop: 5, fontWeight: 800 }}>
                      평점 {place.rating}
                      {place.userRatingCount ? ` · 리뷰 ${place.userRatingCount}` : ''}
                    </span>
                  )}
                </article>
              ))}
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
