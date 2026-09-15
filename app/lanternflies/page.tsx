import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const description = "Founders trade testing time in Slack. Test a product, earn credits, get yours tested.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.barlow-labs.com"),
  title: "Lanternflies | Barlow Labs",
  description,
  icons: {
    icon: [{ url: "/lanternflies/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: "/lanternflies/apple-touch-icon.png",
  },
  openGraph: {
    title: "Lanternflies — squash bugs together",
    description,
    url: "/lanternflies",
    siteName: "Barlow Labs",
    type: "website",
    images: [{ url: "/lanternflies/og.png", width: 1200, height: 630, alt: "Lanternflies: squash bugs together" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@barlowlabs",
    title: "Lanternflies — squash bugs together",
    description,
    images: ["/lanternflies/og.png"],
  },
};

const steps = [
  {
    title: "Release a lanternfly",
    body: "Describe what to test, how long it takes, and how to get in. It costs 1 credit per 20 minutes, paid only when a test is done.",
  },
  {
    title: "We find your testers",
    body: "Lanternflies DMs founders who can test on your platforms — in your Slack community and every other one that uses it.",
  },
  {
    title: "Test, confirm, trade",
    body: "Testers send notes and a recording. You confirm, credits move, and they spend them getting their own product tested.",
  },
];

const faqs = [
  {
    q: "What does it cost?",
    a: "Nothing. Credits are the currency: everyone starts with 3 (about an hour of testing) and earns more by testing for others.",
  },
  {
    q: "Who sees my product?",
    a: "Your request's title and instructions are shown to matched founders. Access details and your contact info are only shared with testers who take a slot. You can also keep a request inside your own Slack community.",
  },
  {
    q: "What does the app read in our Slack?",
    a: "Nothing from your channels. It only sees its own Home tab, the /lanternflies command, and the buttons you press, and it sends DMs to people who use it.",
  },
  {
    q: "We run a founder community. Why install it?",
    a: "Your members get testers from a network bigger than your workspace, and you give them a reason to show up every week. We're happy to help you run a live Testing Night.",
  },
];

function AddToSlack() {
  return (
    <a
      href="/api/lanternflies/slack/install"
      className="inline-flex items-center gap-3 rounded-lg border border-border bg-white px-5 py-3 text-base font-medium text-black shadow-sm transition hover:shadow-md"
    >
      <svg aria-hidden width="22" height="22" viewBox="0 0 122.8 122.8">
        <path fill="#e01e5a" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
        <path fill="#36c5f0" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
        <path fill="#2eb67d" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
        <path fill="#ecb22e" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
      </svg>
      Add Lanternflies to Slack
    </a>
  );
}

export default async function LanternfliesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const installed = typeof params.installed === "string" ? params.installed : null;
  const installError = typeof params.install_error === "string" ? params.install_error : null;

  return (
    <div className="mx-auto max-w-5xl px-6">
      {installed && (
        <div className="mt-8 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm">
          🔦 Lanternflies is installed in <strong>{installed}</strong>. Open the Lanternflies app in Slack —
          we just sent you a welcome DM.
        </div>
      )}
      {installError && (
        <div className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
          The install didn&rsquo;t finish ({installError}). Try again, or ask a workspace admin to install it.
        </div>
      )}

      <section className="relative pt-20 pb-16 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[420px] max-w-4xl bg-gradient-to-b from-primary/20 via-accent/10 to-transparent blur-3xl"
        />
        <Image
          src="/lanternflies/lanternflies-icon-512.png"
          alt="Lanternflies icon: a spotted lanternfly with a glowing lantern body"
          width={112}
          height={112}
          priority
          className="mb-8 rounded-[24px] shadow-[0_0_60px_rgba(255,170,40,0.35)]"
        />
        <p className="mb-5 text-sm uppercase tracking-[0.2em] text-accent">For founders, in Slack</p>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Squash bugs{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">together.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Lanternflies is a testing exchange for founders. Test someone&rsquo;s product to earn credits, then spend
          them to get yours in front of real builders — matched across every Slack community that uses it.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <AddToSlack />
          <span className="text-sm text-muted-foreground">Free · takes a minute · works across workspaces</span>
        </div>
      </section>

      <section className="grid gap-6 pb-16 sm:grid-cols-3">
        {steps.map((step, i) => (
          <div key={step.title} className="rounded-xl border border-border p-6">
            <p className="text-sm font-medium text-accent">0{i + 1}</p>
            <h2 className="mt-2 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="font-medium">{faq.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-24 rounded-xl border border-border p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Bring your community</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Every community that installs Lanternflies makes matching faster for everyone. Barlow Labs members can
          still use it from the{" "}
          <Link href="/members" className="underline underline-offset-4 hover:text-foreground">
            members area
          </Link>
          .
        </p>
        <div className="mt-6 flex justify-center">
          <AddToSlack />
        </div>
      </section>
    </div>
  );
}
