import type { Metadata } from "next";
import { WaitlistForm } from "./WaitlistForm";

export const metadata: Metadata = {
  title: "House360 | Barlow Labs",
  description:
    "One place for all your home documents, scheduled maintenance, and recommended vendors. Join the House360 waitlist.",
  openGraph: {
    title: "House360",
    description:
      "One place for all your home documents, scheduled maintenance, and recommended vendors.",
    type: "website",
  },
};

const features = [
  {
    title: "All your home documents",
    body: "Warranties, manuals, receipts, inspection reports — searchable and in one place, not scattered across drawers and email.",
  },
  {
    title: "Scheduled maintenance",
    body: "Know what your home needs and when. Seasonal reminders for the things that quietly break when ignored.",
  },
  {
    title: "Recommended vendors",
    body: "When something does need a pro, see who your neighbors actually trust — not who paid for the top result.",
  },
];

export default function House360Page() {
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
            House360
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
          One place for all your home documents, scheduled maintenance, and recommended vendors.
          Built for the way you actually live in your home.
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
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Join the waitlist
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            We're rolling out House360 to a small group of early users. Drop your email and we'll
            send you a confirmation, then reach out when it's your turn.
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </div>
  );
}
