import type { Metadata } from "next";
import { InquiryForm } from "@/components/inquiry-form";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Send a message to EuroBarbers with your contact details and we will follow up as soon as we can.",
  alternates: { canonical: "/contact-us" },
  openGraph: { url: "/contact-us", images: [siteConfig.socialImage] }
};

export default function ContactUsPage() {
  return (
    <main className="section py-16 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">Contact</p>
      <h1 className="mt-3 font-serif text-5xl font-semibold">Contact Us</h1>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        Use this form to send us a direct message. Include enough detail in your description so we can
        reply clearly.
      </p>

      <div className="mt-10 max-w-3xl">
        <InquiryForm kind="contact" />
      </div>
    </main>
  );
}
