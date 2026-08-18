import { GuestBookingRouteGuard } from "@/components/auth/guest-booking-route-guard";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <GuestBookingRouteGuard>{children}</GuestBookingRouteGuard>;
}
