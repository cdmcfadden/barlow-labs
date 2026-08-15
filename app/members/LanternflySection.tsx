"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Fly = {
  id: number;
  builder_sub: string;
  builder_name: string;
  title: string;
  description: string;
  effort_minutes: number;
  slots: number;
  access_directions: string;
  credits: number;
  created_at: string;
};

type Assignment = {
  id: number;
  lanternfly_id: number;
  tester_sub: string;
  tester_name: string;
  credits: number;
  notes: string;
  status: string;
  confirmed: boolean;
};

type ResultFile = {
  id: number;
  assignment_id: number;
  filename: string;
  size: number;
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_process: "In process",
  completed: "Completed",
  problem: "Problem",
};

function formatEffort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
}

export default function LanternflySection({ me }: { me: { sub: string; name: string } }) {
  const [flies, setFlies] = useState<Fly[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [files, setFiles] = useState<ResultFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Create-form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [effort, setEffort] = useState("20");
  const [effortUnit, setEffortUnit] = useState<"minutes" | "hours">("minutes");
  const [slots, setSlots] = useState("1");
  const [access, setAccess] = useState("");

  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/lanternflies");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFlies(data.flies);
      setAssignments(data.assignments);
      setFiles(data.files);
    } catch {
      setFlies((f) => f ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const effortMinutes = () => {
    const n = Number(effort);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(effortUnit === "hours" ? n * 60 : n);
  };
  const previewCredits = () => {
    const m = effortMinutes();
    return m > 0 ? Math.max(1, Math.ceil(m / 20)) : 0;
  };

  const createFly = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lanternflies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          effortMinutes: effortMinutes(),
          slots: Number(slots),
          accessDirections: access,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create");
      }
      setTitle("");
      setDescription("");
      setEffort("20");
      setEffortUnit("minutes");
      setSlots("1");
      setAccess("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create lanternfly.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<Response>) => {
    setError(null);
    const res = await fn();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Something went wrong.");
    }
    await load();
  };

  const signUp = (fly: Fly) =>
    act(() => fetch(`/api/lanternflies/${fly.id}/signup`, { method: "POST" }));

  const setStatus = (a: Assignment, status: string) =>
    act(() =>
      fetch(`/api/assignments/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    );

  const saveNotes = (a: Assignment, notes: string) => {
    if (noteTimers.current[a.id]) clearTimeout(noteTimers.current[a.id]);
    noteTimers.current[a.id] = setTimeout(() => {
      fetch(`/api/assignments/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    }, 800);
  };

  const confirmComplete = (a: Assignment) =>
    act(() => fetch(`/api/assignments/${a.id}/confirm`, { method: "POST" }));

  const uploadResult = async (a: Assignment, fileList: FileList) => {
    setError(null);
    for (const file of Array.from(fileList)) {
      try {
        const blob = await upload(`lanternfly-results/${a.id}/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/documents/upload",
        });
        const res = await fetch(`/api/assignments/${a.id}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, filename: file.name }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setError(`Failed to upload ${file.name}.`);
      }
    }
    await load();
  };

  if (flies === null)
    return (
      <div className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Lanternflies</h2>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Lanternflies</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Test requests from fellow builders. Take a slot, test their product, earn karma —
            1 credit per 20 minutes of estimated effort.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="shrink-0 rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          {showForm ? "Cancel" : "+ New lanternfly"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {showForm && (
        <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              What to test ({100 - title.length} characters left)
            </label>
            <input
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short name of the bug or flow to test"
              className="mt-1 w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What should testers do? What are you trying to learn?"
              className="mt-1 w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              How to access the app (URL, TestFlight link, credentials, etc.)
            </label>
            <textarea
              value={access}
              onChange={(e) => setAccess(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Effort per tester</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                  className="w-20 rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
                <select
                  value={effortUnit}
                  onChange={(e) => setEffortUnit(e.target.value as "minutes" | "hours")}
                  className="rounded border border-border bg-transparent px-2 py-2 text-sm outline-none [&>option]:bg-background"
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tester slots</label>
              <input
                type="number"
                min={1}
                max={50}
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
                className="mt-1 block w-20 rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
            </div>
            <p className="pb-2 text-sm text-muted-foreground">
              Worth <span className="font-semibold text-foreground">{previewCredits()}</span>{" "}
              karma per tester
            </p>
            <button
              onClick={createFly}
              disabled={busy || !title.trim() || effortMinutes() < 1}
              className="ml-auto rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Creating…" : "Release the lanternfly"}
            </button>
          </div>
        </div>
      )}

      {flies.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No lanternflies yet. Release one to get your product tested.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {flies.map((fly) => {
            const flyAssignments = assignments.filter((a) => a.lanternfly_id === fly.id);
            const slotsLeft = fly.slots - flyAssignments.length;
            const mine = fly.builder_sub === me.sub;
            const alreadyIn = flyAssignments.some((a) => a.tester_sub === me.sub);
            return (
              <div key={fly.id} className="rounded-lg border border-border">
                <div className="flex flex-wrap items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{fly.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      by {fly.builder_name} · {formatEffort(fly.effort_minutes)} per tester ·{" "}
                      <span className="font-medium text-foreground">{fly.credits} karma</span> ·{" "}
                      {slotsLeft} of {fly.slots} slot{fly.slots === 1 ? "" : "s"} open
                    </p>
                    {fly.description && (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {fly.description}
                      </p>
                    )}
                    {fly.access_directions && (
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        <span className="text-muted-foreground">Access: </span>
                        {fly.access_directions}
                      </p>
                    )}
                  </div>
                  {!mine && !alreadyIn && slotsLeft > 0 && (
                    <button
                      onClick={() => signUp(fly)}
                      className="shrink-0 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    >
                      Take a slot
                    </button>
                  )}
                </div>

                {flyAssignments.length > 0 && (
                  <ul className="divide-y divide-border border-t border-border">
                    {flyAssignments.map((a) => {
                      const isTester = a.tester_sub === me.sub;
                      const aFiles = files.filter((f) => f.assignment_id === a.id);
                      return (
                        <li key={a.id} className="bg-muted/20 px-4 py-3 pl-8">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-medium">{a.tester_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {a.credits} karma
                            </span>
                            {a.confirmed ? (
                              <span className="rounded bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-500">
                                Confirmed — karma paid
                              </span>
                            ) : isTester ? (
                              <select
                                value={a.status}
                                onChange={(e) => setStatus(a, e.target.value)}
                                className="rounded border border-border bg-transparent px-2 py-1 text-xs outline-none [&>option]:bg-background"
                              >
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-medium ${
                                  a.status === "completed"
                                    ? "bg-green-500/15 text-green-500"
                                    : a.status === "problem"
                                      ? "bg-red-500/15 text-red-500"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {STATUS_LABELS[a.status] ?? a.status}
                              </span>
                            )}
                            {mine && !a.confirmed && a.status === "completed" && (
                              <button
                                onClick={() => confirmComplete(a)}
                                className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                              >
                                Confirm complete → pay {a.credits} karma
                              </button>
                            )}
                          </div>

                          {isTester && !a.confirmed ? (
                            <textarea
                              defaultValue={a.notes}
                              onChange={(e) => saveNotes(a, e.target.value)}
                              rows={2}
                              placeholder="Notes for the builder…"
                              className="mt-2 w-full rounded border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
                            />
                          ) : (
                            a.notes && (
                              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                {a.notes}
                              </p>
                            )
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                            {aFiles.map((f) => (
                              <a
                                key={f.id}
                                href={`/api/assignment-files/${f.id}`}
                                download={f.filename}
                                className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                              >
                                📎 {f.filename}
                              </a>
                            ))}
                            {isTester && !a.confirmed && (
                              <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                                + Upload results
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.length) uploadResult(a, e.target.files);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
