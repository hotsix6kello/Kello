'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Trash2, MapPin, DollarSign, Award, Store } from 'lucide-react';
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
  
  // 1. 모드 선택 상태 ('customer' = 외국인 고객용 둘러보기, 'partner' = 제휴업체 사장님 관리용)
  const [activeMode, setActiveMode] = useState<'customer' | 'partner'>('customer');
  
  // 2. 고객 모드용 카테고리 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 3. 업체 정보 목록 (가상 데이터 탑재 및 파트너 CRUD 연동)
  const [stores, setStores] = useState<StoreInfo[]>([
    {
      id: 'demo-1',
      name: 'Luxe K-Esthetic Gangnam (강남 럭스 에스테틱)',
      category: 'esthetic',
      location: 'Gangnam (강남)',
      intro: 'Premium skin treatment and customized soothing care specialized for global visitors.',
      price: '₩120,000 ~',
      specialOffer: 'Free 1:1 skin analyzer consultation (1:1 피부 진단 무료)'
    },
    {
      id: 'demo-2',
      name: 'SOONSOO Hair Salon Hongdae (순수 헤어 홍대)',
      category: 'hair',
      location: 'Hongdae (홍대)',
      intro: 'Trendy K-pop hair styling, color dye, and magic volume perm services.',
      price: '₩80,000 ~',
      specialOffer: '10% discount for international customers (외국인 고객 10% 할인)'
    },
    {
      id: 'demo-3',
      name: 'Myeongdong Nail Art Studio (명동 네일아트)',
      category: 'nail',
      location: 'Myeongdong (명동)',
      intro: 'Delicate hand nail styling and customized premium gel art design.',
      price: '₩50,000 ~',
      specialOffer: 'Complimentary cuticle oil service (큐티클 영양 오일 무료)'
    }
  ]);

  // 4. 파트너 전용 상태 (한 계정당 최대 1개 등록 제한)
  // 사장님의 고유 등록 가게 아이디를 관리 ('my-partner-store' 고정)
  const myStoreId = 'my-partner-store';
  const partnerStore = stores.find(s => s.id === myStoreId);

  // 5. 등록 및 수정 폼 상태
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'esthetic' | 'hair' | 'nail' | 'makeup' | 'lash' | 'waxing'>('esthetic');
  const [formLocation, setFormLocation] = useState('');
  const [formIntro, setFormIntro] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formSpecialOffer, setFormSpecialOffer] = useState('');

  // 6. 파트너 CRUD 핸들러
  const handleOpenRegister = () => {
    // 폼 초기화
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
      location: formLocation || 'Seoul',
      intro: formIntro,
      price: formPrice || 'Consultation required',
      specialOffer: formSpecialOffer || 'Welcome Gift'
    };

    setStores((prev) => {
      const exists = prev.some(s => s.id === myStoreId);
      if (exists) {
        return prev.map(s => s.id === myStoreId ? updatedStore : s);
      }
      return [...prev, updatedStore];
    });

    setIsEditing(false);
    alert('업체 정보가 성공적으로 반영되었습니다.');
  };

  const handleDeleteStore = () => {
    if (window.confirm('등록된 업체 정보를 완전히 삭제하시겠습니까? (삭제 시 다시 새로 등록해야 합니다)')) {
      setStores((prev) => prev.filter(s => s.id !== myStoreId));
      setIsEditing(false);
      alert('업체 정보가 삭제되었습니다.');
    }
  };

  // 7. 카테고리 필터링 적용 목록
  const filteredStores = stores.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  // 카테고리 한글/영어 매핑 상수
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

        {/* Mode Switcher Segment Control */}
        <div className={styles.modeSwitcher}>
          <button 
            className={`${styles.modeButton} ${activeMode === 'customer' ? styles.active : ''}`}
            onClick={() => {
              setActiveMode('customer');
              setIsEditing(false);
            }}
          >
            둘러보기 (Customer Browse)
          </button>
          <button 
            className={`${styles.modeButton} ${activeMode === 'partner' ? styles.active : ''}`}
            onClick={() => setActiveMode('partner')}
          >
            사장님 공간 (Partner Area)
          </button>
        </div>

        {/* Scrollable Content */}
        <div className={styles.scrollArea}>
          
          {/* A. 외국인 고객 둘러보기 뷰 */}
          {activeMode === 'customer' && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>K-Beauty Partners</h2>
                <p className={styles.sectionDesc}>Browse high-quality beauty shops for global tourists.</p>
              </div>

              {/* 6대 카테고리 필터 칩 */}
              <div className={styles.filterContainer}>
                {categoriesMap.map((cat) => (
                  <button
                    key={cat.id}
                    className={`${styles.filterChip} ${selectedCategory === cat.id ? styles.active : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.en} ({cat.ko})
                  </button>
                ))}
              </div>

              {/* 가게 정보 리스트 */}
              <div className={styles.storeList}>
                {filteredStores.length > 0 ? (
                  filteredStores.map((store) => (
                    <div key={store.id} className={styles.storeCard}>
                      <div className={styles.storeHeader}>
                        <h3 className={styles.storeName}>{store.name}</h3>
                        <span className={styles.storeCategoryBadge}>
                          {categoriesMap.find(c => c.id === store.category)?.en}
                        </span>
                      </div>
                      <p className={styles.storeIntro}>{store.intro}</p>
                      
                      <div className={styles.storeMeta}>
                        <span className={`${styles.metaBadge} styles.metaLocation`}>
                          <MapPin size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                          {store.location}
                        </span>
                        <span className={`${styles.metaBadge} styles.metaPrice`}>
                          <DollarSign size={11} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} />
                          {store.price}
                        </span>
                        <span className={`${styles.metaBadge} styles.metaOffer`}>
                          <Award size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                          {store.specialOffer}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <p className={styles.emptyTitle}>No Stores Found</p>
                    <p className={styles.emptyDesc}>Be the first store in this category!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. 제휴업체 사장님 파트너 뷰 */}
          {activeMode === 'partner' && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Partner Center</h2>
                <p className={styles.sectionDesc}>제휴업체 전용 정보 등록 및 관리 공간 (1 ID당 1 매장 제한)</p>
              </div>

              {/* B-1. 등록된 매장이 없을 때 등록 전 폼 작성창 혹은 등록유도카드 */}
              {!partnerStore && !isEditing && (
                <div className={styles.emptyState} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, border: '1px dashed #EDEAE6' }}>
                  <Store size={36} color="#FF3566" style={{ marginBottom: 12 }} />
                  <p className={styles.emptyTitle}>등록된 업체가 없습니다.</p>
                  <p className={styles.emptyDesc} style={{ marginBottom: 16 }}>가게를 등록하여 외국인 관광객들에게 샵을 홍보하세요!</p>
                  <button className={styles.submitButton} style={{ width: '80%' }} onClick={handleOpenRegister}>
                    신규 업체 정보 등록하기
                  </button>
                </div>
              )}

              {/* B-2. 폼 입력/수정 활성화 시 */}
              {isEditing && (
                <form onSubmit={handleSaveStore} className={styles.form}>
                  <h3 className={styles.label} style={{ fontSize: 16, color: '#FF3566', marginBottom: 4 }}>
                    {partnerStore ? '업체 정보 수정 (Edit Store)' : '신규 업체 등록 (Register Store)'}
                  </h3>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>업체명 (Store Name) *</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder="예: Kello Hair Gangnam" 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)} 
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>뷰티 카테고리 (Category) *</label>
                    <select 
                      className={styles.select}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as typeof formCategory)}
                    >
                      <option value="esthetic">Esthetic (에스테틱)</option>
                      <option value="hair">Hair (헤어)</option>
                      <option value="nail">Nail (네일)</option>
                      <option value="makeup">Makeup (메이크업)</option>
                      <option value="lash">Lash (속눈썹)</option>
                      <option value="waxing">Waxing (왁싱)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>위치 (Location)</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder="예: Myeongdong (명동)" 
                      value={formLocation} 
                      onChange={(e) => setFormLocation(e.target.value)} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>매장 한줄 소개 (English Introduction)</label>
                    <textarea 
                      className={styles.textarea} 
                      placeholder="외국인 관광객을 위한 영어 소개글을 작성해보세요." 
                      value={formIntro} 
                      onChange={(e) => setFormIntro(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>기본 가격대 (Price Range)</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder="예: ₩50,000 ~" 
                      value={formPrice} 
                      onChange={(e) => setFormPrice(e.target.value)} 
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>특별 제공 혜택 (Special Benefit for Kello user)</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      placeholder="예: Free welcome drink (웰컴 드링크 무료 제공)" 
                      value={formSpecialOffer} 
                      onChange={(e) => setFormSpecialOffer(e.target.value)} 
                    />
                  </div>

                  <button type="submit" className={styles.submitButton}>
                    저장 완료 (Save Settings)
                  </button>
                  <button 
                    type="button" 
                    className={styles.actionButton} 
                    style={{ marginTop: 4 }}
                    onClick={() => setIsEditing(false)}
                  >
                    취소 (Cancel)
                  </button>
                </form>
              )}

              {/* B-3. 등록된 내 가게 정보 현황 출력 */}
              {partnerStore && !isEditing && (
                <div className={styles.registeredCard}>
                  <div className={styles.cardTag}>본인 소유 업체 (1개 한도 활성화 중)</div>
                  <h3 className={styles.cardTitle}>{partnerStore.name}</h3>
                  
                  <div className={styles.cardInfoList}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>카테고리</span>
                      <span>{categoriesMap.find(c => c.id === partnerStore.category)?.en} ({categoriesMap.find(c => c.id === partnerStore.category)?.ko})</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>가게위치</span>
                      <span>{partnerStore.location}</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>매장소개</span>
                      <span>{partnerStore.intro || '(소개글 없음)'}</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>가격정보</span>
                      <span>{partnerStore.price}</span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>특별혜택</span>
                      <span>{partnerStore.specialOffer}</span>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button className={`${styles.actionButton} ${styles.editButton}`} onClick={handleOpenEdit}>
                      <Edit2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      정보 수정
                    </button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={handleDeleteStore}>
                      <Trash2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      업체 정보 삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
