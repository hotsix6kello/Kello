import { NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import {
  BEAUTY_BOOKING_TABLE,
  BeautyBookingStorageError,
  listBeautyBookingRequestsForUser,
} from "@/lib/bookings/beautyBookingServer.ts";
import { getMissingSupabaseServerEnvVars } from "@/lib/supabaseServer.ts";

export const runtime = "nodejs";

type BeautyBookingMineRouteResponse =
  | {
      ok: true;
      items: Awaited<ReturnType<typeof listBeautyBookingRequestsForUser>>;
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
    } satisfies BeautyBookingMineRouteResponse,
    { status },
  );
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuthenticatedRouteAccess(request);
    const items = await listBeautyBookingRequestsForUser(userId);

    return NextResponse.json(
      {
        ok: true,
        items,
      } satisfies BeautyBookingMineRouteResponse,
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof AdminRouteAccessError && error.code === "missing_token") {
      return jsonFailure("login is required", 401);
    }

    if (error instanceof AdminRouteAccessError && error.code === "unauthorized") {
      return jsonFailure("customer session is invalid", 401);
    }

    if (error instanceof AdminRouteAccessError && error.code === "env_missing") {
      console.error("[beauty-booking-mine-route] env_missing", {
        missingEnvVars: getMissingSupabaseServerEnvVars(),
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    if (error instanceof BeautyBookingStorageError && error.code === "schema_missing") {
      console.error("[beauty-booking-mine-route] schema_missing", {
        table: BEAUTY_BOOKING_TABLE,
      });
      return jsonFailure("booking storage is not ready", 500);
    }

    if (error instanceof BeautyBookingStorageError) {
      console.error("[beauty-booking-mine-route] read_failed", {
        code: error.code,
      });
      return jsonFailure("my booking list could not be loaded", 500);
    }

    console.error("[beauty-booking-mine-route] unexpected_failure");
    return jsonFailure("my booking list could not be loaded", 500);
  }
}
