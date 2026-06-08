import { randomUUID } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient, hasSupabaseServerAccess } from "../supabaseServer.ts";
import type {
  HomeTranslatorRepository,
  InterpreterSession,
  InterpreterTurnRecord,
} from "./types.ts";

function nowIso() {
  return new Date().toISOString();
}

export class InMemoryHomeTranslatorRepository implements HomeTranslatorRepository {
  private readonly interpreterSessions = new Map<string, InterpreterSession>();
  private readonly interpreterTurns = new Map<string, InterpreterTurnRecord>();

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
}

export class SupabaseHomeTranslatorRepository implements HomeTranslatorRepository {
  private readonly client: SupabaseClient;

  constructor() {
    this.client = getSupabaseServerClient();
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
}

export function createHomeTranslatorRepository(): HomeTranslatorRepository {
  if (hasSupabaseServerAccess()) {
    return new SupabaseHomeTranslatorRepository();
  }

  return new InMemoryHomeTranslatorRepository();
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
