import type { Survey } from "./types";
import { realtorFeatures } from "./realtor-features";
import { appTesterFeedback } from "./app-tester-feedback";

const SURVEYS: Survey[] = [realtorFeatures, appTesterFeedback];

export function getSurvey(slug: string): Survey | undefined {
  return SURVEYS.find((s) => s.slug === slug);
}

export function listSurveys(): Survey[] {
  return SURVEYS;
}
