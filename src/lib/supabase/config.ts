export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("[project-ref]")
  );
}

/** Production must have Supabase — never fall back to client demo auth. */
export function isAuthMisconfiguredInProduction(): boolean {
  return process.env.NODE_ENV === "production" && !isSupabaseConfigured();
}
