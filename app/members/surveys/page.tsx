import Link from "next/link";
import { listSurveys } from "@/lib/surveys";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Surveys | Barlow Labs" };

export default async function SurveysPage() {
  const surveys = listSurveys();
  const counts = (await getSql()`
    SELECT survey_slug, COUNT(DISTINCT email)::int AS n FROM survey_responses GROUP BY survey_slug`) as { survey_slug: string; n: number }[];
  const n = (slug: string) => counts.find((c) => c.survey_slug === slug)?.n ?? 0;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/members" className="underline underline-offset-4 hover:text-foreground">Members</Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Surveys</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Each survey has a public link anyone can fill in. Responses land here and are emailed to the team.
        To add a survey, add a file to lib/surveys and register it in lib/surveys/index.ts.
      </p>
      <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
        {surveys.map((s) => (
          <li key={s.slug} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href={`/members/surveys/${s.slug}`} className="font-medium underline-offset-4 hover:underline">{s.title}</Link>
              <p className="text-sm text-muted-foreground">barlow-labs.com/survey/{s.slug}</p>
            </div>
            <span className="text-sm text-muted-foreground">{n(s.slug)} respondents</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
