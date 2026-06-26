import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${siteConfig.name}.`
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 22, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the {siteConfig.name}{" "}
        website and our online booking and walk-in check-in services (the
        &ldquo;Services&rdquo;). By using the Services, you agree to these Terms. This page is a
        starting template and should be reviewed by legal counsel before launch.
      </p>

      <h2>Appointments and check-ins</h2>
      <p>
        When you book an appointment or join the walk-in queue, you agree to provide accurate
        information. Appointment times are confirmed subject to availability, and walk-in service is
        provided on a first-come, first-served basis by queue position.
      </p>

      <h2>Cancellations and reschedules</h2>
      <p>
        To cancel or reschedule an appointment, please call us at{" "}
        <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>. Online self-cancellation is not
        currently offered.
      </p>

      <h2>Pricing</h2>
      <p>
        Prices shown are estimates and may vary based on the service performed. Final pricing is
        confirmed at the shop.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not misuse, disrupt, or attempt to gain unauthorized access to the Services.</li>
        <li>Do not submit false information or impersonate another person.</li>
      </ul>

      <h2>Limitation of liability</h2>
      <p>
        The Services are provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest
        extent permitted by law, {siteConfig.name} is not liable for indirect or incidental damages
        arising from your use of the Services.
      </p>

      <h2>Contact</h2>
      <p>
        {siteConfig.name}
        <br />
        {fullAddress()}
        <br />
        <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
      </p>
    </LegalPage>
  );
}
