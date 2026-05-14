import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Story | Barlow Labs",
  description:
    "The inspiration, journey, and vision behind Barlow Labs — human-centric technology built in the Pacific Northwest.",
};

const sections = [
  {
    eyebrow: "Chapter 01",
    title: "Our Early Inspiration",
    body: "We fight for the user and take inspiration from the early promises made by leading technologists: invisible computing, global human connections, enhanced self-knowledge, expanded capabilities. The chance to be as human as we've ever been. The decision to make the first check-point of design not: will people buy this, but: will people become who they were meant to be through it. That is our design ethic and thinking this way leads to different products, different people, and a different company.",
  },
  {
    eyebrow: "Chapter 02",
    title: "Our Emerging Journey",
    body: "What started as a single idea became a set of nested products, requiring sequential development, testing, and refinement for PMF and scale. This has required the founding of an innovation lab for core platform and product concept refinement. Products prove their human value, then their market value, and then each is graduated out of Barlow Labs and advanced into a stand alone venture, receiving incrementally more resourcing and funding. Our goal is to maintain a constant innovation drumbeat.",
  },
  {
    eyebrow: "Chapter 03",
    title: "Our Vision for The Future",
    body: "We imagine an impossible future, but one that we are more than willing to devote our time, energy, and effort to fractionally realize: a world where traditional measures of success give up their seat to the true human flourishing that good tech promotes: reconciliation, sacrificial love, admission of your mistakes, rescue of those in need. A body, mind, and soul at peace. A kind word offered to a broken stranger. We remain in stealth mode, but we look forward to the time soon that we can engage with interested users and new community members.",
  },
];

export default function StoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[360px] max-w-3xl bg-gradient-to-b from-primary/15 via-accent/5 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">The Barlow Labs story</p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Our{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Story
          </span>
        </h1>
      </section>

      <div className="relative pb-24">
        <div
          aria-hidden
          className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/60 via-accent/40 to-transparent"
        />
        <div className="space-y-14">
          {sections.map((s) => (
            <article key={s.title} className="relative pl-12">
              <span
                aria-hidden
                className="absolute left-[9px] top-2 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-background"
              />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {s.eyebrow}
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">{s.title}</h2>
              <p className="text-lg text-foreground/90 leading-relaxed">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
