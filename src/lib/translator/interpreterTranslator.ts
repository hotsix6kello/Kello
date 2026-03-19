import { GoogleGenerativeAI } from "@google/generative-ai";

import type { ConciergeLocale } from "./types.ts";

const INTERPRETER_LANGUAGE_LABELS: Record<ConciergeLocale, string> = {
  ko: "Korean",
  en: "English",
  ja: "Japanese",
  "zh-CN": "Simplified Chinese",
  "zh-HK": "Traditional Chinese",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
};

export interface InterpreterTranslationRequest {
  sourceText: string;
  sourceLang: ConciergeLocale;
  targetLang: ConciergeLocale;
}

export interface InterpreterTranslationResult {
  translatedText: string;
  provider: string;
}

export interface InterpreterTranslationProvider {
  translateText(request: InterpreterTranslationRequest): Promise<InterpreterTranslationResult>;
}

export class MockInterpreterTranslationProvider implements InterpreterTranslationProvider {
  async translateText(
    request: InterpreterTranslationRequest,
  ): Promise<InterpreterTranslationResult> {
    return {
      translatedText: `[mock ${request.sourceLang}->${request.targetLang}] ${request.sourceText}`,
      provider: "mock",
    };
  }
}

export class GeminiInterpreterTranslationProvider implements InterpreterTranslationProvider {
  private readonly model;

  constructor(apiKey: string, modelName = getGeminiModelName()) {
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: modelName });
  }

  async translateText(
    request: InterpreterTranslationRequest,
  ): Promise<InterpreterTranslationResult> {
    const result = await this.model.generateContent(
      buildGeminiInterpreterPrompt(request),
    );
    const translatedText = result.response.text().trim();

    if (!translatedText) {
      throw new Error("gemini_translation_empty");
    }

    return {
      translatedText,
      provider: "gemini",
    };
  }
}

function getInterpreterGlossaryHints() {
  return [] as string[];
}

function buildGeminiInterpreterPrompt(request: InterpreterTranslationRequest) {
  const glossaryHints = getInterpreterGlossaryHints();
  const sourceLanguage = INTERPRETER_LANGUAGE_LABELS[request.sourceLang];
  const targetLanguage = INTERPRETER_LANGUAGE_LABELS[request.targetLang];

  return [
    "You are a live interpreter for a Korean beauty salon conversation.",
    `Translate the following message from ${sourceLanguage} to ${targetLanguage}.`,
    "Return only the translated text.",
    "Do not add explanations, labels, bullet points, quotes, or extra formatting.",
    "Keep the wording concise, natural, and suitable for real-time face-to-face salon communication.",
    glossaryHints.length > 0
      ? `Preferred salon glossary terms:\n${glossaryHints.join("\n")}`
      : "",
    "Message:",
    request.sourceText,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getConfiguredInterpreterTranslationProvider() {
  const configuredProvider = process.env.INTERPRETER_TRANSLATION_PROVIDER?.trim().toLowerCase();
  if (configuredProvider) {
    return configuredProvider;
  }

  if (
    process.env.INTERPRETER_TRANSLATION_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim()
  ) {
    return "gemini";
  }

  return "mock";
}

function getGeminiApiKey() {
  return (
    process.env.INTERPRETER_TRANSLATION_API_KEY?.trim() ??
    process.env.GEMINI_API_KEY?.trim() ??
    null
  );
}

function getGeminiModelName() {
  return process.env.INTERPRETER_TRANSLATION_GEMINI_MODEL?.trim() || "gemini-1.5-flash";
}

function shouldAllowMockFallback() {
  return process.env.INTERPRETER_TRANSLATION_ALLOW_MOCK_FALLBACK !== "false";
}

function createRealInterpreterTranslationProvider() {
  switch (getConfiguredInterpreterTranslationProvider()) {
    case "gemini": {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return null;
      }

      return new GeminiInterpreterTranslationProvider(apiKey);
    }
    default:
      return null;
  }
}

export function createInterpreterTranslationProvider(): InterpreterTranslationProvider {
  return createRealInterpreterTranslationProvider() ?? new MockInterpreterTranslationProvider();
}

export async function translateInterpreterText(
  request: InterpreterTranslationRequest,
): Promise<InterpreterTranslationResult> {
  const provider = createInterpreterTranslationProvider();

  try {
    return await provider.translateText(request);
  } catch (error) {
    if (!shouldAllowMockFallback() || provider instanceof MockInterpreterTranslationProvider) {
      throw error;
    }

    return new MockInterpreterTranslationProvider().translateText(request);
  }
}
