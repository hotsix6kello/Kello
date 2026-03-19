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
    const { lat, lng, radius = 1000, category } = await request.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const includedTypes = CATEGORY_TYPE_MAP[category] || [];

    try {
        const body: any = {
            locationRestriction: {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: radius
                }
            }
        };

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

        const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos'
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch nearby places' }, { status: 500 });
    }
}
