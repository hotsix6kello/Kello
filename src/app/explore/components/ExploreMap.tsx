'use client';

import { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useTranslation } from 'react-i18next';
import { ServiceItem } from '../mock/data';
import styles from '../explore.module.css';

interface ExploreMapProps {
    items: ServiceItem[];
    center?: { lat: number; lng: number };
    onItemClick: (id: string) => void;
    radius?: number;
    zoom?: number;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '600px', // 물리적 높이 강제 확보
    borderRadius: '0px'
};

const OPTIONS = {
    disableDefaultUI: false, // 사용자 편의를 위해 기본 UI 일부 허용
    zoomControl: true,
    gestureHandling: 'greedy',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
};

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 서울 시청 Fallback

export default function ExploreMap({ items, center: propCenter, onItemClick, zoom: propZoom }: ExploreMapProps) {
    const { t } = useTranslation('common');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(propCenter || DEFAULT_CENTER);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        language: 'ko',
    });

    // 1. 사용자 실시간 위치 추적 및 중심 설정
    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(coords);
                    setMapCenter(coords);
                },
                (err) => {
                    console.warn('Geolocation access denied or timed out, using fallback.', err.message);
                    setMapCenter(propCenter || DEFAULT_CENTER);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
            );
        } else {
            setMapCenter(propCenter || DEFAULT_CENTER);
        }
    }, [propCenter]);

    const onLoad = useCallback(function callback() {
        // 지도 인스턴스 초기 로드 완료 시 동작
    }, []);

    const onUnmount = useCallback(function callback() {
        // 정리 작업
    }, []);

    if (loadError) {
        return (
            <div style={{ height: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff0f0', padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>Google Maps API Key Error</p>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', lineHeight: '1.5' }}>
                    GCP 콘솔에서 <b>Billing(결제 계정)</b>이 활성화되어 있는지,<br/>
                    혹은 <b>API Key 제한</b>에 localhost가 포함되어 있는지 확인해 주세요.
                </p>
                <code style={{ fontSize: '11px', background: '#eee', padding: '8px', borderRadius: '4px', marginTop: '16px', display: 'block', maxWidth: '100%', wordBreak: 'break-all' }}>
                    {loadError.message || 'Unknown Error'}
                </code>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div style={{ height: '600px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div className={styles.spinner}></div>
                <p style={{ marginTop: '16px', color: '#666' }}>{t('common.loading_map', { defaultValue: 'Loading Map...' })}</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '600px', width: '100%', position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={propZoom || 15}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={OPTIONS}
            >
                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                            scaledSize: new window.google.maps.Size(40, 40)
                        }}
                        title="You are here"
                    />
                )}

                {items.map(item => {
                    if (!item.lat || !item.lng) return null;
                    return (
                        <Marker
                            key={item.id}
                            position={{ lat: item.lat, lng: item.lng }}
                            onClick={() => onItemClick(item.id)}
                            title={item.title}
                        />
                    );
                })}
            </GoogleMap>
        </div>
    );
}
