import { NextResponse } from "next/server";

import { TranslationService } from "@/lib/translation/service";
import type { ChatTranslateRequest } from "@/lib/translation/types";

export const runtime = "nodejs";

const translationService = new TranslationService();

export async function POST(request: Request) {

  try {
    const body = (await request.json()) as Partial<ChatTranslateRequest>;

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!body.targetLocale || typeof body.targetLocale !== "string") {
      return NextResponse.json({ error: "targetLocale is required" }, { status: 400 });
    }

    const translated = await translationService.translateRealtimeMessage({
      message: body.message,
      targetLocale: body.targetLocale,
      sourceLocale: body.sourceLocale ?? "ko",
      domain: body.domain,
      conversationId: body.conversationId ?? "chat-session",
      actor: body.actor ?? "customer",
      persist: body.persist ?? false,
    });

    return NextResponse.json({
      translatedText: translated.translatedText
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed" },
      { status: 500 }
      
    );
  }
}
