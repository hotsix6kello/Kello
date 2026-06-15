import { NextResponse } from "next/server";
import { AdminRouteAccessError } from "@/lib/admin/adminRouteAccess.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function handleAdminRouteError(error: unknown, logPrefix: string) {
  if (error instanceof AdminRouteAccessError && error.code === "missing_token")
    return jsonFailure("admin session is required", 401);
  if (error instanceof AdminRouteAccessError && error.code === "unauthorized")
    return jsonFailure("admin session is invalid", 401);
  if (error instanceof AdminRouteAccessError && error.code === "forbidden")
    return jsonFailure("admin access is required", 403);
  if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
    console.error(`[${logPrefix}] env_missing`, { missingEnvVars: getMissingSupabaseServerEnvVars() });
    return jsonFailure("server is not configured", 500);
  }
  return null;
}
