'use client';

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
  onToggleBookingConfirmed?: (value: boolean) => void;
  onTogglePrivacyConsent?: (value: boolean) => void;
  onSubmitIntent?: () => void;
};

type ReceiptRow = {
  id: string;
  label: string;
  value: string;
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
  onToggleBookingConfirmed,
  onTogglePrivacyConsent,
  onSubmitIntent,
}: ConfirmationStepShellProps) {
  const { t } = useTranslation("common");
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsInteractiveReview = capabilities?.interactiveReview === true;
  const imageGroups = getBookingFlowImageGroups(category);
  const serviceLabel = summary.selectedServiceTitle ? t(summary.selectedServiceTitle) : t("booking_skeleton.review.no_service");
  const dateLabel = summary.selectedDate ?? t("booking_skeleton.review.no_date");
  const customerName = summary.customerName.trim() || t("booking_skeleton.review.no_name");
  const customerContact = summary.contact.trim() || t("booking_skeleton.review.no_contact");
  const requestNote = customerDetails.requestNote.trim();
  const canSendSubmitIntent = confirmation.bookingConfirmed && confirmation.privacyConsent;

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

        <div className="flex flex-col gap-3">
          <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${confirmation.bookingConfirmed ? "bg-fuchsia-50 border-fuchsia-200" : "bg-white border-neutral-100 hover:border-fuchsia-100"}`}>
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={confirmation.bookingConfirmed}
                onChange={(event) => onToggleBookingConfirmed?.(event.target.checked)}
                className="peer h-5 w-5 appearance-none rounded-lg border-2 border-neutral-200 transition-all checked:border-fuchsia-600 checked:bg-fuchsia-600"
              />
              <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-[14px] font-bold leading-relaxed transition-colors ${confirmation.bookingConfirmed ? "text-fuchsia-900" : "text-neutral-600"}`}>
              {t("booking_skeleton.confirmation.confirm_info_label")}
            </span>
          </label>

          <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${confirmation.privacyConsent ? "bg-fuchsia-50 border-fuchsia-200" : "bg-white border-neutral-100 hover:border-fuchsia-100"}`}>
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={confirmation.privacyConsent}
                onChange={(event) => onTogglePrivacyConsent?.(event.target.checked)}
                className="peer h-5 w-5 appearance-none rounded-lg border-2 border-neutral-200 transition-all checked:border-fuchsia-600 checked:bg-fuchsia-600"
              />
              <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-1/2 -translate-x-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-[14px] font-bold leading-relaxed transition-colors ${confirmation.privacyConsent ? "text-fuchsia-900" : "text-neutral-600"}`}>
              {t("booking_skeleton.confirmation.privacy_label")}
            </span>
          </label>
        </div>
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
