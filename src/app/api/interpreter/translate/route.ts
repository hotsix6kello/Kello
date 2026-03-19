import { NextResponse } from "next/server";

import {
  getSupportedTranslationLocaleListLabel,
  isSupportedTranslationLocale,
} from "@/lib/translation/config.ts";
import { translateInterpreterText } from "@/lib/translator/interpreterTranslator.ts";

export const runtime = "nodejs";

const SUPPORTED_LOCALE_LIST_LABEL = getSupportedTranslationLocaleListLabel();

type InterpreterTranslateRequest = {
  sourceText?: unknown;
  sourceLang?: unknown;
  targetLang?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InterpreterTranslateRequest;

    if (typeof body.sourceText !== "string" || body.sourceText.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "sourceText must be a non-empty string",
        },
        { status: 400 },
      );
    }

    if (typeof body.sourceLang !== "string" || typeof body.targetLang !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "sourceLang and targetLang are required",
        },
        { status: 400 },
      );
    }

    if (!isSupportedTranslationLocale(body.sourceLang) || !isSupportedTranslationLocale(body.targetLang)) {
      return NextResponse.json(
        {
          ok: false,
          error: `sourceLang and targetLang must be one of ${SUPPORTED_LOCALE_LIST_LABEL}`,
        },
        { status: 400 },
      );
    }

    const normalizedSourceText = body.sourceText.trim();
    const translation = await translateInterpreterText({
      sourceText: normalizedSourceText,
      sourceLang: body.sourceLang,
      targetLang: body.targetLang,
    });

    return NextResponse.json(
      {
        ok: true,
        translatedText: translation.translatedText,
        provider: translation.provider,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "SyntaxError"
        ? "request body must be valid JSON"
        : error instanceof Error
          ? error.message
          : "interpreter_translate_failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
