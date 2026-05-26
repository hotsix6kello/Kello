import assert from "node:assert/strict";

import { MockTranslationProvider } from "../../translation/providers.ts";
import { InMemoryTranslationRepository } from "../../translation/repository.ts";
import { TranslationService } from "../../translation/service.ts";
import { InShopInterpreterService } from "../interpreterService.ts";
import { InMemoryHomeTranslatorRepository } from "../repository.ts";

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createServices() {
  const translationRepository = new InMemoryTranslationRepository();
  const translationService = new TranslationService(translationRepository, new MockTranslationProvider());
  const translatorRepository = new InMemoryHomeTranslatorRepository();

  return {
    translationRepository,
    interpreterService: new InShopInterpreterService(translatorRepository, translationService),
  };
}

await run("interpreter session issues an ephemeral token and applies glossary on staff to customer turns", async () => {
  const { interpreterService, translationRepository } = createServices();

  await translationRepository.upsertGlossaryEntry({
    domain: "beauty",
    sourceLocale: "ko",
    targetLocale: "en",
    sourceTerm: "속눈썹",
    targetTerm: "lash",
    priority: 1,
    version: 1,
    isActive: true,
    notes: null,
    updatedBy: "test",
  });

  const session = await interpreterService.createSession({
    customerLocale: "en",
    staffLocale: "ko",
  });

  assert.equal(session.customerLocale, "en");
  assert.equal(session.staffLocale, "ko");
  assert.equal(session.ephemeralToken.length > 20, true);
  assert.equal(new Date(session.expiresAt).getTime() > Date.now(), true);

  const turn = await interpreterService.translateTurn({
    sessionId: session.id,
    ephemeralToken: session.ephemeralToken,
    speaker: "staff",
    inputMode: "voice",
    text: "속눈썹 연장으로 진행하겠습니다.",
  });

  assert.equal(turn.sourceLocale, "ko");
  assert.equal(turn.targetLocale, "en");
  assert.equal(turn.inputMode, "voice");
  assert.equal(turn.replay.originalLang, "ko-KR");
  assert.equal(turn.replay.translatedLang, "en-US");
  assert.equal(turn.fallbackToText, false);
  assert.match(turn.createdAt, /^20/);
  assert.match(turn.translatedText, /lash/);
});

await run("interpreter flow rejects invalid ephemeral tokens", async () => {
  const { interpreterService } = createServices();

  const session = await interpreterService.createSession({
    customerLocale: "ja",
    staffLocale: "ko",
  });

  await assert.rejects(
    () =>
      interpreterService.translateTurn({
        sessionId: session.id,
        ephemeralToken: "invalid-token",
        speaker: "customer",
        inputMode: "text",
        text: "痛かったら教えてください。",
      }),
    /invalid/i,
  );
});
