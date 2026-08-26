import { prisma } from "@/lib/prisma";
import { sendEmail } from "./send";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function formatStayDates(checkIn: Date, checkOut: Date) {
  const fmt = (d: Date) =>
    d.toISOString().slice(0, 10);
  return `${fmt(checkIn)} → ${fmt(checkOut)}`;
}

export async function deliverWelcomeEmail(input: {
  email: string;
  fullName?: string;
}) {
  const name = input.fullName?.trim() || "there";
  return sendEmail({
    to: input.email,
    subject: "Welcome to Farm Stays",
    text: `Hi ${name},\n\nYour account is ready. Browse stays at ${appUrl()}/listings\n`,
    html: `<p>Hi ${name},</p><p>Your account is ready.</p><p><a href="${appUrl()}/listings">Browse stays</a></p>`,
  });
}

export async function deliverBookingConfirmedEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true } },
      guest: { select: { email: true, fullName: true } },
    },
  });
  if (!booking?.guest?.email) return { sent: false };

  const title = booking.listing.title;
  const dates = formatStayDates(booking.checkIn, booking.checkOut ?? booking.checkIn);
  const total = `${booking.paymentStatus === "paid" ? "Paid" : "Due"} · ${booking.totalPrice}`;
  const tripsUrl = `${appUrl()}/account?tab=bookings`;
  const name = booking.guest.fullName || "there";

  return sendEmail({
    to: booking.guest.email,
    subject: `Your stay is confirmed · ${title}`,
    text: `Hi ${name},\n\nYour booking at ${title} is confirmed.\n${dates}\n${total}\n\nView it: ${tripsUrl}\n`,
    html: `<p>Hi ${name},</p><p>Your booking at <strong>${title}</strong> is confirmed.</p><p>${dates}<br/>${total}</p><p><a href="${tripsUrl}">View your trips</a></p>`,
  });
}
