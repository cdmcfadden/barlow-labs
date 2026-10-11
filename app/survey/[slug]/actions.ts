"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { getSql } from "@/lib/db";
import { getSurvey } from "@/lib/surveys";
import { allQuestions, type Survey, type SurveyAnswers } from "@/lib/surveys/types";

export type SubmitState = {
  status: "idle" | "success" | "error";
  message: string;
  missing?: string[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rating(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export async function submitSurvey(
  slug: string,
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const survey = getSurvey(slug);
  if (!survey) return { status: "error", message: "This survey no longer exists." };

  // Honeypot: real people never see or fill this field.
  if (String(formData.get("company_website") ?? "").trim()) {
    return { status: "success", message: survey.thankYou };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  if (!name) return { status: "error", message: "Please enter your name.", missing: ["name"] };
  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Please enter a valid email address.", missing: ["email"] };
  }

  const ratings: Record<string, number> = {};
  const missing: string[] = [];
  for (const q of allQuestions(survey)) {
    const r = rating(formData.get(`q_${q.id}`));
    if (r === null) missing.push(q.id);
    else ratings[q.id] = r;
  }
  if (missing.length) {
    return {
      status: "error",
      message: `Please rate every feature — ${missing.length} still need a rating.`,
      missing,
    };
  }

  const writeIns: SurveyAnswers["writeIns"] = [];
  for (let i = 0; i < survey.writeIns; i++) {
    const feature = String(formData.get(`writein_${i}`) ?? "").trim().slice(0, 1000);
    const r = rating(formData.get(`writein_${i}_rating`));
    if (feature) writeIns.push({ feature, rating: r });
  }

  const answers: SurveyAnswers = { ratings, writeIns };
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 400);

  let id: number;
  try {
    const sql = getSql();
    const rows = (await sql`
      INSERT INTO survey_responses (survey_slug, name, email, answers, user_agent)
      VALUES (${slug}, ${name}, ${email}, ${JSON.stringify(answers)}::jsonb, ${userAgent})
      RETURNING id`) as { id: number }[];
    id = rows[0].id;
  } catch (err) {
    console.error("Survey save failed", err);
    return { status: "error", message: "We couldn't save your answers. Please try again." };
  }

  // The response is saved; a failed email must not make the respondent redo it.
  try {
    if (await notify(survey, id, name, email, answers)) {
      await getSql()`UPDATE survey_responses SET notified = true WHERE id = ${id}`;
    }
  } catch (err) {
    console.error("Survey notification failed", err);
  }

  return { status: "success", message: survey.thankYou };
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function notify(
  survey: Survey,
  id: number,
  name: string,
  email: string,
  answers: SurveyAnswers,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; survey response", id, "saved without notification");
    return false;
  }
  const to = process.env.SURVEY_NOTIFY_EMAIL ?? "hello@yoova.com";
  const from = process.env.SURVEY_FROM_EMAIL ?? "Barlow Labs Surveys <surveys@barlow-labs.com>";
  const site = process.env.SITE_URL ?? "https://barlow-labs.com";
  const label = (v: number | null) => (v ? `${v} · ${survey.scale[v - 1].short}` : "not rated");

  const sectionsHtml = survey.sections
    .map(
      (s) =>
        `<h3 style="margin:20px 0 6px">${esc(s.title)}</h3><table cellpadding="4" style="border-collapse:collapse">` +
        s.questions
          .map(
            (q) =>
              `<tr><td style="border-bottom:1px solid #eee">${esc(q.label)}</td>` +
              `<td style="border-bottom:1px solid #eee;white-space:nowrap"><strong>${esc(label(answers.ratings[q.id]))}</strong></td></tr>`,
          )
          .join("") +
        `</table>`,
    )
    .join("");
  const writeInHtml = answers.writeIns.length
    ? `<h3 style="margin:20px 0 6px">Their own feature ideas</h3><ul>` +
      answers.writeIns.map((w) => `<li>${esc(w.feature)} — <strong>${esc(label(w.rating))}</strong></li>`).join("") +
      `</ul>`
    : `<p><em>No write-in features.</em></p>`;
  const sectionsText = survey.sections
    .map((s) => `${s.title}\n` + s.questions.map((q) => `  ${label(answers.ratings[q.id])}  ${q.label}`).join("\n"))
    .join("\n\n");
  const writeInText = answers.writeIns.map((w) => `  ${label(w.rating)}  ${w.feature}`).join("\n") || "  none";
  const resultsUrl = `${site}/members/surveys/${survey.slug}`;

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to,
    replyTo: email,
    subject: `New survey response: ${survey.title} — ${name}`,
    html:
      `<p><strong>${esc(name)}</strong> (${esc(email)}) completed <strong>${esc(survey.title)}</strong>.</p>` +
      sectionsHtml +
      writeInHtml +
      `<p style="margin-top:24px"><a href="${resultsUrl}">See all responses and rankings</a></p>`,
    text:
      `${name} (${email}) completed ${survey.title}.\n\n${sectionsText}\n\nTheir own feature ideas\n${writeInText}\n\n` +
      `All responses: ${resultsUrl}`,
  });
  if (error) {
    console.error("Resend error", error);
    return false;
  }
  return true;
}
