import { NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { runBatchTranslateJob } from "@/lib/translation/jobs/batchTranslate";
import type { BatchTranslateRequest } from "@/lib/translation/types";

export const runtime = "nodejs";

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
    const body = (await request.json()) as Partial<BatchTranslateRequest>;
    const result = await runBatchTranslateJob({
      domain: body.domain,
      contentType: body.contentType,
      limit: body.limit,
      targetLocales: body.targetLocales,
      items: body.items,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "batch_translation_failed",
      },
      { status: 500 },
    );
  }
}
