import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { siteConfig, fullAddress } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "SMS / Messaging Policy",
  description: `Text messaging (SMS) policy for ${siteConfig.name}.`
};

export default function SmsPolicyPage() {
  return (
    <LegalPage title="SMS / Messaging Policy" updated="June 22, 2026">
      <p>
        This SMS Policy explains how {siteConfig.name} uses text messaging. This page is a starting
        template and should be reviewed by legal counsel before launch.
      </p>

      <h2>What messages we send</h2>
      <ul>
        <li>
          <strong>Queue notifications.</strong> If you join our walk-in queue and opt in, we send a
          one-time text when you are next in line.
        </li>
        <li>
          <strong>Marketing (optional).</strong> Only if you separately opt in. Marketing messages
          are never sent by default.
        </li>
      </ul>

      <h2>Consent</h2>
      <p>
        By providing your mobile number and checking the consent box, you agree to receive text
        messages from {siteConfig.name} at that number. Consent is not a condition of any purchase
        or service.
      </p>

      <h2>Message frequency and cost</h2>
      <p>
        Message frequency varies based on your activity (for example, queue notifications). Message
        and data rates may apply.
      </p>

      <h2>Opting out</h2>
      <p>
        You can opt out at any time by replying <strong>STOP</strong> to any message. You may reply{" "}
        <strong>HELP</strong> for assistance, or contact us at{" "}
        <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>.
      </p>

      <h2>Privacy</h2>
      <p>
        We do not sell your phone number. See our <a href="/privacy">Privacy Policy</a> for how we
        handle your information.
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
