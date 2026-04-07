'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

export default function KakaoMapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 이미 스크립트가 있다면 방어
    const SCRIPT_ID = 'kakao-map-script';
    
    const initMap = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        
        const options = {
          center: new window.kakao.maps.LatLng(37.4711, 126.7010),
          level: 3,
        };
        new window.kakao.maps.Map(mapRef.current, options);
      });
    };

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
  }, []);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* 상단: 지도 영역 (리렌더링 방어 레이아웃) */}
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height: '45vh', 
            minHeight: '350px',
            backgroundColor: '#e5e5e5',
            position: 'relative',
            flexShrink: 0
          }} 
        />

        {/* 하단: 업체 리스트 영역 (Kello 이미지 깨짐 방지 레이아웃) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
           {/* 데이터 연동 시 이 내부에 업체 카드들이 들어갑니다 */}
        </div>
      </div>
    </>
  );
}
