import { NextResponse } from "next/server";
import { InShopInterpreterService } from "@/lib/translator/interpreterService.ts";
import { processInterpreterSessionPost } from "@/lib/translator/interpreterRouteHandlers.ts";

export const runtime = "nodejs";

const service = new InShopInterpreterService();

export async function POST(request: Request) {
  const result = await processInterpreterSessionPost(request, service);
  return NextResponse.json(result.body, { status: result.status });
}
