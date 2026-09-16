import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DeepTunnel Privacy Policy | Barlow Labs",
  description:
    "DeepTunnel collects no personal data. Everything the app stores — your tunnel history, your goals, your paired tag, your unlock photos — stays on your phone.",
};

const EFFECTIVE_DATE = "September 15, 2026";

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
            the app records lives on your phone and nowhere else.
          </p>
          <p>
            This policy covers the DeepTunnel <strong>iOS and Android</strong> apps
            published by Barlow Labs (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
            &ldquo;our&rdquo;). It is specific to DeepTunnel and replaces, for this app,
            the general Barlow Labs privacy policy — that one describes practices for our
            websites and messaging programs which DeepTunnel simply does not have.
          </p>
          <p>
            The two versions block apps in fundamentally different ways, because the two
            operating systems offer fundamentally different tools. That difference changes
            what the app is able to see on each platform, so it is described plainly in
            section 2 rather than averaged into a single reassuring sentence.
          </p>
        </section>

        <Section id="what-stays-on-your-phone" title="1. What the App Stores on Your Device">
          <p>
            DeepTunnel keeps the following in its own private storage on your phone. None
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
              <strong>Your unlock anchor,</strong> if you use one: either a photograph you
              took or a set of GPS coordinates. See section 3.
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

        <Section id="blocking" title="2. How Blocking Works, and What Each Version Can See">
          <p>
            This is the one place where the iOS and Android versions genuinely differ, and
            the difference matters enough to spell out.
          </p>

          <h3 className="text-xl font-semibold tracking-tight mt-6">On iPhone</h3>
          <p className="mt-2">
            DeepTunnel uses Apple&rsquo;s Screen Time APIs (FamilyControls,
            ManagedSettings and DeviceActivity) to make apps and websites unavailable
            while you are in a tunnel. You grant this permission once, and iOS — not
            DeepTunnel — enforces the restrictions.
          </p>
          <p className="mt-3">
            <strong>The iOS app cannot see which apps you use or block.</strong> This is
            not a promise about our conduct; it is how Apple designed the API. Any app
            selection is handed to us as an opaque token that cannot be read, and the
            automatic adult-content filter is Apple&rsquo;s own classifier running on your
            device. The iOS app never learns which sites you visit or which apps you open.
          </p>

          <h3 className="text-xl font-semibold tracking-tight mt-6">On Android</h3>
          <p className="mt-2">
            Android has no equivalent of Screen Time that a normal app may use. Nothing in
            the platform will stop another app from launching on our behalf, so the
            Android version has to do the work itself — and that requires it to see
            something the iOS version never sees.
          </p>
          <p className="mt-3">
            <strong>
              While a tunnel is running, the Android app checks which app is currently in
              the foreground, several times a second, and covers it with a DeepTunnel
              screen if it is one you chose to block.
            </strong>{" "}
            This uses two permissions you grant in Android Settings: usage access
            (&ldquo;Apps with usage access&rdquo;) and display over other apps.
          </p>
          <p className="mt-3">
            What this means honestly: on Android, the app does briefly read the name of the
            app you just opened. That reading happens entirely on your phone, is used only
            to decide whether to show the shield, and is <strong>never stored, never
            logged, and never transmitted</strong>. Nothing about which apps you open is
            written to your tunnel history or sent anywhere. The check runs only while a
            tunnel is active; when the tunnel ends, the service stops and no foreground
            checking happens at all.
          </p>
          <p className="mt-3">
            Two further consequences of Android&rsquo;s design, stated because you should
            know them: blocking is reactive rather than preventive, so a blocked app really
            does open for a moment before the shield appears; and because enforcement is
            our own background service rather than the operating system, an aggressive
            battery manager can stop it, which ends enforcement for that tunnel.
          </p>
          <p className="mt-3">
            The Android version has no adult-content filter. Apple provides one; Android
            does not, and rather than offer a switch that quietly does nothing, the option
            is not offered. Blocking browsers on Android blocks the browser apps
            themselves.
          </p>

          <p className="mt-6">
            On both platforms, restrictions apply only while a tunnel is running and are
            cleared when it ends. Deleting the app removes them too.
          </p>
        </Section>

        <Section id="camera-location" title="3. Camera and Location">
          <p>
            Besides tapping an NFC tag, DeepTunnel offers two other ways to end a tunnel.
            Both are optional, both are off unless you choose them, and both keep what they
            capture on your phone.
          </p>
          <ul className="list-disc pl-6 space-y-3 mt-3">
            <li>
              <strong>Photo:</strong> you photograph something at the start of a tunnel and
              photograph it again to get out. Both images are held in the app&rsquo;s
              private storage and compared <em>on your device</em> — using Apple&rsquo;s
              Vision framework on iPhone, and a small image-recognition model bundled
              inside the app on Android. No photograph is uploaded, and no photograph is
              added to your camera roll. The comparison happens offline; neither we nor any
              third party ever receives the image.
            </li>
            <li>
              <strong>Place:</strong> you anchor a tunnel to where you are standing and
              return there to get out. The app stores the coordinates on your phone and
              compares them to a fresh reading. Your location is never transmitted, never
              logged as a history, and is requested only at the moment you start or end a
              tunnel using this method.
            </li>
          </ul>
          <p className="mt-3">
            Camera and location permissions are requested only when you first select one of
            these methods, and declining them simply means that method is unavailable. If
            you only ever use the NFC tag, DeepTunnel never asks for either.
          </p>
        </Section>

        <Section id="nfc" title="4. NFC">
          <p>
            When you hold your phone to a tag, DeepTunnel reads only the tag&rsquo;s
            serial number, in order to recognise it. It does not read, write, or store any
            other content on the tag, and NFC is only ever active while you are actively
            starting or ending a tunnel.
          </p>
        </Section>

        <Section id="network" title="5. The One Thing That Leaves Your Phone">
          <p>
            In the interest of being complete rather than flattering: DeepTunnel checks
            for app updates using Expo&rsquo;s update service. That request necessarily
            tells Expo&rsquo;s servers your platform and which version of the app you are
            running, so that the correct update can be returned.
          </p>
          <p className="mt-3">
            It carries no account, no identifier we assign to you, and nothing about your
            tunnels, goals, tag, photographs, location, or blocked apps. This is the only
            network connection the app makes.
          </p>
        </Section>

        <Section id="what-we-dont-do" title="6. What We Do Not Do">
          <ul className="list-disc pl-6 space-y-2">
            <li>No analytics or usage tracking of any kind.</li>
            <li>No crash or error reporting.</li>
            <li>No advertising, and no advertising identifiers.</li>
            <li>No third-party trackers or marketing SDKs.</li>
            <li>We do not sell or share your data, because we do not have it.</li>
          </ul>
        </Section>

        <Section id="children" title="7. Children">
          <p>
            DeepTunnel is intended for adults managing their own device. On iPhone it
            requests Screen Time authorization in Apple&rsquo;s <em>individual</em> mode,
            meaning the owner of the phone restricts their own phone; on Android every
            permission it uses is granted by the person holding the device, for that same
            device. It is not a parental controls product, cannot be used to monitor or
            restrict someone else&rsquo;s device, reports nothing to anyone else, and is
            not directed to children under 13. We do not knowingly collect information from
            children — we do not knowingly collect information from anyone.
          </p>
        </Section>

        <Section id="your-choices" title="8. Your Choices">
          <p>
            On iPhone, Screen Time permission can be withdrawn at any time in iOS Settings.
            On Android, usage access and display-over-other-apps can be revoked in Android
            Settings, and camera and location permissions in the app&rsquo;s permission
            screen. In every case DeepTunnel will simply stop being able to block anything.
          </p>
          <p className="mt-3">
            Deleting the app removes every restriction it applied and every record it kept,
            including any photographs taken for the photo unlock. Because nothing is stored
            on our servers, there is no data for you to request, correct, or ask us to
            delete — and no request you could make that would reach further than deleting
            the app yourself.
          </p>
        </Section>

        <Section id="changes" title="9. Changes to This Policy">
          <p>
            If DeepTunnel ever gains features that do collect data — shared sessions with
            an accountability partner would be the obvious one — this policy will be
            updated before those features ship, and the effective date above will change.
          </p>
        </Section>

        <Section id="contact" title="10. Contact">
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
