import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import {
  BOOKING_FLOW_CONFIRMATION_COPY,
  BOOKING_FLOW_REVIEW_COPY,
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
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsInteractiveReview = capabilities?.interactiveReview === true;
  const imageGroups = getBookingFlowImageGroups(category);
  const serviceLabel = summary.selectedServiceTitle ?? BOOKING_FLOW_REVIEW_COPY.noService;
  const dateLabel = summary.selectedDate ?? BOOKING_FLOW_REVIEW_COPY.noDate;
  const customerName = summary.customerName.trim() || BOOKING_FLOW_REVIEW_COPY.noCustomerName;
  const customerContact = summary.contact.trim() || BOOKING_FLOW_REVIEW_COPY.noContact;
  const requestNote = customerDetails.requestNote.trim();
  const canSendSubmitIntent = confirmation.bookingConfirmed && confirmation.privacyConsent;

  const receiptRows: ReceiptRow[] = [
    { id: "category", label: "카테고리", value: summary.categoryLabel || "-" },
    { id: "service", label: "시술", value: serviceLabel },
    { id: "date", label: "날짜", value: dateLabel },
    { id: "name", label: "이름", value: customerName },
    { id: "contact", label: "연락처", value: customerContact },
  ];

  const content = supportsInteractiveReview ? (
    <div className="bg-white">
      <div className="py-2">
        <ul className="flex flex-col gap-1">
          {receiptRows.map((row) => (
            <li key={row.id} className="flex items-start justify-between border-b border-neutral-100 py-4">
              <span className="text-[15px] text-neutral-500">{row.label}</span>
              <span className="min-w-0 text-right text-[15px] font-semibold text-neutral-950 break-words">
                {row.value}
              </span>
            </li>
          ))}
          {requestNote && (
            <li className="flex flex-col border-b border-neutral-100 py-4">
              <span className="text-[15px] text-neutral-500 mb-2">요청사항</span>
              <span className="text-[15px] font-medium leading-relaxed text-neutral-900 whitespace-pre-wrap">
                {requestNote}
              </span>
            </li>
          )}
        </ul>
      </div>

      <section className="py-6 border-b border-neutral-100">
        <span className="text-[15px] text-neutral-500">첨부 이미지</span>
        <div className="mt-4 space-y-5">
          {imageGroups.map((group) => {
            const images = customerDetails[group.stateKey];

            return (
              <div key={group.id}>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-neutral-900">{group.reviewTitle}</h4>
                  <span className="text-xs text-neutral-500">{images.length}장</span>
                </div>

                {images.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {images.map((item) => (
                      <div key={item.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                        <div className="flex aspect-[4/3] items-center justify-center border-b border-neutral-200 bg-neutral-50">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                            {item.fileName.slice(0, 1).toUpperCase()}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-sm font-semibold text-neutral-900 break-all">
                            {item.fileName}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                              {item.mimeType || "image/*"}
                            </span>
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1">
                              {formatFileSize(item.fileSize)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-neutral-500">{BOOKING_FLOW_REVIEW_COPY.noImages}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-5">
        <h3 className="text-lg font-semibold text-neutral-950">최종 동의</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          아래 항목에 모두 동의해야 예약 요청을 보낼 수 있습니다.
        </p>

        <div className="mt-4 flex flex-col gap-3 text-sm text-neutral-700">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirmation.bookingConfirmed}
              onChange={(event) => onToggleBookingConfirmed?.(event.target.checked)}
              className="mt-1"
            />
            <span>{BOOKING_FLOW_CONFIRMATION_COPY.bookingConfirmedLabel}</span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirmation.privacyConsent}
              onChange={(event) => onTogglePrivacyConsent?.(event.target.checked)}
              className="mt-1"
            />
            <span>{BOOKING_FLOW_CONFIRMATION_COPY.privacyConsentLabel}</span>
          </label>
        </div>
      </section>

      <section className="sticky bottom-0 z-10 -mx-4 bg-white px-4 pb-10 pt-4 shadow-[0_-20px_40px_rgba(255,255,255,1)]">
        <button
          type="button"
          onClick={() => onSubmitIntent?.()}
          disabled={!canSendSubmitIntent}
          className={`w-full p-4 rounded-xl font-bold transition-colors ${
            canSendSubmitIntent
              ? "text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/30"
              : "text-neutral-400 bg-neutral-100 cursor-not-allowed"
          }`}
        >
          예약 요청 전송
        </button>
      </section>
    </div>
  ) : (
    <div className="py-5 text-sm text-neutral-500">현재 카테고리에서는 최종 확인 화면을 준비 중입니다.</div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow="STEP 4"
      title="최종 예약 확인"
      description="예약 내용을 한 번 더 확인한 뒤 요청을 보내세요."
    >
      {content}
    </BookingFlowStepFrame>
  );
}
