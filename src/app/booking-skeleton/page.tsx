import Link from "next/link";
import { BookingFlowSkeleton } from "@/components/booking/flow-skeleton";
import {
  BOOKING_FLOW_CATEGORY_OPTIONS,
  BOOKING_FLOW_CATEGORY_ORDER,
} from "@/lib/bookings/bookingFlowSkeleton/constants";
import type { BookingFlowCategory } from "@/lib/bookings/bookingFlowSkeleton/types";

type BookingSkeletonPageSearchParams = {
  category?: string | string[];
};

type BookingSkeletonPageProps = {
  searchParams?: Promise<BookingSkeletonPageSearchParams>;
};

function normalizePreviewCategory(
  value: string | string[] | undefined,
): BookingFlowCategory {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return "hair";
  }

  return BOOKING_FLOW_CATEGORY_ORDER.includes(candidate as BookingFlowCategory)
    ? (candidate as BookingFlowCategory)
    : "hair";
}

export default async function BookingSkeletonPage({
  searchParams,
}: BookingSkeletonPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const category = normalizePreviewCategory(resolvedSearchParams.category);

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Isolated Preview Route
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">
            Booking skeleton preview
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            This page is intentionally separated from the current home booking
            flow. It only renders the new shared skeleton so we can preview the
            step structure safely.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-800">
              active category: {category}
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1">
              fallback: hair
            </span>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Skeleton categories">
            {BOOKING_FLOW_CATEGORY_OPTIONS.map((option) => {
              const isActive = option.id === category;

              return (
                <Link
                  key={option.id}
                  href={`/booking-skeleton?category=${option.id}`}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${isActive
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-700"
                    }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <BookingFlowSkeleton initialCategory={category} />
      </div>
    </main>
  );
}
