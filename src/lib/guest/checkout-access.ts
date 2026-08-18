import { canBook } from "@/lib/auth/roles";
import type { GuestUser } from "@/lib/auth/types";

export function getGuestLoginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

export function getGuestSignupHref(next: string): string {
  return `/signup?next=${encodeURIComponent(next)}`;
}

export function getCheckoutHref(user: GuestUser | null, checkoutPath: string): string {
  if (user && canBook(user.roles)) {
    return checkoutPath;
  }
  return getGuestLoginHref(checkoutPath);
}
