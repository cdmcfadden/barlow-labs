import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Barlow Labs",
  description:
    "How Barlow Labs collects, uses, and protects your information across our websites, applications, AI features, and text messaging programs.",
};

const EFFECTIVE_DATE = "July 25, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative pt-20 pb-10 sm:pt-28 sm:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[320px] max-w-3xl bg-gradient-to-b from-primary/15 via-accent/5 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">Legal</p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Privacy{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Policy
          </span>
        </h1>
        <p className="mt-6 text-sm text-muted-foreground">Effective {EFFECTIVE_DATE}</p>
      </section>

      <article className="prose-legal pb-24 space-y-10 text-foreground/90 leading-relaxed">
        <section className="space-y-4">
          <p>
            This Privacy Policy explains how Barlow Labs (&ldquo;Barlow Labs,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and protects your information when
            you visit our websites, use our applications, interact with our AI-powered features, or
            participate in our text messaging programs (collectively, the &ldquo;Services&rdquo;). By
            using the Services, you agree to the practices described in this policy.
          </p>
        </section>

        <Section id="information-we-collect" title="1. Information We Collect">
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Information you provide:</strong> such as your name, email address, mobile phone
              number, and any content you submit through forms, messages, or our applications.
            </li>
            <li>
              <strong>Usage and device information:</strong> such as IP address, browser type, device
              identifiers, pages viewed, and interactions with our Services.
            </li>
            <li>
              <strong>AI interaction data:</strong> prompts, messages, and other inputs you provide to
              our AI-powered features, along with the responses generated for you.
            </li>
            <li>
              <strong>Messaging data:</strong> your mobile number and the content and metadata of text
              messages exchanged with us where you have opted into a messaging program.
            </li>
          </ul>
        </Section>

        <Section id="how-we-use" title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Provide, operate, maintain, and improve the Services;</li>
            <li>Respond to your requests and provide customer support;</li>
            <li>Power and improve our AI features and the quality of their responses;</li>
            <li>Send you messages you have requested or consented to receive;</li>
            <li>Protect the security and integrity of the Services; and</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </Section>

        <Section id="ai-features" title="3. AI-Powered Features">
          <p>
            Some of our Services use artificial intelligence to generate responses, recommendations, or
            other content. AI outputs may be inaccurate or incomplete and should not be relied upon as
            professional advice. We may process the inputs you provide to operate and improve these
            features. Please avoid submitting sensitive personal information to our AI features unless
            necessary for the service you are requesting.
          </p>
        </Section>

        <Section id="text-messaging" title="4. Text Messaging Program">
          <p>
            If you opt into a Barlow Labs text messaging program, the following terms apply to your
            participation:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Mobile numbers are never shared.</strong> We will not sell, rent, or share your
              mobile phone number or messaging opt-in information with third parties or affiliates for
              their own marketing or promotional purposes. Mobile information will not be shared with
              third parties except as needed to deliver the messaging service (for example, our
              messaging or telecommunications providers acting on our behalf) or as required by law.
            </li>
            <li>
              <strong>Message frequency.</strong> Message frequency varies based on your interactions
              with us. You should generally expect to receive up to a few messages per week in
              connection with a program you have joined; the exact frequency depends on the specific
              program and your activity.
            </li>
            <li>
              <strong>Message and data rates may apply.</strong> Standard message and data rates from
              your mobile carrier may apply to messages you send or receive. Barlow Labs is not
              responsible for any charges from your wireless carrier.
            </li>
            <li>
              <strong>Opting out.</strong> You can cancel messages at any time by replying{" "}
              <strong>STOP</strong> to any message. After you send STOP, we will send a confirmation
              message and then stop sending messages. For help, reply <strong>HELP</strong> or contact
              us using the details below.
            </li>
            <li>
              <strong>Carrier liability.</strong> Carriers are not liable for delayed or undelivered
              messages.
            </li>
          </ul>
        </Section>

        <Section id="how-we-share" title="5. How We Share Information">
          <p>
            We do not sell your personal information. As noted above, we do not share mobile numbers or
            SMS opt-in data with third parties for their marketing purposes. We may share other
            information with:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Service providers</strong> who perform functions on our behalf (such as hosting,
              analytics, AI processing, and message delivery), bound by obligations to protect your
              information;
            </li>
            <li>
              <strong>Legal and safety recipients</strong> when required to comply with law, enforce our
              terms, or protect the rights, property, or safety of Barlow Labs, our users, or others;
              and
            </li>
            <li>
              <strong>Successors</strong> in connection with a merger, acquisition, or sale of assets,
              subject to this policy.
            </li>
          </ul>
        </Section>

        <Section id="data-retention" title="6. Data Retention & Security">
          <p>
            We retain personal information for as long as necessary to provide the Services and for
            legitimate business or legal purposes. We use reasonable administrative, technical, and
            physical safeguards to protect your information, though no method of transmission or storage
            is completely secure.
          </p>
        </Section>

        <Section id="your-rights" title="7. Your Choices & Rights">
          <p>
            Depending on your location, you may have rights to access, correct, or delete your personal
            information, or to opt out of certain processing. You can opt out of text messages at any
            time by replying STOP. To exercise other rights, contact us using the details below.
          </p>
        </Section>

        <Section id="childrens-privacy" title="8. Children's Privacy">
          <p>
            Our Services are not directed to children under 13, and we do not knowingly collect personal
            information from children under 13. If you believe a child has provided us personal
            information, please contact us and we will take appropriate steps to delete it.
          </p>
        </Section>

        <Section id="changes" title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            effective date above. Your continued use of the Services after changes take effect
            constitutes acceptance of the updated policy.
          </p>
        </Section>

        <Section id="contact" title="10. Contact Us">
          <p>
            If you have questions about this Privacy Policy or our data practices, contact us at{" "}
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
