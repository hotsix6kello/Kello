import { BEAUTY_SERVICE_CATALOG, findServiceByName } from "./catalog.ts";
import type { ConciergeIntent, ExtractedBookingFields } from "./types.ts";

const INTENT_PATTERNS: Array<[ConciergeIntent, RegExp[]]> = [
  ["cancel_booking", [/cancel/i, /취소/, /キャンセル/, /取消/]],
  ["change_booking", [/change/i, /reschedule/i, /변경/, /시간\s*바꾸/, /変更/, /改/]],
  ["create_booking", [/book/i, /reserve/i, /예약/, /부탁/, /予.?約/, /预.?约/]],
  ["availability", [/available/i, /availability/i, /가능/, /자리/, /空き/, /有空/]],
  ["price_query", [/price/i, /cost/i, /얼마/, /가격/, /料金/, /价格/]],
  ["duration_query", [/duration/i, /how long/i, /소요/, /시간/, /どのくらい/, /多久/]],
  ["policy_query", [/policy/i, /cancel policy/i, /규정/, /취소 규정/, /ポリシー/, /政策/]],
];

export function extractBookingFields(message: string): ExtractedBookingFields {
  const service = findServiceByName(message);
  const intent = detectIntent(message);
  const requestedDate = extractRequestedDate(message);
  const requestedTime = extractRequestedTime(message);
  const notes = extractNotes(message);

  return {
    intent,
    service_name: service?.canonicalName ?? null,
    requested_date: requestedDate,
    requested_time: requestedTime,
    notes,
  };
}

function detectIntent(message: string): ConciergeIntent {
  for (const [intent, patterns] of INTENT_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(message))) {
      return intent;
    }
  }

  if (
    BEAUTY_SERVICE_CATALOG.some((service) =>
      (service.aliases.ko ?? []).some((alias) => message.includes(alias)),
    )
  ) {
    return "availability";
  }

  return "general";
}

function extractRequestedDate(message: string) {
  const today = new Date("2026-03-17T09:00:00+09:00");

  const isoMatch = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const slashMatch = message.match(/\b(\d{1,2})[/-](\d{1,2})\b/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    return `2026-${month}-${day}`;
  }

  if (/tomorrow|내일|明日|明天/i.test(message)) {
    return addDays(today, 1);
  }

  if (/today|오늘|本日|今天/i.test(message)) {
    return addDays(today, 0);
  }

  return null;
}

function extractRequestedTime(message: string) {
  const hhmmMatch = message.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmmMatch) {
    return `${hhmmMatch[1].padStart(2, "0")}:${hhmmMatch[2]}`;
  }

  const ampmMatch = message.match(/\b(\d{1,2})\s?(am|pm)\b/i);
  if (ampmMatch) {
    const hour = normalizeMeridiemHour(Number(ampmMatch[1]), ampmMatch[2].toLowerCase() === "pm");
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const koreanMatch = message.match(/(오전|오후)\s?(\d{1,2})시/);
  if (koreanMatch) {
    const hour = normalizeMeridiemHour(Number(koreanMatch[2]), koreanMatch[1] === "오후");
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const asianHourMatch = message.match(/(\d{1,2})\s?(時|点|點)/);
  if (asianHourMatch) {
    return `${asianHourMatch[1].padStart(2, "0")}:00`;
  }

  return null;
}

function extractNotes(message: string) {
  const noteMatch = message.match(/(?:note|notes|request|요청사항|메모|備考|备注)[:：]?\s*(.+)$/i);
  if (noteMatch) {
    return noteMatch[1].trim();
  }

  return message.trim().length > 0 ? message.trim() : null;
}

function normalizeMeridiemHour(hour: number, isPm: boolean) {
  if (isPm && hour < 12) {
    return hour + 12;
  }

  if (!isPm && hour === 12) {
    return 0;
  }

  return hour;
}

function addDays(base: Date, dayOffset: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + dayOffset);
  return next.toISOString().slice(0, 10);
}
