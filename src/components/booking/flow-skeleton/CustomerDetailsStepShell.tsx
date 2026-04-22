'use client';

import { useTranslation } from "react-i18next";
import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import {
  getBookingFlowCategoryCapabilities,
  getBookingFlowImageGroups,
} from "@/lib/bookings/bookingFlowSkeleton/constants";
import type {
  BookingCustomerDetailsState,
  BookingFlowCategory,
  BookingImageGroupStateKey,
} from "@/lib/bookings/bookingFlowSkeleton/types";

type CustomerDetailsStepShellProps = {
  category: BookingFlowCategory | null;
  details: BookingCustomerDetailsState;
  embedded?: boolean;
  onChangeName?: (value: string) => void;
  onChangePhone?: (value: string) => void;
  onChangeRequestNote?: (value: string) => void;
  onSelectCurrentHairImages?: (files: File[]) => void;
  onSelectDesiredStyleImages?: (files: File[]) => void;
  onResetCurrentHairImages?: () => void;
  onResetDesiredStyleImages?: () => void;
};

function formatFileSize(size: number) {
  return `${(size / 1024).toFixed(1)} KB`;
}

export function CustomerDetailsStepShell({
  category,
  details,
  embedded = false,
  onChangeName,
  onChangePhone,
  onChangeRequestNote,
  onSelectCurrentHairImages,
  onSelectDesiredStyleImages,
  onResetCurrentHairImages,
  onResetDesiredStyleImages,
}: CustomerDetailsStepShellProps) {
  const { t } = useTranslation("common");

  const getImageGroupPurposeText = (stateKey: BookingImageGroupStateKey) => {
    if (stateKey === "currentStateImages") {
      return {
        label: t("booking_skeleton.customer_details.current_status"),
        description: t("booking_skeleton.customer_details.current_status_desc"),
        helper: t("booking_skeleton.customer_details.current_status_helper"),
        addButtonLabel: t("booking_skeleton.customer_details.add_current_photo"),
        emptyLabel: t("booking_skeleton.customer_details.no_photo"),
      };
    }

    return {
      label: t("booking_skeleton.customer_details.desired_style"),
      description: t("booking_skeleton.customer_details.desired_style_desc"),
      helper: t("booking_skeleton.customer_details.desired_style_helper"),
      addButtonLabel: t("booking_skeleton.customer_details.add_style_photo"),
      emptyLabel: t("booking_skeleton.customer_details.no_photo"),
    };
  };

  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsCustomerDetails = capabilities?.interactiveCustomerDetails === true;
  const imageGroups = getBookingFlowImageGroups(category);

  const imageGroupHandlers: Record<
    BookingImageGroupStateKey,
    {
      onSelect?: (files: File[]) => void;
      onReset?: () => void;
    }
  > = {
    currentStateImages: {
      onSelect: onSelectCurrentHairImages,
      onReset: onResetCurrentHairImages,
    },
    desiredStyleImages: {
      onSelect: onSelectDesiredStyleImages,
      onReset: onResetDesiredStyleImages,
    },
  };

  const content = supportsCustomerDetails ? (
    <div className="w-full">
      {/* 2. 예약자 정보 입력 폼 */}
      <div className="flex flex-col gap-6 mb-10">
        <div className="flex flex-col gap-1.5 px-1">
          <h3 className="text-[17px] font-bold text-neutral-900">{t("booking_skeleton.customer_details.title")}</h3>
          <p className="text-[13px] text-neutral-500">{t("booking_skeleton.customer_details.desc_hint")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-neutral-700 ml-1">{t("booking_skeleton.customer_details.name_label")}</span>
            <input
              type="text"
              value={details.name}
              onChange={(event) => onChangeName?.(event.target.value)}
              className="min-h-[60px] rounded-2xl border-2 border-neutral-100 bg-white px-5 py-3 text-base text-neutral-900 outline-none transition-all focus:border-fuchsia-400 focus:bg-fuchsia-50/30 shadow-sm hover:border-fuchsia-100"
              placeholder={t("booking_skeleton.customer_details.name_placeholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-neutral-700 ml-1">{t("booking_skeleton.customer_details.phone_label")}</span>
            <input
              type="text"
              inputMode="text"
              value={details.phone}
              onChange={(event) => onChangePhone?.(event.target.value)}
              className="min-h-[60px] rounded-2xl border-2 border-neutral-100 bg-white px-5 py-3 text-base text-neutral-900 outline-none transition-all focus:border-fuchsia-400 focus:bg-fuchsia-50/30 shadow-sm hover:border-fuchsia-100"
              placeholder={t("booking_skeleton.customer_details.phone_placeholder")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-neutral-700 ml-1">{t("booking_skeleton.customer_details.request_label")}</span>
            <textarea
              value={details.requestNote}
              onChange={(event) => onChangeRequestNote?.(event.target.value)}
              rows={4}
              className="rounded-2xl border-2 border-neutral-100 bg-white px-5 py-4 text-base text-neutral-900 outline-none transition-all focus:border-fuchsia-400 focus:bg-fuchsia-50/30 shadow-sm hover:border-fuchsia-100 resize-none"
              placeholder={t("booking_skeleton.customer_details.request_placeholder")}
            />
          </div>
        </div>
      </div>

      {/* 3. 사진 첨부 섹션 */}
      <div className="flex flex-col gap-8 pb-32">
        {imageGroups.map((group) => {
          const files = details[group.stateKey];
          const handlers = imageGroupHandlers[group.stateKey];
          const groupCopy = getImageGroupPurposeText(group.stateKey);

          return (
            <section key={group.id} className="flex flex-col gap-4">
              <div className="px-1">
                <h3 className="text-[17px] font-bold text-neutral-900 mb-1">{groupCopy.label}</h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">{groupCopy.description}</p>
                <p className="text-[11px] text-fuchsia-500 font-semibold mt-1">{groupCopy.helper}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer rounded-2xl border-2 border-fuchsia-600 bg-fuchsia-600 px-6 py-3.5 text-[14px] font-bold text-white transition hover:bg-fuchsia-700 shadow-[0_8px_16px_rgba(192,38,211,0.2)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {groupCopy.addButtonLabel}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const nextFiles = event.target.files ? Array.from(event.target.files) : [];
                      if (nextFiles.length > 0) {
                        handlers.onSelect?.(nextFiles);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handlers.onReset?.()}
                    className="rounded-2xl border-2 border-neutral-100 bg-white px-6 py-3.5 text-[14px] font-bold text-neutral-500 transition hover:bg-neutral-50"
                  >
                    {t("common.reset")}
                  </button>
                )}
              </div>

              {files.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {files.map((item) => (
                    <div key={item.id} className="group overflow-hidden rounded-2xl border-2 border-neutral-100 bg-white shadow-sm ring-fuchsia-400/30 transition-all hover:ring-4">
                      <div className="flex aspect-square items-center justify-center border-b border-neutral-50 bg-neutral-50">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-fuchsia-600 text-lg font-bold text-white shadow-lg animate-pulse-subtle">
                          {item.fileName.slice(0, 1).toUpperCase()}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="text-[13px] font-bold text-neutral-800 truncate">
                          {item.fileName}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-neutral-400">
                          {formatFileSize(item.fileSize)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-10 text-center">
                  <div className="flex justify-center mb-3">
                    <svg className="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-neutral-400 font-medium">
                    {groupCopy.emptyLabel}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="py-20 text-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
      <p className="text-neutral-400 font-medium whitespace-pre-line">
        {t("booking_skeleton.customer_details.preparing")}
      </p>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow={`${t("booking_skeleton.steps.step")} 3`}
      title={t("booking_skeleton.customer_details.title")}
      description={t("booking_skeleton.customer_details.desc")}
    >
      {content}
    </BookingFlowStepFrame>
  );
}