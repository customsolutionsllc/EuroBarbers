import "server-only";
import { Resend } from "resend";

type BookingEmail = {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]!);
}

export async function sendBookingConfirmation(booking: BookingEmail) {
  if (!process.env.RESEND_API_KEY || !booking.to) {
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const when = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/New_York"
  }).format(new Date(booking.startsAt));

  await resend.emails.send({
    from: process.env.BOOKING_CONFIRMATION_FROM || "EuroBarbers <bookings@example.com>",
    to: booking.to,
    subject: "Your EuroBarbers appointment is confirmed",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#151518">
        <h1>Your appointment is confirmed</h1>
        <p>Hi ${escapeHtml(booking.customerName)},</p>
        <p>Your ${escapeHtml(booking.serviceName)} with ${escapeHtml(booking.barberName)} is booked for <strong>${escapeHtml(when)}</strong>.</p>
        <p>EuroBarbers<br/>7370 Sawmill Road, Columbus, Ohio</p>
      </div>
    `
  });
}
