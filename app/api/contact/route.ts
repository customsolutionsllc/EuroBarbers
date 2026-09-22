import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactInquiry } from "@/lib/email";
import { readJsonRequest } from "@/lib/http";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/inquiry-config";

const PHONE_PATTERN = /^\+?[0-9().\s-]+$/;

type FieldErrors = Record<string, string>;

const ContactSchema = z
  .object({
    firstName: z
      .string({ required_error: "First name is required." })
      .trim()
      .min(1, "First name is required.")
      .max(100, "First name must be 100 characters or fewer."),
    lastName: z
      .string({ required_error: "Last name is required." })
      .trim()
      .min(1, "Last name is required.")
      .max(100, "Last name must be 100 characters or fewer."),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .min(1, "Email is required.")
      .max(254, "Email must be 254 characters or fewer.")
      .email("Enter a valid email address."),
    phone: z
      .string({ required_error: "Phone Number is required." })
      .trim()
      .min(1, "Phone Number is required.")
      .max(30, "Phone Number must be 30 characters or fewer.")
      .regex(PHONE_PATTERN, "Enter a valid phone number."),
    description: z
      .string({ required_error: "Description is required." })
      .trim()
      .min(1, "Description is required.")
      .max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`)
  })
  .superRefine((value, context) => {
    const digits = value.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone Number must contain 7 to 15 digits."
      });
    }
  });

function collectFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

export async function POST(request: Request) {
  const body = await readJsonRequest(request);
  if (body.response) {
    return body.response;
  }

  const parsed = ContactSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid contact details.",
        fieldErrors: collectFieldErrors(parsed.error)
      },
      { status: 400 }
    );
  }

  const sent = await sendContactInquiry(parsed.data);
  if (!sent.ok) {
    if (sent.reason === "MISSING_CONFIG") {
      return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
    }

    return NextResponse.json({ error: "Failed to send your message. Please try again later." }, { status: 502 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
