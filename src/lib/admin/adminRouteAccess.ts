import {
  getMissingSupabaseServerEnvVars,
  getSupabaseServerClient,
  hasSupabaseServerAccess,
} from "@/lib/supabaseServer.ts";

export type AdminRouteAccessErrorCode = "env_missing" | "missing_token" | "unauthorized" | "forbidden";

export class AdminRouteAccessError extends Error {
  constructor(
    public readonly code: AdminRouteAccessErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = "AdminRouteAccessError";
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireAuthenticatedRouteAccess(request: Request) {
  if (!hasSupabaseServerAccess()) {
    throw new AdminRouteAccessError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const token = getBearerToken(request);

  if (!token) {
    throw new AdminRouteAccessError("missing_token");
  }

  const client = getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(token);

  if (authError || !user) {
    throw new AdminRouteAccessError("unauthorized");
  }

  return {
    userId: user.id,
  };
}

export async function getOptionalAuthenticatedRouteAccess(request: Request) {
  if (!hasSupabaseServerAccess()) {
    throw new AdminRouteAccessError("env_missing", {
      missingEnvVars: getMissingSupabaseServerEnvVars(),
    });
  }

  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const client = getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(token);

  if (authError || !user) {
    throw new AdminRouteAccessError("unauthorized");
  }

  return {
    userId: user.id,
  };
}

export async function requireAdminRouteAccess(request: Request) {
  const { userId } = await requireAuthenticatedRouteAccess(request);

  const client = getSupabaseServerClient();

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile?.is_admin) {
    throw new AdminRouteAccessError("forbidden");
  }

  return {
    userId,
  };
}
