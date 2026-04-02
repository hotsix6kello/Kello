'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { ServiceItem } from '../mock/data';

declare global {
    interface Window {
        naver: any;
    }
}

interface ExploreMapProps {
    items: ServiceItem[];
    center?: { lat: number; lng: number };
    onItemClick: (id: string) => void;
    radius?: number;
    zoom?: number;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 서울 시청 Fallback

export default function ExploreMap({ items, center: propCenter, onItemClick, zoom: propZoom }: ExploreMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const markersRef = useRef<any[]>([]);
    
    // 네이버 맵 단 1회 초기화 방어 (React StrictMode 대응)
    const initRef = useRef(false);

    const isNaverMapFullyLoaded = () => {
        return (
            typeof window !== 'undefined' &&
            window.naver &&
            window.naver.maps &&
            typeof window.naver.maps.Map === 'function' &&
            window.naver.maps.LatLng &&
            window.naver.maps.Size
        );
    };

    const initMap = () => {
        if (!mapRef.current || !isNaverMapFullyLoaded()) return;
        if (mapRef.current.hasChildNodes()) return; // Prevent double init
        initRef.current = true;
        
        const initialCenter = propCenter || DEFAULT_CENTER;
        
        const map = new window.naver.maps.Map(mapRef.current, {
            center: new window.naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
            zoom: propZoom || 15,
            minZoom: 7,
            draggable: true,
            pinchZoom: true,
            scrollWheel: true,
            keyboardShortcuts: true,
            disableDoubleTapZoom: false,
            disableDoubleClickZoom: false,
            disableTwoFingerTapZoom: false,
            scaleControl: true,
            logoControl: true,
            mapDataControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: window.naver.maps.Position.RIGHT_CENTER,
            },
        });

        setMapInstance(map);
    };

    // propCenter 변경 시 지도 중심 이동 (새 맵 객체 렌더링 방지용)
    useEffect(() => {
        if (mapInstance && window.naver?.maps?.LatLng && propCenter) {
            mapInstance.setCenter(new window.naver.maps.LatLng(propCenter.lat, propCenter.lng));
        }
    }, [propCenter, mapInstance]);

    // 실시간 위치 추적
    useEffect(() => {
        if (typeof window !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(coords);
                    if (mapInstance && window.naver?.maps?.LatLng) {
                        mapInstance.setCenter(new window.naver.maps.LatLng(coords.lat, coords.lng));
                    }
                },
                (err) => {
                    console.warn('Geolocation error, using fallback.', err.message);
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
            );
        }
    }, [mapInstance]);

    // 내 위치 마커 업데이트
    useEffect(() => {
        if (!mapInstance || !window.naver?.maps?.Marker || !window.naver?.maps?.LatLng || !window.naver?.maps?.Point || !userLocation) return;
        
        const userMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(userLocation.lat, userLocation.lng),
            map: mapInstance,
            title: "You are here",
            icon: {
                content: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`,
                anchor: new window.naver.maps.Point(8, 8)
            }
        });

        return () => {
            try {
                userMarker.setMap(null);
            } catch (e) {
                console.warn('userMarker unmount error', e);
            }
        };
    }, [mapInstance, userLocation]);

    // 상점/서비스 마커 업데이트
    useEffect(() => {
        if (!mapInstance || !window.naver?.maps?.Marker || !window.naver?.maps?.LatLng || !window.naver?.maps?.Event) return;

        // 기존 마커 초기화
        markersRef.current.forEach(m => {
            try {
                m.setMap(null);
            } catch (e) {
                // Ignore strict mode immediate unmount errors
            }
        });
        markersRef.current = [];

        items.forEach(item => {
            if (!item.lat || !item.lng) return;

            const markerOptions: any = {
                position: new window.naver.maps.LatLng(item.lat, item.lng),
                map: mapInstance,
            };
            if (item.title) markerOptions.title = item.title;

            const marker = new window.naver.maps.Marker(markerOptions);

            window.naver.maps.Event.addListener(marker, 'click', () => {
                onItemClick(item.id);
            });

            markersRef.current.push(marker);
        });

        return () => {
            markersRef.current.forEach(m => {
                try {
                    m.setMap(null);
                } catch (e) {}
            });
            markersRef.current = [];
        };
    }, [mapInstance, items, onItemClick]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto' }}>
            <Script
                strategy="afterInteractive"
                src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=geocoder`}
                referrerPolicy="origin"
                onReady={initMap}
            />
            <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '0px', pointerEvents: 'auto' }} />
        </div>
    );
}
