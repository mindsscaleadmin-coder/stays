import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Returns the Supabase user from httpOnly cookies without a DB round-trip.
 * Access token is validated by Supabase; use for API authz on stateless app instances.
 */
export async function getSessionUser() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Sign in required");
  return user;
}

export function authErrorResponse(error: AuthError, requestId?: string) {
  return Response.json(
    { error: error.message },
    {
      status: error.status,
      headers: requestId ? { "x-request-id": requestId } : undefined,
    }
  );
}
