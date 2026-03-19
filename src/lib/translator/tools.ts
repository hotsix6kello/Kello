import { randomUUID } from "crypto";

import { BEAUTY_SERVICE_CATALOG, findServiceByName } from "./catalog.ts";
import type {
  AvailabilityToolResult,
  BookingMutationResult,
  BookingRecord,
  HomeTranslatorRepository,
  ServiceInfoResult,
} from "./types.ts";

export async function getServiceInfo(serviceName: string | null): Promise<ServiceInfoResult> {
  const service = serviceName ? findServiceByName(serviceName) : null;

  if (!service) {
    return {
      serviceName: null,
      priceKrw: null,
      durationMinutes: null,
      cancellationPolicy: null,
      found: false,
    };
  }

  return {
    serviceName: service.canonicalName,
    priceKrw: service.priceKrw,
    durationMinutes: service.durationMinutes,
    cancellationPolicy: service.cancellationPolicy,
    found: true,
  };
}

export async function availabilityTool(input: {
  serviceName: string | null;
  requestedDate: string | null;
  requestedTime: string | null;
}): Promise<AvailabilityToolResult> {
  const service = input.serviceName ? findServiceByName(input.serviceName) : null;

  if (!service) {
    return {
      serviceName: null,
      requestedDate: input.requestedDate,
      requestedTime: input.requestedTime,
      available: false,
      availableSlot: null,
      suggestedSlots: [],
      reason: "service_not_found",
    };
  }

  if (!input.requestedDate || !input.requestedTime) {
    return {
      serviceName: service.canonicalName,
      requestedDate: input.requestedDate,
      requestedTime: input.requestedTime,
      available: false,
      availableSlot: null,
      suggestedSlots: service.availableSlots.slice(0, 3),
      reason: "missing_date_or_time",
    };
  }

  const requestedDate = input.requestedDate;
  const requestedTime = input.requestedTime;
  const slotKey = `${requestedDate}T${requestedTime}`;
  const available = service.availableSlots.includes(slotKey);

  return {
    serviceName: service.canonicalName,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
    available,
    availableSlot: available ? slotKey : null,
    suggestedSlots: service.availableSlots
      .filter((slot) => slot.startsWith(requestedDate))
      .slice(0, 3),
    reason: available ? "ok" : "slot_unavailable",
  };
}

export async function createBookingTool(
  repository: HomeTranslatorRepository,
  input: {
    sessionId: string;
    serviceName: string | null;
    requestedDate: string | null;
    requestedTime: string | null;
    notes: string | null;
  },
): Promise<BookingMutationResult> {
  if (!input.serviceName || !input.requestedDate || !input.requestedTime) {
    return {
      success: false,
      booking: null,
      message: "예약 생성에 필요한 서비스, 날짜, 시간이 부족합니다.",
    };
  }

  const availability = await availabilityTool({
    serviceName: input.serviceName,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
  });

  if (!availability.available) {
    return {
      success: false,
      booking: null,
      message: "해당 시간에는 예약이 가능하지 않습니다.",
    };
  }

  const now = new Date().toISOString();
  const booking: BookingRecord = {
    id: `bk_${randomUUID().slice(0, 8)}`,
    sessionId: input.sessionId,
    serviceName: input.serviceName,
    bookingDate: input.requestedDate,
    bookingTime: input.requestedTime,
    status: "confirmed",
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  await repository.saveBooking(booking);

  return {
    success: true,
    booking,
    message: "예약이 생성되었습니다.",
  };
}

export async function changeBookingTool(
  repository: HomeTranslatorRepository,
  input: {
    sessionId: string;
    requestedDate: string | null;
    requestedTime: string | null;
    notes: string | null;
  },
): Promise<BookingMutationResult> {
  const bookings = await repository.listBookings(input.sessionId);
  const activeBooking = [...bookings].reverse().find((booking) => booking.status === "confirmed");

  if (!activeBooking) {
    return {
      success: false,
      booking: null,
      message: "변경할 기존 예약이 없습니다.",
    };
  }

  if (!input.requestedDate || !input.requestedTime) {
    return {
      success: false,
      booking: null,
      message: "예약 변경에는 새 날짜와 시간이 필요합니다.",
    };
  }

  const availability = await availabilityTool({
    serviceName: activeBooking.serviceName,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
  });

  if (!availability.available) {
    return {
      success: false,
      booking: null,
      message: "변경 요청한 시간에 빈 자리가 없습니다.",
    };
  }

  const updatedBooking: BookingRecord = {
    ...activeBooking,
    bookingDate: input.requestedDate,
    bookingTime: input.requestedTime,
    notes: input.notes ?? activeBooking.notes,
    updatedAt: new Date().toISOString(),
  };

  await repository.saveBooking(updatedBooking);

  return {
    success: true,
    booking: updatedBooking,
    message: "예약이 변경되었습니다.",
  };
}

export async function cancelBookingTool(
  repository: HomeTranslatorRepository,
  input: { sessionId: string },
): Promise<BookingMutationResult> {
  const bookings = await repository.listBookings(input.sessionId);
  const activeBooking = [...bookings].reverse().find((booking) => booking.status === "confirmed");

  if (!activeBooking) {
    return {
      success: false,
      booking: null,
      message: "취소할 예약이 없습니다.",
    };
  }

  const cancelledBooking: BookingRecord = {
    ...activeBooking,
    status: "cancelled",
    updatedAt: new Date().toISOString(),
  };

  await repository.saveBooking(cancelledBooking);

  return {
    success: true,
    booking: cancelledBooking,
    message: "예약이 취소되었습니다.",
  };
}

export function listSuggestedServices() {
  return BEAUTY_SERVICE_CATALOG.map((service) => service.canonicalName);
}
