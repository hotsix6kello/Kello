'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '@/app/home.module.css';
import IntegratedBookingMenu from './IntegratedBookingMenu';
import { 
  BEAUTY_STORE_ITEMS, 
  BEAUTY_REGIONS, 
  BeautyStore, 
  BeautyRegionId, 
  BeautyCategoryId,
  PRIMARY_SERVICES_BY_CATEGORY
} from './constants';
import { submitBeautyBooking } from '@/app/explore/beautyBooking';
import { supabase } from '@/lib/supabaseClient';

interface HomeBeautyBookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: BeautyCategoryId | 'all';
  t: any;
}

export default function HomeBeautyBookingFlow({ isOpen, onClose, initialCategory, t }: HomeBeautyBookingFlowProps) {
  const { t: tBeauty } = useTranslation('beauty');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<BeautyRegionId>('all');
  
  // Selection state
  const [selectedStore, setSelectedStore] = useState<BeautyStore | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [snsId, setSnsId] = useState('');
  const [requestNote, setRequestNote] = useState('');

  // Agreement state
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const regions = BEAUTY_REGIONS(t, tBeauty);

  const filteredStores = useMemo(() => {
    return BEAUTY_STORE_ITEMS.filter(item => {
      const matchCategory = initialCategory === 'all' || item.category === initialCategory;
      const matchRegion = selectedRegion === 'all' || item.region === selectedRegion;
      return matchCategory && matchRegion;
    });
  }, [initialCategory, selectedRegion]);

  const availableServices = useMemo(() => {
    if (!selectedStore) return [];
    return PRIMARY_SERVICES_BY_CATEGORY[selectedStore.category] || [];
  }, [selectedStore]);

  const handleStoreSelect = (store: BeautyStore) => {
    setSelectedStore(store);
    setCurrentStep(2);
  };

  const handleComplete = async () => {
    if (!selectedStore || !selectedDate || !selectedTime || !selectedServiceId) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        category: selectedStore.category,
        region: selectedStore.region,
        date: selectedDate,
        time: selectedTime,
        primaryServiceId: selectedServiceId,
        customerName,
        customerPhone,
        snsId,
        requestNote,
        createdAt: new Date().toISOString(),
      };

      const { data } = await supabase.auth.getSession();
      await submitBeautyBooking(payload, data.session?.access_token ?? null);
      
      alert(t('home_beauty.booking.success', { defaultValue: '예약 요청이 전송되었습니다.' }));
      onClose();
    } catch (error) {
      console.error('Booking failed', error);
      alert('예약 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderProgress = () => (
    <ol className={styles.beautyStepIndicator} style={{ marginBottom: '24px' }}>
      {[
        { id: 1, label: "매장" },
        { id: 2, label: "일정" },
        { id: 3, label: "정보" },
        { id: 4, label: "확인" }
      ].map((step) => {
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

  const canContinueStep3 = customerName.trim().length > 0 && customerPhone.trim().length > 10 && selectedServiceId;
  const canSubmit = privacyConsent && bookingConfirmed && !isSubmitting;

  return (
    <div className="fixed inset-0 bg-white z-[400] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-16 border-b border-neutral-100 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-neutral-400">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-lg font-bold text-neutral-800">
          {currentStep === 1 && "매장 선택"}
          {currentStep === 2 && "예약 일시"}
          {currentStep === 3 && "정보 입력"}
          {currentStep === 4 && "예약 확인"}
        </h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 px-5 pt-6">
        {renderProgress()}

        {/* Step 1: Store List */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-6">
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {regions.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => setSelectedRegion(r.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border transition-colors ${
                      selectedRegion === r.id ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
             </div>
             <div className="grid gap-4">
                {filteredStores.map(store => (
                  <div 
                    key={store.id} 
                    onClick={() => handleStoreSelect(store)}
                    className="p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm flex gap-4 cursor-pointer hover:border-[var(--primary)] transition-all active:scale-[0.98]"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                       <img src={store.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-extrabold text-neutral-800 truncate">{store.name}</h3>
                       <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{store.shortDescription}</p>
                       <div className="text-sm font-bold text-[var(--accent)] mt-2">{store.priceLabel}</div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-8">
             <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Selected Salon</span>
                <h2 className="text-xl font-black text-neutral-800 mt-1">{selectedStore?.name}</h2>
             </div>

             <div className="grid gap-4">
                <h3 className="font-bold text-neutral-800">예약 날짜와 시간을 선택해주세요</h3>
                {selectedDate && selectedTime ? (
                   <div className="p-6 rounded-2xl bg-[var(--hanji-ivory)] border border-[var(--warm-sand)]">
                      <span className="text-xs font-bold text-neutral-400">선택된 일시</span>
                      <div className="text-2xl font-black text-neutral-900 mt-2">{selectedDate} - {selectedTime}</div>
                      <button onClick={() => setIsTimePickerOpen(true)} className="mt-4 text-sm font-bold text-[var(--accent)] underline">일시 변경하기</button>
                   </div>
                ) : (
                   <button 
                     onClick={() => setIsTimePickerOpen(true)}
                     className="w-full py-6 rounded-2xl bg-[var(--secondary)] text-white font-black text-lg shadow-xl active:scale-[0.98] transition-transform"
                   >
                     날짜 및 시간 고르기
                   </button>
                )}
             </div>

             {selectedDate && selectedTime && (
                <button 
                  onClick={() => setCurrentStep(3)}
                  className="w-full py-5 rounded-2xl bg-neutral-900 text-white font-bold text-lg shadow-lg"
                >
                  다음 단계: 정보 입력
                </button>
             )}
          </div>
        )}

        {/* Step 3: Detailed Form */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-8">
             {/* Service Selection */}
             <div className="space-y-4">
                <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                   <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs">1</span>
                   시술 서비스 선택
                </h3>
                <div className="grid gap-3">
                   {availableServices.map(service => (
                     <label 
                       key={service.id}
                       className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                         selectedServiceId === service.id ? 'border-[var(--primary)] bg-[var(--primary-glow)]' : 'border-neutral-100 bg-neutral-50'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name="service" 
                            className="hidden" 
                            checked={selectedServiceId === service.id}
                            onChange={() => setSelectedServiceId(service.id)}
                          />
                          <div>
                             <p className={`font-bold text-sm ${selectedServiceId === service.id ? 'text-neutral-900' : 'text-neutral-600'}`}>{service.name}</p>
                             <p className="text-[11px] text-neutral-400">정확한 금액은 매장 상담 후 결정됩니다.</p>
                          </div>
                       </div>
                       <span className="font-bold text-sm text-neutral-800">{service.price.toLocaleString()}원~</span>
                     </label>
                   ))}
                </div>
             </div>

             {/* Personal Details */}
             <div className="space-y-4">
                <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                   <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs">2</span>
                   고객 정보 입력
                </h3>
                <div className="grid gap-5">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 ml-1">이름 (영문/한글) *</label>
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="이름을 입력해 주세요"
                        className="w-full h-14 bg-neutral-50 border border-neutral-100 rounded-2xl px-5 text-sm outline-none focus:border-[var(--primary)]"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 ml-1">휴대폰 번호 *</label>
                      <input 
                        type="tel" 
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full h-14 bg-neutral-50 border border-neutral-100 rounded-2xl px-5 text-sm outline-none focus:border-[var(--primary)]"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 ml-1">SNS ID (인스타그램/카카오톡)</label>
                      <input 
                        type="text" 
                        value={snsId}
                        onChange={e => setSnsId(e.target.value)}
                        placeholder="@id 또는 카카오톡 ID"
                        className="w-full h-14 bg-neutral-50 border border-neutral-100 rounded-2xl px-5 text-sm outline-none focus:border-[var(--primary)]"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-500 ml-1">시술 요청 및 코멘트</label>
                      <textarea 
                        value={requestNote}
                        onChange={e => setRequestNote(e.target.value)}
                        placeholder="원하시는 스타일이나 요청사항을 입력해 주세요."
                        className="w-full h-32 bg-neutral-50 border border-neutral-100 rounded-2xl p-5 text-sm outline-none focus:border-[var(--primary)] resize-none"
                      />
                   </div>
                </div>
             </div>

             <button 
               disabled={!canContinueStep3}
               onClick={() => setCurrentStep(4)}
               className={`w-full py-5 rounded-2xl font-bold text-lg shadow-lg border transition-all ${
                 canContinueStep3 ? 'bg-[var(--secondary)] border-[var(--secondary)] text-white' : 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed'
               }`}
             >
               다음: 예약 내용 확인
             </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-8">
             <div className="p-6 rounded-3xl bg-neutral-50 border border-neutral-100 space-y-6">
                <span className="text-xs font-black text-[var(--accent)] uppercase tracking-widest">Final Summary</span>
                <div className="space-y-4">
                   <div className="flex justify-between items-center py-1 border-b border-neutral-200 border-dashed">
                      <span className="text-sm text-neutral-400">매장명</span>
                      <span className="font-bold text-neutral-800">{selectedStore?.name}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-neutral-200 border-dashed">
                      <span className="text-sm text-neutral-400">일시</span>
                      <span className="font-bold text-neutral-800">{selectedDate} {selectedTime}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-neutral-200 border-dashed">
                      <span className="text-sm text-neutral-400">예약 상품</span>
                      <span className="font-bold text-neutral-800">{availableServices.find(s => s.id === selectedServiceId)?.name}</span>
                   </div>
                   <div className="flex justify-between items-center py-1 border-b border-neutral-200 border-dashed">
                      <span className="text-sm text-neutral-400">성함</span>
                      <span className="font-bold text-neutral-800">{customerName}</span>
                   </div>
                   <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-neutral-400">연락처</span>
                      <span className="font-bold text-neutral-800">{customerPhone}</span>
                   </div>
                </div>
             </div>

             {/* Agreements */}
             <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="mt-1 w-5 h-5 rounded-md border-neutral-300 text-[var(--primary)] focus:ring-[var(--primary-glow)]"
                     checked={privacyConsent}
                     onChange={e => setPrivacyConsent(e.target.checked)}
                   />
                   <span className="text-sm text-neutral-600 line-clamp-2">[필수] 예약 서비스 제공을 위한 개인정보 수집 및 이용에 동의합니다.</span>
                </label>
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                   <input 
                     type="checkbox" 
                     className="mt-1 w-5 h-5 rounded-md border-neutral-300 text-[var(--primary)] focus:ring-[var(--primary-glow)]"
                     checked={bookingConfirmed}
                     onChange={e => setBookingConfirmed(e.target.checked)}
                   />
                   <span className="text-sm text-neutral-600 line-clamp-2">[필수] 예약 내역과 취소/변경 규정을 모두 확인했으며 이에 동의합니다.</span>
                </label>
             </div>

             <button 
               onClick={handleComplete}
               disabled={!canSubmit}
               className={`w-full py-6 rounded-2xl font-black text-xl shadow-2xl transition-all ${
                 canSubmit ? 'bg-[var(--secondary)] text-white' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
               }`}
             >
               {isSubmitting ? "예약 요청 중..." : "최종 예약 요청하기"}
             </button>
          </div>
        )}
      </div>

      <IntegratedBookingMenu 
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onConfirm={(date, time) => {
          setSelectedDate(date);
          setSelectedTime(time);
          setIsTimePickerOpen(false);
        }}
      />
    </div>
  );
}
