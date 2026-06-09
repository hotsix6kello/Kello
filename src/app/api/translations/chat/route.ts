import { NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { TranslationService } from "@/lib/translation/service";
import type { ChatTranslateRequest } from "@/lib/translation/types";

export const runtime = "nodejs";

const translationService = new TranslationService();

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ error: "login_required" }, { status: 401 });
    }
    throw error;
  }

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
      sourceLocale: body.sourceLocale,
      domain: body.domain,
      conversationId: body.conversationId,
      actor: body.actor,
      persist: body.persist,
    });

    return NextResponse.json(translated);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "chat_translation_failed",
      },
      { status: 500 },
    );
  }
}
