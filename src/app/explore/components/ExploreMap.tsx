'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ServiceItem } from '../mock/data';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
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
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const initMap = () => {
    if (!window.kakao || !window.kakao.maps) return;
    
    window.kakao.maps.load(() => {
      if (!mapRef.current) return;
      
      // 기존에 맵이 있으면 초기화 안함 (React StrictMode 대응)
      if (mapRef.current.hasChildNodes() && mapInstance) return;

      const initialCenter = propCenter || DEFAULT_CENTER;
      const options = {
        center: new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
        level: propZoom ? Math.max(1, 15 - propZoom) : 3, // Kakao level is inverse of Naver zoom
      };

      const map = new window.kakao.maps.Map(mapRef.current, options);
      setMapInstance(map);
    });
  };

  useEffect(() => {
    const SCRIPT_ID = 'kakao-map-script';

    if (document.getElementById(SCRIPT_ID)) {
      if (window.kakao && window.kakao.maps) {
        initMap();
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || 'bf92ec51c26fcda4eb7fb33076f2d61b'}&libraries=services&autoload=false`;
    script.async = true;

    document.head.appendChild(script);

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        initMap();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // propCenter 변경 시 지도 중심 이동
  useEffect(() => {
    if (mapInstance && window.kakao?.maps?.LatLng && propCenter) {
      const moveLatLon = new window.kakao.maps.LatLng(propCenter.lat, propCenter.lng);
      mapInstance.setCenter(moveLatLon);
    }
  }, [propCenter, mapInstance]);

  // 실시간 위치 추적
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          if (mapInstance && window.kakao?.maps?.LatLng) {
            const moveLatLon = new window.kakao.maps.LatLng(coords.lat, coords.lng);
            mapInstance.setCenter(moveLatLon);
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
    if (!mapInstance || !window.kakao?.maps?.Marker || !window.kakao?.maps?.LatLng || !userLocation) return;
    
    // 이전에 생성된 마커가 있다면 제거는 생략하고 새로 그리는 방식으로 구현 (Kakao API에 맞게)
    const markerPosition = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    const userMarker = new window.kakao.maps.Marker({
      position: markerPosition
    });

    userMarker.setMap(mapInstance);

    return () => {
      userMarker.setMap(null);
    };
  }, [mapInstance, userLocation]);

  // 상점/서비스 마커 업데이트
  useEffect(() => {
    if (!mapInstance || !window.kakao?.maps?.Marker || !window.kakao?.maps?.LatLng || !window.kakao?.maps?.event) return;

    // 기존 마커 초기화
    markersRef.current.forEach(m => {
      m.setMap(null);
    });
    markersRef.current = [];

    items.forEach(item => {
      if (!item.lat || !item.lng) return;

      const markerPosition = new window.kakao.maps.LatLng(item.lat, item.lng);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        title: item.title || ''
      });

      marker.setMap(mapInstance);

      window.kakao.maps.event.addListener(marker, 'click', () => {
        onItemClick(item.id);
        const query = new URLSearchParams({
          name: item.title || '',
          address: item.description || item.area || '',
          image: item.image_url || ''
        }).toString();
        router.push(`/business/${item.id}?${query}`);
      });

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => {
        m.setMap(null);
      });
      markersRef.current = [];
    };
  }, [mapInstance, items, onItemClick, router]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto' }}>
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '0px', 
          pointerEvents: 'auto',
          zIndex: 10,
          position: 'relative'
        }} 
      />
    </div>
  );
}

