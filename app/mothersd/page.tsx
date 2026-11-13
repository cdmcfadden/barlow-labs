import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "mothersd.ai | Barlow Labs",
  description:
    "mothersd.ai turned a 90-second conversation into a letter, portrait, and keepsake for the mother in your life. The service is no longer available.",
  openGraph: {
    title: "mothersd.ai",
    description:
      "mothersd.ai turned a 90-second conversation into a letter, portrait, and keepsake for the mother in your life. The service is no longer available.",
    type: "website",
  },
};

const steps = [
  {
    n: "01",
    title: "A 90-second conversation",
    body: "A guided conversation, by voice or text, drew out the stories and memories people didn't know they remembered.",
  },
  {
    n: "02",
    title: "A letter and portrait",
    body: "Those memories became a personalized letter and a portrait of mom. It was meant to sound like the person who told the stories, not like a greeting-card cliché.",
  },
  {
    n: "03",
    title: "A keepsake to share or print",
    body: "Each dedication lived on a private page she could revisit, with the original recording and a printable PDF keepsake.",
  },
];

export default function MothersdPage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative pt-20 pb-12 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[480px] max-w-4xl bg-gradient-to-b from-primary/20 via-accent/10 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">
          A Barlow Labs venture · Retired
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            mothersd.ai
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          A dedication for the mother in your life. mothersd.ai turned your memories into a letter,
          a portrait, and a keepsake, something no store sells. It was a great success, and we're
          grateful to everyone who made it one.
        </p>
        <p className="mt-4 max-w-2xl rounded-lg border border-border bg-card px-4 py-3 text-sm text-card-foreground/90 leading-relaxed">
          mothersd.ai has wrapped up and is no longer creating new dedications. This page is a
          record of what we built.
        </p>
      </section>

      <section className="py-10">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
          What it did
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <article
              key={s.n}
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-xs tracking-[0.2em] text-accent mb-3">{s.n}</p>
              <h3 className="text-base font-semibold mb-3">{s.title}</h3>
              <p className="text-card-foreground/90 leading-relaxed text-[15px]">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Thank you
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Thank you to every customer who took ninety seconds to tell a story about their mom.
            You made mothersd.ai a great success. We hope to launch related products again in the
            future, and we'd love to have you back. See what else we're building at Barlow Labs.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Barlow Labs →
          </a>
        </div>
      </section>
    </div>
  );
}
