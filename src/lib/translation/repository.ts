import { randomUUID } from "crypto";

import {
  BASE_TRANSLATION_LOCALE,
  DEFAULT_BATCH_LIMIT,
  DEFAULT_GLOSSARY_VERSION,
  DEFAULT_SCHEMA_VERSION,
  DEFAULT_TRANSLATION_DOMAIN,
  TRANSLATION_TABLES,
} from "./config.ts";
import { getSupabaseServerClient, hasSupabaseServerAccess } from "../supabaseServer.ts";
import type {
  BatchTranslateRequest,
  GlossaryEntry,
  TranslationBatchJobRecord,
  TranslationBatchJobUpdate,
  TranslationContentInput,
  TranslationContentRecord,
  TranslationDomain,
  TranslationTargetLocale,
  TranslationVersionInput,
  TranslationVersionRecord,
} from "./types.ts";

export interface TranslationRepository {
  saveContent(input: TranslationContentInput & { sourceHash: string }): Promise<TranslationContentRecord>;
  getPendingContents(params?: Pick<BatchTranslateRequest, "domain" | "contentType" | "limit">): Promise<TranslationContentRecord[]>;
  getCachedVersion(contentId: string, targetLocale: TranslationTargetLocale, sourceHash: string): Promise<TranslationVersionRecord | null>;
  saveVersion(input: TranslationVersionInput): Promise<TranslationVersionRecord>;
  updateContentStatus(contentId: string, status: TranslationContentRecord["status"], errorMessage?: string | null): Promise<void>;
  getGlossaryEntries(domain: TranslationDomain, targetLocale: TranslationTargetLocale): Promise<GlossaryEntry[]>;
  listGlossaryEntries(domain?: TranslationDomain): Promise<GlossaryEntry[]>;
  upsertGlossaryEntry(
    input: Omit<GlossaryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<GlossaryEntry>;
  deleteGlossaryEntry(id: string): Promise<void>;
  createBatchJob(input: {
    domain: TranslationDomain;
    contentType: TranslationBatchJobRecord["contentType"];
    requestedLocales: TranslationTargetLocale[];
    queuedCount: number;
  }): Promise<TranslationBatchJobRecord>;
  updateBatchJob(jobId: string, update: TranslationBatchJobUpdate): Promise<void>;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeContentRecord(input: TranslationContentInput & { sourceHash: string }): TranslationContentRecord {
  const now = nowIso();

  return {
    id: input.id ?? randomUUID(),
    domain: input.domain ?? DEFAULT_TRANSLATION_DOMAIN,
    contentType: input.contentType,
    sourceTable: input.sourceTable ?? "",
    sourceId: input.sourceId ?? "",
    sourceLocale: input.sourceLocale ?? BASE_TRANSLATION_LOCALE,
    sourceVersion: input.sourceVersion ?? 1,
    schemaVersion: input.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
    mode: input.mode ?? "static",
    sourceHash: input.sourceHash,
    payload: input.payload ?? null,
    fields: input.fields,
    targetLocales: [...(input.targetLocales ?? [])],
    status: "pending",
    errorMessage: null,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeVersionRecord(input: TranslationVersionInput): TranslationVersionRecord {
  return {
    id: randomUUID(),
    contentId: input.contentId,
    targetLocale: input.targetLocale,
    version: input.version,
    cacheKey: input.cacheKey,
    sourceHash: input.sourceHash,
    translationEngine: input.translationEngine,
    glossaryVersion: input.glossaryVersion,
    translatedText: input.translatedText ?? null,
    translatedPayload: input.translatedPayload ?? null,
    translatedFields: input.translatedFields ?? [],
    fallbackUsed: input.fallbackUsed ?? false,
    status: input.status ?? "translated",
    errorMessage: input.errorMessage ?? null,
    metadata: input.metadata ?? {},
    createdAt: nowIso(),
  };
}

export class InMemoryTranslationRepository implements TranslationRepository {
  private readonly contents = new Map<string, TranslationContentRecord>();
  private readonly versions = new Map<string, TranslationVersionRecord>();
  private readonly glossary = new Map<string, GlossaryEntry>();
  private readonly batchJobs = new Map<string, TranslationBatchJobRecord>();

  async saveContent(input: TranslationContentInput & { sourceHash: string }) {
    const existing = [...this.contents.values()].find((content) => {
      return (
        content.domain === (input.domain ?? DEFAULT_TRANSLATION_DOMAIN) &&
        content.contentType === input.contentType &&
        content.sourceTable === (input.sourceTable ?? "") &&
        content.sourceId === (input.sourceId ?? "") &&
        content.sourceHash === input.sourceHash
      );
    });

    if (existing) {
      const updated: TranslationContentRecord = {
        ...existing,
        payload: input.payload ?? existing.payload,
        fields: input.fields,
        targetLocales: [...(input.targetLocales ?? existing.targetLocales)],
        sourceVersion: input.sourceVersion ?? existing.sourceVersion,
        schemaVersion: input.schemaVersion ?? existing.schemaVersion,
        mode: input.mode ?? existing.mode,
        metadata: input.metadata ?? existing.metadata,
        updatedAt: nowIso(),
      };
      this.contents.set(updated.id, updated);
      return updated;
    }

    const record = normalizeContentRecord(input);
    this.contents.set(record.id, record);
    return record;
  }

  async getPendingContents(params?: Pick<BatchTranslateRequest, "domain" | "contentType" | "limit">) {
    const limit = params?.limit ?? DEFAULT_BATCH_LIMIT;
    return [...this.contents.values()]
      .filter((content) => {
        if (content.status !== "pending") {
          return false;
        }

        if (params?.domain && content.domain !== params.domain) {
          return false;
        }

        if (params?.contentType && params.contentType !== "all" && content.contentType !== params.contentType) {
          return false;
        }

        return true;
      })
      .slice(0, limit);
  }

  async getCachedVersion(contentId: string, targetLocale: TranslationTargetLocale, sourceHash: string) {
    return (
      [...this.versions.values()]
        .filter((version) => {
          return (
            version.contentId === contentId &&
            version.targetLocale === targetLocale &&
            version.sourceHash === sourceHash &&
            version.status === "translated"
          );
        })
        .sort((left, right) => right.version - left.version)[0] ?? null
    );
  }

  async saveVersion(input: TranslationVersionInput) {
    const record = normalizeVersionRecord(input);
    this.versions.set(record.id, record);
    return record;
  }

  async updateContentStatus(contentId: string, status: TranslationContentRecord["status"], errorMessage?: string | null) {
    const existing = this.contents.get(contentId);
    if (!existing) {
      return;
    }

    this.contents.set(contentId, {
      ...existing,
      status,
      errorMessage: errorMessage ?? null,
      updatedAt: nowIso(),
    });
  }

  async getGlossaryEntries(domain: TranslationDomain, targetLocale: TranslationTargetLocale) {
    return [...this.glossary.values()].filter((entry) => {
      return entry.domain === domain && entry.targetLocale === targetLocale && entry.isActive;
    });
  }

  async listGlossaryEntries(domain?: TranslationDomain) {
    return [...this.glossary.values()].filter((entry) => {
      return domain ? entry.domain === domain : true;
    });
  }

  async upsertGlossaryEntry(input: Omit<GlossaryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const now = nowIso();
    const entry: GlossaryEntry = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.glossary.set(entry.id, entry);
    return entry;
  }

  async deleteGlossaryEntry(id: string) {
    this.glossary.delete(id);
  }

  async createBatchJob(input: {
    domain: TranslationDomain;
    contentType: TranslationBatchJobRecord["contentType"];
    requestedLocales: TranslationTargetLocale[];
    queuedCount: number;
  }) {
    const record: TranslationBatchJobRecord = {
      id: randomUUID(),
      domain: input.domain,
      contentType: input.contentType,
      requestedLocales: input.requestedLocales,
      status: "queued",
      queuedCount: input.queuedCount,
      processedCount: 0,
      translatedCount: 0,
      failedCount: 0,
      summary: {},
      createdAt: nowIso(),
      startedAt: null,
      completedAt: null,
    };
    this.batchJobs.set(record.id, record);
    return record;
  }

  async updateBatchJob(jobId: string, update: TranslationBatchJobUpdate) {
    const existing = this.batchJobs.get(jobId);
    if (!existing) {
      return;
    }

    this.batchJobs.set(jobId, {
      ...existing,
      ...update,
    });
  }
}

export class SupabaseTranslationRepository implements TranslationRepository {
  private readonly client = getSupabaseServerClient();

  async saveContent(input: TranslationContentInput & { sourceHash: string }) {
    const payload = {
      domain: input.domain ?? DEFAULT_TRANSLATION_DOMAIN,
      content_type: input.contentType,
      source_table: input.sourceTable ?? "",
      source_id: input.sourceId ?? "",
      source_locale: input.sourceLocale ?? BASE_TRANSLATION_LOCALE,
      source_version: input.sourceVersion ?? 1,
      schema_version: input.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
      mode: input.mode ?? "static",
      source_hash: input.sourceHash,
      source_payload: input.payload ?? null,
      source_fields: input.fields,
      target_locales: [...(input.targetLocales ?? [])],
      metadata: input.metadata ?? {},
      status: "pending",
      error_message: null,
    };

    const { data, error } = await this.client
      .from(TRANSLATION_TABLES.contents)
      .upsert(payload, {
        onConflict: "domain,content_type,source_table,source_id,source_hash",
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapSupabaseContent(data);
  }

  async getPendingContents(params?: Pick<BatchTranslateRequest, "domain" | "contentType" | "limit">) {
    let query = this.client
      .from(TRANSLATION_TABLES.contents)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(params?.limit ?? DEFAULT_BATCH_LIMIT);

    if (params?.domain) {
      query = query.eq("domain", params.domain);
    }

    if (params?.contentType && params.contentType !== "all") {
      query = query.eq("content_type", params.contentType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSupabaseContent);
  }

  async getCachedVersion(contentId: string, targetLocale: TranslationTargetLocale, sourceHash: string) {
    const { data, error } = await this.client
      .from(TRANSLATION_TABLES.versions)
      .select("*")
      .eq("content_id", contentId)
      .eq("target_locale", targetLocale)
      .eq("source_hash", sourceHash)
      .eq("status", "translated")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapSupabaseVersion(data) : null;
  }

  async saveVersion(input: TranslationVersionInput) {
    const { data, error } = await this.client
      .from(TRANSLATION_TABLES.versions)
      .insert({
        content_id: input.contentId,
        target_locale: input.targetLocale,
        version: input.version,
        cache_key: input.cacheKey,
        source_hash: input.sourceHash,
        translation_engine: input.translationEngine,
        glossary_version: input.glossaryVersion,
        translated_text: input.translatedText ?? null,
        translated_payload: input.translatedPayload ?? null,
        translated_fields: input.translatedFields ?? [],
        fallback_used: input.fallbackUsed ?? false,
        status: input.status ?? "translated",
        error_message: input.errorMessage ?? null,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapSupabaseVersion(data);
  }

  async updateContentStatus(contentId: string, status: TranslationContentRecord["status"], errorMessage?: string | null) {
    const { error } = await this.client
      .from(TRANSLATION_TABLES.contents)
      .update({
        status,
        error_message: errorMessage ?? null,
        updated_at: nowIso(),
      })
      .eq("id", contentId);

    if (error) {
      throw error;
    }
  }

  async getGlossaryEntries(domain: TranslationDomain, targetLocale: TranslationTargetLocale) {
    const { data, error } = await this.client
      .from(TRANSLATION_TABLES.glossary)
      .select("*")
      .eq("domain", domain)
      .eq("source_locale", BASE_TRANSLATION_LOCALE)
      .eq("target_locale", targetLocale)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSupabaseGlossary);
  }

  async listGlossaryEntries(domain?: TranslationDomain) {
    let query = this.client.from(TRANSLATION_TABLES.glossary).select("*").order("priority", { ascending: true });

    if (domain) {
      query = query.eq("domain", domain);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSupabaseGlossary);
  }

  async upsertGlossaryEntry(input: Omit<GlossaryEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const { data, error } = await this.client
      .from(TRANSLATION_TABLES.glossary)
      .upsert(
        {
          id: input.id,
          domain: input.domain,
          source_locale: input.sourceLocale,
          target_locale: input.targetLocale,
          source_term: input.sourceTerm,
          target_term: input.targetTerm,
          priority: input.priority,
          version: input.version,
          notes: input.notes,
          updated_by: input.updatedBy,
          is_active: input.isActive,
          updated_at: nowIso(),
        },
        {
          onConflict: "id",
        },
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapSupabaseGlossary(data);
  }

  async deleteGlossaryEntry(id: string) {
    const { error } = await this.client.from(TRANSLATION_TABLES.glossary).delete().eq("id", id);

    if (error) {
      throw error;
    }
  }

  async createBatchJob(input: {
    domain: TranslationDomain;
    contentType: TranslationBatchJobRecord["contentType"];
    requestedLocales: TranslationTargetLocale[];
    queuedCount: number;
  }) {
    const { data, error } = await this.client
      .from(TRANSLATION_TABLES.batchJobs)
      .insert({
        domain: input.domain,
        content_type: input.contentType,
        requested_locales: input.requestedLocales,
        status: "queued",
        queued_count: input.queuedCount,
        processed_count: 0,
        translated_count: 0,
        failed_count: 0,
        summary: {},
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return mapSupabaseBatchJob(data);
  }

  async updateBatchJob(jobId: string, update: TranslationBatchJobUpdate) {
    const { error } = await this.client
      .from(TRANSLATION_TABLES.batchJobs)
      .update({
        status: update.status,
        processed_count: update.processedCount,
        translated_count: update.translatedCount,
        failed_count: update.failedCount,
        summary: update.summary,
        started_at: update.startedAt,
        completed_at: update.completedAt,
      })
      .eq("id", jobId);

    if (error) {
      throw error;
    }
  }
}

export function createTranslationRepository(): TranslationRepository {
  if (hasSupabaseServerAccess()) {
    return new SupabaseTranslationRepository();
  }

  return new InMemoryTranslationRepository();
}

function mapSupabaseContent(row: Record<string, unknown>): TranslationContentRecord {
  return {
    id: String(row.id),
    domain: String(row.domain) as TranslationContentRecord["domain"],
    contentType: String(row.content_type) as TranslationContentRecord["contentType"],
    sourceTable: String(row.source_table ?? ""),
    sourceId: String(row.source_id ?? ""),
    sourceLocale: String(row.source_locale) as TranslationContentRecord["sourceLocale"],
    sourceVersion: Number(row.source_version ?? 1),
    schemaVersion: String(row.schema_version ?? DEFAULT_SCHEMA_VERSION),
    mode: String(row.mode ?? "static") as TranslationContentRecord["mode"],
    sourceHash: String(row.source_hash),
    payload: row.source_payload ?? null,
    fields: Array.isArray(row.source_fields) ? (row.source_fields as TranslationContentRecord["fields"]) : [],
    targetLocales: Array.isArray(row.target_locales)
      ? (row.target_locales as TranslationTargetLocale[])
      : [],
    status: String(row.status ?? "pending") as TranslationContentRecord["status"],
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    metadata: isObject(row.metadata) ? row.metadata : {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

function mapSupabaseVersion(row: Record<string, unknown>): TranslationVersionRecord {
  return {
    id: String(row.id),
    contentId: String(row.content_id),
    targetLocale: String(row.target_locale) as TranslationTargetLocale,
    version: Number(row.version ?? 1),
    cacheKey: String(row.cache_key),
    sourceHash: String(row.source_hash),
    translationEngine: String(row.translation_engine),
    glossaryVersion: Number(row.glossary_version ?? 1),
    translatedText: typeof row.translated_text === "string" ? row.translated_text : null,
    translatedPayload: row.translated_payload ?? null,
    translatedFields: Array.isArray(row.translated_fields)
      ? (row.translated_fields as TranslationVersionRecord["translatedFields"])
      : [],
    fallbackUsed: Boolean(row.fallback_used),
    status: String(row.status ?? "translated") as TranslationVersionRecord["status"],
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    metadata: isObject(row.metadata) ? row.metadata : {},
    createdAt: String(row.created_at),
  };
}

function mapSupabaseGlossary(row: Record<string, unknown>): GlossaryEntry {
  return {
    id: String(row.id),
    domain: String(row.domain) as GlossaryEntry["domain"],
    sourceLocale: String(row.source_locale) as GlossaryEntry["sourceLocale"],
    targetLocale: String(row.target_locale) as GlossaryEntry["targetLocale"],
    sourceTerm: String(row.source_term),
    targetTerm: String(row.target_term),
    priority: Number(row.priority ?? 100),
    version: Number(row.version ?? DEFAULT_GLOSSARY_VERSION),
    isActive: Boolean(row.is_active),
    notes: typeof row.notes === "string" ? row.notes : null,
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function mapSupabaseBatchJob(row: Record<string, unknown>): TranslationBatchJobRecord {
  return {
    id: String(row.id),
    domain: String(row.domain) as TranslationBatchJobRecord["domain"],
    contentType: String(row.content_type ?? "all") as TranslationBatchJobRecord["contentType"],
    requestedLocales: Array.isArray(row.requested_locales)
      ? (row.requested_locales as TranslationTargetLocale[])
      : [],
    status: String(row.status ?? "queued") as TranslationBatchJobRecord["status"],
    queuedCount: Number(row.queued_count ?? 0),
    processedCount: Number(row.processed_count ?? 0),
    translatedCount: Number(row.translated_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    summary: isObject(row.summary) ? row.summary : {},
    createdAt: String(row.created_at),
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
