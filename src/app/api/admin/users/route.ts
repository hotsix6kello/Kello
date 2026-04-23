import { NextResponse } from "next/server";
import {
  AdminRouteAccessError,
  requireAdminRouteAccess,
} from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient, getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function handleAdminRouteError(error: unknown) {
  if (error instanceof AdminRouteAccessError && error.code === "missing_token")
    return jsonFailure("admin session is required", 401);
  if (error instanceof AdminRouteAccessError && error.code === "unauthorized")
    return jsonFailure("admin session is invalid", 401);
  if (error instanceof AdminRouteAccessError && error.code === "forbidden")
    return jsonFailure("admin access is required", 403);
  if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
    console.error("[admin-users-route] env_missing", { missingEnvVars: getMissingSupabaseServerEnvVars() });
    return jsonFailure("server is not configured", 500);
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdminRouteAccess(request);

    const client = getSupabaseServerClient();

    const [{ data: profileData, error: profileError }, { data: partnerData }] = await Promise.all([
      client
        .from("profiles")
        .select("id, email, display_name, nickname, phone, sns, role, created_at")
        .order("created_at", { ascending: false }),
      client
        .from("partners")
        .select("email, status"),
    ]);

    if (profileError) {
      console.error("[admin-users-route] profiles_fetch_failed", profileError);
      return jsonFailure("failed to fetch users", 500);
    }

    const partnerMap = new Map<string, string>();
    ((partnerData ?? []) as { email: string; status: string }[])
      .forEach((p) => partnerMap.set(p.email, p.status));

    const users = ((profileData ?? []) as {
      id: string; email: string; display_name: string | null; nickname: string | null;
      phone: string | null; sns: string | null; role: string | null; created_at: string;
    }[]).map((p) => ({
      ...p,
      partnerStatus: (partnerMap.get(p.email) ?? null) as "pending" | "approved" | "rejected" | null,
    }));

    return NextResponse.json({ ok: true, users }, { status: 200 });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error);
    if (adminFailure) return adminFailure;
    console.error("[admin-users-route] unexpected_failure", error);
    return jsonFailure("failed to fetch users", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminRouteAccess(request);

    const body = (await request.json()) as { userId: string; role: string };
    if (!body.userId || !body.role) {
      return jsonFailure("userId and role are required", 400);
    }

    const client = getSupabaseServerClient();
    const { error } = await client
      .from("profiles")
      .update({ role: body.role })
      .eq("id", body.userId);

    if (error) {
      console.error("[admin-users-route] role_update_failed", error);
      return jsonFailure("failed to update role", 500);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const adminFailure = handleAdminRouteError(error);
    if (adminFailure) return adminFailure;
    console.error("[admin-users-route] unexpected_failure", error);
    return jsonFailure("failed to update role", 500);
  }
}
