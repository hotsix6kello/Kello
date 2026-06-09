import { NextResponse } from 'next/server';

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';

export async function POST(request: Request) {
    try {
        await requireAuthenticatedRouteAccess(request);
    } catch (error) {
        if (error instanceof AdminRouteAccessError) {
            return NextResponse.json({ error: 'login_required' }, { status: 401 });
        }
        throw error;
    }

    const { query, lat, lng, languageCode = 'en' } = await request.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ places: [] });
    }

    try {
        const body: Record<string, unknown> = {
            textQuery: query,
            languageCode: languageCode,
        };

        // 위치 정보가 있으면 반경 50km(50000m) 내 결과로 가중치를 둠 (제한이 아닌 바이어스)
        if (lat && lng) {
            body.locationBias = {
                circle: {
                    center: { latitude: lat, longitude: lng },
                    radius: 50000,
                },
            };
        }

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask':
                    'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos,places.editorialSummary',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';
        console.error('Google Places Text Search API Error:', errorMessage);
        return NextResponse.json(
            {
                error: 'Failed to search places',
                detail: errorMessage,
            },
            { status: 500 },
        );
    }
}
