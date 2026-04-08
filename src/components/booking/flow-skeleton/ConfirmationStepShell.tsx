import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import {
  BOOKING_FLOW_CONFIRMATION_COPY,
  getBookingFlowImageGroups,
  BOOKING_FLOW_REVIEW_COPY,
  getBookingFlowCategoryCapabilities,
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
  onToggleBookingConfirmed?: (value: boolean) => void;
  onTogglePrivacyConsent?: (value: boolean) => void;
  onSubmitIntent?: () => void;
};

type ReviewValueSection = {
  id: string;
  title: string;
  value: string;
};

type ReviewCustomerField = {
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

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getFileCountLabel(count: number): string {
  return `${count} file${count === 1 ? "" : "s"}`;
}

export function ConfirmationStepShell({
  category,
  customerDetails,
  confirmation,
  summary,
  onToggleBookingConfirmed,
  onTogglePrivacyConsent,
  onSubmitIntent,
}: ConfirmationStepShellProps) {
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsInteractiveReview = capabilities?.interactiveReview === true;
  const imageGroups = getBookingFlowImageGroups(category);
  const serviceLabel = summary.selectedServiceTitle ?? BOOKING_FLOW_REVIEW_COPY.noService;
  const dateLabel = summary.selectedDate ?? BOOKING_FLOW_REVIEW_COPY.noDate;
  const requestNote = customerDetails.requestNote.trim();
  const hasRequestNote = requestNote.length > 0;

  const reviewSections: ReviewValueSection[] = [
    {
      id: "selected-service",
      title: "Selected service",
      value: serviceLabel,
    },
    {
      id: "selected-date",
      title: "Selected date",
      value: dateLabel,
    },
    {
      id: "selected-time",
      title: "Selected time",
      value: summary.selectedTime ?? BOOKING_FLOW_REVIEW_COPY.noTime,
    },
  ];

  const customerFields: ReviewCustomerField[] = [
    {
      id: "customer-name",
      label: "Customer name",
      value: summary.customerName.trim() || BOOKING_FLOW_REVIEW_COPY.noCustomerName,
    },
    {
      id: "contact",
      label: "Contact",
      value: summary.contact.trim() || BOOKING_FLOW_REVIEW_COPY.noContact,
    },
  ];

  const canSendSubmitIntent = confirmation.bookingConfirmed && confirmation.privacyConsent;

  return (
    <BookingFlowStepFrame
      eyebrow="Step 4"
      title="Review your booking details"
      description={BOOKING_FLOW_REVIEW_COPY.previewOnlyTitle}
    >
      {supportsInteractiveReview ? (
        <div className="flex flex-col gap-4">
          {reviewSections.map((section) => (
            <section key={section.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-neutral-800">{section.title}</h3>
              <p className="mt-2 text-sm text-neutral-700">{section.value}</p>
            </section>
          ))}

          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-800">Customer details</h3>
            <dl className="mt-2 grid gap-2 text-sm">
              {customerFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">{field.label}</dt>
                  <dd className="text-right text-neutral-800">{field.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-800">Request note</h3>
            {hasRequestNote ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{requestNote}</p>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">{BOOKING_FLOW_REVIEW_COPY.noRequestNote}</p>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-800">Agreements</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-700">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmation.bookingConfirmed}
                  onChange={(event) => onToggleBookingConfirmed?.(event.target.checked)}
                />
                <span>{BOOKING_FLOW_CONFIRMATION_COPY.bookingConfirmedLabel}</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmation.privacyConsent}
                  onChange={(event) => onTogglePrivacyConsent?.(event.target.checked)}
                />
                <span>{BOOKING_FLOW_CONFIRMATION_COPY.privacyConsentLabel}</span>
              </label>
            </div>
          </section>

          {imageGroups.map((group) => {
            const images = customerDetails[group.stateKey];

            return (
              <section key={group.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-800">{group.reviewTitle}</h3>
                  <span className="text-xs font-medium text-neutral-500">
                    {getFileCountLabel(images.length)}
                  </span>
                </div>
                {images.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                    {images.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
                      >
                        <p className="font-medium text-neutral-800">{item.fileName}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.mimeType || "unknown type"} / {formatFileSize(item.fileSize)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-neutral-500">{BOOKING_FLOW_REVIEW_COPY.noImages}</p>
                )}
              </section>
            );
          })}

          <section className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-700">{BOOKING_FLOW_REVIEW_COPY.previewOnlyTitle}</p>
            <button
              type="button"
              onClick={onSubmitIntent}
              disabled={!canSendSubmitIntent}
              className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                canSendSubmitIntent
                  ? "bg-neutral-900 text-white"
                  : "cursor-not-allowed bg-neutral-300 text-neutral-600"
              }`}
            >
              {BOOKING_FLOW_CONFIRMATION_COPY.intentButtonLabel}
            </button>
            <p className="mt-2 text-xs text-neutral-500">{BOOKING_FLOW_CONFIRMATION_COPY.intentDescription}</p>
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
          Step 4 review layout is wired for all skeleton categories in this turn.
        </div>
      )}
    </BookingFlowStepFrame>
  );
}
