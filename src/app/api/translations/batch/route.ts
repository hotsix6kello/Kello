import { NextResponse } from "next/server";

import { runBatchTranslateJob } from "@/lib/translation/jobs/batchTranslate";
import type { BatchTranslateRequest } from "@/lib/translation/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
