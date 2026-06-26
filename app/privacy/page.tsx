import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteConfig.name}.`
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 22, 2026">
      <p>
        This Privacy Policy explains how {siteConfig.name} collects, uses, and protects your
        information when you use our website, online booking, and walk-in check-in. This page is a
        starting template and should be reviewed by legal counsel before launch.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Your name and phone number when you book or check in.</li>
        <li>Your email address, only if you choose to provide one.</li>
        <li>Appointment, visit, and queue history for your service.</li>
        <li>Your consent preferences for text messages and marketing.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To schedule appointments and manage the walk-in queue.</li>
        <li>To send transactional notifications (such as a &ldquo;you are next&rdquo; text) when you opt in.</li>
        <li>To send appointment confirmation emails when you provide an email address.</li>
        <li>To understand visit trends and improve our service.</li>
      </ul>

      <h2>Text messages</h2>
      <p>
        We only send text messages to customers who have provided consent. See our{" "}
        <a href="/sms-policy">SMS Policy</a> for details, including how to opt out.
      </p>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We share data only with service providers that
        help us operate (for example, our scheduling database, email provider, and SMS provider),
        and only as needed to deliver the Services.
      </p>

      <h2>Data retention and security</h2>
      <p>
        We retain your information for as long as needed to provide the Services and meet legal
        obligations, and we use reasonable safeguards to protect it.
      </p>

      <h2>Your choices</h2>
      <p>
        You may request access to or deletion of your information, and you may opt out of marketing
        communications at any time, by contacting us.
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
