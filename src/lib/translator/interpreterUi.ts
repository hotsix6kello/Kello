import type { SpeakerRole } from "./types.ts";

const EMPTY_INPUT_MESSAGES: Record<SpeakerRole, string> = {
  customer: "Enter customer text before translating.",
  staff: "Enter staff text before translating.",
};

export const DEFAULT_TEXT_INPUT_STATUS = "Press Enter to send. Use Shift+Enter for a new line.";

export function normalizeInterpreterTextInput(text: string) {
  const normalized = text.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getEmptyInterpreterInputMessage(role?: SpeakerRole) {
  if (!role) {
    return "Enter text before translating.";
  }

  return EMPTY_INPUT_MESSAGES[role];
}

export function getMicrophoneErrorMessage(error: unknown) {
  const domLikeError = error as { name?: unknown; message?: unknown } | null;
  const errorName = typeof domLikeError?.name === "string" ? domLikeError.name : "";

  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Microphone permission was denied. Use text input instead.";
  }

  if (errorName === "NotFoundError") {
    return "No microphone was found. Use text input instead.";
  }

  if (typeof domLikeError?.message === "string" && domLikeError.message.trim().length > 0) {
    return domLikeError.message;
  }

  return "Microphone recording failed. Use text input instead.";
}

export function getMicrophoneFallbackStatusMessage() {
  return "Voice input is unavailable. Use text input to continue.";
}

export function getTranscriptionFallbackStatusMessage() {
  return "Transcription failed. Type below or tap a quick phrase to continue.";
}

export function getTranslationFallbackStatusMessage() {
  return "Translation failed. Showing the original text and keeping voice playback safe.";
}

export function getCompletedTranslationStatusMessage(fallbackUsed: boolean) {
  if (fallbackUsed) {
    return getTranslationFallbackStatusMessage();
  }

  return "Translation completed.";
}
