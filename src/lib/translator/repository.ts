import { createRequire } from "module";
import { randomUUID } from "crypto";

import { hasSupabaseServerAccess } from "../supabaseServer.ts";
import type {
  BookingRecord,
  ConciergeEventRecord,
  HomeTranslatorRepository,
  InterpreterSession,
  InterpreterTurnRecord,
} from "./types.ts";

const require = createRequire(import.meta.url);

function nowIso() {
  return new Date().toISOString();
}

export class InMemoryHomeTranslatorRepository implements HomeTranslatorRepository {
  private readonly conciergeEvents = new Map<string, ConciergeEventRecord>();
  private readonly interpreterSessions = new Map<string, InterpreterSession>();
  private readonly interpreterTurns = new Map<string, InterpreterTurnRecord>();
  private readonly bookingsBySession = new Map<string, BookingRecord[]>();

  async saveConciergeEvent(event: Omit<ConciergeEventRecord, "id" | "createdAt">) {
    const record: ConciergeEventRecord = {
      ...event,
      id: randomUUID(),
      createdAt: nowIso(),
    };

    this.conciergeEvents.set(record.id, record);
    return record;
  }

  async createInterpreterSession(session: Omit<InterpreterSession, "id" | "createdAt">) {
    const record: InterpreterSession = {
      ...session,
      id: randomUUID(),
      createdAt: nowIso(),
    };

    this.interpreterSessions.set(record.id, record);
    return record;
  }

  async getInterpreterSession(sessionId: string) {
    return this.interpreterSessions.get(sessionId) ?? null;
  }

  async saveInterpreterTurn(turn: Omit<InterpreterTurnRecord, "id" | "createdAt">) {
    const record: InterpreterTurnRecord = {
      ...turn,
      id: randomUUID(),
      createdAt: nowIso(),
    };

    this.interpreterTurns.set(record.id, record);
    return record;
  }

  async listBookings(sessionId: string) {
    return [...(this.bookingsBySession.get(sessionId) ?? [])];
  }

  async saveBooking(booking: BookingRecord) {
    const current = this.bookingsBySession.get(booking.sessionId) ?? [];
    const next = current.filter((item) => item.id !== booking.id);
    next.push(booking);
    this.bookingsBySession.set(booking.sessionId, next);
    return booking;
  }
}

export class SupabaseHomeTranslatorRepository implements HomeTranslatorRepository {
  private readonly client: {
    from: (table: string) => {
      insert: (values: Record<string, unknown> | Array<Record<string, unknown>>) => any;
      upsert: (values: Record<string, unknown> | Array<Record<string, unknown>>) => any;
      select: (columns?: string) => any;
      update: (values: Record<string, unknown>) => any;
      eq: (column: string, value: unknown) => any;
      order: (column: string, options?: { ascending?: boolean }) => any;
      maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
    };
  };

  constructor() {
    const { getSupabaseServerClient } = require("../supabaseServer.ts") as {
      getSupabaseServerClient: () => SupabaseHomeTranslatorRepository["client"];
    };

    this.client = getSupabaseServerClient();
  }

  async saveConciergeEvent(event: Omit<ConciergeEventRecord, "id" | "createdAt">) {
    const { data, error } = await this.client
      .from("booking_concierge_events")
      .insert({
        session_id: event.sessionId,
        customer_locale: event.customerLocale,
        original_text: event.originalText,
        normalized_text: event.normalizedText,
        response_ko: event.responseKo,
        response_localized: event.responseLocalized,
        structured_output: event.structuredOutput,
        tools: event.tools,
        booking_id: event.bookingId,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to save concierge event.");
    }

    return mapConciergeEvent(data);
  }

  async createInterpreterSession(session: Omit<InterpreterSession, "id" | "createdAt">) {
    const { data, error } = await this.client
      .from("interpreter_sessions")
      .insert({
        ephemeral_token: session.ephemeralToken,
        customer_locale: session.customerLocale,
        staff_locale: session.staffLocale,
        expires_at: session.expiresAt,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to create interpreter session.");
    }

    return mapInterpreterSession(data);
  }

  async getInterpreterSession(sessionId: string) {
    const { data, error } = await this.client
      .from("interpreter_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapInterpreterSession(data);
  }

  async saveInterpreterTurn(turn: Omit<InterpreterTurnRecord, "id" | "createdAt">) {
    const { data, error } = await this.client
      .from("interpreter_turns")
      .insert({
        session_id: turn.sessionId,
        speaker: turn.speaker,
        source_locale: turn.sourceLocale,
        target_locale: turn.targetLocale,
        input_mode: turn.inputMode,
        original_text: turn.originalText,
        translated_text: turn.translatedText,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to save interpreter turn.");
    }

    return mapInterpreterTurn(data);
  }

  async listBookings(sessionId: string) {
    const { data, error } = await this.client
      .from("booking_records")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map(mapBooking);
  }

  async saveBooking(booking: BookingRecord) {
    const { data, error } = await this.client
      .from("booking_records")
      .upsert({
        id: booking.id,
        session_id: booking.sessionId,
        service_name: booking.serviceName,
        booking_date: booking.bookingDate,
        booking_time: booking.bookingTime,
        status: booking.status,
        notes: booking.notes,
        created_at: booking.createdAt,
        updated_at: booking.updatedAt,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      throw new Error("Failed to save booking.");
    }

    return mapBooking(data);
  }
}

export function createHomeTranslatorRepository(): HomeTranslatorRepository {
  if (hasSupabaseServerAccess()) {
    return new SupabaseHomeTranslatorRepository();
  }

  return new InMemoryHomeTranslatorRepository();
}

function mapConciergeEvent(data: Record<string, unknown>): ConciergeEventRecord {
  return {
    id: String(data.id),
    sessionId: String(data.session_id),
    customerLocale: String(data.customer_locale) as ConciergeEventRecord["customerLocale"],
    originalText: String(data.original_text),
    normalizedText: String(data.normalized_text),
    responseKo: String(data.response_ko),
    responseLocalized: String(data.response_localized),
    structuredOutput: data.structured_output as ConciergeEventRecord["structuredOutput"],
    tools: (data.tools as ConciergeEventRecord["tools"]) ?? [],
    bookingId: typeof data.booking_id === "string" ? data.booking_id : null,
    createdAt: String(data.created_at),
  };
}

function mapInterpreterSession(data: Record<string, unknown>): InterpreterSession {
  return {
    id: String(data.id),
    ephemeralToken: String(data.ephemeral_token),
    customerLocale: String(data.customer_locale) as InterpreterSession["customerLocale"],
    staffLocale: String(data.staff_locale) as InterpreterSession["staffLocale"],
    expiresAt: String(data.expires_at),
    createdAt: String(data.created_at),
  };
}

function mapInterpreterTurn(data: Record<string, unknown>): InterpreterTurnRecord {
  return {
    id: String(data.id),
    sessionId: String(data.session_id),
    speaker: String(data.speaker) as InterpreterTurnRecord["speaker"],
    sourceLocale: String(data.source_locale) as InterpreterTurnRecord["sourceLocale"],
    targetLocale: String(data.target_locale) as InterpreterTurnRecord["targetLocale"],
    inputMode: String(data.input_mode) as InterpreterTurnRecord["inputMode"],
    originalText: String(data.original_text),
    translatedText: String(data.translated_text),
    createdAt: String(data.created_at),
  };
}

function mapBooking(data: Record<string, unknown>): BookingRecord {
  return {
    id: String(data.id),
    sessionId: String(data.session_id),
    serviceName: String(data.service_name),
    bookingDate: String(data.booking_date),
    bookingTime: String(data.booking_time),
    status: String(data.status) as BookingRecord["status"],
    notes: typeof data.notes === "string" ? data.notes : null,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}
