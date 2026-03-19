import { GoogleGenerativeAI } from "@google/generative-ai";

export type InterpreterTranscriptionInput = {
  audioFile: File;
  language: string;
};

export type InterpreterTranscriptionResult = {
  text: string;
  provider: string;
};

interface InterpreterTranscriptionProvider {
  readonly providerName: string;
  transcribe(input: InterpreterTranscriptionInput): Promise<InterpreterTranscriptionResult>;
}

const DEFAULT_AUDIO_MIME_TYPE = "audio/webm";
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_PROVIDER_MODES = new Set(["gemini", "real", "real_or_mock"]);

const LANGUAGE_LABELS: Record<string, string> = {
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

class MockInterpreterTranscriptionProvider implements InterpreterTranscriptionProvider {
  readonly providerName = "mock-stt";

  async transcribe(input: InterpreterTranscriptionInput): Promise<InterpreterTranscriptionResult> {
    const fileName = input.audioFile.name.trim() || "audio";

    return {
      text: `Mock transcription for ${input.language} audio from ${fileName}.`,
      provider: this.providerName,
    };
  }
}

class GeminiInterpreterTranscriptionProvider implements InterpreterTranscriptionProvider {
  readonly providerName = "gemini-stt";
  private readonly model;

  constructor(apiKey: string, modelName: string) {
    const client = new GoogleGenerativeAI(apiKey);
    this.model = client.getGenerativeModel({ model: modelName });
  }

  async transcribe(input: InterpreterTranscriptionInput): Promise<InterpreterTranscriptionResult> {
    const result = await this.model.generateContent([
      buildGeminiTranscriptionPrompt(input.language),
      await buildGeminiInlineAudioPart(input.audioFile),
    ]);

    const text = sanitizeGeminiTranscript(result.response.text());
    if (!text) {
      throw new Error("stt_provider_empty_transcript");
    }

    return {
      text,
      provider: this.providerName,
    };
  }
}

function resolveInterpreterSttProviderMode() {
  const configuredMode = process.env.INTERPRETER_STT_PROVIDER?.trim().toLowerCase();

  if (configuredMode) {
    return configuredMode;
  }

  const legacyMode = process.env.STT_PROVIDER_NAME?.trim().toLowerCase();
  if (legacyMode === "gemini") {
    return "gemini";
  }

  return "mock";
}

function resolveInterpreterSttApiKey() {
  return (
    process.env.INTERPRETER_STT_API_KEY?.trim() ||
    process.env.STT_PROVIDER_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ""
  );
}

function resolveInterpreterSttModel() {
  return process.env.INTERPRETER_STT_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

function createPrimaryInterpreterTranscriptionProvider(): InterpreterTranscriptionProvider {
  const providerMode = resolveInterpreterSttProviderMode();

  if (!GEMINI_PROVIDER_MODES.has(providerMode)) {
    return new MockInterpreterTranscriptionProvider();
  }

  const apiKey = resolveInterpreterSttApiKey();
  if (!apiKey) {
    return new MockInterpreterTranscriptionProvider();
  }

  return new GeminiInterpreterTranscriptionProvider(apiKey, resolveInterpreterSttModel());
}

export function createInterpreterTranscriber() {
  return createPrimaryInterpreterTranscriptionProvider();
}

export async function transcribeInterpreterAudio(
  input: InterpreterTranscriptionInput,
  provider: InterpreterTranscriptionProvider = createInterpreterTranscriber(),
): Promise<InterpreterTranscriptionResult> {
  try {
    return await provider.transcribe(input);
  } catch (error) {
    if (provider.providerName === "mock-stt") {
      throw error;
    }

    console.error(
      `Interpreter STT provider "${provider.providerName}" failed. Falling back to mock-stt.`,
      error,
    );

    return new MockInterpreterTranscriptionProvider().transcribe(input);
  }
}

function buildGeminiTranscriptionPrompt(language: string) {
  const languageLabel = LANGUAGE_LABELS[language] ?? language;

  return [
    "Transcribe the uploaded audio into plain text.",
    `The expected spoken language is ${languageLabel}.`,
    "Return only the transcription.",
    "Do not add speaker labels, markdown, quotes, summaries, or explanations.",
    "If the audio is unclear, return the best plain-text transcription you can infer.",
  ].join(" ");
}

async function buildGeminiInlineAudioPart(audioFile: File) {
  const mimeType = audioFile.type || DEFAULT_AUDIO_MIME_TYPE;
  const audioBase64 = Buffer.from(await audioFile.arrayBuffer()).toString("base64");

  return {
    inlineData: {
      data: audioBase64,
      mimeType,
    },
  };
}

function sanitizeGeminiTranscript(text: string) {
  const withoutCodeFence = text.replace(/```[\s\S]*?```/g, "").trim();
  const withoutLeadingLabel = withoutCodeFence.replace(/^(transcription|transcript)\s*:\s*/i, "").trim();
  const withoutWrappingQuotes = withoutLeadingLabel.replace(/^["'`]+|["'`]+$/g, "").trim();

  return withoutWrappingQuotes;
}
