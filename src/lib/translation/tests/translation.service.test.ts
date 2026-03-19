import assert from "node:assert/strict";

import { runBatchTranslateJob } from "../jobs/batchTranslate.ts";
import { MockTranslationProvider, type TranslationProvider } from "../providers.ts";
import { InMemoryTranslationRepository } from "../repository.ts";
import { createContentHash, TranslationService } from "../service.ts";
import type { TranslationTextRequest } from "../types.ts";
import { getSalonQuickPhraseGroups, getSalonQuickPhraseTexts } from "../../translator/salonGlossary.ts";

class FailingProvider implements TranslationProvider {
  async translateText(_request: TranslationTextRequest) {
    throw new Error("provider_failed");
  }
}

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run("static translation applies glossary and returns cache hit on repeat", async () => {
  const repository = new InMemoryTranslationRepository();
  await repository.upsertGlossaryEntry({
    domain: "beauty",
    sourceLocale: "ko",
    targetLocale: "en",
    sourceTerm: "속눈썹",
    targetTerm: "lash",
    priority: 1,
    version: 1,
    isActive: true,
    notes: null,
    updatedBy: null,
  });

  const service = new TranslationService(repository, new MockTranslationProvider());

  const request = {
    domain: "beauty" as const,
    contentType: "service" as const,
    sourceTable: "services",
    sourceId: "svc-1",
    sourceLocale: "ko" as const,
    payload: { service_name: "속눈썹 연장" },
    fields: [{ path: "service_name", text: "속눈썹 연장" }],
    targetLocales: ["en"] as const,
  };

  const [first] = await service.translateStaticContent(request);
  const [second] = await service.translateStaticContent(request);

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.match(first.translatedFields[0].text, /lash/);
});

await run("structured reservation translation preserves numeric schema fields", async () => {
  const service = new TranslationService(new InMemoryTranslationRepository(), new MockTranslationProvider());

  const result = await service.translateStructuredReservation({
    targetLocale: "ja",
    payload: {
      service_name: "두피 케어",
      duration: 60,
      price: 79000,
      currency: "KRW",
      notes: "민감성 두피",
    },
  });

  assert.equal(result.translatedPayload.duration, 60);
  assert.equal(result.translatedPayload.price, 79000);
  assert.equal(result.translatedPayload.currency, "KRW");
  assert.match(result.translatedPayload.service_name, /^\[ja\]/);
  assert.match(result.translatedPayload.notes ?? "", /^\[ja\]/);
});

await run("chat translation uses short-term cache for repeated requests", async () => {
  const service = new TranslationService(new InMemoryTranslationRepository(), new MockTranslationProvider());

  const first = await service.translateRealtimeMessage({
    targetLocale: "zh-CN",
    message: "예약 시간 확인 부탁드립니다",
    conversationId: "conv-1",
  });
  const second = await service.translateRealtimeMessage({
    targetLocale: "zh-CN",
    message: "예약 시간 확인 부탁드립니다",
    conversationId: "conv-1",
  });

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(first.targetText, second.targetText);
});

await run("built-in salon glossary applies beauty terms for realtime translation in both directions", async () => {
  const service = new TranslationService(new InMemoryTranslationRepository(), new MockTranslationProvider());

  const englishToKorean = await service.translateRealtimeMessage({
    domain: "beauty",
    sourceLocale: "en",
    targetLocale: "ko",
    message: "Please check my bangs and volume.",
    conversationId: "conv-salon-en-ko",
    persist: false,
  });

  const koreanToEnglish = await service.translateRealtimeMessage({
    domain: "beauty",
    sourceLocale: "ko",
    targetLocale: "en",
    message: "앞머리와 볼륨을 확인해 주세요.",
    conversationId: "conv-salon-ko-en",
    persist: false,
  });

  assert.match(englishToKorean.targetText, /앞머리/);
  assert.match(englishToKorean.targetText, /볼륨/);
  assert.match(koreanToEnglish.targetText, /bangs/);
  assert.match(koreanToEnglish.targetText, /volume/);
});

await run("salon quick phrases are generated from glossary terms", async () => {
  const staffEnglish = getSalonQuickPhraseTexts("staff", "en");
  const customerJapanese = getSalonQuickPhraseTexts("customer", "ja");

  assert.equal(staffEnglish.some((text) => text.includes("mirror")), true);
  assert.equal(staffEnglish.some((text) => text.includes("bangs")), true);
  assert.equal(customerJapanese.some((text) => text.includes("ボリューム")), true);
});

await run("salon quick phrases are grouped for mobile interpreter cards", async () => {
  const customerGroups = getSalonQuickPhraseGroups("customer", "en");
  const staffGroups = getSalonQuickPhraseGroups("staff", "ko");

  assert.deepEqual(
    customerGroups.map((group) => group.category),
    ["greeting", "consultation", "haircut", "color", "shampoo", "finish"],
  );
  assert.equal(customerGroups.every((group) => group.phrases.length > 0), true);
  assert.equal(
    staffGroups.some((group) => group.category === "haircut" && group.phrases.some((phrase) => phrase.id === "bangs")),
    true,
  );
});

await run("provider failure falls back to source text", async () => {
  const service = new TranslationService(new InMemoryTranslationRepository(), new FailingProvider());

  const [result] = await service.translateStaticContent({
    domain: "beauty",
    contentType: "policy",
    sourceTable: "shop_policies",
    sourceId: "policy-1",
    sourceLocale: "ko",
    payload: { policy: "예약 취소는 24시간 전까지 가능합니다." },
    fields: [{ path: "policy", text: "예약 취소는 24시간 전까지 가능합니다." }],
    targetLocales: ["en"],
  });

  assert.equal(result.fallbackUsed, true);
  assert.equal(result.translatedFields[0].text, "예약 취소는 24시간 전까지 가능합니다.");
});

await run("batch job processes queued static items", async () => {
  const repository = new InMemoryTranslationRepository();
  const service = new TranslationService(repository, new MockTranslationProvider());

  const source = {
    domain: "beauty" as const,
    contentType: "shop" as const,
    sourceTable: "shops",
    sourceId: "shop-1",
    sourceLocale: "ko" as const,
    sourceVersion: 1,
    schemaVersion: "beauty-v1",
    mode: "static" as const,
    payload: { shop_name: "청담 헤어" },
    fields: [{ path: "shop_name", text: "청담 헤어" }],
    targetLocales: ["en"] as const,
    metadata: {},
  };

  await repository.saveContent({
    ...source,
    sourceHash: createContentHash(source),
  });

  const result = await runBatchTranslateJob(
    {
      domain: "beauty",
      contentType: "shop",
      limit: 10,
    },
    service,
  );

  assert.equal(result.processed, 1);
  assert.equal(result.translated, 1);
  assert.equal(result.items[0]?.status, "translated");
});
