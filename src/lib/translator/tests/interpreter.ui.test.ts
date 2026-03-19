import assert from "node:assert/strict";

import {
  getCompletedTranslationStatusMessage,
  getMicrophoneErrorMessage,
  getTranscriptionFallbackStatusMessage,
  normalizeInterpreterTextInput,
} from "../interpreterUi.ts";
import {
  getConversationHistoryView,
  getSpeakerControlCardView,
  getVisibleQuickPhraseGroups,
} from "../../../app/components/home-translator/interpreter/viewModel.ts";
import type { InterpreterTurnResponse } from "../types.ts";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await run("interpreter UI helpers trim empty input and keep real text", () => {
  assert.equal(normalizeInterpreterTextInput("   "), null);
  assert.equal(normalizeInterpreterTextInput("  hello  "), "hello");
});

await run("microphone permission denied returns a text fallback message", () => {
  const errorMessage = getMicrophoneErrorMessage({
    name: "NotAllowedError",
    message: "Permission denied",
  });

  assert.match(errorMessage, /permission/i);
  assert.match(errorMessage, /text input/i);
});

await run("speaker control card view exposes loading state and disabled submit state", () => {
  const loadingView = getSpeakerControlCardView({
    draftValue: "Please make it natural.",
    isBusy: true,
    statusText: null,
  });
  const emptyView = getSpeakerControlCardView({
    draftValue: "   ",
    isBusy: false,
    statusText: null,
  });

  assert.equal(loadingView.translateButtonLabel, "Translating...");
  assert.equal(loadingView.translateDisabled, true);
  assert.equal(emptyView.translateDisabled, true);
});

await run("quick phrase groups filter empty categories for mobile layouts", () => {
  const groups = getVisibleQuickPhraseGroups([
    {
      category: "greeting",
      label: "Greeting",
      phrases: [{ id: "hello", text: "Hello" }],
    },
    {
      category: "consultation",
      label: "Consultation",
      phrases: [],
    },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.category, "greeting");
});

await run("conversation history view returns the latest turn and count label", () => {
  const turns: InterpreterTurnResponse[] = [
    {
      turnId: "turn-2",
      sessionId: "session-1",
      speaker: "staff",
      inputMode: "text",
      originalText: "Please look in the mirror.",
      translatedText: "Please look in the mirror.",
      sourceLocale: "en",
      targetLocale: "ko",
      createdAt: new Date().toISOString(),
      replay: {
        originalLang: "en-US",
        translatedLang: "ko-KR",
      },
      fallbackToText: false,
    },
  ];

  const view = getConversationHistoryView(turns);

  assert.equal(view.latestTurn?.turnId, "turn-2");
  assert.equal(view.turnCountLabel, "1 turns");
  assert.equal(view.isEmpty, false);
});

await run("translation fallback status stays visible after a failed provider call", () => {
  assert.match(getCompletedTranslationStatusMessage(true), /showing the original text/i);
  assert.match(getTranscriptionFallbackStatusMessage(), /transcription failed/i);
});
