/** True when listings, pricing, and availability use the shared Postgres store. */
export function isSharedDbEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_SHARED_DB === "1";
}
