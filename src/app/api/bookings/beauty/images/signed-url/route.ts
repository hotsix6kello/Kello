import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import {
  BeautyBookingStorageError,
  getBookingImageSignedUrls,
} from "@/lib/bookings/beautyBookingServer.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/beauty/images/signed-url?bookingId={id}
 *
 * booking bucket이 private이므로 이미지 접근은 이 API를 통한 signed URL로만 가능하다.
 * 권한: 예약자 본인 또는 admin/super_admin
 * 비로그인 사용자는 401 반환.
 */
export async function GET(request: NextRequest) {
  // 1. 인증 필수 (비로그인 불허)
  const auth = await getOptionalAuthenticatedRouteAccess(request);
  if (!auth?.userId) {
    return NextResponse.json(
      { ok: false, error: "authentication required" },
      { status: 401 },
    );
  }

  // 2. bookingId 파라미터 확인
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json(
      { ok: false, error: "bookingId is required" },
      { status: 400 },
    );
  }

  try {
    // 3. 권한 확인 + signed URL 발급 (beautyBookingServer 헬퍼)
    const results = await getBookingImageSignedUrls(bookingId, auth.userId);

    return NextResponse.json(
      { ok: true, images: results },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BeautyBookingStorageError && error.code === "not_found") {
      return NextResponse.json(
        { ok: false, error: "booking not found" },
        { status: 404 },
      );
    }

    if (error instanceof BeautyBookingStorageError && error.code === "forbidden_owner") {
      return NextResponse.json(
        { ok: false, error: "access denied" },
        { status: 403 },
      );
    }

    if (error instanceof BeautyBookingStorageError && error.code === "env_missing") {
      console.error("[booking-images-signed-url] env_missing");
      return NextResponse.json(
        { ok: false, error: "storage not ready" },
        { status: 500 },
      );
    }

    console.error("[booking-images-signed-url] unexpected error", error);
    return NextResponse.json(
      { ok: false, error: "failed to generate signed URLs" },
      { status: 500 },
    );
  }
}
