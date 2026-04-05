'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExplorePage() {
  const [searchInput, setSearchInput] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [businessList, setBusinessList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null); // 카카오맵 인스턴스 보관용 Ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);     // 마커 객체 배열 보관용 Ref
  const router = useRouter();

  // 1. 카카오맵 순수 JS 강제 주입 및 렌더링 무한 보장 로직 (Ultimate Fix + 상세 디버깅)
  useEffect(() => {
    console.log("[KakaoMap] 1. useEffect 시작");

    // 1. 실제 지도를 그리는 핵심 함수
    const renderMap = () => {
      console.log("[KakaoMap] 4. renderMap 함수 내부 진입. window.kakao 상태:", typeof window !== 'undefined' ? window.kakao : 'undefined');
      if (typeof window === 'undefined' || !window.kakao || !window.kakao.maps) {
        console.error("❌ [KakaoMap] window.kakao.maps가 아직 없습니다. 로딩이 실패했거나 지연 중입니다.");
        return;
      }
      
      console.log("[KakaoMap] 5. window.kakao.maps.load 호출 직전");
      window.kakao.maps.load(() => {
        console.log("[KakaoMap] 6. load 콜백 실행! 지도 객체 생성 시도");
        // 카카오맵 공식 가이드 코드 반영
        const container = document.getElementById('map'); // 지도를 담을 영역의 DOM 레퍼런스
        const options = { // 지도를 생성할 때 필요한 기본 옵션
          center: new window.kakao.maps.LatLng(33.450701, 126.570667), // 지도의 중심좌표. (가이드 기본값)
          level: 3 // 지도의 레벨(확대, 축소 정도)
        };
        
        if (container) {
          try {
            const map = new window.kakao.maps.Map(container, options); // 지도 생성 및 객체 리턴
            mapInstanceRef.current = map; // 생성된 맵 인스턴스 저장
            console.log("✅ [KakaoMap] 7. 카카오맵 가이드 기반 렌더링 완벽 성공!");

            // [내 위치 기반 초기화 및 자동 검색 로직]
            const initMapWithLocation = async (lat: number, lng: number) => {
              const currentPos = new window.kakao.maps.LatLng(lat, lng);
              map.setCenter(currentPos); // 1. 지도 중심 이동

              // 2. 주변 뷰티 매장 자동 검색 API 호출
              try {
                const res = await fetch('/api/places/nearby', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: '미용실', lat, lng })
                });
                const rawData = await res.json();

                // 프론트엔드 하드 필터링 (뷰티 업종만 통과)
                const beautyKeywords = ['미용', '헤어', '네일', '왁싱', '피부', '에스테틱', '속눈썹', '뷰티'];
                const blackList = ['식당', '찜', '라이브', '고기', '카페', '노래', '술'];
                
                // 연산자 우선순위 해결 및 안전한 배열 파싱
                const dataToFilter = rawData.data || rawData.places || (Array.isArray(rawData) ? rawData : []);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const filtered = dataToFilter.filter((business: any) => {
                  const name = business.name || business.title || (business.displayName && business.displayName.text) || '';
                  const category = business.category || (business.types && business.types.join(' ')) || '';
                  const text = `${name} ${category}`.toLowerCase();
                  if (blackList.some(bad => text.includes(bad))) return false;
                  return beautyKeywords.some(good => text.includes(good));
                });

                setBusinessList(filtered.slice(0, 10)); // 상위 10곳 추출
              } catch (error) {
                console.error("❌ [KakaoMap] 초기 데이터 로딩(API 호출) 실패:", error);
              }
            };

            // 위치 권한 허용 여부에 따라 분기 처리 (성공, 실패 시 모두 init 처리)
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  // 위치 권한 허용됨 -> 내 위치로 세팅
                  initMapWithLocation(position.coords.latitude, position.coords.longitude);
                },
                () => {
                  // 위치 권한 거부/실패 -> 기본값(인천 동암역 등)으로 조용히 세팅
                  initMapWithLocation(37.4711, 126.7010);
                }
              );
            } else {
              // 브라우저 미지원 -> 기본값 세팅
              initMapWithLocation(37.4711, 126.7010);
            }
          } catch(e) {
            console.error("❌ [KakaoMap] 지도 객체(new kakao.maps.Map) 생성 중 예외 발생:", e);
          }
        } else {
          console.error("❌ [KakaoMap] id가 'map'인 컨테이너가 DOM에 존재하지 않습니다!");
        }
      });
    };

    // 2. 이미 카카오 스크립트가 로드되어 있다면 바로 그리기
    if (window.kakao && window.kakao.maps) {
      console.log("[KakaoMap] 2. 이미 kakao 객체가 전역에 존재함. 즉시 렌더링 시도.");
      renderMap();
      return;
    }

    // 3. 스크립트가 없다면, 순수 JS로 직접 만들어서 head에 주입
    const scriptId = 'kakao-map-script';
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      console.log("[KakaoMap] 2. 페이지에 스크립트 요소가 없음. 새로 생성하여 DOM에 주입합니다.");
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY}&autoload=false&libraries=services`;
      script.async = true;
      
      script.onerror = () => {
        console.error("❌ [KakaoMap] 카카오맵 스크립트 로드 실패. 카카오 디벨로퍼스(developers.kakao.com)의 [플랫폼] - [Web] 설정에 http://localhost:3000 도메인이 정상 등록되었는지 확인하세요.");
      };

      // 스크립트 다운로드가 끝나면 무조건 renderMap 실행
      script.onload = () => {
        console.log("[KakaoMap] 3. 스크립트 onload 이벤트 발생!");
        renderMap();
      };

      document.head.appendChild(script);
    } else {
      console.log("[KakaoMap] 2. 스크립트 태그는 있는데 kakao 객체가 없음. 무한 대기 루프(0.1초) 시작.");
      // 스크립트 태그는 있는데 아직 로딩 중인 경우를 대비한 무한 대기 (0.1초 간격)
      const timer = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          console.log("[KakaoMap] 3. 대기 중 window.kakao 객체 감지 성공! 루프 종료 및 렌더링 시도.");
          clearInterval(timer);
          renderMap();
        }
      }, 100);
      
      return () => clearInterval(timer);
    }
  }, []);

  // [마커 렌더링 로직] businessList 업데이트 시 지도에 마커(깃발) 표시
  useEffect(() => {
    const map = mapInstanceRef.current;
    // map 객체가 없거나 리스트가 비어있으면 중단
    if (!map || !window.kakao || !window.kakao.maps || businessList.length === 0) return;

    // 기존 마커 전체 삭제 (중복 렌더링 방지)
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMarkers: any[] = [];
    const bounds = new window.kakao.maps.LatLngBounds();
    let hasPoints = false;

    businessList.forEach((biz, idx) => {
      // 구글/카카오/자체 API 등 다양한 위경도 응답 포맷 지원
      const lat = biz.lat || biz.y || biz.location?.latitude || biz.geometry?.location?.lat;
      const lng = biz.lng || biz.x || biz.location?.longitude || biz.geometry?.location?.lng;
      
      if (lat && lng) {
        const markerPos = new window.kakao.maps.LatLng(lat, lng);
        const marker = new window.kakao.maps.Marker({
          position: markerPos,
          map: map,
          title: biz.name || biz.title || (biz.displayName && biz.displayName.text) || ''
        });

        // 마커 클릭 시 가로 스크롤 리스트의 해당 카드로 스크롤 이동 및 지도 중앙 커스텀 이동
        window.kakao.maps.event.addListener(marker, 'click', () => {
          const card = document.getElementById(`biz-card-${biz.id || idx}`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
          map.panTo(marker.getPosition()); // 지도 중심도 마커로 이동
        });

        newMarkers.push(marker);
        bounds.extend(markerPos);
        hasPoints = true;
      }
    });

    markersRef.current = newMarkers;

    // 검색 완료 후 노출된 모든 마커가 화면에 꽉 차도록 지도 시점을 자동 이동(패닝/줌)
    if (hasPoints) {
      map.setBounds(bounds);
      
      // 약간의 딜레이 후 줌 레벨이 너무 가깝다면 살짝 뺌 (너무 타이트하게 줌인되는 현상 방지)
      setTimeout(() => {
        if (map.getLevel() < 3) map.setLevel(3);
      }, 50);
    }

    // 하단 카드 슬라이더 위치를 맨 처음(0)으로 초기화
    const carousel = document.getElementById('business-carousel');
    if (carousel) carousel.scrollLeft = 0;
  }, [businessList]);

  // 2. 검색 핸들러 및 데이터 필터링
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent | any) => {
    if (e) e.preventDefault();
    
    const query = searchInput.trim();
    if (!query) {
      alert("검색어를 입력해주세요.");
      return;
    }

    console.log("🔍 [Search] 1. 검색 시작:", query);

    try {
      const map = mapInstanceRef.current;
      if (!map) {
        console.error("❌ [Search] 지도가 아직 로드되지 않았습니다.");
        return;
      }

      const center = map.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();
      console.log(`📍 [Search] 2. 기준 좌표: lat(${lat}), lng(${lng})`);

      const res = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lat, lng })
      });
      
      const rawData = await res.json();
      console.log("📦 [Search] 3. API 원본 응답:", rawData);


      
      const dataToFilter = rawData.data || rawData.places || rawData.documents || rawData.results || (Array.isArray(rawData) ? rawData : []) || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = dataToFilter.filter((business: any) => {
        // [검색 엔진 최적화]
        // 구글 Places API V1의 응답 구조(displayName.text)를 감지하여 유효성을 판별합니다.
        const name = business.name || business.title || (business.displayName && business.displayName.text) || '';
        
        if (!name) return false; // 이름조차 없는 쓰레기 데이터만 파기
        
        return true; 
      });

      console.log("✨ [Search] 4. 필터링된 결과 개수:", filtered.length);
      setBusinessList(filtered.slice(0, 10)); // 최대 10곳 노출

    } catch (error) {
      console.error('❌ [Search] 검색 통신 실패:', error);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      
      {/* 1. 상단 플로팅 검색바 영역 (웹 표준 Form으로 통신 유실 방지 및 모바일 키보드 최적화) */}
      <form 
        onSubmit={handleSearch}
        style={{ 
          position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 9999,
          display: 'flex', backgroundColor: '#fff', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' 
        }}
      >
        <input 
          type="text" 
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="뷰티, 미용실 등을 검색해 보세요..."
          style={{ flex: 1, padding: '14px 20px', border: 'none', borderRadius: '30px', outline: 'none', fontSize: '15px' }}
        />
        <button 
          type="submit"
          style={{ padding: '0 20px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#ff3366', fontSize: '15px' }}
        >
          검색
        </button>
      </form>

      {/* 2. 카카오맵 영역 (화면 전체 꽉 채우기) */}
      <div id="map" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, backgroundColor: '#e5e5e5' }} />

      {/* 하단 바텀 시트 스타일의 가로 스크롤 리스트 */}
      <div 
        id="business-carousel"
        onWheel={(e) => {
          // 데스크탑 마우스 휠(상하)을 가로 스크롤(좌우)로 치환해주는 매직 로직
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        style={{ 
          position: 'absolute', bottom: '80px', left: 0, right: 0, zIndex: 30,
          display: 'flex', overflowX: 'auto', gap: '12px', padding: '0 20px 20px',
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'auto', scrollbarWidth: 'auto'
        }}
      >
        {businessList.length > 0 ? (
          businessList.map((biz, idx) => {
            const name = biz.name || biz.title || (biz.displayName && biz.displayName.text) || 'Unknown';
            const imageUrl = biz.image_url || (biz.photos && biz.photos[0] && `https://places.googleapis.com/v1/${biz.photos[0].name}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`) || '';
            const address = biz.address || biz.formattedAddress || biz.vicinity || biz.formatted_address || '주소 정보가 제공되지 않았습니다.';

            return (
              <div 
                key={biz.id || idx} 
                id={`biz-card-${biz.id || idx}`}
                onClick={() => router.push(`/business/${biz.id || idx}`)}
                style={{ 
                  flex: '0 0 auto', width: '200px', backgroundColor: '#fff', 
                  borderRadius: '16px', overflow: 'hidden', scrollSnapAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer',
                  border: '1px solid #eee'
                }}
              >
                {/* [중요] Kello 서비스 규정: 16/9 비율, overflow: hidden 및 object-fit: cover 무조건 유지 */}
                <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#eee' }}>
                  {imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '10px' }}>No Image</div>
                  )}
                </div>
                <div style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</h3>
                  <p style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{address}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ flex: '1', backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>현재 지도 영역에 매장이 없습니다.</p>
            <p style={{ fontSize: '11px', marginTop: '6px', color: '#666' }}>지도를 이동하거나 다른 키워드로 다시 검색해 보세요.</p>
          </div>
        )}
      </div>
      
    </div>
  );
}
