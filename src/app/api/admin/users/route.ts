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

    // auth.users에서 이메일 목록 가져오기 (profiles 테이블에 email 컬럼 없음)
    const { data: authData, error: authError } = await client.auth.admin.listUsers({ perPage: 1000 });
    if (authError) {
      console.error("[admin-users-route] auth_list_failed", JSON.stringify(authError));
      return jsonFailure(`auth error: ${authError.message}`, 500);
    }

    const emailMap = new Map<string, string>();
    for (const u of authData.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // profiles에서 가입자 정보 가져오기 (email 제외)
    const [{ data: profileData, error: profileError }, { data: partnerData }] = await Promise.all([
      client
        .from("profiles")
        .select("id, display_name, nickname, phone, sns, role, created_at")
        .order("created_at", { ascending: false }),
      client
        .from("partners")
        .select("email, status"),
    ]);

    if (profileError) {
      // display_name / phone / sns 컬럼이 없으면 최소 컬럼으로 재시도
      console.warn("[admin-users-route] profiles_fetch_failed, retrying minimal", JSON.stringify(profileError));
      const { data: fallbackData, error: fallbackError } = await client
        .from("profiles")
        .select("id, nickname, role, created_at")
        .order("created_at", { ascending: false });

      if (fallbackError) {
        console.error("[admin-users-route] fallback_fetch_failed", JSON.stringify(fallbackError));
        return jsonFailure(`DB error: ${fallbackError.message}`, 500);
      }

      const users = ((fallbackData ?? []) as {
        id: string; nickname: string | null; role: string | null; created_at: string;
      }[]).map((p) => ({
        ...p,
        email: emailMap.get(p.id) ?? "",
        display_name: null,
        phone: null,
        sns: null,
        partnerStatus: null as "pending" | "approved" | "rejected" | null,
      }));
      return NextResponse.json({ ok: true, users }, { status: 200 });
    }

    // partners 테이블은 이메일 기준으로 상태 매핑
    const partnerEmailMap = new Map<string, string>();
    ((partnerData ?? []) as { email: string; status: string }[])
      .forEach((p) => partnerEmailMap.set(p.email, p.status));

    const users = ((profileData ?? []) as {
      id: string; display_name: string | null; nickname: string | null;
      phone: string | null; sns: string | null; role: string | null; created_at: string;
    }[]).map((p) => {
      const email = emailMap.get(p.id) ?? "";
      return {
        ...p,
        email,
        partnerStatus: (partnerEmailMap.get(email) ?? null) as "pending" | "approved" | "rejected" | null,
      };
    });

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
