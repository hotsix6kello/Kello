import assert from "node:assert/strict";

import {
  processInterpreterSessionPost,
  processInterpreterSttPost,
  processInterpreterTurnPost,
} from "../interpreterRouteHandlers.ts";
import type { TranslationTextRequest } from "../../translation/types.ts";
import { TranslationService } from "../../translation/service.ts";
import { InMemoryTranslationRepository } from "../../translation/repository.ts";
import { InMemoryHomeTranslatorRepository } from "../repository.ts";
import { InShopInterpreterService } from "../interpreterService.ts";

class FailingTranslationProvider {
  async translateText(_request: TranslationTextRequest) {
    throw new Error("translation_provider_down");
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

await run("interpreter session route returns a created session with mocked service", async () => {
  const response = await processInterpreterSessionPost(
    new Request("http://localhost/api/translator/interpreter/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerLocale: "en",
        staffLocale: "ko",
      }),
    }),
    {
      async createSession(input) {
        return {
          id: "session-1",
          ephemeralToken: "token-1",
          customerLocale: input.customerLocale,
          staffLocale: input.staffLocale,
          expiresAt: "2026-03-17T12:00:00.000Z",
          createdAt: "2026-03-17T11:40:00.000Z",
        };
      },
    },
  );

  assert.equal(response.status, 200);
  const body = response.body as { id: string; customerLocale: string; staffLocale: string };
  assert.equal(body.id, "session-1");
  assert.equal(body.customerLocale, "en");
  assert.equal(body.staffLocale, "ko");
});

await run("interpreter session route validates unsupported locales", async () => {
  const response = await processInterpreterSessionPost(
    new Request("http://localhost/api/translator/interpreter/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerLocale: "fr",
        staffLocale: "ko",
      }),
    }),
  );

  assert.equal(response.status, 400);
  const body = response.body as { error: string };
  assert.match(body.error, /must be one of/i);
});

await run("interpreter turn route rejects empty input before calling the service", async () => {
  const response = await processInterpreterTurnPost(
    new Request("http://localhost/api/translator/interpreter/turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "session-1",
        ephemeralToken: "token-1",
        speaker: "customer",
        inputMode: "text",
        text: "   ",
      }),
    }),
    {
      async translateTurn() {
        throw new Error("should_not_be_called");
      },
    },
  );

  assert.equal(response.status, 400);
  const body = response.body as { error: string };
  assert.match(body.error, /must not be empty/i);
});

await run("interpreter turn route keeps the original text when translation falls back", async () => {
  const translatorRepository = new InMemoryHomeTranslatorRepository();
  const translationService = new TranslationService(
    new InMemoryTranslationRepository(),
    new FailingTranslationProvider(),
  );
  const interpreterService = new InShopInterpreterService(translatorRepository, translationService);

  const session = await interpreterService.createSession({
    customerLocale: "en",
    staffLocale: "ko",
  });

  const response = await processInterpreterTurnPost(
    new Request("http://localhost/api/translator/interpreter/turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.id,
        ephemeralToken: session.ephemeralToken,
        speaker: "customer",
        inputMode: "text",
        text: "Please make it natural.",
      }),
    }),
    interpreterService,
  );

  assert.equal(response.status, 200);
  const body = response.body as { originalText: string; translatedText: string; fallbackToText: boolean };
  assert.equal(body.originalText, "Please make it natural.");
  assert.equal(body.translatedText, body.originalText);
  assert.equal(body.fallbackToText, true);
});

await run("interpreter STT route returns a transcript with a mocked service", async () => {
  const formData = new FormData();
  formData.append("audio", new File([new Uint8Array([1, 2, 3, 4])], "clip.webm", { type: "audio/webm" }));
  formData.append("language", "en");

  const response = await processInterpreterSttPost(
    new Request("http://localhost/api/translator/interpreter/stt", {
      method: "POST",
      body: formData,
    }),
    {
      async transcribe(request) {
        return {
          transcriptId: "stt-1",
          text: `mock:${request.language}:${request.audioBuffer.byteLength}`,
          locale: request.language,
          engine: "mock-stt",
          fallbackUsed: true,
          confidence: 0.5,
          createdAt: "2026-03-17T12:00:00.000Z",
        };
      },
    },
  );

  assert.equal(response.status, 200);
  const body = response.body as { text: string; locale: string };
  assert.equal(body.locale, "en");
  assert.equal(body.text, "mock:en:4");
});

await run("interpreter STT route surfaces provider failures for text fallback handling", async () => {
  const formData = new FormData();
  formData.append("audio", new File([new Uint8Array([1, 2, 3, 4])], "clip.webm", { type: "audio/webm" }));
  formData.append("language", "ja");

  const response = await processInterpreterSttPost(
    new Request("http://localhost/api/translator/interpreter/stt", {
      method: "POST",
      body: formData,
    }),
    {
      async transcribe() {
        throw new Error("stt_provider_down");
      },
    },
  );

  assert.equal(response.status, 500);
  const body = response.body as { error: string };
  assert.match(body.error, /stt_provider_down/i);
});
