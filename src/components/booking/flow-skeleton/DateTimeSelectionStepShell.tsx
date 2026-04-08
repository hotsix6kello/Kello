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
        <div className="py-2">
          <label className="flex flex-col gap-2">
            <input
              type="date"
              value={selectedDate ?? ""}
              onChange={(event) => onSelectDate?.(event.target.value)}
              className="min-h-12 rounded-xl border border-neutral-100 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-pink-500 focus:bg-pink-50/10"
            />
          </label>
        </div>
      </div>

      {!dateOnly ? (
        <div className="py-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {QUICK_TIME_OPTIONS.map((timeOption) => {
                const isSelected = timeOption === selectedTime;

                return (
                  <button
                    key={timeOption}
                    type="button"
                    onClick={() => onSelectTime?.(timeOption)}
                    className={`rounded-xl border px-2 py-3 text-[15px] font-semibold transition ${
                      isSelected
                        ? "border-pink-500 bg-pink-50 text-pink-700"
                        : "border-neutral-100 bg-white text-neutral-700 hover:border-pink-300"
                    }`}
                  >
                    {timeOption}
                  </button>
                );
              })}
            </div>

            <label className="mt-2 flex flex-col gap-2">
              <input
                type="time"
                value={selectedTime ?? ""}
                onChange={(event) => onSelectTime?.(event.target.value)}
                className="min-h-12 rounded-xl border border-neutral-100 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-pink-500"
              />
            </label>
          </div>
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
