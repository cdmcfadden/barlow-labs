import type { Survey } from "./types";
import { realtorFeatures } from "./realtor-features";

const SURVEYS: Survey[] = [realtorFeatures];

export function getSurvey(slug: string): Survey | undefined {
  return SURVEYS.find((s) => s.slug === slug);
}

export function listSurveys(): Survey[] {
  return SURVEYS;
}
