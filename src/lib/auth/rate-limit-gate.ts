/**
 * Server-side auth rate limit gate. Call before Supabase sign-in/sign-up on the client.
 */
export async function gateAuthRateLimit(email: string): Promise<{ error?: string }> {
  try {
    const res = await fetch("/api/auth/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { error: data.error ?? "Too many requests. Please try again later." };
    }
    return {};
  } catch {
    // Do not block login if the gate is unreachable (degraded mode)
    return {};
  }
}
