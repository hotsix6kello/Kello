import { NextResponse } from 'next/server';

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';
import { getSupabaseServerClient, hasSupabaseServerAccess } from '@/lib/supabaseServer.ts';
import {
    isPartnerBusinessType,
    mapPartnerBusinessTypeToBookingFlowCategory,
} from '@/lib/bookings/partnerCategoryMap.ts';

const CATEGORY_TYPE_MAP: Record<string, string[]> = {
    beauty: [
        'skin_care_clinic', 'spa', 'massage', 'beauty_salon',
        'hair_salon', 'nail_salon', 'barber_shop', 'sauna'
    ],
    food: ['restaurant', 'cafe', 'bakery', 'dessert_shop', 'bar'],
    attraction: [
        'tourist_attraction', 'historical_landmark', 'museum',
        'art_gallery', 'park', 'shopping_mall'
    ],
    event: [
        'event_venue', 'concert_hall', 'live_music_venue',
        'movie_theater', 'performing_arts_theater', 'amusement_park', 'aquarium'
    ]
};

const PARTNER_STORE_SEARCH_RADIUS_METERS = 50000; // 기존 Google 검색 반경(50km)과 동일

type PartnerStoreRow = {
    id: string;
    name: string | null;
    address: string | null;
    phone: string | null;
    business_types: string[] | null;
    latitude: number | null;
    longitude: number | null;
};

// 두 좌표 사이의 거리를 미터(m) 단위로 계산 (Haversine formula)
function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusMeters = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);

    const a =
        sinDLat * sinDLat +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLng * sinDLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
}

// Kello Partner 제휴 매장 중 고객 앱(Kello)에 노출 가능한(승인 완료 + 좌표 보유) 매장을
// 요청 좌표 기준 반경 내에서 조회해, 탐색 화면에서 쓰는 응답 형태로 변환한다.
async function fetchNearbyPartnerStores(lat: number, lng: number): Promise<Record<string, unknown>[]> {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return [];
    }

    if (!hasSupabaseServerAccess()) {
        return [];
    }

    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from('stores')
            .select('id, name, address, phone, business_types, latitude, longitude')
            .eq('published', true)
            .eq('review_status', 'approved')
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

        if (error) {
            console.error('[places/nearby] Failed to fetch partner stores:', error.message);
            return [];
        }

        const rows = (data ?? []) as PartnerStoreRow[];

        return rows
            .filter((store) => {
                if (typeof store.latitude !== 'number' || typeof store.longitude !== 'number') {
                    return false;
                }
                return distanceInMeters(lat, lng, store.latitude, store.longitude) <= PARTNER_STORE_SEARCH_RADIUS_METERS;
            })
            .map((store) => {
                const bookingFlowCategories = (store.business_types ?? [])
                    .filter(isPartnerBusinessType)
                    .map(mapPartnerBusinessTypeToBookingFlowCategory);

                return {
                    id: store.id,
                    store_id: store.id,
                    source: 'partner',
                    name: store.name ?? '',
                    displayName: { text: store.name ?? '' },
                    formattedAddress: store.address ?? '',
                    address: store.address ?? '',
                    vicinity: store.address ?? '',
                    location: { latitude: store.latitude, longitude: store.longitude },
                    lat: store.latitude,
                    lng: store.longitude,
                    // 기존 프론트엔드의 "뷰티 키워드" 필터를 통과하도록 카테고리 텍스트에 '뷰티'를 포함시킨다.
                    category: '뷰티',
                    types: bookingFlowCategories,
                };
            });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[places/nearby] Unexpected error while fetching partner stores:', message);
        return [];
    }
}

export async function POST(request: Request) {
    try {
        await requireAuthenticatedRouteAccess(request);
    } catch (error) {
        if (error instanceof AdminRouteAccessError) {
            return NextResponse.json({ error: 'login_required' }, { status: 401 });
        }
        throw error;
    }

    const { lat, lng, category, query } = await request.json();
    const fixedRadius = 50000; // Increased to 50km to remove strict restriction
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const includedTypes = CATEGORY_TYPE_MAP[category] || [];

    // 제휴 매장은 모두 뷰티 업종이므로, 뷰티 탐색(또는 카테고리 미지정/전체) 요청일 때만 함께 노출한다.
    const shouldIncludePartnerStores = !category || category === 'beauty' || category === 'all';
    const partnerStoresPromise = shouldIncludePartnerStores
        ? fetchNearbyPartnerStores(lat, lng)
        : Promise.resolve<Record<string, unknown>[]>([]);

    try {
        interface SearchNearbyRequest {
            locationRestriction: {
                circle: {
                    center: { latitude: number; longitude: number };
                    radius: number;
                };
            };
            includedTypes?: string[];
        }

        const body: SearchNearbyRequest & { rankPreference?: string } = {
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: fixedRadius
                }
            }
        };

        // 거리순 정렬을 위해 rankPreference 추가 (includedTypes가 있을 때 사용 가능)
        body.rankPreference = "DISTANCE";

        if (includedTypes.length > 0) {
            body.includedTypes = includedTypes;
        } else if (category === 'all') {
            body.includedTypes = [
                ...CATEGORY_TYPE_MAP.beauty,
                ...CATEGORY_TYPE_MAP.food,
                ...CATEGORY_TYPE_MAP.attraction,
                ...CATEGORY_TYPE_MAP.event
            ];
        }

        // [핵심] 만약 사용자가 프론트엔드에서 검색어(query)를 보냈다면,
        // 묻지마 주변거리 탐색(searchNearby)이 아닌 명시적 텍스트 검색(searchText) API를 사용합니다.
        let endPoint = 'https://places.googleapis.com/v1/places:searchNearby';
        let finalBody: unknown = body;

        if (query) {
            endPoint = 'https://places.googleapis.com/v1/places:searchText';
            finalBody = {
                textQuery: query, // 사용자의 검색어 그대로 토스
                locationBias: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: 50000.0
                    }
                }
            };
        }

        const response = await fetch(endPoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos'
            },
            body: JSON.stringify(finalBody),
        });

        const data = await response.json();
        const partnerStores = await partnerStoresPromise;

        const googlePlaces = Array.isArray(data?.places)
            ? data.places.map((place: Record<string, unknown>) => ({ source: 'google', ...place }))
            : [];

        return NextResponse.json({
            ...data,
            places: [...partnerStores, ...googlePlaces],
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';
        console.error('Google Places Nearby API Error 상세:', errorMessage);
        return NextResponse.json({
            error: 'Failed to fetch nearby places',
            detail: errorMessage
        }, { status: 500 });
    }
}
