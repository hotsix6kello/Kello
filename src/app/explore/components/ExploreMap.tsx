'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
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
    minHeight: '100%', // 레이아웃을 꽉 채우기 위해 height 100% 유지
    borderRadius: '0px' // 탐색창 전체를 채우기 위해 라운드 제거
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

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        language: 'ko', // 기본 한국어 설정
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
                    // 에러 발생 시 조용히 기본 위치로 이동 (console.error 대신 warn 사용)
                    console.warn('Geolocation access denied or timed out, using fallback.', err.message);
                    setMapCenter(propCenter || DEFAULT_CENTER);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
            );
        } else {
            setMapCenter(propCenter || DEFAULT_CENTER);
        }
    }, [propCenter]);

    const onLoad = useCallback(function callback(_map: google.maps.Map) {
        // 지도 인스턴스 초기 로드 완료 시 동작
    }, []);

    const onUnmount = useCallback(function callback(_map: google.maps.Map) {
        // 정리 작업
    }, []);

    if (!isLoaded) {
        return (
            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <div className={styles.spinner}></div>
                <p style={{ marginTop: '16px', color: '#666' }}>{t('common.loading_map', { defaultValue: 'Loading Map...' })}</p>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={propZoom || 15} // 기본 줌 레벨 15 설정
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={OPTIONS}
            >
                {/* 2. 사용자 현재 위치 마커 표시 */}
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

                {/* 3. 뷰티샵/명소 마커들 표시 */}
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
