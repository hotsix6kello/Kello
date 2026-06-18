import { NextResponse } from 'next/server';

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';

export const runtime = 'nodejs';

const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  food: ['restaurant', 'cafe', 'bakery', 'korean_restaurant', 'japanese_restaurant', 'bar'],
  beauty: ['beauty_salon', 'hair_care', 'hair_salon', 'nail_salon', 'makeup_artist', 'skin_care_clinic', 'spa'],
  stay: ['lodging', 'hotel', 'guest_house', 'hostel', 'motel'],
};

const RADIUS_METERS = 1500;
const MAX_RESULTS = 10;
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri';

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
};

function parseNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


export async function GET(request: Request) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ error: 'login_required' }, { status: 401 });
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const lat = parseNumber(searchParams.get('lat'));
  const lng = parseNumber(searchParams.get('lng'));
  const category = searchParams.get('category') ?? '';
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  if (!CATEGORY_TYPE_MAP[category]) {
    return NextResponse.json(
      { error: 'category must be one of: food, beauty, stay' },
      { status: 400 },
    );
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_SERVER_KEY is not configured' }, { status: 500 });
  }

  const requestBody = {
    includedTypes: CATEGORY_TYPE_MAP[category],
    maxResultCount: MAX_RESULTS,
    rankPreference: 'DISTANCE',
    languageCode: 'ko',
    regionCode: 'KR',
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: RADIUS_METERS,
      },
    },
  };

  console.log('[api/places/nearby] request', { lat, lng, category, types: requestBody.includedTypes });

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json()) as { places?: GooglePlace[]; error?: { code?: number; message?: string; status?: string } };

    if (!response.ok) {
      console.error('[api/places/nearby] Google Places API error', {
        httpStatus: response.status,
        code: data.error?.code,
        message: data.error?.message,
        status: data.error?.status,
      });
      return NextResponse.json(
        { error: 'google_api_error', detail: data.error?.message ?? 'unknown' },
        { status: 502 },
      );
    }

    const places = ((data.places ?? []) as GooglePlace[])
      .filter((p) => p.id && p.location?.latitude != null && p.location?.longitude != null)
      .slice(0, MAX_RESULTS)
      .map((p) => ({
        id: p.id as string,
        name: p.displayName?.text ?? '',
        address: p.formattedAddress ?? null,
        lat: p.location!.latitude as number,
        lng: p.location!.longitude as number,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        googleMapsUri: p.googleMapsUri ?? null,
      }));

    console.log(`[api/places/nearby] result count: ${places.length}`);
    return NextResponse.json({ places });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/places/nearby] Unexpected error:', message);
    return NextResponse.json({ error: 'google_api_error', detail: message }, { status: 500 });
  }
}
