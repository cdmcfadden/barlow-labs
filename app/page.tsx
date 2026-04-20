import Link from "next/link";

const principles = [
  {
    title: "Our Guiding Principle",
    body: "We practice like we play and are assembling a global network of domain experts, luminaries, and unorthodox dreamers that are passionate about contributing to a new way to size tech to the humans it must serve. Maybe you know one of those people or are one yourself.",
  },
  {
    title: "Our Product Design Ethic",
    body: "Rethink the human-machine interface based on an upgraded razor: a person must not serve their tech.",
  },
  {
    title: "Our Customer Imperative",
    body: "Strive to leave no wo/man where we find them, alone, abandoned, or lost in the machinery. We promote search and rescue.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[480px] max-w-4xl bg-gradient-to-b from-primary/20 via-accent/10 to-transparent blur-3xl"
        />
        <p className="text-sm uppercase tracking-[0.2em] text-accent mb-5">
          Innovation · Data · Technology
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Barlow Labs
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          Our stealth venture develops human-centric tech. We are part of the revolution of builders
          obsessed with creating, harnessing, customizing, and controlling data to serve our own human
          needs. When done with purpose, we believe this unlocks forgotten levels of accountability and
          community.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/story"
            className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Read our story →
          </Link>
          <a
            href="#principles"
            className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            What we believe
          </a>
        </div>
      </section>

      <section id="principles" className="py-16 sm:py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {principles.map((p) => (
            <article
              key={p.title}
              className="rounded-lg border border-border bg-card p-6 shadow-sm hover:border-accent/40 transition-colors"
            >
              <h2 className="text-base font-semibold text-accent mb-3">{p.title}</h2>
              <p className="text-card-foreground/90 leading-relaxed text-[15px]">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-border/60">
        <div className="grid gap-10 md:grid-cols-5 items-start">
          <div className="md:col-span-2">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Built in the Pacific Northwest
            </h2>
          </div>
          <p className="md:col-span-3 text-lg text-muted-foreground leading-relaxed">
            Our headquarters is in the fractal known as Seattle, surrounded by national parks, alpine
            lakes, and mountains still waiting to be named. We believe beautiful places make the best
            tech.
          </p>
        </div>
      </section>
    </div>
  );
}
