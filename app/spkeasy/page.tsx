import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Speak Easy | Barlow Labs",
  description:
    "Drop your number. Get a call. Get coached. AI-powered phone mock interviews for FAANG and consulting loops.",
  openGraph: {
    title: "Speak Easy",
    description:
      "Drop your number. Get a call. Get coached. AI-powered phone mock interviews for FAANG and consulting loops.",
    type: "website",
  },
};

const features = [
  {
    title: "Phone-first practice",
    body: "No app, no signup form. Drop your number, pick up the call, and you're in a mock interview with a rigorous AI interviewer.",
  },
  {
    title: "Four interviewer personas",
    body: "Classic Bar Raiser, Socratic, Stress, and Coaching modes — with company packs calibrated for Amazon, Google, Meta, McKinsey/Bain, and early-stage startups.",
  },
  {
    title: "Instant, honest feedback",
    body: "Per-principle scores, voice analytics, and full transcripts after every call, drawn from questions curated from 1,000+ real interviews.",
  },
];

export default function SpkeasyPage() {
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
            Speak Easy
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Drop your number. Get a call. Get coached. The reps a $300/hr interview coach can't give
          you — unlimited, on-demand mock interviews for FAANG and consulting loops.
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

      <section className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Drill before the real loop
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Practice your stories across every persona until the Bar Raiser holds no surprises.
          </p>
          <a
            href="https://spkeasy.ai"
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Visit spkeasy.ai →
          </a>
        </div>
      </section>
    </div>
  );
}
