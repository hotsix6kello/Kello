import type {
  BASE_TRANSLATION_LOCALE,
  DEFAULT_TRANSLATION_DOMAIN,
  TRANSLATION_CONTENT_TYPES,
  TRANSLATION_DOMAINS,
  TRANSLATION_LOCALES,
  TRANSLATION_MODES,
  TRANSLATION_STATUSES,
  TRANSLATION_TARGET_LOCALES,
} from "./config.ts";

export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];
export type TranslationTargetLocale = (typeof TRANSLATION_TARGET_LOCALES)[number];
export type TranslationDomain = (typeof TRANSLATION_DOMAINS)[number];
export type TranslationContentType = (typeof TRANSLATION_CONTENT_TYPES)[number];
export type TranslationMode = (typeof TRANSLATION_MODES)[number];
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

export type TranslationEngine = "mock" | "http-generic" | string;
export type TextFormat = "text" | "markdown";

export interface GlossaryEntry {
  id: string;
  domain: TranslationDomain;
  sourceLocale: TranslationLocale;
  targetLocale: TranslationTargetLocale;
  sourceTerm: string;
  targetTerm: string;
  priority: number;
  version: number;
  isActive: boolean;
  notes: string | null;
  updatedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TranslationField {
  path: string;
  text: string;
  format?: TextFormat;
}

export interface TranslationContentInput {
  id?: string;
  domain?: TranslationDomain;
  contentType: TranslationContentType;
  sourceTable?: string;
  sourceId?: string;
  sourceLocale?: TranslationLocale;
  sourceVersion?: number;
  schemaVersion?: string;
  mode?: TranslationMode;
  payload?: unknown;
  fields: TranslationField[];
  targetLocales?: readonly TranslationTargetLocale[];
  metadata?: Record<string, unknown>;
}

export interface TranslationContentRecord {
  id: string;
  domain: TranslationDomain;
  contentType: TranslationContentType;
  sourceTable: string;
  sourceId: string;
  sourceLocale: TranslationLocale;
  sourceVersion: number;
  schemaVersion: string;
  mode: TranslationMode;
  sourceHash: string;
  payload: unknown;
  fields: TranslationField[];
  targetLocales: TranslationTargetLocale[];
  status: TranslationStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationVersionRecord {
  id: string;
  contentId: string;
  targetLocale: TranslationTargetLocale;
  version: number;
  cacheKey: string;
  sourceHash: string;
  translationEngine: TranslationEngine;
  glossaryVersion: number;
  translatedText: string | null;
  translatedPayload: unknown;
  translatedFields: TranslationField[];
  fallbackUsed: boolean;
  status: TranslationStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TranslationVersionInput {
  contentId: string;
  targetLocale: TranslationTargetLocale;
  version: number;
  cacheKey: string;
  sourceHash: string;
  translationEngine: TranslationEngine;
  glossaryVersion: number;
  translatedText?: string | null;
  translatedPayload?: unknown;
  translatedFields?: TranslationField[];
  fallbackUsed?: boolean;
  status?: TranslationStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TranslationBatchJobRecord {
  id: string;
  domain: TranslationDomain;
  contentType: TranslationContentType | "all";
  requestedLocales: TranslationTargetLocale[];
  status: "queued" | "running" | "completed" | "failed";
  queuedCount: number;
  processedCount: number;
  translatedCount: number;
  failedCount: number;
  summary: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TranslationBatchJobUpdate {
  status?: TranslationBatchJobRecord["status"];
  processedCount?: number;
  translatedCount?: number;
  failedCount?: number;
  summary?: Record<string, unknown>;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface TranslationTextRequest {
  domain: TranslationDomain;
  contentType: TranslationContentType;
  sourceLocale: TranslationLocale;
  targetLocale: TranslationTargetLocale;
  text: string;
  format?: TextFormat;
  glossary: GlossaryEntry[];
}

export interface TranslationProviderResult {
  translatedText: string;
  engine: TranslationEngine;
  metadata?: Record<string, unknown>;
}

export interface TranslationResult<
  TPayload = unknown,
  TTargetLocale extends TranslationLocale = TranslationTargetLocale,
> {
  contentId: string;
  targetLocale: TTargetLocale;
  engine: TranslationEngine;
  cacheHit: boolean;
  fallbackUsed: boolean;
  version: number;
  glossaryVersion: number;
  glossaryEntriesApplied: string[];
  translatedText: string | null;
  translatedPayload: TPayload;
  translatedFields: TranslationField[];
}

export interface ChatTranslateRequest {
  domain?: TranslationDomain;
  sourceLocale?: TranslationLocale;
  targetLocale: TranslationLocale;
  message: string;
  conversationId?: string;
  actor?: "customer" | "shop" | "admin";
  persist?: boolean;
}

export interface ChatTranslateResponse extends TranslationResult<string, TranslationLocale> {
  originalText: string;
  targetText: string;
}

export interface StructuredReservationPayload {
  service_name: string;
  duration: number;
  price: number;
  currency?: string;
  notes: string | null;
}

export interface StructuredTranslationRequest {
  domain?: TranslationDomain;
  contentType?: TranslationContentType;
  sourceLocale?: TranslationLocale;
  targetLocale: TranslationTargetLocale;
  payload: StructuredReservationPayload;
  sourceTable?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchTranslateRequest {
  domain?: TranslationDomain;
  contentType?: TranslationContentType | "all";
  limit?: number;
  targetLocales?: readonly TranslationTargetLocale[];
  items?: TranslationContentInput[];
}

export interface BatchTranslateItemResult {
  contentId: string;
  targetLocales: TranslationTargetLocale[];
  status: "translated" | "failed";
  cacheHits: number;
  failures: number;
}

export interface BatchTranslateSummary {
  jobId: string;
  processed: number;
  translated: number;
  cacheHits: number;
  failures: number;
  items: BatchTranslateItemResult[];
}

export type DefaultTranslationLocale = typeof BASE_TRANSLATION_LOCALE;
export type DefaultTranslationDomain = typeof DEFAULT_TRANSLATION_DOMAIN;
