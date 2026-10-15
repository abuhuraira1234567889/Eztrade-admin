import { getApi, patchApi } from "@/services/api";

export type SurveyOption = { id?: string; slug: string; label: string; sortOrder?: number; isActive: boolean };
export type SurveySection = {
  id?: string;
  key: string;
  title: string;
  prompt: string;
  sortOrder?: number;
  isActive: boolean;
  options: SurveyOption[];
};
export type SurveyConfig = { isEnabled: boolean; title: string; subtitle: string; sections: SurveySection[] };

export type ItemStat = {
  slug: string;
  label: string;
  isActive: boolean;
  rank: number | null;
  avgPosition: number | null;
  firstCount: number;
  pctFirst: number;
  top3Count: number;
  pctTop3: number;
  responses: number;
  rankDelta: number | null;
};
export type FeedbackSummary = {
  totalResponses: number;
  legacyResponses: number;
  generatedAt: string;
  responsesByDay: { date: string; count: number }[];
  sections: { key: string; label: string; isActive: boolean; items: ItemStat[] }[];
};

export function fetchFeedbackSummary() {
  return getApi<FeedbackSummary>("/api/admin/product-feedback");
}

/** Full survey definition, inactive steps/items included. */
export function fetchSurvey() {
  return getApi<SurveyConfig>("/api/admin/product-feedback/survey");
}

/** Replace the survey. Steps/items left out are deactivated server-side (never deleted). */
export function saveSurvey(survey: SurveyConfig) {
  return patchApi<SurveyConfig>("/api/admin/product-feedback/survey", survey);
}
