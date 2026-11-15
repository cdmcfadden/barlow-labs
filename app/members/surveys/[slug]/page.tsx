import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurvey } from "@/lib/surveys";
import { choiceStats, featureStats, loadResponses, type FeatureStat } from "@/lib/surveys/results";
import { scaleFor, type ScaleLabel } from "@/lib/surveys/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Survey results | Barlow Labs" };

// Rating 1 → 5, cold to warm, readable on the dark theme.
const SHADES = ["#64748b", "#94a3b8", "#fcd34d", "#f59e0b", "#ea580c"];

export default async function SurveyResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const survey = getSurvey(slug);
  if (!survey) notFound();

  const { all, latest } = await loadResponses(slug);
  const stats = featureStats(survey, latest);
  const choices = choiceStats(survey, latest);
  const perSection = survey.sections.some((s) => s.scale);
  const writeIns = latest.flatMap((r) => (r.answers.writeIns ?? []).map((w) => ({ ...w, name: r.name, email: r.email })));
  writeIns.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const fmt = (d: string) => new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" });

  const renderTable = (rows: FeatureStat[], scale: ScaleLabel[]) => (
    <>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {scale.map((s, i) => (
          <span key={s.value} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SHADES[i] }} />
            {s.value} {s.short}
          </span>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-card text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Feature</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Avg</th>
              <th className="px-3 py-2 text-right font-medium">Want it</th>
              <th className="px-3 py-2 font-medium">Distribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((f, i) => (
              <tr key={f.id}>
                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2">{f.label}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${f.tag === "Today" ? "bg-secondary text-foreground" : "bg-accent/15 text-accent"}`}>
                    {f.tag}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{f.n ? f.mean.toFixed(2) : "–"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{f.n ? `${Math.round(f.topTwo * 100)}%` : "–"}</td>
                <td className="px-3 py-2">
                  <div className="flex h-3 w-48 overflow-hidden rounded-sm bg-muted" title={f.counts.map((c, j) => `${j + 1}: ${c}`).join("  ")}>
                    {f.n > 0 && f.counts.map((c, j) => c > 0 && <span key={j} style={{ width: `${(c / f.n) * 100}%`, background: SHADES[j] }} />)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </>
  );

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm text-muted-foreground">
        <Link href="/members/surveys" className="underline underline-offset-4 hover:text-foreground">Surveys</Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{survey.title}</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        {latest.length} {latest.length === 1 ? "respondent" : "respondents"}
        {all.length > latest.length ? ` (${all.length} submissions; rankings use each person's latest)` : ""}.
        Public link:{" "}
        <a href={`/survey/${slug}`} className="underline underline-offset-4 hover:text-foreground">barlow-labs.com/survey/{slug}</a>
        {" · "}
        <a href={`/members/surveys/${slug}/csv`} className="underline underline-offset-4 hover:text-foreground">Download CSV</a>
      </p>

      {perSection ? (
        survey.sections.map((sec) => {
          const rows = stats.filter((f) => f.sectionId === sec.id);
          const scale = scaleFor(survey, sec);
          return (
            <div key={sec.id}>
              <h2 className="mt-12 text-xl font-semibold">{sec.title}, ranked by average rating</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Bar shows how ratings split from 1 ({scale[0].long.toLowerCase()}) to 5 ({scale[4].long.toLowerCase()}). &ldquo;Top two&rdquo; is the share who rated 4 or 5.
              </p>
              {renderTable(rows, scale)}
            </div>
          );
        })
      ) : (
        <>
      <h2 className="mt-12 text-xl font-semibold">Features ranked by average rating</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bar shows how ratings split from 1 (no value) to 5 (must have). &ldquo;Want it&rdquo; is the share who rated 4 or 5.
      </p>
          {renderTable(stats, survey.scale)}
        </>
      )}

      {choices.map((c) => (
        <div key={c.id}>
          <h2 className="mt-12 text-xl font-semibold">{c.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.n} {c.n === 1 ? "answer" : "answers"}.</p>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {c.options.map((o) => (
              <li key={o.value} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="w-56 shrink-0">{o.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-sm bg-muted">
                  <span className="block h-full bg-accent" style={{ width: `${c.n ? (o.count / c.n) * 100 : 0}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">
                  {o.count}{c.n ? ` · ${Math.round((o.count / c.n) * 100)}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2 className="mt-12 text-xl font-semibold">Feature ideas from respondents</h2>
      {writeIns.length ? (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {writeIns.map((w, i) => (
            <li key={i} className="flex gap-4 px-4 py-3 text-sm">
              <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{w.rating ? `${w.rating} · ${survey.scale[w.rating - 1].short}` : "unrated"}</span>
              <span className="flex-1">{w.feature}</span>
              <span className="shrink-0 text-muted-foreground">{w.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">None yet.</p>
      )}

      <h2 className="mt-12 text-xl font-semibold">Responses</h2>
      {all.length ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-card text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Submitted</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Emailed to team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {all.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-muted-foreground">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2"><a href={`mailto:${r.email}`} className="underline underline-offset-4">{r.email}</a></td>
                  <td className="px-3 py-2 text-muted-foreground">{r.notified ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No responses yet. Share the public link above.</p>
      )}
    </section>
  );
}
