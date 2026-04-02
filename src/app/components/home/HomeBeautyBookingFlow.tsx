'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Image from 'next/image';
import styles from '@/app/home.module.css';
import IntegratedBookingMenu from '../IntegratedBookingMenu';
import { 
  BEAUTY_STORE_ITEMS, 
  BEAUTY_REGIONS, 
  BeautyStore, 
  BeautyRegionId, 
  BeautyCategoryId,
  PRIMARY_SERVICES_BY_CATEGORY
} from './constants';
import { submitBeautyBooking, uploadBookingImages, BeautyBookingPayload } from '@/app/explore/beautyBooking';
import { supabase } from '@/lib/supabaseClient';

interface HomeBeautyBookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: BeautyCategoryId | 'all' | null;
  t: TFunction;
}

export default function HomeBeautyBookingFlow({ isOpen, onClose, initialCategory, t }: HomeBeautyBookingFlowProps) {
  const { t: tBeauty } = useTranslation(['beauty_explore', 'home_beauty']);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<BeautyRegionId>('all');
  
  // Selection state (Recovering user's original logic)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  
  // Form state
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    request: ''
  });
  const [requestImages, setRequestImages] = useState<string[]>([]);
  const [agreements, setAgreements] = useState({
    bookingConfirmed: false,
    privacyConsent: false
  });

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<{
    storeName: string;
    date: string;
    time: string;
    serviceName?: string;
  } | null>(null);

  const regions = BEAUTY_REGIONS(t, tBeauty);

  const filteredStores = useMemo(() => {
    return BEAUTY_STORE_ITEMS.filter((item: BeautyStore) => {
      const matchCategory = !initialCategory || initialCategory === 'all' || item.category === initialCategory;
      const matchRegion = selectedRegion === 'all' || item.region === selectedRegion;
      return matchCategory && matchRegion;
    });
  }, [initialCategory, selectedRegion]);

  const selectedStore = useMemo(() => 
    BEAUTY_STORE_ITEMS.find((s: BeautyStore) => s.id === selectedStoreId) || null
  , [selectedStoreId]);

  const availableServices = useMemo(() => {
    if (!selectedStore) return [];
    return PRIMARY_SERVICES_BY_CATEGORY[selectedStore.category] || [];
  }, [selectedStore]);

  const handleStoreSelect = (store: BeautyStore) => {
    setSelectedStoreId(store.id);
    setSelectedStoreName(store.name);
    
    // 매장 선택 시 해당 카테고리의 첫 번째 서비스를 자동으로 선택
    const services = PRIMARY_SERVICES_BY_CATEGORY[store.category] || [];
    if (services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
    
    setCurrentStep(2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 2 - requestImages.length;
    if (remainingSlots <= 0) {
      alert('이미지는 최대 2장까지만 첨부 가능합니다.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRequestImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setRequestImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => {
    if (currentStep === 1 || submittedBooking) {
      onClose();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };



  const handleComplete = async () => {
    if (!selectedStore || !selectedDate || !selectedTime || !selectedServiceId) return;
    
    setIsSubmitting(true);
    try {
      // 1. Upload images to Supabase Storage if any
      let uploadedUrls: string[] = [];
      if (requestImages.length > 0) {
        uploadedUrls = await uploadBookingImages(requestImages);
      }

      const service = availableServices.find((s) => s.id === selectedServiceId);
      
      const payload: BeautyBookingPayload = {
        category: 'beauty',
        beautyCategory: selectedStore.category,
        region: selectedStore.region,
        storeId: selectedStore.id,
        storeName: selectedStore.name,
        bookingDate: selectedDate,
        bookingTime: selectedTime,
        designerId: null,
        designerName: null,
        primaryServiceId: selectedServiceId,
        primaryServiceName: service?.name || '선택 안 함',
        addOnIds: [],
        addOnNames: [],
        priceSummary: {
          basePrice: service?.price || 0,
          addOnPrice: 0,
          designerSurcharge: 0,
          totalPrice: service?.price || 0,
        },
        customer: {
          name: customerForm.name,
          phone: customerForm.phone,
          request: customerForm.request,
          imageUrls: uploadedUrls,
        },
        communication: {
          language: 'ko',
          intent: 'visit',
          messages: {
            korean: '',
            localized: '',
          },
        },
        agreements: {
          bookingConfirmed: agreements.bookingConfirmed,
          privacyConsent: agreements.privacyConsent,
        },
        createdFrom: {
          flow: 'beauty-explore',
        },
      };

      const { data } = await supabase.auth.getSession();
      await submitBeautyBooking(payload, data.session?.access_token ?? null);
      
      setSubmittedBooking({
        storeName: selectedStore.name,
        date: selectedDate,
        time: selectedTime,
        serviceName: service?.name
      });

    } catch (error) {
      console.error('Booking failed', error);
      alert('예약 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const beautyFlowSteps = [
    tBeauty('step_1', { defaultValue: '매장 선택' }),
    tBeauty('step_2', { defaultValue: '일정 선택' }),
    '정보 입력',
    '예약 확인'
  ];

  const renderProgress = () => (
    <ol className={styles.beautyStepIndicator} style={{ marginBottom: '24px' }}>
      {beautyFlowSteps.map((step, index) => {
        const stepNum = index + 1;
        const isCurrent = currentStep === stepNum;
        const isDone = currentStep > stepNum;
        return (
          <li
            key={step}
            className={`${styles.beautyStepItem} ${isCurrent ? styles.beautyStepItemCurrent : ''} ${isDone ? styles.beautyStepItemDone : ''}`}
          >
            <span className={styles.beautyStepBullet}>{stepNum}</span>
            <span className={styles.beautyStepText}>{step}</span>
          </li>
        );
      })}
    </ol>
  );

  const isFormValid = customerForm.name.trim() && customerForm.phone.trim() && selectedServiceId;
  const isConfirmEnabled = isFormValid && agreements.bookingConfirmed && agreements.privacyConsent;

  return (
    <div className="fixed inset-0 z-[400] flex justify-center bg-black/60 sm:bg-black/40">
      <div className="w-full max-w-[480px] bg-white flex flex-col h-full overflow-hidden relative shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Back Button (Absolute as per 9b939b8) */}
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-3 top-6 z-[50] flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto pb-24">
        {submittedBooking ? (
          <div className="px-4 pt-20">
             <div className={styles.beautyHero} style={{ background: 'none', padding: 0, marginBottom: '32px' }}>
                <h1 className={styles.beautyTitle} style={{ color: '#111' }}>결과를 확인해 주세요</h1>
             </div>
             <div className={styles.beautyCompletionCard}>
                <p className={styles.beautyCompletionTitle}>{tBeauty('completion_title')}</p>
                <div className={styles.beautyCompletionMain}>
                   <p className={styles.beautyCompletionDesc}>{tBeauty('completion_desc1')}</p>
                   <div className={styles.beautyCompletionHero}>
                      <div className={styles.beautyCompletionHeroBlock}>
                         <span className={styles.beautyCompletionHeroLabel}>예약 매장</span>
                         <strong className={styles.beautyCompletionHeroTitle}>{submittedBooking.storeName}</strong>
                         <span className={styles.beautyCompletionHeroMeta}>{submittedBooking.date} · {submittedBooking.time}</span>
                      </div>
                   </div>
                </div>
                <div className={styles.beautyCompletionActions}>
                   <button type="button" className={styles.beautySecondaryAction} onClick={onClose} style={{ background: '#bb8a78', color: 'white' }}>
                      메인으로 돌아가기
                   </button>
                </div>
             </div>
          </div>
        ) : (
          <>
            <section className={styles.beautyHero} style={{ background: '#fffcfb', borderBottom: '1px solid #f0e0d8', paddingTop: '45px', paddingBottom: '16px', paddingLeft: '20px', paddingRight: '20px' }}>
               <span className={styles.beautyEyebrow} style={{ color: '#bb8a78', fontWeight: 900 }}>STEP {currentStep} / 4</span>
               <h1 className={styles.beautyTitle} style={{ fontSize: '22px', fontWeight: 900, marginTop: '6px', color: '#222' }}>
                  {currentStep === 1 && (!initialCategory || initialCategory === 'all' ? "관심 있는 매장을 골라보세요" : `${tBeauty(`categories.${initialCategory}.label`)} 매장을 선택해 주세요`)}
                  {currentStep === 2 && "예약 일시를 선택해 주세요"}
                  {currentStep === 3 && "상세 정보를 입력해 주세요"}
                  {currentStep === 4 && "예약 내용을 확인해 주세요"}
               </h1>
               <div className="mt-4 px-5" style={{ paddingLeft: '0', paddingRight: '0' }}>
                  {renderProgress()}
               </div>
            </section>

            <div className="px-4 mt-2">
               {/* Step 1: Store Selection */}
               {currentStep === 1 && (
                 <div className="flex flex-col gap-4">
                    <div className={styles.beautyRegionChipRow}>
                       {regions.map((region: { id: BeautyRegionId; label: string }) => (
                         <button
                           key={region.id}
                           className={`${styles.beautyRegionChip} ${selectedRegion === region.id ? styles.beautyRegionChipActive : ''}`}
                           style={selectedRegion === region.id ? { background: '#bb8a78', color: 'white' } : {}}
                           onClick={() => setSelectedRegion(region.id)}
                         >
                           {region.label}
                         </button>
                       ))}
                    </div>
                    <div className="flex flex-col gap-3">
                       {filteredStores.map((store: BeautyStore) => (
                         <article
                           key={store.id}
                           className={`bg-white rounded-2xl transition-all duration-300 ${selectedStoreId === store.id ? 'ring-2 ring-[#bb8a78] shadow-md bg-[#fffbfa]' : 'shadow-sm border border-neutral-100'}`}
                           style={{ overflow: 'hidden', cursor: 'pointer' }}
                           onClick={() => handleStoreSelect(store)}
                         >
                           <div className="flex flex-row w-full items-center p-3 gap-3">
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                 <Image 
                                   src={store.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} 
                                   alt={store.name} 
                                   fill
                                   sizes="(max-width: 768px) 100vw, 33vw"
                                   className="object-cover" 
                                 />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h3 className="text-base font-bold text-neutral-900 truncate">{store.name}</h3>
                                 <p className="text-xs text-neutral-500">{tBeauty(`region_${store.region}`)}</p>
                                 <div className="text-sm font-semibold text-[#bb8a78] mt-1">{store.priceLabel}</div>
                              </div>
                              <div className="shrink-0 text-[#bb8a78] font-bold text-xs uppercase bg-[#fff5f0] px-3 py-1.5 rounded-lg border border-[#f0e0d8]">
                                 {tBeauty('btn_select_salon', { defaultValue: '선택' })}
                              </div>
                           </div>
                         </article>
                       ))}
                    </div>
                 </div>
               )}

               {/* Step 2: Scheduling */}
               {currentStep === 2 && (
                 <div className="flex flex-col gap-6">
                    {selectedStore && (
                       <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                             <Image src={selectedStore.imageUrl || ''} alt={selectedStore.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                          </div>
                          <div className="flex-1">
                             <span className="text-[10px] font-bold text-[#bb8a78] uppercase tracking-wider">SELECTED STORE</span>
                             <h3 className="font-bold text-neutral-800">{selectedStoreName}</h3>
                          </div>
                       </div>
                    )}
                    <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
                       <h3 className="font-bold text-lg mb-4">날짜와 시간을 골라주세요</h3>
                       {selectedDate && selectedTime ? (
                          <div className="flex flex-col gap-4">
                             <div className="bg-[#fffcfb] border border-[#bb8a78]/20 rounded-xl p-4">
                                <div className="text-sm text-neutral-500 mb-1">선택된 일시</div>
                                <div className="text-xl font-bold text-neutral-900">{selectedDate} - {selectedTime}</div>
                             </div>
                             <button onClick={() => setIsTimePickerOpen(true)} className="text-[#bb8a78] font-bold underline text-sm py-2">다른 일시로 변경하기</button>
                             <button onClick={() => setCurrentStep(3)} className="w-full bg-[#bb8a78] text-white py-4 rounded-xl font-bold shadow-lg">다음: 상세 정보 입력</button>
                          </div>
                       ) : (
                          <button onClick={() => setIsTimePickerOpen(true)} className="w-full bg-[#bb8a78] text-white py-5 rounded-xl font-bold text-lg shadow-md">날짜 및 시간 선택하기</button>
                       )}
                    </div>
                 </div>
               )}

               {/* Step 3: Detailed Form */}
               {currentStep === 3 && (
                 <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col gap-4">
                       <span className="text-xs font-bold text-[#bb8a78] uppercase tracking-wider">Customer Details</span>
                       <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-1.5">
                             <label className="text-xs font-bold text-neutral-600">이름 (영문 추천) *</label>
                             <input
                                className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm focus:border-[#bb8a78] outline-none"
                                value={customerForm.name}
                                onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Name as on Passport"
                             />
                          </div>
                          <div className="flex flex-col gap-1.5">
                             <label className="text-xs font-bold text-neutral-600">연락처 (SNS ID 포함 가능) *</label>
                             <input
                                className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm focus:border-[#bb8a78] outline-none"
                                value={customerForm.phone}
                                onChange={e => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="Phone or Instagram ID"
                             />
                          </div>
                          <div className="flex flex-col gap-1.5">
                             <label className="text-xs font-bold text-neutral-600">요청사항</label>
                             <textarea
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-sm focus:border-[#bb8a78] outline-none"
                                rows={4}
                                value={customerForm.request}
                                onChange={e => setCustomerForm(prev => ({ ...prev, request: e.target.value }))}
                                placeholder="원하시는 스타일 이미지나 특이사항이 있다면 적어주세요."
                             />
                             
                             {/* 이미지 첨부 영역 */}
                             <div className="mt-4">
                               <div className="flex flex-wrap gap-3">
                                 {requestImages.map((img, idx) => (
                                   <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-100 group">
                                     <Image src={img} alt="attached" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                                     <button 
                                       onClick={() => removeImage(idx)}
                                       className="absolute top-1 right-1 bg-black/50 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs backdrop-blur-sm"
                                     >
                                       ✕
                                     </button>
                                   </div>
                                 ))}
                                 
                                 {requestImages.length < 2 && (
                                   <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50 text-neutral-400 cursor-pointer hover:border-[#bb8a78] hover:bg-[#fffcfb] hover:text-[#bb8a78] transition-all">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mb-1">
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                       <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                     </svg>
                                     <span className="text-[10px] font-bold uppercase tracking-wide">Add Poto</span>
                                     <input type="file" accept="image/*" className="hidden" multiple onChange={handleImageUpload} />
                                   </label>
                                 )}
                               </div>
                               <p className="text-[10px] text-neutral-400 mt-2 font-medium">* 스타일 참고용 이미지(최대 2장)를 첨부하실 수 있습니다.</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <button
                       disabled={!isFormValid}
                       onClick={() => setCurrentStep(4)}
                       className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${isFormValid ? 'bg-[#bb8a78] text-white hover:bg-[#a67969]' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'}`}
                    >
                       다음: 예약 내용 확인
                    </button>
                 </div>
               )}

               {/* Step 4: Final Confirmation */}
               {currentStep === 4 && (
                 <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col gap-4">
                       <span className="text-xs font-bold text-[#bb8a78] uppercase tracking-wider">Booking Summary</span>
                       <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-start border-b border-neutral-50 pb-3">
                             <span className="text-sm text-neutral-400">매장</span>
                             <strong className="text-sm text-neutral-800 text-right">{selectedStoreName}</strong>
                          </div>
                          <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                             <span className="text-sm text-neutral-400">일시</span>
                             <strong className="text-sm text-neutral-800">{selectedDate} - {selectedTime}</strong>
                          </div>
                           <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                              <span className="text-sm text-neutral-400">서비스</span>
                              <strong className="text-sm text-neutral-800">{availableServices.find((s) => s.id === selectedServiceId)?.name}</strong>
                           </div>
                          <div className="flex justify-between items-center">
                             <span className="text-sm text-neutral-400">예약자</span>
                             <strong className="text-sm text-neutral-800">{customerForm.name}</strong>
                          </div>
                       </div>
                    </div>

                    <div className="bg-neutral-50 rounded-2xl p-5 flex flex-col gap-4">
                       <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-widest">이용 동의</h4>
                       <div className="flex flex-col gap-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                             <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#bb8a78] focus:ring-[#bb8a78]"
                                checked={agreements.bookingConfirmed}
                                onChange={() => setAgreements(prev => ({ ...prev, bookingConfirmed: !prev.bookingConfirmed }))}
                             />
                             <div className="flex flex-col">
                                <span className="text-sm font-bold text-neutral-800 leading-tight">예약 내용 확인</span>
                                <span className="text-[11px] text-neutral-500 mt-0.5">선택하신 매장, 일시, 시술 정보가 정확함을 확인합니다.</span>
                             </div>
                          </label>
                          <label className="flex items-start gap-3 cursor-pointer">
                             <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#bb8a78] focus:ring-[#bb8a78]"
                                checked={agreements.privacyConsent}
                                onChange={() => setAgreements(prev => ({ ...prev, privacyConsent: !prev.privacyConsent }))}
                             />
                             <div className="flex flex-col">
                                <span className="text-sm font-bold text-neutral-800 leading-tight">개인정보 처리방침 동의</span>
                                <span className="text-[11px] text-neutral-500 mt-0.5">예약 진행을 위해 성함, 연락처 등의 정보가 매장에 제공됨에 동의합니다.</span>
                             </div>
                          </label>
                       </div>
                    </div>

                    <button
                       disabled={!isConfirmEnabled || isSubmitting}
                       onClick={handleComplete}
                       className={`w-full py-5 rounded-xl font-bold text-lg shadow-xl transition-all ${isConfirmEnabled ? 'bg-[#bb8a78] text-white hover:bg-[#a67969]' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                    >
                       {isSubmitting ? '처리 중...' : '최종 예약 신청하기'}
                    </button>
                 </div>
               )}
            </div>
          </>
        )}
      </div>

      <IntegratedBookingMenu 
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onConfirm={(date, time) => {
          setSelectedDate(date);
          setSelectedTime(time);
          setIsTimePickerOpen(false);
          if (currentStep < 2) setCurrentStep(2);
        }}
      />
    </div>
  </div>
);
}
