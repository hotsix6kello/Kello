import { NextResponse } from "next/server";

import { coerceBeautyBookingPayload } from "@/app/explore/beautyBooking.ts";
import {
  AdminRouteAccessError,
  getOptionalAuthenticatedRouteAccess,
  requireAdminRouteAccess,
} from "@/lib/admin/adminRouteAccess.ts";
import {
  BEAUTY_BOOKING_TABLE,
  BeautyBookingStorageError,
  createBeautyBookingRequest,
  listBeautyBookingRequests,
} from "@/lib/bookings/beautyBookingServer.ts";
import { normalizeBeautyBookingAdminListStatus } from "@/lib/bookings/beautyBookingAdmin.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

type BeautyBookingRouteResponse =
  | {
      ok: true;
      bookingId: string;
      status: "requested";
      createdAt: string;
    }
  | {
      ok: false;
      error: string;
    };

type BeautyBookingAdminListRouteResponse =
  | {
      ok: true;
      items: Awaited<ReturnType<typeof listBeautyBookingRequests>>;
    }
  | {
      ok: false;
      error: string;
    };

function jsonFailure(error: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status },
  );
}

function handleAdminRouteError(error: unknown) {
  if (error instanceof AdminRouteAccessError && error.code === "missing_token") {
    return jsonFailure("admin session is required", 401);
  }

  if (error instanceof AdminRouteAccessError && error.code === "unauthorized") {
    return jsonFailure("admin session is invalid", 401);
  }

  if (error instanceof AdminRouteAccessError && error.code === "forbidden") {
    return jsonFailure("admin access is required", 403);
  }

  if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
    console.error("[beauty-booking-route] admin_env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });

    return jsonFailure("booking storage is not ready", 500);
  }

  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdminRouteAccess(request);

    const url = new URL(request.url);
    const status = normalizeBeautyBookingAdminListStatus(url.searchParams.get("status"));
    const beautyCategory = url.searchParams.get("beautyCategory");
    const query = url.searchParams.get("query") ?? url.searchParams.get("q");

    const items = await listBeautyBookingRequests({
      status,
      beautyCategory,
      query,
    });

    return NextResponse.json(
      {
        ok: true,
        items,
      } satisfies BeautyBookingAdminListRouteResponse,
      { status: 200 },
    );
  } catch (error) {
    const adminFailure = handleAdminRouteError(error);

    if (adminFailure) {
      return adminFailure;
    }

    if (error instanceof BeautyBookingStorageError && error.code === "schema_missing") {
      console.error("[beauty-booking-route] list_schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    if (error instanceof BeautyBookingStorageError) {
      console.error("[beauty-booking-route] list_failed", {
        code: error.code,
      });
      return jsonFailure("booking list could not be loaded", 500);
    }

    console.error("[beauty-booking-route] list_unexpected_failure");
    return jsonFailure("booking list could not be loaded", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const payload = coerceBeautyBookingPayload(body);

    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          error: "valid beauty booking payload is required",
        } satisfies BeautyBookingRouteResponse,
        { status: 400 },
      );
    }

    const auth = await getOptionalAuthenticatedRouteAccess(request);
    const result = await createBeautyBookingRequest(payload, auth?.userId ?? null);

    return NextResponse.json(
      {
        ok: true,
        bookingId: result.bookingId,
        status: result.status,
        createdAt: result.createdAt,
      } satisfies BeautyBookingRouteResponse,
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "SyntaxError") {
      return NextResponse.json(
        {
          ok: false,
          error: "request body must be valid JSON",
        } satisfies BeautyBookingRouteResponse,
        { status: 400 },
      );
    }

    if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
      console.error("[beauty-booking-route] storage_env_missing", {
        missingEnvVars: getMissingSupabaseServerEnvVars(),
      });

      return NextResponse.json(
        {
          ok: false,
          error: "booking storage is not ready",
        } satisfies BeautyBookingRouteResponse,
        { status: 500 },
      );
    }

    if (error instanceof BeautyBookingStorageError && error.code === "env_missing") {
      console.error("[beauty-booking-route] storage_env_missing", {
        missingEnvVars: getMissingSupabaseServerEnvVars(),
      });

      return NextResponse.json(
        {
          ok: false,
          error: "booking storage is not ready",
        } satisfies BeautyBookingRouteResponse,
        { status: 500 },
      );
    }

    if (error instanceof AdminRouteAccessError && error.code === "unauthorized") {
      return NextResponse.json(
        {
          ok: false,
          error: "customer session is invalid",
        } satisfies BeautyBookingRouteResponse,
        { status: 401 },
      );
    }

    if (error instanceof BeautyBookingStorageError && error.code === "schema_missing") {
      console.error("[beauty-booking-route] storage_schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "booking storage is not ready",
        } satisfies BeautyBookingRouteResponse,
        { status: 500 },
      );
    }

    if (error instanceof BeautyBookingStorageError) {
      console.error("[beauty-booking-route] storage_insert_failed", {
        code: error.details?.code ?? null,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "booking request failed",
        } satisfies BeautyBookingRouteResponse,
        { status: 500 },
      );
    }

    console.error("[beauty-booking-route] unexpected_failure");
    return jsonFailure("booking request failed", 500);
  }
}
