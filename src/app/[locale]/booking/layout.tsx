import type { Metadata } from "next";
import { GuestBookingRouteGuard } from "@/components/auth/guest-booking-route-guard";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = NOINDEX_METADATA;

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <GuestBookingRouteGuard>{children}</GuestBookingRouteGuard>;
}
