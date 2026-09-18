import {
  looksLikeServerBookingId,
  upsertGuestBooking,
  type GuestBookingSummary,
} from "@/lib/guest/guest-bookings-data";
import { cancelHostBooking } from "@/lib/host/host-booking-data";
import {
  evaluateCancellationRefund,
  refundStatusFromBand,
} from "@/lib/booking/policies";
import { BASE_CURRENCY } from "@/lib/currency";

function parseTotalPrice(booking: GuestBookingSummary): number {
  if (typeof booking.totalPrice === "number" && Number.isFinite(booking.totalPrice)) {
    return booking.totalPrice;
  }
  return Number(booking.total.replace(/[^\d.]/g, "")) || 0;
}

function paymentStatusForPreview(booking: GuestBookingSummary): string {
  const raw = (booking.paymentStatus || "").toLowerCase();
  if (raw.includes("paid") && !raw.includes("unpaid")) return "paid";
  return "unpaid";
}

export function previewGuestCancelRefund(booking: GuestBookingSummary) {
  return evaluateCancellationRefund({
    policyId: booking.policyId || "flexible",
    checkIn: booking.checkIn,
    totalPrice: parseTotalPrice(booking),
    paymentStatus: paymentStatusForPreview(booking),
  });
}

export async function cancelGuestBooking(input: {
  booking: GuestBookingSummary;
  reason: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { booking, reason } = input;
  const preview = previewGuestCancelRefund(booking);

  if (looksLikeServerBookingId(booking.id)) {
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, actor: "guest" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: payload.error || "Could not cancel booking" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not cancel booking" };
    }
  }

  upsertGuestBooking({ ...booking, status: "cancelled" });
  cancelHostBooking(booking.id, {
    reason,
    refundStatus: refundStatusFromBand(preview.band),
    refundAmount:
      preview.refundAmount > 0
        ? `${BASE_CURRENCY} ${preview.refundAmount.toLocaleString()}`
        : undefined,
  });

  return { ok: true };
}
