import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTranslationEngineName } from "./config.ts";
import { injectGlossaryTokens } from "./glossary.ts";
import type { TranslationProviderResult, TranslationTextRequest } from "./types.ts";

const TRANSLATION_LANGUAGE_LABELS: Record<string, string> = {
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

export interface TranslationProvider {
  translateText(request: TranslationTextRequest): Promise<TranslationProviderResult>;
}

export class MockTranslationProvider implements TranslationProvider {
  async translateText(request: TranslationTextRequest): Promise<TranslationProviderResult> {
    if (request.sourceLocale === request.targetLocale) {
      return {
        translatedText: request.text,
        engine: "mock",
      };
    }

    const glossary = injectGlossaryTokens(request.text, request.glossary);
    const translatedText = glossary.restore(`[${request.targetLocale}] ${glossary.tokenizedText}`);

    return {
      translatedText,
      engine: "mock",
      metadata: {
        domain: request.domain,
        contentType: request.contentType,
      },
    };
  }
}

export class HttpTranslationProvider implements TranslationProvider {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string,
    private readonly engineName = "http-generic",
  ) {}

  async translateText(request: TranslationTextRequest): Promise<TranslationProviderResult> {
    const glossary = injectGlossaryTokens(request.text, request.glossary);

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        text: glossary.tokenizedText,
        sourceLocale: request.sourceLocale,
        targetLocale: request.targetLocale,
        domain: request.domain,
        contentType: request.contentType,
        format: request.format ?? "text",
        preserveTokens: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation provider request failed with status ${response.status}.`);
    }

    const body = (await response.json()) as {
      translatedText?: string;
      engine?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.translatedText) {
      throw new Error("Translation provider did not return translatedText.");
    }

    return {
      translatedText: glossary.restore(body.translatedText),
      engine: body.engine ?? this.engineName,
      metadata: body.metadata,
    };
  }
}

export class GeminiTranslationProvider implements TranslationProvider {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async translateText(request: TranslationTextRequest): Promise<TranslationProviderResult> {
    const sourceLanguage = TRANSLATION_LANGUAGE_LABELS[request.sourceLocale] ?? request.sourceLocale;
    const targetLanguage = TRANSLATION_LANGUAGE_LABELS[request.targetLocale] ?? request.targetLocale;
    const prompt = `
      Translate the following text from ${sourceLanguage} to ${targetLanguage}.
      Context: ${request.domain} / ${request.contentType}
      Text to translate:
      ${request.text}
      
      Only return the translated text without any explanation or quotes.
    `;

    const result = await this.model.generateContent(prompt);
    const translatedText = result.response.text().trim();

    return {
      translatedText,
      engine: "gemini",
      metadata: {
        domain: request.domain,
        contentType: request.contentType,
      },
    };
  }
}

export function createTranslationProvider(): TranslationProvider {
  const endpoint = process.env.TRANSLATION_PROVIDER_URL;
  const apiKey = process.env.TRANSLATION_PROVIDER_API_KEY;
  const engineName = getTranslationEngineName();

  if (engineName === "gemini" && apiKey) {
    return new GeminiTranslationProvider(apiKey);
  }

  if (!endpoint) {
    return new MockTranslationProvider();
  }

  return new HttpTranslationProvider(endpoint, apiKey, engineName);
}
