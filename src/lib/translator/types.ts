import type { TranslationLocale } from "../translation/types.ts";

export type ConciergeIntent =
  | "availability"
  | "create_booking"
  | "change_booking"
  | "cancel_booking"
  | "price_query"
  | "duration_query"
  | "policy_query"
  | "general";

export type ConciergeLocale = TranslationLocale;
export type SpeakerRole = "customer" | "staff";
export type TurnInputMode = "voice" | "text";

export interface ExtractedBookingFields {
  intent: ConciergeIntent;
  service_name: string | null;
  requested_date: string | null;
  requested_time: string | null;
  notes: string | null;
}

export interface ConciergeToolTrace<TOutput = unknown> {
  tool: "service_info" | "availability" | "create_booking" | "change_booking" | "cancel_booking";
  input: Record<string, unknown>;
  output: TOutput;
}

export interface BeautyServiceCatalogItem {
  id: string;
  category: "beauty";
  canonicalName: string;
  aliases: Partial<Record<ConciergeLocale, string[]>>;
  priceKrw: number;
  durationMinutes: number;
  cancellationPolicy: string;
  availableSlots: string[];
}

export interface ServiceInfoResult {
  serviceName: string | null;
  priceKrw: number | null;
  durationMinutes: number | null;
  cancellationPolicy: string | null;
  found: boolean;
}

export interface AvailabilityToolResult {
  serviceName: string | null;
  requestedDate: string | null;
  requestedTime: string | null;
  available: boolean;
  availableSlot: string | null;
  suggestedSlots: string[];
  reason: string;
}

export interface BookingRecord {
  id: string;
  sessionId: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  status: "confirmed" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingMutationResult {
  success: boolean;
  booking: BookingRecord | null;
  message: string;
}

export interface ConciergeRequest {
  sessionId?: string;
  customerLocale: ConciergeLocale;
  message: string;
}

export interface ConciergeResponse {
  sessionId: string;
  originalText: string;
  normalizedText: string;
  responseKo: string;
  responseLocalized: string;
  customerLocale: ConciergeLocale;
  structuredOutput: ExtractedBookingFields;
  tools: ConciergeToolTrace[];
  booking: BookingRecord | null;
  savedEventId: string;
}

export interface ConciergeEventRecord {
  id: string;
  sessionId: string;
  customerLocale: ConciergeLocale;
  originalText: string;
  normalizedText: string;
  responseKo: string;
  responseLocalized: string;
  structuredOutput: ExtractedBookingFields;
  tools: ConciergeToolTrace[];
  bookingId: string | null;
  createdAt: string;
}

export interface InterpreterSessionRequest {
  customerLocale: ConciergeLocale;
  staffLocale: ConciergeLocale;
}

export interface InterpreterSession {
  id: string;
  ephemeralToken: string;
  customerLocale: ConciergeLocale;
  staffLocale: ConciergeLocale;
  expiresAt: string;
  createdAt: string;
}

export interface InterpreterTurnRequest {
  sessionId: string;
  ephemeralToken: string;
  speaker: SpeakerRole;
  inputMode: TurnInputMode;
  text: string;
}

export interface InterpreterTurnRecord {
  id: string;
  sessionId: string;
  speaker: SpeakerRole;
  sourceLocale: ConciergeLocale;
  targetLocale: ConciergeLocale;
  inputMode: TurnInputMode;
  originalText: string;
  translatedText: string;
  createdAt: string;
}

export interface InterpreterTurnResponse {
  turnId: string;
  sessionId: string;
  speaker: SpeakerRole;
  inputMode: TurnInputMode;
  originalText: string;
  translatedText: string;
  sourceLocale: ConciergeLocale;
  targetLocale: ConciergeLocale;
  createdAt: string;
  replay: {
    originalLang: string;
    translatedLang: string;
  };
  fallbackToText: boolean;
}

export interface InterpreterSttRequest {
  language: ConciergeLocale;
  audioBuffer: Uint8Array;
  mimeType: string;
}

export interface InterpreterSttResponse {
  transcriptId: string;
  text: string;
  locale: ConciergeLocale;
  engine: string;
  fallbackUsed: boolean;
  confidence: number | null;
  createdAt: string;
}

export interface HomeTranslatorRepository {
  saveConciergeEvent(event: Omit<ConciergeEventRecord, "id" | "createdAt">): Promise<ConciergeEventRecord>;
  createInterpreterSession(session: Omit<InterpreterSession, "id" | "createdAt">): Promise<InterpreterSession>;
  getInterpreterSession(sessionId: string): Promise<InterpreterSession | null>;
  saveInterpreterTurn(turn: Omit<InterpreterTurnRecord, "id" | "createdAt">): Promise<InterpreterTurnRecord>;
  listBookings(sessionId: string): Promise<BookingRecord[]>;
  saveBooking(booking: BookingRecord): Promise<BookingRecord>;
}
