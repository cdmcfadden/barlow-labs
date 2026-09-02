import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DeepTunnel Privacy Policy | Barlow Labs",
  description:
    "DeepTunnel collects no personal data. Everything the app stores — your tunnel history, your goals, your paired tag — stays on your iPhone.",
};

const EFFECTIVE_DATE = "September 2, 2026";

export default function DeepTunnelPrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative pt-20 pb-10 sm:pt-28 sm:pb-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[320px] max-w-3xl bg-gradient-to-b from-primary/15 via-accent/5 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">DeepTunnel</p>
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
          <p className="text-lg">
            <strong>DeepTunnel does not collect your personal data.</strong> It has no
            account, no login, and no server that stores anything about you. Everything
            the app records lives on your iPhone and nowhere else.
          </p>
          <p>
            This policy covers the DeepTunnel iOS app published by Barlow Labs
            (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;). It is specific to
            DeepTunnel and replaces, for this app, the general Barlow Labs privacy
            policy — that one describes practices for our websites and messaging
            programs which DeepTunnel simply does not have.
          </p>
        </section>

        <Section id="what-stays-on-your-phone" title="1. What the App Stores on Your Device">
          <p>
            DeepTunnel keeps the following in its own private storage on your iPhone. None
            of it is transmitted anywhere, and we cannot see any of it:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Your tunnel history:</strong> when each focus session started and
              ended, and whether you ended it early.
            </li>
            <li>
              <strong>Goals you write:</strong> the text you enter for what you intend to
              accomplish, and whether you marked it done afterwards.
            </li>
            <li>
              <strong>Your paired tag:</strong> the serial number of the NFC tag you tap.
              This is a hardware identifier on the sticker itself, not an identifier for
              you or your phone.
            </li>
            <li>
              <strong>Your settings:</strong> whether a tunnel blocks apps, websites, or
              both, and any optional time limit.
            </li>
          </ul>
          <p className="mt-3">
            Deleting DeepTunnel deletes all of it. There is no copy anywhere else, which
            also means we cannot restore it for you.
          </p>
        </Section>

        <Section id="screen-time" title="2. Screen Time and the Apps You Block">
          <p>
            DeepTunnel uses Apple&rsquo;s Screen Time APIs (FamilyControls,
            ManagedSettings and DeviceActivity) to make apps and websites unavailable
            while you are in a tunnel. You grant this permission once, and iOS — not
            DeepTunnel — enforces the restrictions.
          </p>
          <p className="mt-3">
            <strong>We cannot see which apps you use or block.</strong> This is not a
            promise about our conduct; it is how Apple designed the API. Any app selection
            is handed to us as an opaque token that cannot be read, and the automatic
            adult-content filter is Apple&rsquo;s own classifier running on your device.
            DeepTunnel never learns which sites you visit or which apps you open.
          </p>
          <p className="mt-3">
            Restrictions apply only while a tunnel is running and are cleared when it
            ends. Deleting the app removes them too.
          </p>
        </Section>

        <Section id="nfc" title="3. NFC">
          <p>
            When you hold your phone to a tag, DeepTunnel reads only the tag&rsquo;s
            serial number, in order to recognise it. It does not read, write, or store any
            other content on the tag, and NFC is only ever active while you are actively
            starting or ending a tunnel.
          </p>
        </Section>

        <Section id="network" title="4. The One Thing That Leaves Your Phone">
          <p>
            In the interest of being complete rather than flattering: DeepTunnel checks
            for app updates using Expo&rsquo;s update service. That request necessarily
            tells Expo&rsquo;s servers your platform and which version of the app you are
            running, so that the correct update can be returned.
          </p>
          <p className="mt-3">
            It carries no account, no identifier we assign to you, and nothing about your
            tunnels, goals, tag, or blocked apps. This is the only network connection the
            app makes.
          </p>
        </Section>

        <Section id="what-we-dont-do" title="5. What We Do Not Do">
          <ul className="list-disc pl-6 space-y-2">
            <li>No analytics or usage tracking of any kind.</li>
            <li>No crash or error reporting.</li>
            <li>No advertising, and no advertising identifiers.</li>
            <li>No third-party trackers or marketing SDKs.</li>
            <li>We do not sell or share your data, because we do not have it.</li>
          </ul>
        </Section>

        <Section id="children" title="6. Children">
          <p>
            DeepTunnel is intended for adults managing their own device. It requests
            Screen Time authorization in Apple&rsquo;s <em>individual</em> mode, meaning
            the owner of the phone restricts their own phone. It is not a parental
            controls product, cannot be used to monitor or restrict someone else&rsquo;s
            device, and is not directed to children under 13. We do not knowingly collect
            information from children — we do not knowingly collect information from
            anyone.
          </p>
        </Section>

        <Section id="your-choices" title="7. Your Choices">
          <p>
            Screen Time permission can be withdrawn at any time in iOS Settings, and
            DeepTunnel will simply stop being able to block anything. Deleting the app
            removes every restriction it applied and every record it kept. Because nothing
            is stored on our servers, there is no data for you to request, correct, or ask
            us to delete — and no request you could make that would reach further than
            deleting the app yourself.
          </p>
        </Section>

        <Section id="changes" title="8. Changes to This Policy">
          <p>
            If DeepTunnel ever gains features that do collect data — shared sessions with
            an accountability partner would be the obvious one — this policy will be
            updated before those features ship, and the effective date above will change.
          </p>
        </Section>

        <Section id="contact" title="9. Contact">
          <p>
            Questions about this policy or DeepTunnel&rsquo;s data practices:{" "}
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
