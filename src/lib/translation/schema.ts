import { STRUCTURED_TRANSLATABLE_PATHS } from "./config.ts";
import type { StructuredReservationPayload } from "./types.ts";

export interface TranslationSchemaNode {
  type: "object" | "string" | "number" | "integer" | "null";
  translate?: boolean;
  nullable?: boolean;
  properties?: Record<string, TranslationSchemaNode>;
  required?: readonly string[];
  additionalProperties?: boolean;
}

export const reservationTranslationSchema: TranslationSchemaNode = {
  type: "object",
  additionalProperties: false,
  required: ["service_name", "duration", "price", "notes"],
  properties: {
    service_name: {
      type: "string",
      translate: true,
    },
    duration: {
      type: "integer",
    },
    price: {
      type: "number",
    },
    currency: {
      type: "string",
    },
    notes: {
      type: "string",
      translate: true,
      nullable: true,
    },
  },
};

export function validateReservationPayload(value: unknown): StructuredReservationPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Reservation payload must be an object.");
  }

  const payload = value as Record<string, unknown>;

  if (typeof payload.service_name !== "string" || payload.service_name.trim().length === 0) {
    throw new Error("Reservation payload.service_name must be a non-empty string.");
  }

  if (!Number.isInteger(payload.duration)) {
    throw new Error("Reservation payload.duration must be an integer.");
  }

  if (typeof payload.price !== "number" || Number.isNaN(payload.price)) {
    throw new Error("Reservation payload.price must be a number.");
  }

  if (!(typeof payload.notes === "string" || payload.notes === null)) {
    throw new Error("Reservation payload.notes must be a string or null.");
  }

  if (!(typeof payload.currency === "string" || typeof payload.currency === "undefined")) {
    throw new Error("Reservation payload.currency must be a string when provided.");
  }

  const serviceName = payload.service_name as string;
  const duration = payload.duration as number;
  const price = payload.price as number;
  const notes = payload.notes as string | null;
  const currency = payload.currency;

  return {
    service_name: serviceName,
    duration,
    price,
    currency: typeof currency === "string" ? currency : undefined,
    notes,
  };
}

export function collectStructuredTranslatableFields(payload: StructuredReservationPayload) {
  return STRUCTURED_TRANSLATABLE_PATHS.flatMap((path) => {
    const value = payload[path];
    if (typeof value !== "string" || value.trim().length === 0) {
      return [];
    }

    return [{ path, text: value }] as const;
  });
}

export function applyStructuredTranslations(
  payload: StructuredReservationPayload,
  translatedFields: Map<string, string>,
): StructuredReservationPayload {
  return {
    service_name: translatedFields.get("service_name") ?? payload.service_name,
    duration: payload.duration,
    price: payload.price,
    currency: payload.currency,
    notes: translatedFields.has("notes") ? translatedFields.get("notes") ?? null : payload.notes,
  };
}
