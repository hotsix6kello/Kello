import { NextResponse } from "next/server";

import { BookingConciergeService } from "@/lib/translator/conciergeService.ts";
import type { ConciergeRequest } from "@/lib/translator/types.ts";

export const runtime = "nodejs";

const service = new BookingConciergeService();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ConciergeRequest>;

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!body.customerLocale || typeof body.customerLocale !== "string") {
      return NextResponse.json({ error: "customerLocale is required" }, { status: 400 });
    }

    const result = await service.handleRequest({
      sessionId: body.sessionId,
      customerLocale: body.customerLocale,
      message: body.message,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "concierge_request_failed" },
      { status: 500 },
    );
  }
}
