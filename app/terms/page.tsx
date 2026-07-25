import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions | Barlow Labs",
  description:
    "The terms governing your use of Barlow Labs websites, applications, AI features, and text messaging programs.",
};

const EFFECTIVE_DATE = "July 25, 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative pt-20 pb-10 sm:pt-28 sm:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[320px] max-w-3xl bg-gradient-to-b from-primary/15 via-accent/5 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">Legal</p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Terms &amp;{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Conditions
          </span>
        </h1>
        <p className="mt-6 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>
      </section>

      <article className="pb-24 space-y-10 text-foreground/90 leading-relaxed">
        <section className="space-y-4">
          <p>
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the
            websites, applications, AI-powered features, and text messaging programs provided by Barlow
            Labs (&ldquo;Barlow Labs,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            (collectively, the &ldquo;Services&rdquo;). By accessing or using the Services, you agree to
            be bound by these Terms. If you do not agree, do not use the Services.
          </p>
        </section>

        <Section id="eligibility" title="1. Eligibility">
          <p>
            You must be at least 13 years old (or the age of majority in your jurisdiction where
            required) to use the Services. By using the Services, you represent that you meet these
            requirements and that any information you provide is accurate and current.
          </p>
        </Section>

        <Section id="use-of-services" title="2. Use of the Services">
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Use the Services in any unlawful manner or for any unlawful purpose;</li>
            <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Services;</li>
            <li>Reverse engineer, scrape, or misuse any part of the Services; or</li>
            <li>Infringe the intellectual property or other rights of Barlow Labs or any third party.</li>
          </ul>
        </Section>

        <Section id="ai-features" title="3. AI-Powered Features">
          <p>
            Certain Services use artificial intelligence to generate responses, recommendations, or
            other content. AI-generated output may be inaccurate, incomplete, or otherwise unreliable
            and is provided for informational purposes only. It does not constitute professional
            advice, and you are responsible for evaluating and independently verifying any output
            before relying on it. You are responsible for the inputs you submit and agree not to submit
            content that is unlawful or that violates the rights of others.
          </p>
        </Section>

        <Section id="text-messaging" title="4. Text Messaging Program">
          <p>
            If you provide your mobile phone number and opt into a Barlow Labs text messaging program,
            you agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Consent.</strong> By opting in, you consent to receive text messages from or on
              behalf of Barlow Labs at the mobile number you provide. Consent is not a condition of
              purchasing any goods or services.
            </li>
            <li>
              <strong>Message frequency.</strong> Message frequency varies based on your interactions
              with us. You should generally expect up to a few messages per week in connection with a
              program you have joined; the exact frequency depends on the program and your activity.
            </li>
            <li>
              <strong>Message and data rates may apply.</strong> Standard message and data rates from
              your mobile carrier may apply to messages you send and receive. Barlow Labs is not
              responsible for charges imposed by your wireless carrier.
            </li>
            <li>
              <strong>We do not share your mobile number.</strong> We will not sell, rent, or share your
              mobile phone number or SMS opt-in information with third parties or affiliates for their
              own marketing purposes. See our{" "}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>{" "}
              for details.
            </li>
            <li>
              <strong>Opt out.</strong> Reply <strong>STOP</strong> to any message to cancel. Reply{" "}
              <strong>HELP</strong> for help. Carriers are not liable for delayed or undelivered
              messages.
            </li>
          </ul>
        </Section>

        <Section id="intellectual-property" title="5. Intellectual Property">
          <p>
            The Services and all associated content, trademarks, and software are owned by Barlow Labs
            or its licensors and are protected by applicable laws. We grant you a limited,
            non-exclusive, non-transferable, revocable license to use the Services for their intended
            purpose. All rights not expressly granted are reserved.
          </p>
        </Section>

        <Section id="disclaimers" title="6. Disclaimers">
          <p>
            THE SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES
            WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
        </Section>

        <Section id="limitation-of-liability" title="7. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, BARLOW LABS WILL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA,
            ARISING FROM OR RELATED TO YOUR USE OF THE SERVICES.
          </p>
        </Section>

        <Section id="indemnification" title="8. Indemnification">
          <p>
            You agree to indemnify and hold harmless Barlow Labs and its officers, employees, and agents
            from any claims, liabilities, damages, and expenses arising out of your use of the Services
            or your violation of these Terms.
          </p>
        </Section>

        <Section id="governing-law" title="9. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Washington, without regard to its
            conflict of laws principles. Any disputes will be subject to the exclusive jurisdiction of
            the state and federal courts located in Washington.
          </p>
        </Section>

        <Section id="changes" title="10. Changes to These Terms">
          <p>
            We may update these Terms from time to time. When we do, we will revise the effective date
            above. Your continued use of the Services after changes take effect constitutes acceptance
            of the updated Terms.
          </p>
        </Section>

        <Section id="contact" title="11. Contact Us">
          <p>
            If you have questions about these Terms, contact us at{" "}
            <a href="mailto:hello@barlow-labs.com" className="text-accent hover:underline">
              hello@barlow-labs.com
            </a>
            . Barlow Labs, Seattle, WA.
          </p>
        </Section>
      </article>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-24">
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
