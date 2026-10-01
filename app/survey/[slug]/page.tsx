import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSurvey } from "@/lib/surveys";
import { SurveyForm } from "./SurveyForm";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const survey = getSurvey((await params).slug);
  if (!survey) return {};
  return {
    title: `${survey.title} | Barlow Labs`,
    description: survey.intro,
    robots: { index: false, follow: false },
    openGraph: { title: survey.title, description: survey.intro, type: "website" },
  };
}

export default async function SurveyPage({ params }: Params) {
  const survey = getSurvey((await params).slug);
  if (!survey) notFound();
  const count = survey.sections.reduce((n, s) => n + s.questions.length, 0);

  return (
    <div className="mx-auto max-w-4xl px-6">
      <section className="pt-16 pb-10 sm:pt-20">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-accent">Barlow Labs · {survey.audience}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{survey.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{survey.intro}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {count} quick ratings{survey.writeIns ? ` plus ${survey.writeIns} optional ideas of your own` : ""}. About 5 minutes.
        </p>
      </section>
      <SurveyForm
        survey={{ slug: survey.slug, scale: survey.scale, sections: survey.sections, writeIns: survey.writeIns, writeInPrompt: survey.writeInPrompt }}
      />
    </div>
  );
}
