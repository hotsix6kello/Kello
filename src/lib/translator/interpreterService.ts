import { createHash, randomUUID } from "crypto";

import { getSpeechLocale } from "./catalog.ts";
import { normalizeInterpreterTextInput } from "./interpreterUi.ts";
import { createHomeTranslatorRepository } from "./repository.ts";
import { TranslationService } from "../translation/service.ts";
import type {
  HomeTranslatorRepository,
  InterpreterSessionRequest,
  InterpreterTurnRequest,
  InterpreterTurnResponse,
} from "./types.ts";

const EPHEMERAL_TTL_MS = 1000 * 60 * 20;

export class InShopInterpreterService {
  constructor(
    private readonly repository: HomeTranslatorRepository = createHomeTranslatorRepository(),
    private readonly translationService: TranslationService = new TranslationService(),
  ) {}

  async createSession(request: InterpreterSessionRequest) {
    const expiresAt = new Date(Date.now() + EPHEMERAL_TTL_MS).toISOString();
    const ephemeralToken = createHash("sha256")
      .update(`${request.customerLocale}:${request.staffLocale}:${Date.now()}:${randomUUID()}`)
      .digest("hex");

    return this.repository.createInterpreterSession({
      ephemeralToken,
      customerLocale: request.customerLocale,
      staffLocale: request.staffLocale,
      expiresAt,
    });
  }

  async translateTurn(request: InterpreterTurnRequest): Promise<InterpreterTurnResponse> {
    const normalizedText = normalizeInterpreterTextInput(request.text);
    if (!normalizedText) {
      throw new Error("Interpreter text is empty.");
    }

    const session = await this.repository.getInterpreterSession(request.sessionId);

    if (!session) {
      throw new Error("Interpreter session not found.");
    }

    if (session.ephemeralToken !== request.ephemeralToken) {
      throw new Error("Interpreter session token is invalid.");
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      throw new Error("Interpreter session token expired.");
    }

    const sourceLocale = request.speaker === "customer" ? session.customerLocale : session.staffLocale;
    const targetLocale = request.speaker === "customer" ? session.staffLocale : session.customerLocale;

    const translated = await this.translationService.translateRealtimeMessage({
      domain: "beauty",
      sourceLocale,
      targetLocale,
      message: normalizedText,
      conversationId: request.sessionId,
      persist: true,
    });

    const savedTurn = await this.repository.saveInterpreterTurn({
      sessionId: request.sessionId,
      speaker: request.speaker,
      sourceLocale,
      targetLocale,
      inputMode: request.inputMode,
      originalText: normalizedText,
      translatedText: translated.targetText,
    });

    return {
      turnId: savedTurn.id,
      sessionId: request.sessionId,
      speaker: request.speaker,
      inputMode: request.inputMode,
      originalText: normalizedText,
      translatedText: translated.targetText,
      sourceLocale,
      targetLocale,
      createdAt: savedTurn.createdAt,
      replay: {
        originalLang: getSpeechLocale(sourceLocale),
        translatedLang: getSpeechLocale(targetLocale),
      },
      fallbackToText: translated.fallbackUsed,
    };
  }
}
