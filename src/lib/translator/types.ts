import type { TranslationLocale } from "../translation/types.ts";

export type ConciergeLocale = TranslationLocale;
export type SpeakerRole = "customer" | "staff";
export type TurnInputMode = "voice" | "text";

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
  createInterpreterSession(session: Omit<InterpreterSession, "id" | "createdAt">): Promise<InterpreterSession>;
  getInterpreterSession(sessionId: string): Promise<InterpreterSession | null>;
  saveInterpreterTurn(turn: Omit<InterpreterTurnRecord, "id" | "createdAt">): Promise<InterpreterTurnRecord>;
}
