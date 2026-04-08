import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import { getBookingFlowCategoryCapabilities } from "@/lib/bookings/bookingFlowSkeleton/constants";
import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";

type DateTimeSelectionStepShellProps = {
  category: BookingFlowCategory | null;
  categoryLabel?: string | null;
  selectedServiceTitle?: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  embedded?: boolean;
  dateOnly?: boolean;
  onSelectDate?: (value: string) => void;
  onSelectTime?: (value: string) => void;
};

const QUICK_TIME_OPTIONS = ["10:00", "11:00", "13:00", "15:00", "17:00", "19:00"] as const;

export function DateTimeSelectionStepShell({
  category,
  categoryLabel,
  selectedServiceTitle,
  selectedDate,
  selectedTime,
  embedded = false,
  dateOnly = false,
  onSelectDate,
  onSelectTime,
}: DateTimeSelectionStepShellProps) {
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsDateSelection = capabilities?.interactiveDateSelection === true;

  const content = supportsDateSelection ? (
    <div className="bg-white">
      {!embedded ? (
        <div className="border-b border-neutral-200 py-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {selectedServiceTitle ?? categoryLabel ?? "선택한 시술"}
            </span>
            {selectedDate ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                {selectedDate}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="border-b border-neutral-200 py-5">
        <h3 className="text-lg font-semibold text-neutral-950">예약 날짜</h3>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          가능한 날짜를 선택해 주세요.
        </p>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">날짜 선택</span>
          <input
            type="date"
            value={selectedDate ?? ""}
            onChange={(event) => onSelectDate?.(event.target.value)}
            className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
          />
        </label>
      </div>

      {!dateOnly ? (
        <div className="py-5">
          <h3 className="text-lg font-semibold text-neutral-950">예약 시간</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            빠른 선택이나 직접 입력으로 시간을 정해 주세요.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_TIME_OPTIONS.map((timeOption) => {
              const isSelected = timeOption === selectedTime;

              return (
                <button
                  key={timeOption}
                  type="button"
                  onClick={() => onSelectTime?.(timeOption)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isSelected ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {timeOption}
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">직접 시간 입력</span>
            <input
              type="time"
              value={selectedTime ?? ""}
              onChange={(event) => onSelectTime?.(event.target.value)}
              className="min-h-12 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-500"
            />
          </label>
        </div>
      ) : null}
    </div>
  ) : (
    <div className="py-5 text-sm text-neutral-500">현재 카테고리에서는 날짜 선택 화면을 준비 중입니다.</div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow="STEP 2"
      title="날짜 선택"
      description="예약 날짜를 고른 뒤 나머지 정보를 입력하세요."
    >
      {content}
    </BookingFlowStepFrame>
  );
}
