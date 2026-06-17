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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { setSharedBusinesses } = useTrip();
  const { t } = useTranslation('common');

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: mapsApiKey,
  });

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [center, setCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [searchBaseLocation, setSearchBaseLocation] = useState<Coordinates | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [partners, setPartners] = useState<PartnerResult[]>([]);
  const [places, setPlaces] = useState<NearbyPlaceResult[]>([]);
  const [activeList, setActiveList] = useState<ActiveList>('beauty');

  const activeBaseLocation = searchBaseLocation ?? currentLocation ?? center;

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;

      const token = data.session?.access_token ?? null;
      setSessionToken(token);
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
        setPlaces([]);
        setActiveList('beauty');
        setSharedBusinesses(nextPartners.map(toSharedBusiness));
      } catch (error) {
        console.error('[explore] partner fetch failed', error);
      }
    },
    [sessionToken, setSharedBusinesses],
  );

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentLocation(nextLocation);
        setSearchBaseLocation(null);
        setCenter(nextLocation);
        void fetchPartners(nextLocation);
      },
      () => {
        setCenter(DEFAULT_CENTER);
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
    if (!input || !sessionToken) return;

    try {
      const params = new URLSearchParams({ input });
      const res = await fetch(`/api/explore/place-autocomplete?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) throw new Error('autocomplete_failed');

      const data = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
      setSuggestions(data.suggestions ?? []);
    } catch (error) {
      console.error('[explore] autocomplete failed', error);
    }
  };

  const handleSuggestionSelect = async (suggestion: AutocompleteSuggestion) => {
    if (!sessionToken) return;

    try {
      const params = new URLSearchParams({ place_id: suggestion.place_id });
      const res = await fetch(`/api/explore/place-autocomplete?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) throw new Error('place_detail_failed');

      const detail = (await res.json()) as { place?: AutocompleteDetail };
      if (!detail.place) throw new Error('place_detail_missing');

      const nextLocation = { lat: detail.place.lat, lng: detail.place.lng };
      setCenter(nextLocation);
      setSearchBaseLocation(nextLocation);
      setSearchInput(detail.place.name);
      setSuggestions([]);
      await fetchPartners(nextLocation);
    } catch (error) {
      console.error('[explore] place detail failed', error);
    }
  };

  const fetchNearbyPlaces = async (type: 'restaurant' | 'lodging') => {
    if (!sessionToken) return;

    const location = activeBaseLocation;

    try {
      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        type,
      });

      const res = await fetch(`/api/explore/places/nearby?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (!res.ok) throw new Error('places_fetch_failed');

      const data = (await res.json()) as { places?: NearbyPlaceResult[] };
      setPlaces(data.places ?? []);
      setActiveList(type);
    } catch (error) {
      console.error('[explore] nearby places failed', error);
    }
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
            placeholder={t('explore_map.search_placeholder')}
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
            {t('explore_map.search_btn')}
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
            {t('explore_map.my_location')}
          </button>
          <button type="button" style={chipStyle} onClick={() => void fetchPartners(activeBaseLocation)}>
            {t('explore_map.beauty_shop')}
          </button>
          <button type="button" style={chipStyle} onClick={() => void fetchNearbyPlaces('restaurant')}>
            {t('explore_map.restaurant')}
          </button>
          <button type="button" style={chipStyle} onClick={() => void fetchNearbyPlaces('lodging')}>
            {t('explore_map.accommodation')}
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

      <section style={{ position: 'absolute', inset: 0 }}>
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

    </main>
  );
}
