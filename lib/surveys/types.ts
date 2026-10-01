/**
 * A survey is plain data. Adding a new one is a new file in this folder plus
 * one line in ./index.ts; it is then live at /survey/<slug> and its results at
 * /members/surveys/<slug>.
 */

export type RatingQuestion = {
  id: string; // stable key stored with each answer — never rename once live
  label: string;
  detail?: string;
};

export type RatingSection = {
  id: string;
  title: string;
  description?: string;
  questions: RatingQuestion[];
};

export type ScaleLabel = { value: 1 | 2 | 3 | 4 | 5; short: string; long: string };

export type Survey = {
  slug: string;
  title: string;
  /** Shown under the title. */
  intro: string;
  /** Who the survey is for, shown in the notification email. */
  audience: string;
  scale: ScaleLabel[];
  sections: RatingSection[];
  /** Number of "suggest your own feature" write-ins, each with its own 1–5 rating. */
  writeIns: number;
  writeInPrompt: string;
  thankYou: string;
};

export type SurveyAnswers = {
  ratings: Record<string, number>;
  writeIns: { feature: string; rating: number | null }[];
};

export const DEFAULT_SCALE: ScaleLabel[] = [
  { value: 1, short: "No value", long: "No value or negative value — would not use" },
  { value: 2, short: "Curious", long: "Mildly curious" },
  { value: 3, short: "Might use", long: "Interested, might use" },
  { value: 4, short: "Want it", long: "Great feature — want it" },
  { value: 5, short: "Must have", long: "Must-have feature, very valuable" },
];

export function allQuestions(survey: Survey): RatingQuestion[] {
  return survey.sections.flatMap((s) => s.questions);
}
