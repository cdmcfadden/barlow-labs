import type { Metadata } from "next";

const APP_URL = "https://seattle-home-scorer.lovable.app";

export const metadata: Metadata = {
  title: "PlaceMont | Barlow Labs",
  description:
    "A weighted, two-person scorecard for finding a home in Seattle. Every new listing is scored on eight criteria and ranked the way you both actually decide.",
  openGraph: {
    title: "PlaceMont",
    description:
      "A weighted, two-person scorecard for finding a home in Seattle. Every listing scored on eight criteria and ranked the way you both actually decide.",
    type: "website",
  },
};

const criteria = [
  { label: "Green score", hint: "Walkable parks nearby", me: 92, wife: 74 },
  { label: "Price", hint: "Lower in range scores higher", me: 61, wife: 61 },
  { label: "Walk score", hint: "Errands on foot", me: 88, wife: 88 },
  { label: "Bike score", hint: "Bike lanes and hills", me: 79, wife: 45 },
  { label: "Size", hint: "Bigger in range scores higher", me: 55, wife: 70 },
  { label: "Commute", hint: "Drive to Bellevue", me: 68, wife: 82 },
  { label: "Transit", hint: "Bus and light rail", me: 84, wife: 84 },
  { label: "Garage / parking", hint: "Garage beats street", me: 40, wife: 90 },
];

const hoods = [
  "Ballard",
  "Fremont",
  "Wallingford",
  "Green Lake",
  "Phinney Ridge",
  "Greenwood",
  "Queen Anne",
  "Capitol Hill",
  "Montlake",
  "Madison Park",
  "Madrona",
  "Leschi",
  "Ravenna",
  "Mt. Baker",
  "Columbia City",
  "Beacon Hill",
];

const steps = [
  {
    n: "01",
    title: "Weight it your way — both of you",
    body: "Each person gets their own sliders for the eight criteria. Rankings update instantly, and a blended view shows where you agree and where you don't.",
  },
  {
    n: "02",
    title: "Score every listing, not just the pretty ones",
    body: "Each home gets a 0–100 score per criterion — distance to the nearest of eighteen Seattle parks, estimated drive to Bellevue, walk, bike, transit, size, price and parking — then a weighted overall.",
  },
  {
    n: "03",
    title: "See what changed since last time",
    body: "Pull the latest Redfin export for your target ZIPs and PlaceMont diffs it: new listings, price drops, relists, and homes that went off the market — in a single changes feed.",
  },
];

export default function PlaceMontPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="relative grid items-center gap-12 pt-20 pb-12 sm:pt-28 lg:grid-cols-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[520px] max-w-4xl bg-gradient-to-b from-primary/20 via-accent/10 to-transparent blur-3xl"
        />
        <div className="lg:col-span-3">
          <p className="mb-5 text-sm uppercase tracking-[0.2em] text-accent">A Barlow Labs venture</p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PlaceMont
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            A weighted, two-person scorecard for finding a home in Seattle. Every listing gets
            scored on the things that matter to each of you — then ranked the way you actually
            decide together.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open PlaceMont →
            </a>
            <a
              href="#how"
              className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              How it scores
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Private beta · built for one household, opening up soon.
          </p>
        </div>

        <Scorecard />
      </section>

      <section id="how" className="scroll-mt-24 py-16 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <article
              key={s.n}
              className="rounded-lg border border-border bg-card p-6 shadow-sm transition-colors hover:border-accent/40"
            >
              <p className="font-mono text-xs tracking-[0.2em] text-accent">{s.n}</p>
              <h3 className="mt-3 text-base font-semibold text-accent">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-card-foreground/90">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="grid items-start gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Sixteen neighborhoods, one shortlist
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Pick the parts of the city you&rsquo;d actually live in. Everything else stays out of
              the ranking, no matter how good the numbers look.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 md:col-span-3">
            {hoods.map((h, i) => (
              <li
                key={h}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  i % 3 === 0
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {h}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Ready to rank the market?</h2>
              <p className="mt-2 text-muted-foreground">
                PlaceMont currently runs on a separate host while we finish the build.
              </p>
            </div>
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open PlaceMont →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Scorecard() {
  const avg = (k: "me" | "wife") =>
    Math.round(criteria.reduce((sum, c) => sum + c[k], 0) / criteria.length);
  const me = avg("me");
  const wife = avg("wife");
  const blend = Math.round((me + wife) / 2);

  return (
    <aside
      aria-label="Example scorecard"
      className="relative lg:col-span-2 rounded-xl border border-border bg-card/80 p-5 shadow-lg backdrop-blur"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px -z-10 rounded-xl bg-gradient-to-br from-primary/25 via-transparent to-accent/20 blur-xl"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Rank #1 · example
          </p>
          <p className="mt-1 text-base font-semibold leading-tight">4-bed craftsman, Wallingford</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">$1.24M · 1,880 sf · 1926</p>
        </div>
        <div className="text-right">
          <p className="bg-gradient-to-r from-primary to-accent bg-clip-text text-3xl font-semibold leading-none text-transparent">
            {blend}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">blended</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 font-mono text-[11px]">
        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
          me {me}
        </span>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-accent">
          wife {wife}
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {criteria.map((c) => (
          <li key={c.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{c.label}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {c.me} · {c.wife}
              </span>
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.me}%` }} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${c.wife}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Overall = each score × that person&rsquo;s slider, divided by the slider total. Illustrative
        numbers.
      </p>
    </aside>
  );
}
