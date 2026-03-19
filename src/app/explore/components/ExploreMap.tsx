'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { ServiceItem } from '../mock/data';
import styles from '../explore.module.css';

interface ExploreMapProps {
    items: ServiceItem[];
    center: { lat: number; lng: number, name?: string };
    onItemClick: (id: string) => void;
    radius?: number;
    zoom?: number;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    borderRadius: '12px'
};

const OPTIONS = {
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
};

export default function ExploreMap(props: ExploreMapProps) {
    const [mapLang, setMapLang] = useState<string | null>(null);

    useEffect(() => {
        // Map i18n codes back to valid Google Maps language codes if necessary
        const stored = localStorage.getItem('ktrip_lang') || 'ko';
        const googleMapLanguageMapping: Record<string, string> = {
            'jp': 'ja',
            'cn': 'zh-CN',
            'tw': 'zh-TW',
            'ko': 'ko',
            'en': 'en',
            'th': 'th',
            'vi': 'vi',
            'es': 'es',
            'fr': 'fr',
            'de': 'de',
            'id': 'id',
            'ms': 'ms',
            'ru': 'ru',
            'ar': 'ar',
            'pt': 'pt'
        };
        setMapLang(googleMapLanguageMapping[stored] || 'en');
    }, []);

    if (!mapLang) {
        return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Initializing Map...</div>;
    }

    return <ExploreMapInner {...props} lang={mapLang} />;
}

function ExploreMapInner({ items, center, onItemClick, radius, zoom, lang }: ExploreMapProps & { lang: string }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
        language: lang,
    });

    const { t, i18n } = useTranslation('common');
    const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);

    // Routing states
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[] | null>(null);
    const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; transitLines?: string[] } | null>(null);
    const [travelMode, setTravelMode] = useState<string>('TRANSIT');

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => {
                    console.log('Map location error, using fallback', err);
                    setCurrentLocation({ lat: 37.5665, lng: 126.9780 }); // Fallback to a default center
                },
                { timeout: 3000 }
            );
        } else {
            setCurrentLocation({ lat: 37.5665, lng: 126.9780 });
        }
    }, []);

    // Fetch route from our API
    useEffect(() => {
        if (!currentLocation || !center) return;

        const fetchRoute = async () => {
            try {
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
                const res = await fetch('/api/routes/compute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps'
                    },
                    body: JSON.stringify({
                        origin: currentLocation,
                        destination: { lat: center.lat, lng: center.lng },
                        travelMode: travelMode
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        const points = decodePolyline(route.polyline.encodedPolyline);
                        setRoutePath(points);

                        const distKm = (route.distanceMeters / 1000).toFixed(1);
                        const durSec = parseInt(route.duration.replace('s', ''));
                        const durMin = Math.ceil(durSec / 60);

                        setRouteInfo({
                            distance: `${distKm} km`,
                            duration: `${durMin} min`
                        });
                        return;
                    }
                }
                throw new Error('API failed or no routes');
            } catch (err) {
                // Fallback: Show a simple mock route for demonstration
                console.log('Using mock route for demo');
                const mockPath = [
                    currentLocation,
                    { lat: (currentLocation.lat + center.lat) / 2 + 0.002, lng: (currentLocation.lng + center.lng) / 2 + 0.001 },
                    { lat: center.lat, lng: center.lng }
                ];
                setRoutePath(mockPath);
                setRouteInfo({
                    distance: '2.4 km',
                    duration: '15 min',
                    transitLines: travelMode === 'TRANSIT' ? ['Blue Line', 'Bus 701'] : undefined
                });
            }
        };

        fetchRoute();
    }, [currentLocation, center, travelMode]);

    // Helper to decode polyline
    const decodePolyline = (encoded: string) => {
        const points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            points.push({ lat: (lat / 1e5), lng: (lng / 1e5) });
        }
        return points;
    };

    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const handleKRide = (item: ServiceItem) => {
        let deeplink = `kride://route?dest_lat=${item.lat}&dest_lng=${item.lng}&dest_name=${encodeURIComponent(item.title)}`;
        if (currentLocation) {
            deeplink += `&origin_lat=${currentLocation.lat}&origin_lng=${currentLocation.lng}&origin_name=${encodeURIComponent('My Location')}`;
        }

        // Attempt to open the app
        window.location.href = deeplink;

        // Fallback to store if app not opened
        setTimeout(() => {
            if (document.hidden) return;
            const ua = navigator.userAgent;
            const isiOS = ua.includes('iPhone') || ua.includes('iPad');
            const isAndroid = ua.includes('Android');

            if (isiOS) {
                window.open('https://apps.apple.com/app/k-ride/id6478148574', '_blank');
            } else if (isAndroid) {
                window.open('https://play.google.com/store/apps/details?id=com.kakaomobility.kride', '_blank');
            }
        }, 2500);
    };

    const handleTransit = (item: ServiceItem) => {
        const origin = currentLocation ? `${currentLocation.lat},${currentLocation.lng}` : 'My Location';
        const dest = `${item.lat},${item.lng}`;
        const lang = i18n.language;
        const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&destination_place_id=${encodeURIComponent(item.title)}&travelmode=transit&hl=${lang}`;
        window.open(googleUrl, '_blank');
    };

    const handleGoogleMaps = (item: ServiceItem) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`, '_blank');
    };

    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            const priorityA = 0;
            const priorityB = 0;
            return priorityB - priorityA;
        });
    }, [items]);

    if (!isLoaded) return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div>;

    let finalZoom = zoom || 14;
    if (radius && !zoom) {
        if (radius <= 500) finalZoom = 16;
        else if (radius <= 1000) finalZoom = 15;
        else if (radius <= 3000) finalZoom = 13;
    }

    return (
        <div style={{ height: '100%', width: '100%', minHeight: '400px', position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={finalZoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={OPTIONS}
            >
                {/* Route logic via Polyline */}
                {routePath && (
                    <Polyline
                        path={routePath}
                        options={{
                            strokeColor: '#2563eb',
                            strokeOpacity: 0.8,
                            strokeWeight: 5
                        }}
                    />
                )}

                {/* Current Location Marker */}
                {currentLocation && (
                    <Marker
                        position={currentLocation}
                        icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                        }}
                        title="My Current Location"
                    />
                )}

                {/* Hotel/Base Marker */}
                <Marker
                    position={center}
                    icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }}
                    title={center.name || "Hotel / Destination"}
                    onClick={() => {
                        const centerItem = {
                            id: 'center-dest',
                            title: center.name || 'Destination',
                            area: '',
                            lat: center.lat,
                            lng: center.lng,
                            type: 'attraction'
                        } as any;
                        setSelectedItem(centerItem);
                    }}
                />

                {sortedItems.map(item => {
                    if (!item.lat || !item.lng) return null;

                    return (
                        <Marker
                            key={item.id}
                            position={{ lat: item.lat, lng: item.lng }}
                            onClick={() => setSelectedItem(item)}
                        />
                    );
                })}

                {selectedItem && selectedItem.lat && selectedItem.lng && (
                    <InfoWindow
                        position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
                        onCloseClick={() => setSelectedItem(null)}
                    >
                        <div className={styles.infoWindow} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.infoTitle}>{selectedItem.title}</h3>
                            <p className={styles.infoArea}>{selectedItem.area}</p>

                            <div className={styles.infoActions}>
                                <button
                                    className={`${styles.infoActionBtn} ${styles.infoActionKride}`}
                                    onClick={() => handleKRide(selectedItem)}
                                >
                                    🚕 K.Ride
                                </button>
                                <button
                                    className={`${styles.infoActionBtn} ${styles.infoActionTransit}`}
                                    onClick={() => handleTransit(selectedItem)}
                                >
                                    🚇 Transit
                                </button>
                                <button
                                    className={`${styles.infoActionBtn} ${styles.infoActionMap}`}
                                    onClick={() => handleGoogleMaps(selectedItem)}
                                >
                                    🌐 Map
                                </button>
                                <button
                                    className={styles.infoActionBtn}
                                    onClick={() => onItemClick(selectedItem.id)}
                                >
                                    📄 {t('common.details', { defaultValue: 'Details' })}
                                </button>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Route Overlay Info */}
            {routeInfo && (
                <div className={styles.routeOverlay}>
                    <div className={styles.routeHeader}>
                        <span className={styles.routeIcon}>🚕</span>
                        <div className={styles.routeInfo}>
                            <div className={styles.routeTitle}>Route to {center.name || 'Hotel'}</div>
                            <div className={styles.routeStats}>
                                {routeInfo.distance} · {routeInfo.duration}
                            </div>
                            {routeInfo.transitLines && (
                                <div className={styles.transitLines}>
                                    {routeInfo.transitLines.map((line, idx) => (
                                        <span key={idx} className={styles.transitBadge}>
                                            {line}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.modeSelector}>
                        <button
                            className={`${styles.modeBtn} ${travelMode === 'TRANSIT' ? styles.active : ''}`}
                            onClick={() => {
                                setRoutePath(null);
                                setRouteInfo(null);
                                setTravelMode('TRANSIT');
                            }}
                        >
                            🚇 {t('fab.transit')}
                        </button>
                        <button
                            className={`${styles.modeBtn} ${travelMode === 'DRIVING' ? styles.active : ''}`}
                            onClick={() => {
                                setRoutePath(null);
                                setRouteInfo(null);
                                setTravelMode('DRIVING');
                            }}
                        >
                            🚕 {t('fab.kride')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
