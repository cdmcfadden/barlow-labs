import { getSurvey } from "@/lib/surveys";
import { loadResponses } from "@/lib/surveys/results";
import { allQuestions } from "@/lib/surveys/types";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Gated by middleware (matcher covers /members/*).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const survey = getSurvey(slug);
  if (!survey) return new Response("Not found", { status: 404 });
  const { all } = await loadResponses(slug);
  const qs = allQuestions(survey);
  const header = ["submitted_at", "name", "email", ...qs.map((q) => q.id)];
  for (let i = 0; i < survey.writeIns; i++) header.push(`writein_${i + 1}`, `writein_${i + 1}_rating`);
  const lines = [header.join(",")];
  for (const r of all) {
    const row: unknown[] = [new Date(r.created_at).toISOString(), r.name, r.email, ...qs.map((q) => r.answers.ratings?.[q.id])];
    for (let i = 0; i < survey.writeIns; i++) {
      const w = r.answers.writeIns?.[i];
      row.push(w?.feature, w?.rating);
    }
    lines.push(row.map(cell).join(","));
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-responses.csv"`,
    },
  });
}
