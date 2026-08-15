import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "mothersd.ai | Barlow Labs",
  description:
    "A dedication for the mother in your life. Turn your memories into a heartfelt letter, portrait, and keepsake in 90 seconds.",
  openGraph: {
    title: "mothersd.ai",
    description:
      "A dedication for the mother in your life. Turn your memories into a heartfelt letter, portrait, and keepsake in 90 seconds.",
    type: "website",
  },
};

const features = [
  {
    title: "Just start talking",
    body: "A guided 90-second conversation — voice or text — draws out the stories and memories you didn't know you remembered. Once you start, you won't want to stop.",
  },
  {
    title: "A letter worth keeping",
    body: "Your memories become a heartfelt, personalized letter and portrait of your mom — not a greeting-card cliché, but something that sounds like you.",
  },
  {
    title: "Share it or print it",
    body: "A private page she can visit again and again, with your recording and a printable PDF keepsake she can hold onto.",
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
          A Barlow Labs venture
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            mothersd.ai
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          A dedication for the mother in your life. She gave you everything — give her something no
          store sells: your memories, turned into a letter, a portrait, and a keepsake she'll never
          put down.
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
            Make hers today
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Free to build. Ninety seconds to start. A lifetime to keep.
          </p>
          <a
            href="https://mothersd.ai"
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Visit mothersd.ai →
          </a>
        </div>
      </section>
    </div>
  );
}
