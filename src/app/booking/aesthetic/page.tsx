'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Gift, Search } from 'lucide-react';
import styles from './page.module.css';

interface StoreInfo {
  id: string;
  name: string;
  category: string;
  location: string;
  region: 'seoul' | 'gyeonggi' | 'incheon' | 'busan' | 'jeju';
  intro: string;
  price: string;
  specialOffer: string;
}

export default function BeautyStoreManagementPage() {
  const router = useRouter();
  
  // 1. 검색어 상태
  const [searchQuery, setSearchQuery] = useState('');
  
  // 2. 지역 필터 상태 ('all' 또는 'seoul', 'gyeonggi', 'incheon', 'busan', 'jeju')
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // 3. 다채로운 지역별 모의 매장 데이터 (한국어 표기)
  const [stores] = useState<StoreInfo[]>([
    {
      id: 'store-1',
      name: '강남 럭스 에스테틱',
      category: '에스테틱',
      location: '서울 강남구 테헤란로',
      region: 'seoul',
      intro: '글로벌 고객을 위한 맞춤형 피부 관리 및 저자극 진정 전문 케어 스파입니다.',
      price: '120,000원 ~',
      specialOffer: '1:1 정밀 피부 진단 및 맞춤 화장품 추천 서비스 무료 제공'
    },
    {
      id: 'store-2',
      name: '순수 헤어 홍대본점',
      category: '헤어',
      location: '서울 마포구 홍대',
      region: 'seoul',
      intro: '트렌디한 K-뷰티 레이어드 컷, 스페셜 염색 및 볼륨 매직 펌 전문 헤어숍입니다.',
      price: '80,000원 ~',
      specialOffer: '신규 방문 외국인 및 Kello 회원 대상 10% 즉시 할인'
    },
    {
      id: 'store-3',
      name: '분당 정자 네일 라운지',
      category: '네일',
      location: '경기 성남시 분당구',
      region: 'gyeonggi',
      intro: '고급 젤네일 아트 디자인 및 프리미엄 비건 큐티클 오일을 사용한 맞춤 네일 케어 서비스입니다.',
      price: '45,000원 ~',
      specialOffer: '첫 방문 젤 네일 케어 시 영양 강화제 무료 서비스'
    },
    {
      id: 'store-4',
      name: '송도 스파 앤 왁싱',
      category: '왁싱/스파',
      location: '인천 연수구 송도동',
      region: 'incheon',
      intro: '프라이빗 룸에서 진행되는 청결하고 안전한 저자극 프리미엄 왁싱 스튜디오입니다.',
      price: '60,000원 ~',
      specialOffer: '왁싱 후 진정 알로에 수딩 케어 키트 무료 증정'
    },
    {
      id: 'store-5',
      name: '해운대 마린 테라피',
      category: '에스테틱',
      location: '부산 해운대구 마린시티',
      region: 'busan',
      intro: '오션뷰를 조망하며 힐링할 수 있는 천연 아로마 솔트 전신 진정 테라피 숍입니다.',
      price: '150,000원 ~',
      specialOffer: '전신 마사지 예약 고객에게 시그니처 페이셜 팩 추가 증정'
    },
    {
      id: 'store-6',
      name: '제주 힐링 아로마 스킨',
      category: '에스테틱/헤어',
      location: '제주 제주시 연동',
      region: 'jeju',
      intro: '제주 유기농 허브 에센셜 오일을 사용하여 지친 일상 피부를 환기시켜 주는 아로마 피부 전문 샵입니다.',
      price: '90,000원 ~',
      specialOffer: '웰컴 한라봉 허브 티 무료 제공 및 미니어처 오일 선물'
    }
  ]);

  // 4. 지역 필터 정의
  const regionsMap = [
    { id: 'all', ko: '전체' },
    { id: 'seoul', ko: '서울' },
    { id: 'gyeonggi', ko: '경기' },
    { id: 'incheon', ko: '인천' },
    { id: 'busan', ko: '부산' },
    { id: 'jeju', ko: '제주' }
  ];

  // 5. 지역 필터 및 검색어 연동 매칭
  const filteredStores = stores.filter(store => {
    // A. 지역 필터링
    const matchesRegion = selectedRegion === 'all' || store.region === selectedRegion;
    
    // B. 검색어 필터링 (가게명, 한줄소개, 카테고리 매칭)
    const matchesSearch = 
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.intro.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.category.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesRegion && matchesSearch;
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header (Kello 로고와 뒤로가기 버튼 유지) */}
        <header className={styles.header}>
          <button 
            className={styles.backButton} 
            onClick={() => router.back()} 
            aria-label="뒤로가기"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          
          <div className={styles.logoWrapper}>
            <svg width="76" height="30" viewBox="0 0 76 30" aria-label="Kello" style={{ display: 'block' }}>
              <text
                x="2"
                y="22"
                fontFamily="'Nunito', 'Quicksand', 'Pretendard', 'Inter', sans-serif"
                fontWeight="800"
                fontSize="24"
                fill="#FF3566"
                letterSpacing="-0.5"
              >
                Kello
              </text>
            </svg>
          </div>
          
          <div className={styles.placeholder}></div>
        </header>

        {/* Scroll Area */}
        <div className={styles.scrollArea}>
          
          {/* 제휴 업체 둘러보기 공간 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>제휴 업체 둘러보기</h2>
              
              {/* 기존 소제목 텍스트를 제거하고 검색바 배치 */}
              <div className={styles.searchBarWrapper}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                  type="text" 
                  className={styles.searchInput} 
                  placeholder="매장명, 업종 또는 소개글을 검색해보세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* 에스테틱/헤어 필터 대신 "서울/경기/인천/부산/제주" 지역 필터 칩 */}
            <div className={styles.filterContainer}>
              {regionsMap.map((reg) => (
                <button
                  key={reg.id}
                  className={`${styles.filterChip} ${selectedRegion === reg.id ? styles.active : ''}`}
                  onClick={() => setSelectedRegion(reg.id)}
                >
                  {reg.ko}
                </button>
              ))}
            </div>

            {/* 제휴업체 카드 목록 */}
            <div className={styles.storeList}>
              {filteredStores.length > 0 ? (
                filteredStores.map((store) => (
                  <div key={store.id} className={styles.storeCard}>
                    <div className={styles.storeHeader}>
                      <h3 className={styles.storeName}>{store.name}</h3>
                      <span className={styles.storeCategoryBadge}>
                        {store.category}
                      </span>
                    </div>
                    <p className={styles.storeIntro}>{store.intro}</p>
                    
                    <div className={styles.storeMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaLocation}`}>
                        <MapPin size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {store.location}
                      </span>
                      <span className={`${styles.metaBadge} ${styles.metaPrice}`}>
                        <span style={{ marginRight: 2, fontWeight: 700 }}>₩</span>
                        {store.price}
                      </span>
                      <span className={`${styles.metaBadge} ${styles.metaOffer}`}>
                        <Gift size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {store.specialOffer}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyTitle}>검색된 매장이 없습니다.</p>
                  <p className={styles.emptyDesc}>지역 필터 혹은 다른 검색어를 입력해보세요.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
