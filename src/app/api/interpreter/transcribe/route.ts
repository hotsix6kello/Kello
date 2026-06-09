import { NextResponse } from "next/server";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";
import { transcribeInterpreterAudio } from "@/lib/interpreter/transcriber";

export const runtime = "nodejs";

function jsonFailure(error: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    { status },
  );
}

async function readMultipartFormData(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return {
      errorResponse: jsonFailure("content-type must be multipart/form-data", 415),
    };
  }

  try {
    return {
      formData: await request.formData(),
    };
  } catch {
    return {
      errorResponse: jsonFailure("request body must be valid multipart/form-data", 400),
    };
  }
}

async function methodNotAllowed() {
  return jsonFailure("method not allowed", 405);
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return jsonFailure("login is required", 401);
    }
    throw error;
  }

  const multipart = await readMultipartFormData(request);
  if (multipart.errorResponse) {
    return multipart.errorResponse;
  }

  try {
    const audio = multipart.formData.get("audio");
    const language = multipart.formData.get("language");

    if (!(audio instanceof File)) {
      return jsonFailure("audio file is required", 400);
    }

    if (audio.size === 0) {
      return jsonFailure("audio file must not be empty", 400);
    }

    if (typeof language !== "string" || language.trim().length === 0) {
      return jsonFailure("language is required", 400);
    }

    const result = await transcribeInterpreterAudio({
      audioFile: audio,
      language: language.trim(),
    });

    return NextResponse.json(
      {
        ok: true,
        text: result.text,
        provider: result.provider,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[interpreter/transcribe] STT failed:", error);
    return jsonFailure(error instanceof Error ? error.message : "transcription_failed", 500);
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
