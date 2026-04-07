import { NextRequest, NextResponse } from "next/server";
import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { getSupabaseServerClient } from "@/lib/supabaseServer.ts";
import { normalizeInternationalPhoneInput, sanitizeSnsInput } from "@/lib/settings/contact";

export const runtime = "nodejs";

type ContactField = "sns" | "phone";

interface ProfileRecordResponse {
  id: string;
  role: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_path?: string | null;
  created_at: string | null;
  phone: string | null;
  sns?: string | null;
}

function jsonFailure(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function pickNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toProfileRecordResponse(record: Record<string, unknown> | null): ProfileRecordResponse | null {
  if (!record || typeof record.id !== "string") {
    return null;
  }

  const profile: ProfileRecordResponse = {
    id: record.id,
    role: pickNullableString(record.role),
    display_name: pickNullableString(record.display_name),
    avatar_url: pickNullableString(record.avatar_url),
    created_at: pickNullableString(record.created_at),
    phone: pickNullableString(record.phone),
    sns: pickNullableString(record.sns),
  };

  const avatarPath = pickNullableString(record.avatar_path);
  if (avatarPath) {
    profile.avatar_path = avatarPath;
  }

  return profile;
}

function toContactSnapshot(record: Record<string, unknown> | null) {
  return {
    phone: pickNullableString(record?.phone) ?? "",
    sns: pickNullableString(record?.sns) ?? "",
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const body = (await request.json()) as {
      field?: ContactField;
      value?: unknown;
    };

    if (body.field !== "sns" && body.field !== "phone") {
      return jsonFailure("invalid_field", 400);
    }

    const rawValue = typeof body.value === "string" ? body.value : "";
    const updates =
      body.field === "sns"
        ? { sns: sanitizeSnsInput(rawValue) }
        : (() => {
            if (rawValue.trim() && !normalizeInternationalPhoneInput(rawValue)) {
              return null;
            }

            return {
              phone: normalizeInternationalPhoneInput(rawValue),
            };
          })();

    if (!updates) {
      return jsonFailure("invalid_phone", 400);
    }

    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "42703") {
        return jsonFailure("contact_schema_missing", 409);
      }

      throw error;
    }

    if (!data) {
      return jsonFailure("profile_not_found", 404);
    }

    return NextResponse.json({
      ok: true,
      contact: toContactSnapshot(data as Record<string, unknown>),
      profile: toProfileRecordResponse(data as Record<string, unknown>),
    });
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return jsonFailure("unauthorized", error.code === "forbidden" ? 403 : 401);
    }

    return jsonFailure("failed_to_update_contact", 500);
  }
}
