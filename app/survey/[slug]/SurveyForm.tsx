"use client";

import { useMemo, useState, useTransition } from "react";
import { submitSurvey, type SubmitState } from "./actions";
import type { ScaleLabel, Survey } from "@/lib/surveys/types";

type Props = { survey: Pick<Survey, "slug" | "scale" | "sections" | "writeIns" | "writeInPrompt"> };

function RatingRow({
  name,
  value,
  onChange,
  scale,
  invalid,
  label,
}: {
  name: string;
  value: number | null;
  onChange: (v: number) => void;
  scale: ScaleLabel[];
  invalid?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} className="grid grid-cols-5 gap-1.5 sm:w-[340px] sm:shrink-0">
      {scale.map((s) => {
        const checked = value === s.value;
        return (
          <label
            key={s.value}
            title={s.long}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border px-1 py-2 text-center transition-colors focus-within:ring-2 focus-within:ring-ring ${
              checked
                ? "border-primary bg-primary text-primary-foreground"
                : invalid
                  ? "border-red-500/70 hover:border-accent"
                  : "border-border hover:border-accent hover:bg-secondary/60"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={s.value}
              checked={checked}
              onChange={() => onChange(s.value)}
              className="sr-only"
            />
            <span className="text-base font-semibold leading-none">{s.value}</span>
            <span className={`mt-1 text-[10px] leading-tight ${checked ? "" : "text-muted-foreground"}`}>{s.short}</span>
          </label>
        );
      })}
    </div>
  );
}

export function SurveyForm({ survey }: Props) {
  const questions = useMemo(() => survey.sections.flatMap((s) => s.questions), [survey]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [writeIns, setWriteIns] = useState(() =>
    Array.from({ length: survey.writeIns }, () => ({ feature: "", rating: null as number | null })),
  );
  const [state, setState] = useState<SubmitState>({ status: "idle", message: "" });
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const rated = questions.filter((q) => ratings[q.id]).length;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const gaps = new Set<string>();
    if (!name.trim()) gaps.add("name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) gaps.add("email");
    questions.forEach((q) => !ratings[q.id] && gaps.add(q.id));
    setMissing(gaps);
    if (gaps.size) {
      const first = [...gaps][0];
      document.getElementById(first === "name" || first === "email" ? first : `row_${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      const n = [...gaps].filter((g) => g !== "name" && g !== "email").length;
      setState({
        status: "error",
        message: gaps.has("name") || gaps.has("email")
          ? "Please add your name and a valid email at the top."
          : `Please rate every feature — ${n} still need a rating.`,
      });
      return;
    }
    startTransition(async () => {
      const result = await submitSurvey(survey.slug, state, fd);
      setState(result);
      if (result.missing) setMissing(new Set(result.missing));
      if (result.status === "success") window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-accent/40 bg-accent/5 p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Thank you{name ? `, ${name.split(" ")[0]}` : ""}.</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">{state.message}</p>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      {/* Honeypot */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">About you</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">Name</label>
            <input
              id="name" name="name" required autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${field} mt-1.5 ${missing.has("name") ? "border-red-500/70" : "border-border"}`}
              placeholder="Jane Agent"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${field} mt-1.5 ${missing.has("email") ? "border-red-500/70" : "border-border"}`}
              placeholder="you@brokerage.com"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-accent">How to rate</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
          {survey.scale.map((s) => (
            <li key={s.value}>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-secondary text-xs font-semibold text-foreground">{s.value}</span>
              {s.long}
            </li>
          ))}
        </ol>
      </section>

      {survey.sections.map((section) => (
        <section key={section.id}>
          <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
          {section.description && <p className="mt-2 text-muted-foreground">{section.description}</p>}
          <ol className="mt-5 divide-y divide-border rounded-lg border border-border bg-card">
            {section.questions.map((q) => {
              const n = questions.indexOf(q) + 1;
              const bad = missing.has(q.id) && !ratings[q.id];
              return (
                <li key={q.id} id={`row_${q.id}`} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 ${bad ? "bg-red-500/5" : ""}`}>
                  <div className="flex-1">
                    <p className="font-medium leading-snug">
                      <span className="mr-2 text-muted-foreground">{n}.</span>
                      {q.label}
                    </p>
                    {q.detail && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{q.detail}</p>}
                  </div>
                  <RatingRow
                    name={`q_${q.id}`} label={q.label} scale={survey.scale} invalid={bad}
                    value={ratings[q.id] ?? null}
                    onChange={(v) => setRatings((r) => ({ ...r, [q.id]: v }))}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {survey.writeIns > 0 && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">What are we missing?</h2>
          <p className="mt-2 text-muted-foreground">{survey.writeInPrompt}</p>
          <ol className="mt-5 divide-y divide-border rounded-lg border border-border bg-card">
            {writeIns.map((w, i) => (
              <li key={i} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex-1">
                  <label htmlFor={`writein_${i}`} className="block font-medium">
                    <span className="mr-2 text-muted-foreground">{questions.length + i + 1}.</span>
                    Feature idea {i + 1} <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    id={`writein_${i}`} name={`writein_${i}`} rows={2} value={w.feature}
                    onChange={(e) => setWriteIns((all) => all.map((x, j) => (j === i ? { ...x, feature: e.target.value } : x)))}
                    className={`${field} mt-1.5 border-border`}
                    placeholder="Describe a feature you'd want"
                  />
                </div>
                <div className="sm:pt-7">
                  <RatingRow
                    name={`writein_${i}_rating`} label={`Value of feature idea ${i + 1}`} scale={survey.scale}
                    value={w.rating}
                    onChange={(v) => setWriteIns((all) => all.map((x, j) => (j === i ? { ...x, rating: v } : x)))}
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="sticky bottom-0 -mx-6 border-t border-border/60 bg-background/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {rated} of {questions.length} features rated
          </p>
          <button
            type="submit" disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit survey"}
          </button>
        </div>
        {state.status === "error" && (
          <p className="mt-2 text-sm text-red-500" role="alert">{state.message}</p>
        )}
      </div>
    </form>
  );
}
