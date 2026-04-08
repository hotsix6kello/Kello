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
  categoryLabel?: string | null;
  selectedServiceTitle?: string | null;
  selectedDate?: string | null;
  selectedTime?: string | null;
  details: BookingCustomerDetailsState;
  embedded?: boolean;
  hideBookingSummary?: boolean;
  hideSelectedTime?: boolean;
  onChangeName?: (value: string) => void;
  onChangePhone?: (value: string) => void;
  onChangeRequestNote?: (value: string) => void;
  onSelectCurrentHairImages?: (files: File[]) => void;
  onSelectDesiredStyleImages?: (files: File[]) => void;
  onResetCurrentHairImages?: () => void;
  onResetDesiredStyleImages?: () => void;
};

function getImageGroupPurposeText(stateKey: BookingImageGroupStateKey) {
  if (stateKey === "currentStateImages") {
    return {
      label: "현재 상태 이미지",
      description: "현재 상태를 보여주는 사진을 첨부해 주세요.",
      helper: "상태가 잘 보이는 사진일수록 상담에 도움이 됩니다.",
      addButtonLabel: "현재 상태 이미지 추가",
      emptyLabel: "아직 현재 상태 이미지가 없습니다.",
    };
  }

  return {
    label: "원하는 스타일 이미지",
    description: "원하는 스타일을 보여주는 참고 이미지를 첨부해 주세요.",
    helper: "희망하는 무드나 길이감이 잘 드러나는 이미지가 좋습니다.",
    addButtonLabel: "스타일 이미지 추가",
    emptyLabel: "아직 원하는 스타일 이미지가 없습니다.",
  };
}

function formatFileSize(size: number) {
  return `${(size / 1024).toFixed(1)} KB`;
}

export function CustomerDetailsStepShell({
  category,
  categoryLabel,
  selectedServiceTitle,
  selectedDate,
  selectedTime,
  details,
  embedded = false,
  hideBookingSummary = false,
  hideSelectedTime = false,
  onChangeName,
  onChangePhone,
  onChangeRequestNote,
  onSelectCurrentHairImages,
  onSelectDesiredStyleImages,
  onResetCurrentHairImages,
  onResetDesiredStyleImages,
}: CustomerDetailsStepShellProps) {
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
    <div className="bg-white">
      {!hideBookingSummary ? (
        <div className="border-b border-neutral-200 py-5">
          <h3 className="text-lg font-semibold text-neutral-950">예약 정보</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-neutral-700">
            {categoryLabel ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1">{categoryLabel}</span>
            ) : null}
            {selectedServiceTitle ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1">{selectedServiceTitle}</span>
            ) : null}
            {selectedDate ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1">{selectedDate}</span>
            ) : null}
            {!hideSelectedTime && selectedTime ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1">{selectedTime}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="border-b border-neutral-200 py-5">
        <h3 className="text-lg font-semibold text-neutral-950">고객 정보</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          로그인 정보가 있으면 자동으로 채워집니다.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
            자동 입력 {details.profileSource === "auth-profile" ? "연결됨" : "없음"}
          </span>
          {details.profileSnapshot?.displayName ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              이름 {details.profileSnapshot.displayName}
            </span>
          ) : null}
          {details.profileSnapshot?.phone ? (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              연락처 {details.profileSnapshot.phone}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">이름</span>
            <input
              type="text"
              value={details.name}
              onChange={(event) => onChangeName?.(event.target.value)}
              className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
              placeholder="예약자 이름을 입력해 주세요"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">연락처</span>
            <input
              type="tel"
              value={details.phone}
              onChange={(event) => onChangePhone?.(event.target.value)}
              className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
              placeholder="문자 또는 전화 가능한 연락처를 입력해 주세요"
            />
          </label>
        </div>
      </div>

      <div className="border-b border-neutral-200 py-5">
        <h3 className="text-lg font-semibold text-neutral-950">요청사항</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          원하는 스타일이나 전달할 메모를 남겨 주세요.
        </p>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">메모</span>
          <textarea
            value={details.requestNote}
            onChange={(event) => onChangeRequestNote?.(event.target.value)}
            rows={5}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
            placeholder="예: 앞머리는 가볍게, 컬러는 상담 후 결정하고 싶어요"
          />
        </label>
      </div>

      <div className="divide-y divide-neutral-200">
        {imageGroups.map((group) => {
          const files = details[group.stateKey];
          const handlers = imageGroupHandlers[group.stateKey];
          const groupCopy = getImageGroupPurposeText(group.stateKey);

          return (
            <section key={group.id} className="py-5">
              <h3 className="text-lg font-semibold text-neutral-950">{groupCopy.label}</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600">{groupCopy.description}</p>
              <p className="mt-1 text-sm leading-6 text-neutral-500">{groupCopy.helper}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-900">
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
                <button
                  type="button"
                  onClick={() => handlers.onReset?.()}
                  className="rounded-full bg-neutral-100 px-4 py-2 text-sm text-neutral-700"
                >
                  전체 삭제
                </button>
              </div>

              {files.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {files.map((item) => (
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
                <div className="mt-4 text-sm text-neutral-500">{groupCopy.emptyLabel}</div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="py-5 text-sm text-neutral-500">현재 카테고리에서는 고객 정보 입력 화면을 준비 중입니다.</div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow="STEP 3"
      title="고객 정보"
      description="예약 정보를 확인하고 연락처, 요청사항, 참고 이미지를 입력해 주세요."
    >
      {content}
    </BookingFlowStepFrame>
  );
}
