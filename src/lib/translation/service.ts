import { createHash } from "crypto";

import {
  BASE_TRANSLATION_LOCALE,
  CACHE_MAX_ENTRIES,
  DEFAULT_SCHEMA_VERSION,
  DEFAULT_TRANSLATION_DOMAIN,
  DEFAULT_TRANSLATION_VERSION,
  REALTIME_CACHE_TTL_MS,
  STATIC_CACHE_TTL_MS,
  getRequestedTargetLocales,
} from "./config.ts";
import { MemoryTtlCache } from "./cache.ts";
import { getGlossaryVersion } from "./glossary.ts";
import { createTranslationProvider, type TranslationProvider } from "./providers.ts";
import { mergeSalonGlossaryEntries } from "../translator/salonGlossary.ts";
import {
  applyStructuredTranslations,
  collectStructuredTranslatableFields,
  validateReservationPayload,
} from "./schema.ts";
import { createTranslationRepository, type TranslationRepository } from "./repository.ts";
import type {
  ChatTranslateRequest,
  ChatTranslateResponse,
  GlossaryEntry,
  StructuredReservationPayload,
  StructuredTranslationRequest,
  TranslationContentInput,
  TranslationField,
  TranslationResult,
  TranslationTargetLocale,
} from "./types.ts";

const staticCache = new MemoryTtlCache<TranslationResult>(STATIC_CACHE_TTL_MS, CACHE_MAX_ENTRIES);
const realtimeCache = new MemoryTtlCache<ChatTranslateResponse>(REALTIME_CACHE_TTL_MS, CACHE_MAX_ENTRIES);

type StoredContentRecord = Awaited<ReturnType<TranslationRepository["saveContent"]>>;

export class TranslationService {
  constructor(
    private readonly repository: TranslationRepository = createTranslationRepository(),
    private readonly provider: TranslationProvider = createTranslationProvider(),
  ) {}

  async translateStaticContent(input: TranslationContentInput) {
    const sourceHash = createContentHash(input);
    const content = await this.repository.saveContent({
      ...input,
      sourceHash,
      sourceLocale: input.sourceLocale ?? BASE_TRANSLATION_LOCALE,
      domain: input.domain ?? DEFAULT_TRANSLATION_DOMAIN,
      schemaVersion: input.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
      mode: input.mode ?? "static",
      sourceVersion: input.sourceVersion ?? DEFAULT_TRANSLATION_VERSION,
      targetLocales: getRequestedTargetLocales(input.targetLocales),
    });

    const results = await Promise.all(
      content.targetLocales.map((targetLocale) => this.translateContentRecord(content, targetLocale)),
    );

    const hasFailure = results.some((result) => result.fallbackUsed);
    await this.repository.updateContentStatus(content.id, hasFailure ? "failed" : "translated", hasFailure ? "fallback" : null);

    return results;
  }

  async translateRealtimeMessage(request: ChatTranslateRequest): Promise<ChatTranslateResponse> {
    const domain = request.domain ?? DEFAULT_TRANSLATION_DOMAIN;
    const sourceLocale = request.sourceLocale ?? BASE_TRANSLATION_LOCALE;
    const targetLocale = request.targetLocale;
    const conversationId = request.conversationId ?? "";
    const cacheKey = createHash("sha256")
      .update(JSON.stringify([domain, sourceLocale, targetLocale, conversationId, request.message]))
      .digest("hex");

    const cached = realtimeCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
      };
    }

    const glossary = await this.resolveGlossaryEntries(domain, sourceLocale, targetLocale);
    let translatedText = request.message;
    let engine = "mock";
    let fallbackUsed = false;

    try {
      const result = await this.provider.translateText({
        domain,
        contentType: "chat_message",
        sourceLocale,
        targetLocale,
        text: request.message,
        glossary,
        format: "text",
      });

      translatedText = result.translatedText;
      engine = result.engine;
    } catch {
      fallbackUsed = true;
    }

    const response: ChatTranslateResponse = {
      contentId: cacheKey,
      targetLocale,
      engine,
      cacheHit: false,
      fallbackUsed,
      version: DEFAULT_TRANSLATION_VERSION,
      glossaryVersion: getGlossaryVersion(glossary),
      glossaryEntriesApplied: glossary.map((entry) => entry.sourceTerm),
      translatedText,
      translatedPayload: translatedText,
      translatedFields: [{ path: "message", text: translatedText }],
      originalText: request.message,
      targetText: translatedText,
    };

    if (request.persist !== false) {
      const sourceHash = createHash("sha256")
        .update(JSON.stringify([request.message, sourceLocale, targetLocale, conversationId]))
        .digest("hex");

      const content = await this.repository.saveContent({
        domain,
        contentType: "chat_message",
        sourceTable: "chat_messages",
        sourceId: conversationId,
        sourceLocale,
        sourceVersion: DEFAULT_TRANSLATION_VERSION,
        schemaVersion: DEFAULT_SCHEMA_VERSION,
        mode: "realtime",
        payload: { actor: request.actor ?? "customer", message: request.message },
        fields: [{ path: "message", text: request.message }],
        targetLocales: [targetLocale],
        metadata: { actor: request.actor ?? "customer" },
        sourceHash,
      });

      await this.repository.saveVersion({
        contentId: content.id,
        targetLocale,
        version: DEFAULT_TRANSLATION_VERSION,
        cacheKey,
        sourceHash,
        translationEngine: engine,
        glossaryVersion: getGlossaryVersion(glossary),
        translatedText,
        translatedPayload: { message: translatedText },
        translatedFields: [{ path: "message", text: translatedText }],
        fallbackUsed,
        status: fallbackUsed ? "failed" : "translated",
      });
    }

    realtimeCache.set(cacheKey, response);
    return response;
  }

  async translateStructuredReservation(
    request: StructuredTranslationRequest,
  ): Promise<TranslationResult<StructuredReservationPayload>> {
    const payload = validateReservationPayload(request.payload);
    const fields = collectStructuredTranslatableFields(payload);

    const [result] = await this.translateStaticContent({
      domain: request.domain ?? DEFAULT_TRANSLATION_DOMAIN,
      contentType: request.contentType ?? "reservation",
      sourceTable: request.sourceTable ?? "reservations",
      sourceId: request.sourceId ?? "",
      sourceLocale: request.sourceLocale ?? BASE_TRANSLATION_LOCALE,
      sourceVersion: DEFAULT_TRANSLATION_VERSION,
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      mode: "structured",
      payload,
      fields,
      targetLocales: [request.targetLocale],
      metadata: request.metadata,
    });

    const translatedFields = new Map(result.translatedFields.map((field) => [field.path, field.text]));
    const translatedPayload = applyStructuredTranslations(payload, translatedFields);

    return {
      ...result,
      translatedPayload,
    };
  }

  async getGlossaryEntries(domain = DEFAULT_TRANSLATION_DOMAIN) {
    return this.repository.listGlossaryEntries(domain);
  }

  async upsertGlossaryEntry(input: Parameters<TranslationRepository["upsertGlossaryEntry"]>[0]) {
    return this.repository.upsertGlossaryEntry(input);
  }

  async deleteGlossaryEntry(id: string) {
    return this.repository.deleteGlossaryEntry(id);
  }

  getRepository() {
    return this.repository;
  }

  private async translateContentRecord(content: StoredContentRecord, targetLocale: TranslationTargetLocale) {
    const cacheKey = buildCacheKey(content, targetLocale);
    const cachedMemory = staticCache.get(cacheKey);

    if (cachedMemory) {
      return {
        ...cachedMemory,
        cacheHit: true,
      };
    }

    const cachedVersion = await this.repository.getCachedVersion(content.id, targetLocale, content.sourceHash);
    if (cachedVersion) {
      const cachedResult: TranslationResult = {
        contentId: content.id,
        targetLocale,
        engine: cachedVersion.translationEngine,
        cacheHit: true,
        fallbackUsed: cachedVersion.fallbackUsed,
        version: cachedVersion.version,
        glossaryVersion: cachedVersion.glossaryVersion,
        glossaryEntriesApplied: [],
        translatedText: cachedVersion.translatedText,
        translatedPayload: cachedVersion.translatedPayload,
        translatedFields: cachedVersion.translatedFields,
      };
      staticCache.set(cacheKey, cachedResult);
      return cachedResult;
    }

    const glossary = await this.resolveGlossaryEntries(content.domain, content.sourceLocale, targetLocale);

    try {
      const translatedFields = await Promise.all(
        content.fields.map(async (field) => this.translateField(content, field, targetLocale, glossary)),
      );

      const translatedText = translatedFields.map((field) => field.text).join("\n\n");
      const translatedPayload = buildTranslatedPayload(content.payload, translatedFields);

      const record = await this.repository.saveVersion({
        contentId: content.id,
        targetLocale,
        version: content.sourceVersion,
        cacheKey,
        sourceHash: content.sourceHash,
        translationEngine: translatedFields[0]?.engine ?? "mock",
        glossaryVersion: getGlossaryVersion(glossary),
        translatedText,
        translatedPayload,
        translatedFields: translatedFields.map(({ path, text, format }) => ({ path, text, format })),
      });

      const result: TranslationResult = {
        contentId: content.id,
        targetLocale,
        engine: record.translationEngine,
        cacheHit: false,
        fallbackUsed: false,
        version: record.version,
        glossaryVersion: record.glossaryVersion,
        glossaryEntriesApplied: glossary.map((entry) => entry.sourceTerm),
        translatedText,
        translatedPayload,
        translatedFields: record.translatedFields,
      };

      staticCache.set(cacheKey, result);
      return result;
    } catch (error) {
      const fallbackFields = content.fields.map((field) => ({ ...field }));
      const fallbackText = fallbackFields.map((field) => field.text).join("\n\n");
      await this.repository.saveVersion({
        contentId: content.id,
        targetLocale,
        version: content.sourceVersion,
        cacheKey,
        sourceHash: content.sourceHash,
        translationEngine: "mock",
        glossaryVersion: getGlossaryVersion(glossary),
        translatedText: fallbackText,
        translatedPayload: content.payload,
        translatedFields: fallbackFields,
        fallbackUsed: true,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "translation_error",
      });

      const result: TranslationResult = {
        contentId: content.id,
        targetLocale,
        engine: "mock",
        cacheHit: false,
        fallbackUsed: true,
        version: content.sourceVersion,
        glossaryVersion: getGlossaryVersion(glossary),
        glossaryEntriesApplied: glossary.map((entry) => entry.sourceTerm),
        translatedText: fallbackText,
        translatedPayload: content.payload,
        translatedFields: fallbackFields,
      };

      staticCache.set(cacheKey, result);
      return result;
    }
  }

  private async translateField(
    content: StoredContentRecord,
    field: TranslationField,
    targetLocale: TranslationTargetLocale,
    glossary: GlossaryEntry[],
  ) {
    const result = await this.provider.translateText({
      domain: content.domain,
      contentType: content.contentType,
      sourceLocale: content.sourceLocale,
      targetLocale,
      text: field.text,
      format: field.format ?? "text",
      glossary,
    });

    return {
      ...field,
      text: result.translatedText,
      engine: result.engine,
    };
  }

  private async resolveGlossaryEntries(
    domain: StoredContentRecord["domain"],
    sourceLocale: StoredContentRecord["sourceLocale"],
    targetLocale: TranslationTargetLocale | ChatTranslateRequest["targetLocale"],
  ) {
    const repositoryEntries = await this.repository.getGlossaryEntries(domain, targetLocale);
    return mergeSalonGlossaryEntries(sourceLocale, targetLocale, repositoryEntries, domain);
  }
}

export function createContentHash(input: TranslationContentInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        domain: input.domain ?? DEFAULT_TRANSLATION_DOMAIN,
        contentType: input.contentType,
        sourceLocale: input.sourceLocale ?? BASE_TRANSLATION_LOCALE,
        sourceVersion: input.sourceVersion ?? DEFAULT_TRANSLATION_VERSION,
        schemaVersion: input.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
        payload: input.payload ?? null,
        fields: input.fields,
      }),
    )
    .digest("hex");
}

function buildCacheKey(content: StoredContentRecord, targetLocale: TranslationTargetLocale) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        content.domain,
        content.contentType,
        content.sourceHash,
        targetLocale,
        content.schemaVersion,
        content.sourceVersion,
      ]),
    )
    .digest("hex");
}

function buildTranslatedPayload(payload: unknown, translatedFields: Array<TranslationField & { engine?: string }>) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const nextPayload = structuredClone(payload as Record<string, unknown>);

  translatedFields.forEach((field) => {
    if (field.path in nextPayload) {
      nextPayload[field.path] = field.text;
    }
  });

  return nextPayload;
}
