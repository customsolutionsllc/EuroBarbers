import { NextResponse } from "next/server";
import { z } from "zod";
import { sendHiringInquiry } from "@/lib/email";
import { readMultipartRequest } from "@/lib/http";
import { MAX_RESUME_BYTES } from "@/lib/inquiry-config";

const MAX_MULTIPART_BYTES = 4 * 1024 * 1024;
const PHONE_PATTERN = /^\+?[0-9().\s-]+$/;

type FieldErrors = Record<string, string>;

type ResumeAttachment = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

const ApplicantTextSchema = z
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
    phone: z
      .string({ required_error: "Phone Number is required." })
      .trim()
      .min(1, "Phone Number is required.")
      .max(30, "Phone Number must be 30 characters or fewer.")
      .regex(PHONE_PATTERN, "Enter a valid phone number."),
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .min(1, "Email is required.")
      .max(254, "Email must be 254 characters or fewer.")
      .email("Enter a valid email address.")
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

function stringField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function extensionForResume(filename: string): ".pdf" | ".docx" | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".pdf")) return ".pdf";
  if (lower.endsWith(".docx")) return ".docx";
  return null;
}

function sanitizeAttachmentFilename(filename: string, extension: ".pdf" | ".docx") {
  const basename = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]*$/, "");
  const safeBase = basename
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 80);

  return `${safeBase || "resume"}${extension}`;
}

function hasPdfSignature(bytes: Uint8Array) {
  return (
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function hasDocxSignature(bytes: Uint8Array) {
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    return false;
  }

  return (
    (bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06) ||
    (bytes[2] === 0x07 && bytes[3] === 0x08)
  );
}

async function validateResume(formData: FormData): Promise<{ attachment?: ResumeAttachment; error?: string }> {
  const resume = formData.get("resume");
  if (!(resume instanceof File)) {
    return { error: "Upload Resume is required." };
  }

  if (resume.size <= 0) {
    return { error: "Resume must not be empty." };
  }

  if (resume.size > MAX_RESUME_BYTES) {
    return { error: "Resume must be 3MB or smaller." };
  }

  const extension = extensionForResume(resume.name);
  if (!extension) {
    return { error: "Resume must be a PDF or DOCX file." };
  }

  const content = new Uint8Array(await resume.arrayBuffer());
  if (content.byteLength <= 0) {
    return { error: "Resume must not be empty." };
  }

  if (extension === ".pdf" && !hasPdfSignature(content)) {
    return { error: "Resume content must match a PDF file." };
  }

  if (extension === ".docx" && !hasDocxSignature(content)) {
    return { error: "Resume content must match a DOCX file." };
  }

  return {
    attachment: {
      filename: sanitizeAttachmentFilename(resume.name, extension),
      contentType:
        extension === ".pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content
    }
  };
}

export async function POST(request: Request) {
  const body = await readMultipartRequest(request, MAX_MULTIPART_BYTES);
  if (body.response) {
    return body.response;
  }

  const parsed = ApplicantTextSchema.safeParse({
    firstName: stringField(body.data, "firstName"),
    lastName: stringField(body.data, "lastName"),
    phone: stringField(body.data, "phone"),
    email: stringField(body.data, "email")
  });

  const fieldErrors: FieldErrors = parsed.success ? {} : collectFieldErrors(parsed.error);

  const resume = await validateResume(body.data);
  if (!resume.attachment) {
    fieldErrors.resume = resume.error ?? "Resume is invalid.";
  }

  if (!parsed.success || !resume.attachment) {
    return NextResponse.json(
      {
        error: "Invalid applicant details.",
        fieldErrors
      },
      { status: 400 }
    );
  }

  const sent = await sendHiringInquiry({
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    resume: resume.attachment
  });

  if (!sent.ok) {
    if (sent.reason === "MISSING_CONFIG") {
      return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
    }

    return NextResponse.json({ error: "Failed to send your application. Please try again later." }, { status: 502 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
