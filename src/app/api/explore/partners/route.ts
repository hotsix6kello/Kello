import { NextResponse } from 'next/server';

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';
import { isPartnerBusinessType, mapPartnerBusinessTypeToBookingFlowCategory } from '@/lib/bookings/partnerCategoryMap.ts';
import { getSupabaseServerClient, hasSupabaseServerAccess } from '@/lib/supabaseServer.ts';

type PartnerStoreRow = {
  id: string;
  name: string | null;
  address: string | null;
  business_types: string[] | null;
  latitude: number | null;
  longitude: number | null;
};

function parseNumber(value: string | null, fallback: number | null = null) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const radius = parseNumber(searchParams.get('radius'), 50000) ?? 50000;
  const category = searchParams.get('category');

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  if (!hasSupabaseServerAccess()) {
    return NextResponse.json({ partners: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, address, business_types, latitude, longitude')
    .eq('published', true)
    .eq('review_status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('[api/explore/partners] stores query failed', error.message);
    return NextResponse.json({ error: 'failed_to_fetch_partners' }, { status: 500 });
  }

  const partners = ((data ?? []) as PartnerStoreRow[])
    .filter((store) => typeof store.latitude === 'number' && typeof store.longitude === 'number')
    .map((store) => {
      const mappedCategories = (store.business_types ?? [])
        .filter(isPartnerBusinessType)
        .map(mapPartnerBusinessTypeToBookingFlowCategory);
      const distance = distanceInMeters(lat, lng, store.latitude as number, store.longitude as number);

      return {
        id: store.id,
        shop_name: store.name ?? '',
        shop_name_en: null,
        address: store.address,
        address_en: null,
        lat: store.latitude as number,
        lng: store.longitude as number,
        category: mappedCategories[0] ?? store.business_types?.[0] ?? 'beauty',
        main_image_url: null,
        supports_english: false,
        distance_m: Math.round(distance),
      };
    })
    .filter((partner) => partner.distance_m <= radius)
    .filter((partner) => !category || category === 'beauty' || partner.category === category)
    .sort((a, b) => a.distance_m - b.distance_m);

  return NextResponse.json({ partners });
}
