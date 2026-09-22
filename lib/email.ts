import "server-only";
import { Resend, type Attachment } from "resend";

type BookingEmail = {
  to: string;
  customerName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
};

type InquiryEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "MISSING_CONFIG" | "SEND_FAILED" };

type HiringInquiryEmail = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  resume: {
    filename: string;
    contentType: string;
    content: Uint8Array;
  };
};

type ContactInquiryEmail = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  description: string;
};

const INQUIRY_RECIPIENT = "Info@Eurobarbers.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]!);
}

function getInquiryTransport() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_CONFIRMATION_FROM;
  if (!apiKey || !from) {
    return null;
  }

  return {
    resend: new Resend(apiKey),
    from
  };
}

async function sendInquiryEmail(options: {
  subject: "New Applicant" | "New message";
  text: string;
  replyTo: string;
  attachments?: Attachment[];
}): Promise<InquiryEmailResult> {
  const transport = getInquiryTransport();
  if (!transport) {
    return { ok: false, reason: "MISSING_CONFIG" };
  }

  try {
    const sent = await transport.resend.emails.send({
      from: transport.from,
      to: INQUIRY_RECIPIENT,
      subject: options.subject,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments
    });

    if (sent.error || !sent.data?.id) {
      return { ok: false, reason: "SEND_FAILED" };
    }

    return { ok: true, id: sent.data.id };
  } catch {
    return { ok: false, reason: "SEND_FAILED" };
  }
}

export async function sendHiringInquiry(input: HiringInquiryEmail): Promise<InquiryEmailResult> {
  return sendInquiryEmail({
    subject: "New Applicant",
    replyTo: input.email,
    text: [
      "New applicant submitted via eurobarbers.com",
      "",
      `First name: ${input.firstName}`,
      `Last name: ${input.lastName}`,
      `Phone: ${input.phone}`,
      `Email: ${input.email}`
    ].join("\n"),
    attachments: [
      {
        filename: input.resume.filename,
        contentType: input.resume.contentType,
        content: Buffer.from(input.resume.content.buffer, input.resume.content.byteOffset, input.resume.content.byteLength)
      }
    ]
  });
}

export async function sendContactInquiry(input: ContactInquiryEmail): Promise<InquiryEmailResult> {
  return sendInquiryEmail({
    subject: "New message",
    replyTo: input.email,
    text: [
      "New contact-us message submitted via eurobarbers.com",
      "",
      `First name: ${input.firstName}`,
      `Last name: ${input.lastName}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
      "",
      "Description:",
      input.description
    ].join("\n")
  });
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
