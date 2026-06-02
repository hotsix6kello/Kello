'use client';

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import {
  getBookingFlowCategoryCapabilities,
  getBookingFlowImageGroups,
} from "@/lib/bookings/bookingFlowSkeleton/constants";
import type {
  BookingConfirmationState,
  BookingCustomerDetailsState,
  BookingFlowCategory,
  BookingFlowSummary,
} from "@/lib/bookings/bookingFlowSkeleton/types";

type ConfirmationStepShellProps = {
  category: BookingFlowCategory | null;
  customerDetails: BookingCustomerDetailsState;
  confirmation: BookingConfirmationState;
  summary: BookingFlowSummary;
  embedded?: boolean;
  onChangeConfirmation?: (patch: Partial<BookingConfirmationState>) => void;
  onSubmitIntent?: () => void;
};

type ReceiptRow = {
  id: string;
  label: string;
  value: string;
};

const TERMS_CONTENT = {
  service: {
    title: "서비스 이용약관",
    content: "제1조 (목적)\n본 약관은 켈로(Kello) 서비스를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (용어의 정의)\n1. '서비스'란 회사가 제공하는 예약 중개 플랫폼을 의미합니다.\n2. '이용자'란 본 약관에 따라 서비스를 이용하는 고객을 의미합니다.\n\n제3조 (약관의 효력 및 변경)\n회사는 관련 법령을 위배하지 않는 범위 내에서 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 고지합니다.\n\n[이하 중략...]\n\n감사합니다."
  },
  privacy: {
    title: "개인정보 수집 및 이용 동의",
    content: "1. 수집하는 개인정보 항목\n- 필수항목: 이름, 연락처(전화번호 또는 SNS ID), 예약 일시, 서비스 메뉴\n- 선택항목: 추가 요청사항, 참고 이미지\n\n2. 수집 및 이용 목적\n- 서비스 예약 확인 및 가맹점 전달\n- 예약 변경/취소 안내 및 CS 대응\n\n3. 보유 및 이용 기간\n- 서비스 이용 종료 후 1년 또는 법정 의무 보관 기간까지\n\n귀하는 본 동의를 거부할 권리가 있으나, 거부 시 서비스 예약이 불가능할 수 있습니다."
  },
  third_party: {
    title: "개인정보 제3자 제공 및 국외 이전",
    content: "1. 제공받는 자: 해당 예약 가맹점(숍)\n2. 제공 목적: 예약 서비스 제공 및 방문 확인\n3. 제공 항목: 이름, 연락처, 예약 상세 정보\n4. 보유 및 이용 기간: 서비스 제공 목적 달성 완료 시까지\n\n[국외 이전 안내]\n회사는 글로벌 서비스 품질 향상을 위해 클라우드 서버(AWS 등)를 사용하며, 이 과정에서 데이터의 물리적 위치가 해외일 수 있습니다.\n\n동의를 거부할 권리가 있으며, 거부 시 서비스 이용에 제한이 있을 수 있습니다."
  },
  marketing: {
    title: "마케팅 정보 수집 및 수신",
    content: "1. 목적: 신규 서비스 안내, 이벤트 정보 전달, 맞춤형 혜택 제공\n2. 수집 항목: 이메일, 휴대전화 번호, 앱 푸시 수신 여부\n3. 보유 기간: 동의 철회 시 또는 회원 탈퇴 시까지\n\n선택 사항으로 동의하지 않아도 서비스 이용은 가능하나, 각종 할인 혜택 등 유용한 정보 수신이 제한될 수 있습니다."
  }
};

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

export function ConfirmationStepShell({
  category,
  customerDetails,
  confirmation,
  summary,
  embedded = false,
  onChangeConfirmation,
  onSubmitIntent,
}: ConfirmationStepShellProps) {
  const { t } = useTranslation("common");
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsInteractiveReview = capabilities?.interactiveReview === true;
  const imageGroups = getBookingFlowImageGroups(category);
  
  const [activeTermId, setActiveTermId] = useState<keyof typeof TERMS_CONTENT | null>(null);

  useEffect(() => {
    if (activeTermId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeTermId]);

  const serviceLabel = summary.selectedServiceTitle ? t(summary.selectedServiceTitle) : t("booking_skeleton.review.no_service");
  const dateLabel = summary.selectedDate ?? t("booking_skeleton.review.no_date");
  const customerName = summary.customerName.trim() || t("booking_skeleton.review.no_name");
  const customerContact = summary.contact.trim() || t("booking_skeleton.review.no_contact");
  const requestNote = customerDetails.requestNote.trim();

  // Validation: Required items must be checked
  const canSendSubmitIntent =
    confirmation.serviceTermsAgreed &&
    confirmation.privacyPolicyAgreed &&
    confirmation.thirdPartySharingAgreed &&
    confirmation.refundPolicyAgreed;

  const isAllAgreed =
    confirmation.serviceTermsAgreed &&
    confirmation.privacyPolicyAgreed &&
    confirmation.thirdPartySharingAgreed &&
    confirmation.marketingConsentAgreed &&
    confirmation.refundPolicyAgreed;

  const handleToggleAll = (checked: boolean) => {
    onChangeConfirmation?.({
      serviceTermsAgreed: checked,
      privacyPolicyAgreed: checked,
      thirdPartySharingAgreed: checked,
      marketingConsentAgreed: checked,
      refundPolicyAgreed: checked,
      refundPolicyAgreedAt: checked ? new Date().toISOString() : null,
    });
  };

  const receiptRows: ReceiptRow[] = [
    { id: "category", label: t("booking_skeleton.confirmation.shop"), value: summary.categoryLabel ? t(summary.categoryLabel) : "-" },
    { id: "service", label: t("booking_skeleton.confirmation.service"), value: serviceLabel },
    { id: "date", label: t("booking_skeleton.confirmation.date_time"), value: dateLabel },
    { id: "name", label: t("booking_skeleton.confirmation.customer"), value: customerName },
    { id: "contact", label: t("booking_skeleton.confirmation.customer"), value: customerContact },
  ];

  const content = supportsInteractiveReview ? (
    <div className="w-full">
      <div className="py-2">
        <div className="flex flex-col gap-1.5 px-1 mb-4">
          <h3 className="text-[17px] font-bold text-neutral-900">{t("booking_skeleton.confirmation.title")}</h3>
          <p className="text-[13px] text-neutral-500">{t("booking_skeleton.confirmation.desc_summary")}</p>
        </div>

        <ul className="flex flex-col gap-1 bg-neutral-50/50 rounded-2xl p-4 border border-neutral-100">
          {receiptRows.map((row) => (
            <li key={row.id} className="flex items-start justify-between py-3 px-1 border-b border-neutral-100 last:border-0">
              <span className="text-[14px] font-medium text-neutral-500">{row.label}</span>
              <span className="min-w-0 text-right text-[14px] font-bold text-neutral-900 break-words">
                {row.value}
              </span>
            </li>
          ))}
          {requestNote && (
            <li className="flex flex-col pt-3 pb-1 px-1">
              <span className="text-[14px] font-medium text-neutral-500 mb-2">{t("booking_skeleton.customer_details.request_label")}</span>
              <div className="text-[14px] font-semibold leading-relaxed text-fuchsia-900 bg-fuchsia-50/50 rounded-xl p-4 border border-fuchsia-100/50 whitespace-pre-wrap">
                {requestNote}
              </div>
            </li>
          )}
        </ul>
      </div>

      <section className="py-8">
        <div className="flex items-center justify-between px-1 mb-5">
          <h3 className="text-[17px] font-bold text-neutral-900">{t("booking_skeleton.confirmation.attached_images")}</h3>
          <span className="text-[12px] font-bold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-full">
            {t("booking_skeleton.confirmation.image_count_summary", { count: imageGroups.reduce((acc, g) => acc + customerDetails[g.stateKey].length, 0) })}
          </span>
        </div>
        
        <div className="space-y-6">
          {imageGroups.map((group) => {
            const images = customerDetails[group.stateKey];

            return (
              <div key={group.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  <h4 className="text-[14px] font-bold text-neutral-800">{t(group.reviewTitle)}</h4>
                </div>

                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {images.map((item) => (
                      <div key={item.id} className="group overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-all hover:border-fuchsia-200">
                        <div className="flex aspect-square items-center justify-center border-b border-neutral-50 bg-neutral-50">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-600 text-sm font-bold text-white shadow-lg">
                            {item.fileName.slice(0, 1).toUpperCase()}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[12px] font-bold text-neutral-900 truncate">
                            {item.fileName}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-neutral-400">
                            {formatFileSize(item.fileSize)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-neutral-400 px-1 italic">{t("booking_skeleton.review.no_images")}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-6 mb-32">
        <div className="px-1 mb-5">
          <h3 className="text-[17px] font-bold text-neutral-900">{t("booking_skeleton.confirmation.agreement_title")}</h3>
          <p className="text-[13px] text-neutral-500 mt-1">{t("booking_skeleton.confirmation.agreement_desc_hint")}</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Select All */}
          <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${isAllAgreed ? "bg-fuchsia-50 border-fuchsia-200" : "bg-white border-neutral-100 hover:border-fuchsia-100"}`}>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={isAllAgreed}
                onChange={(e) => handleToggleAll(e.target.checked)}
                className="peer h-6 w-6 appearance-none rounded-lg border-2 border-neutral-200 transition-all checked:border-fuchsia-600 checked:bg-fuchsia-600"
              />
              <svg className="absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-[15px] font-black leading-relaxed transition-colors ${isAllAgreed ? "text-fuchsia-900" : "text-neutral-900"}`}>
              {t("booking_skeleton.confirmation.agreement_all")}
            </span>
          </label>

          <div className="flex flex-col gap-1 px-1">
            {/* Service Terms */}
            <div className="flex items-center justify-between group py-2">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={confirmation.serviceTermsAgreed}
                    onChange={(e) => onChangeConfirmation?.({ serviceTermsAgreed: e.target.checked })}
                    className="peer h-5 w-5 appearance-none rounded-md border-2 border-neutral-200 transition-all checked:border-fuchsia-500 checked:bg-fuchsia-500"
                  />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13.5px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors">
                  {t("booking_skeleton.confirmation.agreement_service")}
                </span>
              </label>
              <button 
                type="button" 
                className="p-2 text-neutral-400 hover:text-fuchsia-600 transition-all active:scale-90"
                onClick={() => setActiveTermId('service')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-center justify-between group py-2">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={confirmation.privacyPolicyAgreed}
                    onChange={(e) => onChangeConfirmation?.({ privacyPolicyAgreed: e.target.checked })}
                    className="peer h-5 w-5 appearance-none rounded-md border-2 border-neutral-200 transition-all checked:border-fuchsia-500 checked:bg-fuchsia-500"
                  />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13.5px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors">
                  {t("booking_skeleton.confirmation.agreement_privacy")}
                </span>
              </label>
              <button 
                type="button" 
                className="p-2 text-neutral-400 hover:text-fuchsia-600 transition-all active:scale-90"
                onClick={() => setActiveTermId('privacy')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Third Party Sharing */}
            <div className="flex items-center justify-between group py-2">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={confirmation.thirdPartySharingAgreed}
                    onChange={(e) => onChangeConfirmation?.({ thirdPartySharingAgreed: e.target.checked })}
                    className="peer h-5 w-5 appearance-none rounded-md border-2 border-neutral-200 transition-all checked:border-fuchsia-500 checked:bg-fuchsia-500"
                  />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13.5px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors">
                  {t("booking_skeleton.confirmation.agreement_third_party")}
                </span>
              </label>
              <button 
                type="button" 
                className="p-2 text-neutral-400 hover:text-fuchsia-600 transition-all active:scale-90"
                onClick={() => setActiveTermId('third_party')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Marketing Consent */}
            <div className="flex items-center justify-between group py-2">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={confirmation.marketingConsentAgreed}
                    onChange={(e) => onChangeConfirmation?.({ marketingConsentAgreed: e.target.checked })}
                    className="peer h-5 w-5 appearance-none rounded-md border-2 border-neutral-200 transition-all checked:border-fuchsia-500 checked:bg-fuchsia-500"
                  />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13.5px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors">
                  {t("booking_skeleton.confirmation.agreement_marketing")}
                </span>
              </label>
              <button
                type="button"
                className="p-2 text-neutral-400 hover:text-fuchsia-600 transition-all active:scale-90"
                onClick={() => setActiveTermId('marketing')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Refund Policy Consent */}
            <div className="flex items-center py-2 group">
              <label className="flex items-start gap-3 cursor-pointer flex-1">
                <div className="relative flex items-center mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={confirmation.refundPolicyAgreed}
                    onChange={(e) => onChangeConfirmation?.({
                      refundPolicyAgreed: e.target.checked,
                      refundPolicyAgreedAt: e.target.checked ? new Date().toISOString() : null,
                    })}
                    className="peer h-5 w-5 appearance-none rounded-md border-2 border-neutral-200 transition-all checked:border-fuchsia-500 checked:bg-fuchsia-500"
                  />
                  <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[13.5px] font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors leading-relaxed">
                  {t("booking_skeleton.confirmation.agreement_refund_policy")}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Validation Error Message */}
        {!canSendSubmitIntent && (isAllAgreed || confirmation.marketingConsentAgreed || confirmation.refundPolicyAgreed || confirmation.serviceTermsAgreed || confirmation.privacyPolicyAgreed || confirmation.thirdPartySharingAgreed) && (
          <p className="mt-4 px-1 text-[12px] font-bold text-red-500 animate-pulse">
            {t("booking_skeleton.confirmation.agreement_validation_error")}
          </p>
        )}
      </section>

      <section className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-10 pt-4 shadow-[0_-20px_40px_rgba(255,255,255,1)]">
        <button
          type="button"
          onClick={() => onSubmitIntent?.()}
          disabled={!canSendSubmitIntent}
          className="inline-flex min-h-[60px] w-full items-center justify-center rounded-2xl px-4 py-4 text-[16px] font-bold transition bg-fuchsia-600 text-white shadow-[0_12px_24px_rgba(192,38,211,0.25)] hover:bg-fuchsia-700 disabled:bg-fuchsia-100 disabled:text-fuchsia-300 disabled:shadow-none"
        >
          {t("booking_skeleton.confirmation.submit_button")}
        </button>
      </section>

      {/* Terms Detail Modal */}
      {activeTermId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
            onClick={() => setActiveTermId(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-[18px] font-bold text-neutral-900">
                {TERMS_CONTENT[activeTermId].title}
              </h2>
              <button 
                onClick={() => setActiveTermId(null)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="text-[14px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
                {TERMS_CONTENT[activeTermId].content}
              </div>
            </div>

            <footer className="p-6 border-t border-neutral-50 bg-neutral-50/50">
              <button 
                onClick={() => setActiveTermId(null)}
                className="w-full py-4 rounded-2xl bg-neutral-900 text-white text-[15px] font-bold hover:bg-neutral-800 transition-colors shadow-lg"
              >
                {t("common.actions.close")}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="py-5 text-sm text-neutral-500">{t("booking_skeleton.confirmation.preparing")}</div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow={`${t("booking_skeleton.steps.step")} 4`}
      title={t("booking_skeleton.confirmation.title")}
      description={t("booking_skeleton.confirmation.desc_final")}
    >
      {content}
    </BookingFlowStepFrame>
  );
}
