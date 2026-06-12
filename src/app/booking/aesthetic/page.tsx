'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, MapPin, WonSign, Gift, Store } from 'lucide-react';
import styles from './page.module.css';

interface StoreInfo {
  id: string;
  name: string;
  category: 'esthetic' | 'hair' | 'nail' | 'makeup' | 'lash' | 'waxing';
  location: string;
  intro: string;
  price: string;
  specialOffer: string;
}

export default function BeautyStoreManagementPage() {
  const router = useRouter();
  
  // 고객 모드용 카테고리 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 모의 매장 데이터 (완벽한 한국어 표기화)
  const [stores, setStores] = useState<StoreInfo[]>([
    {
      id: 'demo-1',
      name: '강남 럭스 에스테틱 (Luxe K-Esthetic Gangnam)',
      category: 'esthetic',
      location: '서울 강남구',
      intro: '글로벌 고객을 위한 맞춤형 피부 관리 및 저자극 진정 전문 케어 서비스입니다.',
      price: '120,000원 ~',
      specialOffer: '1:1 정밀 피부 진단 및 맞춤 화장품 추천 서비스 무료 제공'
    },
    {
      id: 'demo-2',
      name: '순수 헤어 홍대본점 (SOONSOO Hair Hongdae)',
      category: 'hair',
      location: '서울 마포구 홍대',
      intro: '트렌디한 K-뷰티 레이어드 컷, 스페셜 염색 및 볼륨 매직 펌 전문 헤어샵입니다.',
      price: '80,000원 ~',
      specialOffer: '신규 방문 외국인/Kello 회원 대상 10% 즉시 할인'
    },
    {
      id: 'demo-3',
      name: '명동 네일아트 스튜디오 (Myeongdong Nail Art)',
      category: 'nail',
      location: '서울 중구 명동',
      intro: '화려하고 섬세한 젤네일 아트 디자인 및 프리미엄 손발톱 위생 관리 전문 네일숍입니다.',
      price: '50,000원 ~',
      specialOffer: '네일 시술 시 큐티클 전용 영양 오일 무료 증정'
    }
  ]);

  // 파트너 전용 상태 (1 ID당 1 매장 제한)
  const myStoreId = 'my-partner-store';
  const partnerStore = stores.find(s => s.id === myStoreId);

  // 등록 및 수정 폼 상태
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'esthetic' | 'hair' | 'nail' | 'makeup' | 'lash' | 'waxing'>('esthetic');
  const [formLocation, setFormLocation] = useState('');
  const [formIntro, setFormIntro] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formSpecialOffer, setFormSpecialOffer] = useState('');

  // 파트너 CRUD 핸들러
  const handleOpenRegister = () => {
    setFormName('');
    setFormCategory('esthetic');
    setFormLocation('');
    setFormIntro('');
    setFormPrice('');
    setFormSpecialOffer('');
    setIsEditing(true);
  };

  const handleOpenEdit = () => {
    if (!partnerStore) return;
    setFormName(partnerStore.name);
    setFormCategory(partnerStore.category);
    setFormLocation(partnerStore.location);
    setFormIntro(partnerStore.intro);
    setFormPrice(partnerStore.price);
    setFormSpecialOffer(partnerStore.specialOffer);
    setIsEditing(true);
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('업체명을 입력해주세요.');
      return;
    }

    const updatedStore: StoreInfo = {
      id: myStoreId,
      name: formName,
      category: formCategory,
      location: formLocation || '서울',
      intro: formIntro,
      price: formPrice || '상담 후 결정',
      specialOffer: formSpecialOffer || '웰컴 사은품 제공'
    };

    setStores((prev) => {
      const exists = prev.some(s => s.id === myStoreId);
      if (exists) {
        return prev.map(s => s.id === myStoreId ? updatedStore : s);
      }
      return [...prev, updatedStore];
    });

    setIsEditing(false);
    alert('업체 정보 등록/수정이 정상 완료되었습니다.');
  };

  const handleDeleteStore = () => {
    if (window.confirm('등록된 업체 정보를 완전히 삭제하시겠습니까? (삭제 시 다시 새로 등록해야 합니다)')) {
      setStores((prev) => prev.filter(s => s.id !== myStoreId));
      setIsEditing(false);
      alert('업체 정보가 정상적으로 삭제되었습니다.');
    }
  };

  // 카테고리 필터링 목록
  const filteredStores = stores.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const categoriesMap = [
    { id: 'all', ko: '전체', en: 'All' },
    { id: 'esthetic', ko: '에스테틱', en: 'Esthetic' },
    { id: 'hair', ko: '헤어', en: 'Hair' },
    { id: 'nail', ko: '네일', en: 'Nail' },
    { id: 'makeup', ko: '메이크업', en: 'Makeup' },
    { id: 'lash', ko: '속눈썹', en: 'Lash' },
    { id: 'waxing', ko: '왁싱', en: 'Waxing' }
  ];

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
          
          {/* SECTION 1: 제휴 업체 둘러보기 공간 */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>제휴 업체 둘러보기</h2>
              <p className={styles.sectionDesc}>원하는 뷰티 서비스 매장의 상세 정보를 확인해 보세요.</p>
            </div>

            {/* 6대 카테고리 필터 칩 */}
            <div className={styles.filterContainer}>
              {categoriesMap.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.filterChip} ${selectedCategory === cat.id ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.ko} ({cat.en})
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
                        {categoriesMap.find(c => c.id === store.category)?.ko}
                      </span>
                    </div>
                    <p className={styles.storeIntro}>{store.intro}</p>
                    
                    <div className={styles.storeMeta}>
                      <span className={`${styles.metaBadge} ${styles.metaLocation}`}>
                        <MapPin size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                        {store.location}
                      </span>
                      <span className={`${styles.metaBadge} ${styles.metaPrice}`}>
                        <WonSign size={11} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} />
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
                  <p className={styles.emptyTitle}>등록된 업체가 없습니다.</p>
                  <p className={styles.emptyDesc}>해당 카테고리의 첫 번째 입점 매장이 되어보세요!</p>
                </div>
              )}
            </div>
          </section>

          {/* 수직 단락을 나누는 미세한 디바이더 선 */}
          <div className={styles.divider}></div>

          {/* SECTION 2: 사장님 제휴 정보 등록 및 관리 공간 */}
          <section className={styles.section} style={{ marginTop: 8 }}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>사장님 전용 공간</h2>
              <p className={styles.sectionDesc}>가게를 입점시켜 외국인 관광객들에게 매장을 홍보하세요. (1계정당 1매장 제한)</p>
            </div>

            {/* B-1. 미등록 상태 */}
            {!partnerStore && !isEditing && (
              <div className={styles.emptyState} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px dashed #EDEAE6' }}>
                <Store size={36} color="#FF3566" style={{ marginBottom: 12 }} />
                <p className={styles.emptyTitle}>현재 등록한 매장이 없습니다.</p>
                <p className={styles.emptyDesc} style={{ marginBottom: 16 }}>아래 버튼을 눌러 빠르게 입점 신청서를 완성하세요!</p>
                <button className={styles.submitButton} style={{ width: '80%' }} onClick={handleOpenRegister}>
                  제휴 업체 신규 등록하기
                </button>
              </div>
            )}

            {/* B-2. 등록/수정 폼 입력 화면 */}
            {isEditing && (
              <form onSubmit={handleSaveStore} className={styles.form}>
                <h3 className={styles.label} style={{ fontSize: 15, color: '#FF3566', marginBottom: 4 }}>
                  {partnerStore ? '내 제휴 매장 정보 수정하기' : '신규 제휴 매장 등록하기'}
                </h3>

                <div className={styles.formGroup}>
                  <label className={styles.label}>매장명 (업체명) *</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="예: 켈로에스테틱 강남점" 
                    value={formName} 
                    onChange={(e) => setFormName(e.target.value)} 
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>업종 카테고리 *</label>
                  <select 
                    className={styles.select}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as typeof formCategory)}
                  >
                    <option value="esthetic">에스테틱 (Esthetic)</option>
                    <option value="hair">헤어 (Hair)</option>
                    <option value="nail">네일 (Nail)</option>
                    <option value="makeup">메이크업 (Makeup)</option>
                    <option value="lash">속눈썹 (Lash)</option>
                    <option value="waxing">왁싱 (Waxing)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>상세 주소 (위치) *</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="예: 서울 강남구 테헤란로 12" 
                    value={formLocation} 
                    onChange={(e) => setFormLocation(e.target.value)} 
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>매장 한줄 소개글 *</label>
                  <textarea 
                    className={styles.textarea} 
                    placeholder="매장을 매력적으로 표현할 소개글을 작성해 주세요." 
                    value={formIntro} 
                    onChange={(e) => setFormIntro(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>대표 서비스 가격 정보</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="예: 기본 네일 35,000원" 
                    value={formPrice} 
                    onChange={(e) => setFormPrice(e.target.value)} 
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Kello 고객 전용 특별 혜택</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="예: 웰컴 티 무료 제공 또는 추가 서비스" 
                    value={formSpecialOffer} 
                    onChange={(e) => setFormSpecialOffer(e.target.value)} 
                  />
                </div>

                <button type="submit" className={styles.submitButton}>
                  매장 정보 저장하기
                </button>
                <button 
                  type="button" 
                  className={styles.actionButton} 
                  style={{ marginTop: 4 }}
                  onClick={() => setIsEditing(false)}
                >
                  취소
                </button>
              </form>
            )}

            {/* B-3. 내 제휴 매장 등록 완료 현황 확인 및 수정/삭제 */}
            {partnerStore && !isEditing && (
              <div className={styles.registeredCard}>
                <div className={styles.cardTag}>내 등록 업체 (1매장 소유 한도 사용 중)</div>
                <h3 className={styles.cardTitle}>{partnerStore.name}</h3>
                
                <div className={styles.cardInfoList}>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>카테고리</span>
                    <span>{categoriesMap.find(c => c.id === partnerStore.category)?.ko} ({categoriesMap.find(c => c.id === partnerStore.category)?.en})</span>
                  </div>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>가게주소</span>
                    <span>{partnerStore.location}</span>
                  </div>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>한줄소개</span>
                    <span>{partnerStore.intro}</span>
                  </div>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>가격대</span>
                    <span>{partnerStore.price}</span>
                  </div>
                  <div className={styles.cardInfoItem}>
                    <span className={styles.cardInfoLabel}>고객혜택</span>
                    <span>{partnerStore.specialOffer}</span>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button className={`${styles.actionButton} ${styles.editButton}`} onClick={handleOpenEdit}>
                    <Edit2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    정보 수정하기
                  </button>
                  <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={handleDeleteStore}>
                    <Trash2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    매장 등록 삭제
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
