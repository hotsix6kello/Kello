import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import { getBookingFlowCategoryCapabilities } from "@/lib/bookings/bookingFlowSkeleton/constants";
import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";

type DateTimeSelectionStepShellProps = {
  category: BookingFlowCategory | null;
  selectedDate: string | null;
  embedded?: boolean;
  onSelectDate?: (value: string) => void;
};

export function DateTimeSelectionStepShell({
  category,
  selectedDate,
  embedded = false,
  onSelectDate,
}: DateTimeSelectionStepShellProps) {
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsDateSelection = capabilities?.interactiveDateSelection === true;

  const content = supportsDateSelection ? (
    <div className="w-full">
      {/* 2. 날짜 선택 섹션 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 px-1">
          <h3 className="text-[17px] font-bold text-neutral-900">방문 일자 선택</h3>
          <p className="text-[13px] text-neutral-500">예약 가능한 날짜를 선택해주세요.</p>
        </div>

        <div className="relative group">
          <input
            type="date"
            value={selectedDate ?? ""}
            min={new Date().toISOString().split("T")[0]}
            onChange={(event) => onSelectDate?.(event.target.value)}
            className={`w-full min-h-[64px] rounded-2xl border-2 px-5 text-base font-medium transition-all duration-200 outline-none cursor-pointer appearance-none ${selectedDate 
              ? "bg-fuchsia-50 border-fuchsia-400 text-fuchsia-900 shadow-[0_8px_20px_rgba(192,38,211,0.06)]" 
              : "bg-white border-neutral-100 text-neutral-900 hover:border-fuchsia-200"
            }`}
          />
          <div className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${selectedDate ? "text-fuchsia-600" : "text-neutral-400"}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="py-20 text-center bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-200">
      <p className="text-neutral-400 font-medium whitespace-pre-line">
        {"현재 카테고리에서는\n날짜 선택 화면을 준비 중입니다."}
      </p>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <BookingFlowStepFrame
      eyebrow="STEP 2"
      title="날짜 선택"
      description="원하시는 예약 날짜를 선택해 주세요."
    >
      {content}
    </BookingFlowStepFrame>
  );
}