import assert from "node:assert/strict";

import {
  createInterpreterTranslationProvider,
  GeminiInterpreterTranslationProvider,
  translateInterpreterText,
} from "../interpreterTranslator.ts";

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function withEnv(overrides: Record<string, string | undefined>, fn: () => Promise<void>) {
  const previous = {
    INTERPRETER_TRANSLATION_PROVIDER: process.env.INTERPRETER_TRANSLATION_PROVIDER,
    INTERPRETER_TRANSLATION_API_KEY: process.env.INTERPRETER_TRANSLATION_API_KEY,
    INTERPRETER_TRANSLATION_ALLOW_MOCK_FALLBACK:
      process.env.INTERPRETER_TRANSLATION_ALLOW_MOCK_FALLBACK,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return fn().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

await run("interpreter translator uses Gemini provider when configured with an API key", async () => {
  await withEnv(
    {
      INTERPRETER_TRANSLATION_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-key",
      INTERPRETER_TRANSLATION_API_KEY: undefined,
    },
    async () => {
      const provider = createInterpreterTranslationProvider();
      assert.equal(provider instanceof GeminiInterpreterTranslationProvider, true);
    },
  );
});

await run("interpreter translator falls back to mock when Gemini is configured without an API key", async () => {
  await withEnv(
    {
      INTERPRETER_TRANSLATION_PROVIDER: "gemini",
      GEMINI_API_KEY: undefined,
      INTERPRETER_TRANSLATION_API_KEY: undefined,
    },
    async () => {
      const result = await translateInterpreterText({
        sourceText: "Please make it look natural.",
        sourceLang: "en",
        targetLang: "ko",
      });

      assert.equal(result.provider, "mock");
      assert.match(result.translatedText, /^\[mock en->ko\]/);
    },
  );
});

await run("interpreter translator falls back to mock when Gemini request fails", async () => {
  const originalTranslate = GeminiInterpreterTranslationProvider.prototype.translateText;

  GeminiInterpreterTranslationProvider.prototype.translateText = async function () {
    throw new Error("gemini_provider_down");
  };

  await withEnv(
    {
      INTERPRETER_TRANSLATION_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-key",
      INTERPRETER_TRANSLATION_ALLOW_MOCK_FALLBACK: "true",
    },
    async () => {
      const result = await translateInterpreterText({
        sourceText: "Please wait a moment.",
        sourceLang: "en",
        targetLang: "ko",
      });

      assert.equal(result.provider, "mock");
      assert.match(result.translatedText, /^\[mock en->ko\]/);
    },
  ).finally(() => {
    GeminiInterpreterTranslationProvider.prototype.translateText = originalTranslate;
  });
});
