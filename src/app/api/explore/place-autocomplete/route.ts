import { NextResponse } from 'next/server';

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';

type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

type GooglePlaceDetail = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

async function fetchPlaceDetail(placeId: string, apiKey: string) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
    },
  });
  const data = (await response.json()) as GooglePlaceDetail;

  if (!response.ok) {
    console.error('[api/explore/place-autocomplete] Google detail failed', data);
    return null;
  }

  if (!data.id || !data.location?.latitude || !data.location?.longitude) {
    return null;
  }

  return {
    id: data.id,
    name: data.displayName?.text ?? '',
    address: data.formattedAddress ?? null,
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
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
  const input = searchParams.get('input')?.trim() ?? '';
  const placeId = searchParams.get('place_id')?.trim() ?? '';
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY is not configured' }, { status: 500 });
  }

  if (placeId) {
    const place = await fetchPlaceDetail(placeId, apiKey);
    if (!place) {
      return NextResponse.json({ error: 'failed_to_fetch_place_detail' }, { status: 502 });
    }
    return NextResponse.json({ place });
  }

  if (!input) {
    return NextResponse.json({ suggestions: [] });
  }

  // Autocomplete is called only on user search submit to avoid unnecessary Places cost.
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text',
    },
    body: JSON.stringify({
      input,
      languageCode: 'ko',
      regionCode: 'KR',
      includedPrimaryTypes: ['lodging', 'locality', 'sublocality', 'neighborhood'],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[api/explore/place-autocomplete] Google autocomplete failed', data);
    return NextResponse.json({ error: 'failed_to_fetch_autocomplete' }, { status: 502 });
  }

  const suggestions = ((data.suggestions ?? []) as GoogleAutocompleteSuggestion[])
    .map((suggestion) => {
      const prediction = suggestion.placePrediction;
      if (!prediction?.placeId) return null;

      const mainText = prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '';
      return {
        place_id: prediction.placeId,
        label: prediction.text?.text ?? mainText,
        main_text: mainText,
        secondary_text: prediction.structuredFormat?.secondaryText?.text ?? null,
      };
    })
    .filter((suggestion): suggestion is NonNullable<typeof suggestion> => suggestion !== null)
    .slice(0, 6);

  return NextResponse.json({ suggestions });
}
