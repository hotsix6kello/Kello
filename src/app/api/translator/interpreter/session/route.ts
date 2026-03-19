import { NextResponse } from "next/server";

import { InShopInterpreterService } from "../../../../../lib/translator/interpreterService.ts";
import { processInterpreterSessionPost } from "../../../../../lib/translator/interpreterRouteHandlers.ts";

export const runtime = "nodejs";

const service = new InShopInterpreterService();

export async function handleInterpreterSessionPost(
  request: Request,
  routeService = service,
) {
  const result = await processInterpreterSessionPost(request, routeService);
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  return handleInterpreterSessionPost(request);
}
