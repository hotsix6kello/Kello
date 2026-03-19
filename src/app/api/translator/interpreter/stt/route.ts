import { NextResponse } from "next/server";

import { processInterpreterSttPost } from "../../../../../lib/translator/interpreterRouteHandlers.ts";
import { InterpreterSttService } from "../../../../../lib/translator/stt.ts";

export const runtime = "nodejs";

const service = new InterpreterSttService();

export async function handleInterpreterSttPost(
  request: Request,
  routeService = service,
) {
  const result = await processInterpreterSttPost(request, routeService);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  return handleInterpreterSttPost(request);
}
