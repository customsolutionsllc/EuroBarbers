import type { Metadata } from "next";
import { InquiryForm } from "@/components/inquiry-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "We Are Hiring",
  description:
    "Apply to EuroBarbers by sharing your contact details and resume through our hiring form.",
  alternates: { canonical: "/we-are-hiring" },
  openGraph: { url: "/we-are-hiring", images: [siteConfig.socialImage] }
};

export default function WeAreHiringPage() {
  return (
    <main className="section py-16 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Careers</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">We are Hiring</h1>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        Send your contact details and resume to apply at EuroBarbers.
      </p>

      <div className="mt-10 max-w-3xl">
        <InquiryForm kind="applicant" />
      </div>
    </main>
  );
}
