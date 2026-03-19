import type { InterpreterTurnResponse } from "../../../../lib/translator/types.ts";
import type { SalonQuickPhraseGroup } from "../../../../lib/translator/salonGlossary.ts";
import { DEFAULT_TEXT_INPUT_STATUS } from "../../../../lib/translator/interpreterUi.ts";

export function getVisibleQuickPhraseGroups(groups: SalonQuickPhraseGroup[]) {
  return groups.filter((group) => group.phrases.length > 0);
}

export function getSpeakerControlCardView(input: {
  draftValue: string;
  isBusy: boolean;
  statusText: string | null;
}) {
  return {
    translateButtonLabel: input.isBusy ? "Translating..." : "Translate",
    translateDisabled: input.isBusy || input.draftValue.trim().length === 0,
    statusText: input.statusText ?? DEFAULT_TEXT_INPUT_STATUS,
  };
}

export function getConversationHistoryView(turns: InterpreterTurnResponse[]) {
  return {
    latestTurn: turns[0] ?? null,
    turnCountLabel: `${turns.length} turns`,
    isEmpty: turns.length === 0,
  };
}
