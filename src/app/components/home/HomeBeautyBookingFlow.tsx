"use client";

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../home.module.css';
import { 
  BEAUTY_STORE_ITEMS, 
  DESIGNERS_BY_STORE, 
  PRIMARY_SERVICES_BY_CATEGORY,
  BEAUTY_AVAILABILITY_BY_STORE,
  BEAUTY_REGIONS
} from './constants';
import IntegratedBookingMenu from '../IntegratedBookingMenu';

interface HomeBeautyBookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: string | null;
  t: any;
}

export default function HomeBeautyBookingFlow({ isOpen, onClose, initialCategory, t }: HomeBeautyBookingFlowProps) {
  const { t: tCommon } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters stores by category and region
  const filteredStores = useMemo(() => {
    return BEAUTY_STORE_ITEMS.filter(s => 
      (initialCategory ? s.category === initialCategory : true) &&
      (selectedRegion === 'all' ? true : s.region === selectedRegion)
    );
  }, [initialCategory, selectedRegion]);

  const regions = useMemo(() => BEAUTY_REGIONS(t, t), [t]);

  if (!isOpen) return null;

  const handleStoreSelect = (store: any) => {
    setSelectedStore(store);
    setCurrentStep(2);
  };

  const handleComplete = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      setCurrentStep(1);
      // Success toast is handled by parent
    }, 1500);
  };

  const renderProgress = () => (
    <ol className={styles.beautyStepIndicator}>
      {[
        { id: 1, label: "매장" },
        { id: 2, label: "일정" },
        { id: 3, label: "정보" },
        { id: 4, label: "확인" }
      ].map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isDone = currentStep > step.id;

        return (
          <li
            key={step.id}
            className={`${styles.beautyStepItem} ${isCurrent ? styles.beautyStepItemCurrent : ''} ${isDone ? styles.beautyStepItemDone : ''}`}
          >
            <span className={styles.beautyStepBullet}>{step.id}</span>
            <span className={styles.beautyStepText}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.mapModal} onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', height: '85vh', maxWidth: '480px' }}>
        <div className={styles.mapModalHeader}>
          <div className={styles.mapModalInfo}>
            <div className={styles.mapModalTitle}>
              {currentStep === 1 && "매장을 선택해주세요"}
              {currentStep === 2 && "예약 일시를 선택해주세요"}
              {currentStep === 3 && "상세 정보를 입력해주세요"}
              {currentStep === 4 && "예약 내용을 확인해주세요"}
            </div>
          </div>
          <button className={styles.mapCloseBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '0 20px' }}>
            {renderProgress()}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Step 1: Region & Store List */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {regions.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => setSelectedRegion(r.id)}
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: '20px', 
                      whiteSpace: 'nowrap',
                      background: selectedRegion === r.id ? 'var(--accent)' : 'var(--hanji-ivory)',
                      color: selectedRegion === r.id ? '#fff' : 'var(--ink-black)',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: '1px solid var(--warm-sand)'
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredStores.map(store => (
                  <div 
                    key={store.id} 
                    onClick={() => handleStoreSelect(store)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '16px', 
                      background: 'var(--surface)', 
                      border: '1px solid var(--warm-sand)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{store.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--soft-ink)' }}>{store.shortDescription}</div>
                    <div style={{ fontSize: '14px', color: 'var(--accent)', marginTop: '8px', fontWeight: 800 }}>{store.priceLabel}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Display */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--hanji-ivory)', border: '1px solid var(--warm-sand)' }}>
                 <div style={{ fontSize: '12px', color: 'var(--soft-ink)' }}>선택된 매장</div>
                 <div style={{ fontWeight: 800, fontSize: '18px' }}>{selectedStore?.name}</div>
               </div>
               
               <button 
                 onClick={() => setIsTimePickerOpen(true)}
                 style={{ 
                   width: '100%', 
                   padding: '20px', 
                   borderRadius: '16px', 
                   background: 'var(--accent)', 
                   color: '#fff', 
                   fontWeight: 800,
                   fontSize: '16px'
                 }}
               >
                 {selectedDate ? `${selectedDate} ${selectedTime}` : "날짜와 시간 선택하기"}
               </button>

               {selectedDate && (
                 <button 
                   onClick={() => setCurrentStep(3)}
                   style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--ink-black)', color: '#fff', fontWeight: 700 }}
                 >
                   다음 단계로
                 </button>
               )}
            </div>
          )}

          {/* Step 3: Info Form */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--soft-ink)' }}>이름 (영문)</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="English Name"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--warm-sand)', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--soft-ink)' }}>연락처</label>
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--warm-sand)', marginTop: '4px' }}
                />
              </div>
              <button 
                disabled={!customerName || !customerPhone}
                onClick={() => setCurrentStep(4)}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  background: (!customerName || !customerPhone) ? 'var(--warm-sand)' : 'var(--accent)', 
                  color: '#fff', 
                  fontWeight: 700,
                  marginTop: '10px'
                }}
              >
                확인 및 단계 완료
              </button>
            </div>
          )}

          {/* Step 4: Final Confirm */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ background: 'var(--hanji-ivory)', padding: '20px', borderRadius: '16px', border: '1px solid var(--warm-sand)' }}>
                 <div style={{ marginBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--soft-ink)' }}>매장: </span>
                    <span style={{ fontWeight: 800 }}>{selectedStore?.name}</span>
                 </div>
                 <div style={{ marginBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--soft-ink)' }}>일시: </span>
                    <span style={{ fontWeight: 800 }}>{selectedDate} {selectedTime}</span>
                 </div>
                 <div style={{ marginBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--soft-ink)' }}>예약자: </span>
                    <span style={{ fontWeight: 800 }}>{customerName} ({customerPhone})</span>
                 </div>
               </div>
               
               <button 
                 onClick={handleComplete}
                 disabled={isSubmitting}
                 style={{ 
                   width: '100%', 
                   padding: '20px', 
                   borderRadius: '16px', 
                   background: 'var(--secondary)', 
                   color: '#fff', 
                   fontWeight: 800,
                   fontSize: '18px'
                 }}
               >
                 {isSubmitting ? "처리 중..." : "최종 예약 요청하기"}
               </button>
            </div>
          )}
        </div>

        {/* Time Picker Modal inside */}
        <IntegratedBookingMenu 
          isOpen={isTimePickerOpen}
          onClose={() => setIsTimePickerOpen(false)}
          onConfirm={(date, time) => {
            setSelectedDate(date);
            setSelectedTime(time);
            setIsTimePickerOpen(false);
          }}
        />

        {currentStep > 1 && (
            <div style={{ padding: '0 20px 20px' }}>
                <button onClick={() => setCurrentStep(prev => prev - 1)} style={{ fontSize: '13px', fontWeight: 700, color: 'var(--soft-ink)' }}>
                    ← 이전 단계로
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
