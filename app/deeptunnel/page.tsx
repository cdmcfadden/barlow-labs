import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "DeepTunnel | Barlow Labs",
  description:
    "Tap an NFC tag to go into a tunnel. Your distracting apps and the web go dark until you tap out. A physical switch for your attention.",
  openGraph: {
    title: "DeepTunnel",
    description:
      "Tap an NFC tag to go into a tunnel. Your distracting apps and the web go dark until you tap out.",
    type: "website",
  },
};

const features = [
  {
    title: "A tag, not a button",
    body: "Stick an NFC tag where the habit lives — the car dashboard, your desk, the gym bag. Holding your phone to it starts a tunnel. A button you can talk yourself out of; a tag you have to walk back to.",
  },
  {
    title: "You choose the depth",
    body: "Shield every app, block browsing entirely, or filter only adult sites — independently, in two taps. No blocklist to build and no list of apps to keep up to date.",
  },
  {
    title: "Nothing leaves your phone",
    body: "No account, no server, no analytics. Your sessions, goals and settings never go anywhere. Even we cannot see which apps you block — iOS hands them over as tokens no app is allowed to read.",
  },
];

export default function DeepTunnelPage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative pt-20 pb-12 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[480px] max-w-4xl bg-gradient-to-b from-primary/20 via-accent/10 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">
          A Barlow Labs venture
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            DeepTunnel
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Tap a tag to go into a tunnel. The apps that pull at you go dark, and stay dark, until
          you come back and tap out. A physical switch for your attention.
        </p>
      </section>

      <section className="py-10">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 shadow-sm hover:border-accent/40 transition-colors"
            >
              <h2 className="text-base font-semibold text-accent mb-3">{f.title}</h2>
              <p className="text-card-foreground/90 leading-relaxed text-[15px]">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-10 border-t border-border/60">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <li>
            <span className="text-foreground font-medium">1. Stick the tag somewhere honest.</span>{" "}
            Any standard NFC sticker works. Nothing has to be written to it.
          </li>
          <li>
            <span className="text-foreground font-medium">2. Say what you are here to do.</span>{" "}
            Optional, but a tunnel with a goal asks you afterwards whether you got it done.
          </li>
          <li>
            <span className="text-foreground font-medium">3. Tap in.</span> Your phone stops being
            interesting. Phone, Messages and Settings keep working — iOS never lets an app take
            those away.
          </li>
          <li>
            <span className="text-foreground font-medium">4. Tap out when you are done.</span> Or
            set a time limit and let the tunnel end on its own.
          </li>
        </ol>
      </section>

      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Coming to the App Store
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            DeepTunnel is in testing on iPhone. Want a tag and an early build?{" "}
            <a
              href="mailto:hello@barlow-labs.com?subject=DeepTunnel%20beta"
              className="text-accent hover:underline"
            >
              hello@barlow-labs.com
            </a>
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            <Link href="/deeptunnel/privacy" className="hover:text-foreground transition-colors">
              Privacy policy
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
