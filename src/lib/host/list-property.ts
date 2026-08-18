import { canManageListings } from "@/lib/auth/roles";
import type { GuestUser } from "@/lib/auth/types";

export const LIST_PROPERTY_PATH = "/host/listings/new";

export const LIST_PROPERTY_SIGNUP_HREF = `/host/signup?next=${encodeURIComponent(LIST_PROPERTY_PATH)}`;

export function getListPropertyHref(user: GuestUser | null): string {
  if (user && canManageListings(user.roles)) {
    return LIST_PROPERTY_PATH;
  }
  return LIST_PROPERTY_SIGNUP_HREF;
}
