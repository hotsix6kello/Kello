import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
    const { lat, lng, category, query } = await request.json();
    const fixedRadius = 50000; // Increased to 50km to remove strict restriction
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const includedTypes = CATEGORY_TYPE_MAP[category] || [];

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
        let finalBody: any = body;

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
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';
        console.error('Google Places Nearby API Error 상세:', errorMessage);
        return NextResponse.json({ 
            error: 'Failed to fetch nearby places',
            detail: errorMessage
        }, { status: 500 });
    }
}
