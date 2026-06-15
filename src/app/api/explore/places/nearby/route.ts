import { NextResponse } from 'next/server';

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';

const ALLOWED_TYPES = new Set(['restaurant', 'cafe', 'lodging']);

type GoogleNearbyPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
};

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const type = searchParams.get('type') ?? '';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: 'type must be restaurant, cafe, or lodging' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY is not configured' }, { status: 500 });
  }

  // Keep this server-side key restricted to Places API. The browser map uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types',
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 10,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 2000,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[api/explore/places/nearby] Google Places failed', data);
    return NextResponse.json({ error: 'failed_to_fetch_places' }, { status: 502 });
  }

  const places = ((data.places ?? []) as GoogleNearbyPlace[])
    .filter((place) => place.id && place.location?.latitude && place.location?.longitude)
    .slice(0, 10)
    .map((place) => ({
      id: place.id as string,
      name: place.displayName?.text ?? '',
      address: place.formattedAddress ?? null,
      lat: place.location?.latitude as number,
      lng: place.location?.longitude as number,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      types: place.types ?? [],
    }));

  return NextResponse.json({ places });
}
