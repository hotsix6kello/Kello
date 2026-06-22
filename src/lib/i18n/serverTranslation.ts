import { resolveCanonicalLocale } from "./locales";

// Static imports — bundled at build time, zero runtime filesystem access.
import koMessages from "../../../public/locales/ko/common.json";
import enMessages from "../../../public/locales/en/common.json";
import jaMessages from "../../../public/locales/ja/common.json";
import zhCNMessages from "../../../public/locales/zh-CN/common.json";
import zhTWMessages from "../../../public/locales/zh-TW/common.json";
import viMessages from "../../../public/locales/vi/common.json";
import thMessages from "../../../public/locales/th/common.json";
import arMessages from "../../../public/locales/ar/common.json";

type MessageTree = Record<string, unknown>;

const LOCALE_MAP: Record<string, MessageTree> = {
  ko: koMessages as unknown as MessageTree,
  en: enMessages as unknown as MessageTree,
  ja: jaMessages as unknown as MessageTree,
  "zh-CN": zhCNMessages as unknown as MessageTree,
  "zh-TW": zhTWMessages as unknown as MessageTree,
  vi: viMessages as unknown as MessageTree,
  th: thMessages as unknown as MessageTree,
  ar: arMessages as unknown as MessageTree,
};

function dig(obj: MessageTree, path: string): string | undefined {
  const parts = path.split(".");
  let node: unknown = obj;
  for (const part of parts) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as MessageTree)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Returns a server-side t() function for the given locale.
 * Falls back to `en` for any missing key.
 */
export function getServerT(locale?: string | null) {
  const canonical = resolveCanonicalLocale(locale, "en");
  const primary = LOCALE_MAP[canonical] ?? LOCALE_MAP["en"];
  const fallback = LOCALE_MAP["en"];

  return function t(key: string, params?: Record<string, string | number>): string {
    let text = dig(primary, key) ?? dig(fallback, key) ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return text;
  };
}
