"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_DESCRIPTION_LENGTH, MAX_RESUME_BYTES, RESUME_ACCEPT } from "@/lib/inquiry-config";
import { cn } from "@/lib/utils";

type InquiryKind = "applicant" | "contact";

type InquiryFormProps = {
  kind: InquiryKind;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  description: string;
};

type FieldName = keyof FormValues | "resume";
type FieldErrors = Partial<Record<FieldName, string>>;

type SubmitStatus = "idle" | "submitting" | "success" | "error";

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PHONE_MAX = 30;
const PHONE_PATTERN = "[+0-9\\(\\)\\-.\\s]{7,30}";
const EMPTY_VALUES: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  description: ""
};
const SUPPORTED_EXTENSIONS = RESUME_ACCEPT.split(",").map((value) => value.trim().toLowerCase());

function normalizeFieldErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const normalized: FieldErrors = {};
  const keys: FieldName[] = ["firstName", "lastName", "email", "phone", "description", "resume"];

  for (const key of keys) {
    const fieldError = source[key];
    if (typeof fieldError === "string" && fieldError.trim()) {
      normalized[key] = fieldError;
    }
  }

  return normalized;
}

function toMb(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

export function InquiryForm({ kind }: InquiryFormProps) {
  const isApplicant = kind === "applicant";
  const idPrefix = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resumeSummary, setResumeSummary] = useState("");

  const isSubmitting = status === "submitting";

  useEffect(() => {
    if (status === "success" || status === "error") {
      resultRef.current?.focus();
    }
  }, [status]);

  function clearFieldError(field: FieldName) {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function updateField(field: keyof FormValues, nextValue: string) {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    clearFieldError(field);
  }

  function updateResumeSummary(file: File | null) {
    if (!file) {
      setResumeSummary("");
      return;
    }
    setResumeSummary(`${file.name} (${toMb(file.size)} MB)`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setStatus("submitting");
    setResultMessage("");
    setFieldErrors({});

    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      description: values.description.trim()
    };

    let response: Response;

    try {
      if (isApplicant) {
        const resumeFile = resumeInputRef.current?.files?.[0] ?? null;

        if (!resumeFile) {
          setStatus("error");
          setFieldErrors({ resume: "Please upload your resume." });
          setResultMessage("Please fix the highlighted field and try again.");
          return;
        }

        const lowerName = resumeFile.name.toLowerCase();
        const hasSupportedExtension = SUPPORTED_EXTENSIONS.some((extension) =>
          lowerName.endsWith(extension)
        );

        if (!hasSupportedExtension) {
          setStatus("error");
          setFieldErrors({ resume: "Resume must be a PDF or DOCX file." });
          setResultMessage("Please fix the highlighted field and try again.");
          return;
        }

        if (resumeFile.size <= 0) {
          setStatus("error");
          setFieldErrors({ resume: "Resume file appears to be empty." });
          setResultMessage("Please fix the highlighted field and try again.");
          return;
        }

        if (resumeFile.size > MAX_RESUME_BYTES) {
          setStatus("error");
          setFieldErrors({ resume: `Resume must be ${toMb(MAX_RESUME_BYTES)} MB or smaller.` });
          setResultMessage("Please fix the highlighted field and try again.");
          return;
        }

        const formData = new FormData();
        formData.set("firstName", payload.firstName);
        formData.set("lastName", payload.lastName);
        formData.set("phone", payload.phone);
        formData.set("email", payload.email);
        formData.set("resume", resumeFile);

        response = await fetch("/api/applicants", {
          method: "POST",
          body: formData
        });
      } else {
        response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            phone: payload.phone,
            description: payload.description
          })
        });
      }
    } catch {
      setStatus("error");
      setResultMessage("Network error. Please check your connection and try again.");
      return;
    }

    const body = await response.json().catch(() => null);

    if (response.ok && body?.success === true) {
      setStatus("success");
      setResultMessage(
        isApplicant ? "Application sent successfully." : "Message sent successfully."
      );
      setValues(EMPTY_VALUES);
      setFieldErrors({});
      if (isApplicant) {
        formRef.current?.reset();
        setResumeSummary("");
      }
      return;
    }

    const responseFieldErrors = normalizeFieldErrors(body?.fieldErrors);
    if (Object.keys(responseFieldErrors).length > 0) {
      setFieldErrors(responseFieldErrors);
    }

    setStatus("error");
    setResultMessage(
      typeof body?.error === "string" && body.error
        ? body.error
        : isApplicant
          ? "We couldn't submit your application right now. Please try again."
          : "We couldn't send your message right now. Please try again."
    );
  }

  const firstNameId = `${idPrefix}-first-name`;
  const lastNameId = `${idPrefix}-last-name`;
  const emailId = `${idPrefix}-email`;
  const phoneId = `${idPrefix}-phone`;
  const descriptionId = `${idPrefix}-description`;
  const resumeId = `${idPrefix}-resume`;
  const submitLabel = isApplicant
    ? isSubmitting
      ? "Submitting application..."
      : "Send application"
    : isSubmitting
      ? "Sending message..."
      : "Send message";

  return (
    <form
      ref={formRef}
      method="post"
      onSubmit={submit}
      aria-busy={isSubmitting}
      className="rounded-lg border bg-white p-6 shadow-sm sm:p-8"
    >
      <noscript>
        <p className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Please enable JavaScript to submit this form.
        </p>
      </noscript>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor={firstNameId}>
            First name
          </label>
          <Input
            id={firstNameId}
            name="firstName"
            autoComplete="given-name"
            required
            minLength={1}
            maxLength={NAME_MAX}
            disabled={isSubmitting}
            value={values.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            aria-invalid={Boolean(fieldErrors.firstName)}
            aria-describedby={fieldErrors.firstName ? `${firstNameId}-error` : undefined}
            className={cn(fieldErrors.firstName && "border-red-700 focus-visible:ring-red-500")}
          />
          {fieldErrors.firstName ? (
            <p id={`${firstNameId}-error`} className="mt-2 text-sm text-red-700">
              {fieldErrors.firstName}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor={lastNameId}>
            Last name
          </label>
          <Input
            id={lastNameId}
            name="lastName"
            autoComplete="family-name"
            required
            minLength={1}
            maxLength={NAME_MAX}
            disabled={isSubmitting}
            value={values.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            aria-invalid={Boolean(fieldErrors.lastName)}
            aria-describedby={fieldErrors.lastName ? `${lastNameId}-error` : undefined}
            className={cn(fieldErrors.lastName && "border-red-700 focus-visible:ring-red-500")}
          />
          {fieldErrors.lastName ? (
            <p id={`${lastNameId}-error`} className="mt-2 text-sm text-red-700">
              {fieldErrors.lastName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor={emailId}>
            Email
          </label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={EMAIL_MAX}
            disabled={isSubmitting}
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
            className={cn(fieldErrors.email && "border-red-700 focus-visible:ring-red-500")}
          />
          {fieldErrors.email ? (
            <p id={`${emailId}-error`} className="mt-2 text-sm text-red-700">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor={phoneId}>
            Phone Number
          </label>
          <Input
            id={phoneId}
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            maxLength={PHONE_MAX}
            pattern={PHONE_PATTERN}
            title="Please enter a valid phone number."
            disabled={isSubmitting}
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? `${phoneId}-error` : undefined}
            className={cn(fieldErrors.phone && "border-red-700 focus-visible:ring-red-500")}
          />
          {fieldErrors.phone ? (
            <p id={`${phoneId}-error`} className="mt-2 text-sm text-red-700">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>
      </div>

      {isApplicant ? (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium" htmlFor={resumeId}>
            Upload Resume
          </label>
          <Input
            ref={resumeInputRef}
            id={resumeId}
            name="resume"
            type="file"
            accept={RESUME_ACCEPT}
            required
            disabled={isSubmitting}
            onChange={(event) => {
              clearFieldError("resume");
              updateResumeSummary(event.target.files?.[0] ?? null);
            }}
            aria-invalid={Boolean(fieldErrors.resume)}
            aria-describedby={
              fieldErrors.resume ? `${resumeId}-hint ${resumeId}-error` : `${resumeId}-hint`
            }
            className={cn(fieldErrors.resume && "border-red-700 focus-visible:ring-red-500")}
          />
          <p id={`${resumeId}-hint`} className="mt-2 text-xs text-muted-foreground">
            Accepted formats: PDF or DOCX. Maximum size: {toMb(MAX_RESUME_BYTES)} MB.
          </p>
          {resumeSummary ? <p className="mt-1 break-all text-xs text-muted-foreground">Selected: {resumeSummary}</p> : null}
          {fieldErrors.resume ? (
            <p id={`${resumeId}-error`} className="mt-2 text-sm text-red-700">
              {fieldErrors.resume}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium" htmlFor={descriptionId}>
            Description
          </label>
          <textarea
            id={descriptionId}
            name="description"
            autoComplete="on"
            required
            minLength={1}
            maxLength={MAX_DESCRIPTION_LENGTH}
            disabled={isSubmitting}
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description ? `${descriptionId}-hint ${descriptionId}-error` : `${descriptionId}-hint`
            }
            className={cn(
              "flex min-h-36 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              fieldErrors.description && "border-red-700 focus-visible:ring-red-500"
            )}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p id={`${descriptionId}-hint`}>Please include enough detail so we can respond clearly.</p>
            <p>
              {values.description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>
          {fieldErrors.description ? (
            <p id={`${descriptionId}-error`} className="mt-2 text-sm text-red-700">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">All fields are required.</p>
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>

      {status !== "idle" ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
          className={cn(
            "mt-5 rounded-md border px-4 py-3 text-sm",
            status === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            status === "error" && "border-red-200 bg-red-50 text-red-800",
            status === "submitting" && "border-muted bg-muted/40 text-muted-foreground"
          )}
        >
          {status === "submitting" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Sending your request...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
              {resultMessage}
            </span>
          )}
        </p>
      ) : null}
    </form>
  );
}
