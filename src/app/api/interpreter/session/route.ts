import { NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { InShopInterpreterService } from "@/lib/translator/interpreterService.ts";
import { processInterpreterSessionPost } from "@/lib/translator/interpreterRouteHandlers.ts";

export const runtime = "nodejs";

const service = new InShopInterpreterService();

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ error: "login_required" }, { status: 401 });
    }
    throw error;
  }

  const result = await processInterpreterSessionPost(request, service);
  return NextResponse.json(result.body, { status: result.status });
}
