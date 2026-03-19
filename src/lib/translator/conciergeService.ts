import { randomUUID } from "crypto";

import { TranslationService } from "../translation/service.ts";
import { createHomeTranslatorRepository } from "./repository.ts";
import { extractBookingFields } from "./parser.ts";
import {
  availabilityTool,
  cancelBookingTool,
  changeBookingTool,
  createBookingTool,
  getServiceInfo,
} from "./tools.ts";
import type {
  ConciergeRequest,
  ConciergeResponse,
  ConciergeToolTrace,
  HomeTranslatorRepository,
} from "./types.ts";

export class BookingConciergeService {
  constructor(
    private readonly repository: HomeTranslatorRepository = createHomeTranslatorRepository(),
    private readonly translationService: TranslationService = new TranslationService(),
  ) {}

  async handleRequest(request: ConciergeRequest): Promise<ConciergeResponse> {
    const sessionId = request.sessionId ?? `concierge_${randomUUID().slice(0, 8)}`;
    const normalized = await this.translateToKoreanIfNeeded(request.customerLocale, request.message, sessionId);
    const structuredOutput = extractBookingFields(normalized);
    const tools: ConciergeToolTrace[] = [];
    const serviceInfo = await getServiceInfo(structuredOutput.service_name);
    tools.push({
      tool: "service_info",
      input: { serviceName: structuredOutput.service_name },
      output: serviceInfo,
    });

    let booking = null;
    let responseKo = "";

    switch (structuredOutput.intent) {
      case "availability":
      case "create_booking": {
        const availability = await availabilityTool({
          serviceName: structuredOutput.service_name,
          requestedDate: structuredOutput.requested_date,
          requestedTime: structuredOutput.requested_time,
        });
        tools.push({
          tool: "availability",
          input: {
            serviceName: structuredOutput.service_name,
            requestedDate: structuredOutput.requested_date,
            requestedTime: structuredOutput.requested_time,
          },
          output: availability,
        });

        if (structuredOutput.intent === "create_booking") {
          const created = await createBookingTool(this.repository, {
            sessionId,
            serviceName: structuredOutput.service_name,
            requestedDate: structuredOutput.requested_date,
            requestedTime: structuredOutput.requested_time,
            notes: structuredOutput.notes,
          });
          tools.push({
            tool: "create_booking",
            input: {
              sessionId,
              serviceName: structuredOutput.service_name,
              requestedDate: structuredOutput.requested_date,
              requestedTime: structuredOutput.requested_time,
            },
            output: created,
          });
          booking = created.booking;
          responseKo = created.success
            ? `${created.booking?.serviceName} 예약이 ${created.booking?.bookingDate} ${created.booking?.bookingTime}에 확정되었습니다.`
            : `${created.message} ${formatSuggestedSlots(availability.suggestedSlots)}`;
        } else {
          responseKo = availability.available
            ? `${availability.serviceName}는 ${availability.requestedDate} ${availability.requestedTime}에 예약 가능합니다.`
            : `${availability.reason === "missing_date_or_time" ? "예약 가능 여부 확인을 위해 날짜와 시간이 더 필요합니다." : "요청하신 시간은 예약이 어렵습니다."} ${formatSuggestedSlots(availability.suggestedSlots)}`;
        }
        break;
      }
      case "change_booking": {
        const changed = await changeBookingTool(this.repository, {
          sessionId,
          requestedDate: structuredOutput.requested_date,
          requestedTime: structuredOutput.requested_time,
          notes: structuredOutput.notes,
        });
        tools.push({
          tool: "change_booking",
          input: {
            sessionId,
            requestedDate: structuredOutput.requested_date,
            requestedTime: structuredOutput.requested_time,
          },
          output: changed,
        });
        booking = changed.booking;
        responseKo = changed.success
          ? `기존 예약이 ${changed.booking?.bookingDate} ${changed.booking?.bookingTime}로 변경되었습니다.`
          : changed.message;
        break;
      }
      case "cancel_booking": {
        const cancelled = await cancelBookingTool(this.repository, { sessionId });
        tools.push({
          tool: "cancel_booking",
          input: { sessionId },
          output: cancelled,
        });
        booking = cancelled.booking;
        responseKo = cancelled.success
          ? `${cancelled.booking?.serviceName} 예약이 취소되었습니다.`
          : cancelled.message;
        break;
      }
      case "price_query":
        responseKo = serviceInfo.found
          ? `${serviceInfo.serviceName}의 가격은 ${serviceInfo.priceKrw?.toLocaleString("ko-KR")}원입니다.`
          : "문의하신 시술명을 찾지 못했습니다.";
        break;
      case "duration_query":
        responseKo = serviceInfo.found
          ? `${serviceInfo.serviceName}의 소요 시간은 약 ${serviceInfo.durationMinutes}분입니다.`
          : "문의하신 시술명을 찾지 못했습니다.";
        break;
      case "policy_query":
        responseKo = serviceInfo.found
          ? `${serviceInfo.serviceName} 취소 규정은 ${serviceInfo.cancellationPolicy}`
          : "문의하신 시술명의 취소 규정을 찾지 못했습니다.";
        break;
      default:
        responseKo = serviceInfo.found
          ? `${serviceInfo.serviceName} 기준으로 가격, 소요시간, 예약 가능 시간, 취소 규정을 안내할 수 있습니다. 원하시는 날짜와 시간을 함께 보내 주세요.`
          : "시술명, 날짜, 시간 중 하나 이상을 보내 주시면 예약 가능 여부를 확인해 드리겠습니다.";
        break;
    }

    const localizedResponse = await this.translateFromKoreanIfNeeded(request.customerLocale, responseKo, sessionId);
    const savedEvent = await this.repository.saveConciergeEvent({
      sessionId,
      customerLocale: request.customerLocale,
      originalText: request.message,
      normalizedText: normalized,
      responseKo,
      responseLocalized: localizedResponse,
      structuredOutput,
      tools,
      bookingId: booking?.id ?? null,
    });

    return {
      sessionId,
      originalText: request.message,
      normalizedText: normalized,
      responseKo,
      responseLocalized: localizedResponse,
      customerLocale: request.customerLocale,
      structuredOutput,
      tools,
      booking,
      savedEventId: savedEvent.id,
    };
  }

  getRepository() {
    return this.repository;
  }

  private async translateToKoreanIfNeeded(locale: ConciergeRequest["customerLocale"], text: string, sessionId: string) {
    if (locale === "ko") {
      return text;
    }

    const translated = await this.translationService.translateRealtimeMessage({
      domain: "beauty",
      sourceLocale: locale,
      targetLocale: "ko",
      message: text,
      conversationId: sessionId,
      persist: true,
    });

    return translated.targetText;
  }

  private async translateFromKoreanIfNeeded(locale: ConciergeRequest["customerLocale"], text: string, sessionId: string) {
    if (locale === "ko") {
      return text;
    }

    const translated = await this.translationService.translateRealtimeMessage({
      domain: "beauty",
      sourceLocale: "ko",
      targetLocale: locale,
      message: text,
      conversationId: `${sessionId}_assistant`,
      persist: true,
    });

    return translated.targetText;
  }
}

function formatSuggestedSlots(slots: string[]) {
  if (slots.length === 0) {
    return "";
  }

  const formatted = slots.map((slot) => slot.replace("T", " ")).join(", ");
  return `대안 시간: ${formatted}`;
}
