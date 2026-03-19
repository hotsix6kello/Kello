import assert from "node:assert/strict";

import { MockTranslationProvider } from "../../translation/providers.ts";
import { InMemoryTranslationRepository } from "../../translation/repository.ts";
import { TranslationService } from "../../translation/service.ts";
import { BookingConciergeService } from "../conciergeService.ts";
import { InShopInterpreterService } from "../interpreterService.ts";
import { InMemoryHomeTranslatorRepository } from "../repository.ts";
import { InterpreterSttService, MockInterpreterSttProvider } from "../stt.ts";

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
    conciergeService: new BookingConciergeService(translatorRepository, translationService),
    interpreterService: new InShopInterpreterService(translatorRepository, translationService),
  };
}

await run("booking concierge creates a booking from a grounded availability check", async () => {
  const { conciergeService } = createServices();

  const result = await conciergeService.handleRequest({
    customerLocale: "en",
    message: "Please book lash extension on 2026-03-18 at 14:00. note: natural style",
  });

  assert.equal(result.structuredOutput.intent, "create_booking");
  assert.equal(result.structuredOutput.service_name, "속눈썹 연장");
  assert.equal(result.structuredOutput.requested_date, "2026-03-18");
  assert.equal(result.structuredOutput.requested_time, "14:00");
  assert.equal(result.booking?.status, "confirmed");
  assert.equal(result.booking?.bookingTime, "14:00");
  assert.equal(result.tools.some((tool) => tool.tool === "availability"), true);
  assert.equal(result.tools.some((tool) => tool.tool === "create_booking"), true);
  assert.match(result.responseLocalized, /^\[en\]/);
  assert.ok(result.savedEventId);
});

await run("booking concierge changes and cancels an existing booking in the same session", async () => {
  const { conciergeService } = createServices();

  const created = await conciergeService.handleRequest({
    customerLocale: "ko",
    message: "속눈썹 연장 2026-03-18 14:00 예약 부탁해요",
  });

  assert.ok(created.booking);

  const changed = await conciergeService.handleRequest({
    sessionId: created.sessionId,
    customerLocale: "en",
    message: "Please change my booking to 2026-03-19 16:00",
  });

  assert.equal(changed.structuredOutput.intent, "change_booking");
  assert.equal(changed.booking?.bookingDate, "2026-03-19");
  assert.equal(changed.booking?.bookingTime, "16:00");
  assert.equal(changed.tools.some((tool) => tool.tool === "change_booking"), true);

  const cancelled = await conciergeService.handleRequest({
    sessionId: created.sessionId,
    customerLocale: "en",
    message: "Please cancel my booking",
  });

  assert.equal(cancelled.structuredOutput.intent, "cancel_booking");
  assert.equal(cancelled.booking?.status, "cancelled");
  assert.equal(cancelled.tools.some((tool) => tool.tool === "cancel_booking"), true);
});

await run("booking concierge returns a grounded fallback when a requested slot is unavailable", async () => {
  const { conciergeService } = createServices();

  const result = await conciergeService.handleRequest({
    customerLocale: "ja",
    message: "まつげエクステを2026-03-18 18:00に予約したいです",
  });

  assert.equal(result.structuredOutput.intent, "create_booking");
  assert.equal(result.booking, null);
  assert.equal(result.tools.some((tool) => tool.tool === "availability"), true);
  assert.match(result.responseKo, /대안 시간|예약이 어렵습니다|수수료|생성/);
});

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

await run("mock STT service returns a transcript for supported interpreter languages", async () => {
  const service = new InterpreterSttService(new MockInterpreterSttProvider());

  const result = await service.transcribe({
    language: "zh-CN",
    audioBuffer: new Uint8Array([10, 20, 30, 40]),
    mimeType: "audio/webm",
  });

  assert.equal(result.locale, "zh-CN");
  assert.equal(result.fallbackUsed, true);
  assert.match(result.engine, /mock/i);
  assert.match(result.text, /自然|蓬松/);
});
