import {
  DEFAULT_BATCH_LIMIT,
  DEFAULT_TRANSLATION_DOMAIN,
  getRequestedTargetLocales,
} from "../config.ts";
import { TranslationService } from "../service.ts";
import type {
  BatchTranslateItemResult,
  BatchTranslateRequest,
  BatchTranslateSummary,
  TranslationContentInput,
  TranslationContentRecord,
} from "../types.ts";

export async function runBatchTranslateJob(
  request: BatchTranslateRequest,
  service = new TranslationService(),
): Promise<BatchTranslateSummary> {
  const repository = service.getRepository();
  const targetLocales = getRequestedTargetLocales(request.targetLocales);
  const queuedItems = request.items ?? [];
  const pendingItems =
    queuedItems.length > 0
      ? queuedItems
      : await repository.getPendingContents({
          domain: request.domain ?? DEFAULT_TRANSLATION_DOMAIN,
          contentType: request.contentType ?? "all",
          limit: request.limit ?? DEFAULT_BATCH_LIMIT,
        });

  const job = await repository.createBatchJob({
    domain: request.domain ?? DEFAULT_TRANSLATION_DOMAIN,
    contentType: request.contentType ?? "all",
    requestedLocales: targetLocales,
    queuedCount: pendingItems.length,
  });

  await repository.updateBatchJob(job.id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  let translated = 0;
  let failures = 0;
  let cacheHits = 0;

  const items: BatchTranslateItemResult[] = [];

  for (const item of pendingItems) {
    try {
      const results = await service.translateStaticContent({
        ...toTranslationInput(item),
        targetLocales,
      });

      translated += 1;
      cacheHits += results.filter((result) => result.cacheHit).length;
      failures += results.filter((result) => result.fallbackUsed).length;

      items.push({
        contentId: results[0]?.contentId ?? item.id ?? "",
        targetLocales,
        status: results.some((result) => result.fallbackUsed) ? "failed" : "translated",
        cacheHits: results.filter((result) => result.cacheHit).length,
        failures: results.filter((result) => result.fallbackUsed).length,
      });
    } catch {
      failures += 1;
      items.push({
        contentId: "id" in item && typeof item.id === "string" ? item.id : "",
        targetLocales,
        status: "failed",
        cacheHits: 0,
        failures: 1,
      });
    }
  }

  await repository.updateBatchJob(job.id, {
    status: failures > 0 ? "failed" : "completed",
    processedCount: pendingItems.length,
    translatedCount: translated,
    failedCount: failures,
    summary: {
      cacheHits,
      targetLocales,
    },
    completedAt: new Date().toISOString(),
  });

  return {
    jobId: job.id,
    processed: pendingItems.length,
    translated,
    cacheHits,
    failures,
    items,
  };
}

function toTranslationInput(item: TranslationContentInput | TranslationContentRecord): TranslationContentInput {
  return {
    id: item.id,
    domain: item.domain,
    contentType: item.contentType,
    sourceTable: item.sourceTable,
    sourceId: item.sourceId,
    sourceLocale: item.sourceLocale,
    sourceVersion: item.sourceVersion,
    schemaVersion: item.schemaVersion,
    mode: item.mode,
    payload: item.payload,
    fields: item.fields,
    targetLocales: item.targetLocales,
    metadata: item.metadata,
  };
}
