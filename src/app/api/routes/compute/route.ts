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

    const { origin, destination, travelMode = 'TRANSIT' } = await request.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            },
            body: JSON.stringify({
                origin: {
                    location: {
                        latLng: {
                            latitude: origin.lat,
                            longitude: origin.lng
                        }
                    }
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: destination.lat,
                            longitude: destination.lng
                        }
                    }
                },
                travelMode: travelMode === 'DRIVING' ? 'DRIVE' : 'TRANSIT',
                units: 'METRIC',
            }),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Routes API Error:', error);
        return NextResponse.json({ error: 'Failed to compute routes' }, { status: 500 });
    }
}
