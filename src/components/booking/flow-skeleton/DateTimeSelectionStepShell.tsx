import { BookingFlowStepFrame } from "@/components/booking/flow-skeleton/BookingFlowStepFrame";
import { getBookingFlowCategoryCapabilities } from "@/lib/bookings/bookingFlowSkeleton/constants";
import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";

type DateTimeSelectionStepShellProps = {
  category: BookingFlowCategory | null;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectDate?: (value: string) => void;
  onSelectTime?: (value: string) => void;
};

export function DateTimeSelectionStepShell({
  category,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
}: DateTimeSelectionStepShellProps) {
  const capabilities = getBookingFlowCategoryCapabilities(category);
  const supportsDateSelection = capabilities?.interactiveDateSelection === true;

  return (
    <BookingFlowStepFrame
      eyebrow="Step 2"
      title="Date selection"
      description="This preview step is wired for date selection only. Time is intentionally excluded in this turn."
    >
      {supportsDateSelection ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
              <span className="text-sm font-medium text-neutral-700">Date</span>
              <input
                type="date"
                value={selectedDate ?? ""}
                onChange={(event) => onSelectDate?.(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </label>

            <label className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
              <span className="text-sm font-medium text-neutral-700">Time</span>
              <input
                type="time"
                value={selectedTime ?? ""}
                onChange={(event) => onSelectTime?.(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
            Choose both date and time to continue.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
          Date selection preview is wired for all skeleton categories in this turn.
        </div>
      )}
    </BookingFlowStepFrame>
  );
}
