import type { ConciergeLocale, InterpreterTurnResponse } from "@/lib/translator/types.ts";

const HISTORY_LIMIT = 24;

export function buildInterpreterHistoryKey(customerLocale: ConciergeLocale, staffLocale: ConciergeLocale) {
  return `kello:interpreter-history:${customerLocale}:${staffLocale}`;
}

export function mergeInterpreterHistory(
  current: InterpreterTurnResponse[],
  incoming: InterpreterTurnResponse,
  limit = HISTORY_LIMIT,
) {
  const deduped = [incoming, ...current.filter((turn) => turn.turnId !== incoming.turnId)];
  return deduped.slice(0, limit);
}

export function parseInterpreterHistory(raw: string | null) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isInterpreterTurnResponse).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function isInterpreterTurnResponse(value: unknown): value is InterpreterTurnResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const turn = value as Partial<InterpreterTurnResponse>;
  return (
    typeof turn.turnId === "string" &&
    typeof turn.sessionId === "string" &&
    typeof turn.originalText === "string" &&
    typeof turn.translatedText === "string" &&
    typeof turn.createdAt === "string" &&
    typeof turn.sourceLocale === "string" &&
    typeof turn.targetLocale === "string"
  );
}
