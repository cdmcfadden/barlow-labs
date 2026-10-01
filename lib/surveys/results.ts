import { getSql } from "@/lib/db";
import type { Survey, SurveyAnswers } from "./types";

export type ResponseRow = {
  id: number;
  name: string;
  email: string;
  answers: SurveyAnswers;
  notified: boolean;
  created_at: string;
};

export type FeatureStat = {
  id: string;
  label: string;
  section: string;
  n: number;
  mean: number;
  topTwo: number; // share rating 4 or 5
  counts: number[]; // index 0..4 = rating 1..5
};

/** All responses, newest first, plus the latest one per email (what rankings use). */
export async function loadResponses(slug: string) {
  const rows = (await getSql()`
    SELECT id, name, email, answers, notified, created_at
    FROM survey_responses WHERE survey_slug = ${slug}
    ORDER BY created_at DESC`) as ResponseRow[];
  const seen = new Set<string>();
  const latest = rows.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
  return { all: rows, latest };
}

export function featureStats(survey: Survey, rows: ResponseRow[]): FeatureStat[] {
  return survey.sections
    .flatMap((s) =>
      s.questions.map((q) => {
        const counts = [0, 0, 0, 0, 0];
        for (const r of rows) {
          const v = r.answers.ratings?.[q.id];
          if (v >= 1 && v <= 5) counts[v - 1]++;
        }
        const n = counts.reduce((a, b) => a + b, 0);
        const sum = counts.reduce((a, c, i) => a + c * (i + 1), 0);
        return {
          id: q.id,
          label: q.label,
          section: s.title,
          n,
          mean: n ? sum / n : 0,
          topTwo: n ? (counts[3] + counts[4]) / n : 0,
          counts,
        };
      }),
    )
    .sort((a, b) => b.mean - a.mean || b.topTwo - a.topTwo);
}
