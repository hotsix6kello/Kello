import { ItineraryItem } from "@/lib/contexts/TripContext";
import { formatItineraryStatusLabel, formatTripDayTimeLabel } from "@/lib/i18n/runtimeFormatters";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type SearchParamReader = {
    get(name: string): string | null;
};

export interface BookingQueryContext {
    bookingId: string;
    title?: string;
    area?: string;
    time?: string;
    status?: string;
}

interface AppendBookingContextOptions {
    includeIdParam?: boolean;
    includeBookingIdParam?: boolean;
}

function cleanValue(value: string | undefined, maxLength: number): string | undefined {
    const normalized = value?.trim();
    if (!normalized) return undefined;
    return normalized.slice(0, maxLength);
}

function findBookingByQueryId(
    itinerary: ItineraryItem[],
    bookingId: string
): ItineraryItem | undefined {
    const exactMatch = itinerary.find((item) => item.id === bookingId);
    if (exactMatch) {
        return exactMatch;
    }

    return itinerary.find((item) => item.sourceItemId === bookingId);
}

export function formatBookingReferenceValue(bookingId: string): string {
    return bookingId.trim().slice(0, 8).toUpperCase();
}

export function formatBookingReferenceLabel(
    bookingId: string,
    t: TranslateFn
): string {
    return `${t("my_page.bookings_hub.meta.reference", {
        defaultValue: "Reference",
    })} ${formatBookingReferenceValue(bookingId)}`;
}

export function createBookingQueryContext(
    item: ItineraryItem,
    t: TranslateFn
): BookingQueryContext {
    const extendedItem = item as ItineraryItem & { area?: string };

    return {
        bookingId: item.id,
        title: cleanValue(item.name, 80),
        area: cleanValue(extendedItem.area, 48),
        time: cleanValue(
            formatTripDayTimeLabel(t, item.day, item.time, {
                separator: "dash",
            }),
            48
        ),
        status: cleanValue(item.status, 24),
    };
}

export function readBookingQueryContext(
    searchParams: SearchParamReader
): BookingQueryContext | null {
    const bookingId = searchParams.get("bookingId") ?? searchParams.get("id");
    if (!bookingId) return null;

    return {
        bookingId,
        title: cleanValue(searchParams.get("title") ?? undefined, 80),
        area: cleanValue(searchParams.get("area") ?? undefined, 48),
        time: cleanValue(searchParams.get("time") ?? undefined, 48),
        status: cleanValue(searchParams.get("status") ?? undefined, 24),
    };
}

export function resolveBookingQueryContext(
    itinerary: ItineraryItem[],
    context: BookingQueryContext | null | undefined,
    t: TranslateFn
): BookingQueryContext | null {
    if (!context?.bookingId) {
        return null;
    }

    const matchedBooking = findBookingByQueryId(itinerary, context.bookingId);
    return matchedBooking ? createBookingQueryContext(matchedBooking, t) : context;
}

export function getBookingContextChips(
    context: BookingQueryContext | null | undefined,
    t: TranslateFn
): string[] {
    if (!context) {
        return [];
    }

    const statusLabel = context.status ? formatItineraryStatusLabel(t, context.status) : "";
    const referenceLabel = context.bookingId
        ? formatBookingReferenceLabel(context.bookingId, t)
        : "";

    return [context.title, context.time, context.area, statusLabel, referenceLabel].filter(
        (item): item is string => Boolean(item)
    );
}

export function appendBookingQueryContext(
    params: URLSearchParams,
    context: BookingQueryContext | null | undefined,
    options: AppendBookingContextOptions = {}
) {
    if (!context?.bookingId) return;

    const includeIdParam = options.includeIdParam ?? false;
    const includeBookingIdParam = options.includeBookingIdParam ?? true;

    if (includeIdParam) {
        params.set("id", context.bookingId);
    }

    if (includeBookingIdParam) {
        params.set("bookingId", context.bookingId);
    }

    if (context.title) params.set("title", context.title);
    if (context.area) params.set("area", context.area);
    if (context.time) params.set("time", context.time);
    if (context.status) params.set("status", context.status);
}

export function buildPathWithParams(pathname: string, params: URLSearchParams): string {
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}
