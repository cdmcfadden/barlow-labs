"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bootstrapper } from "@/lib/db";

const COLUMNS: {
  key: keyof Omit<Bootstrapper, "id">;
  label: string;
  width?: string;
  options?: string[];
}[] = [
  { key: "bootstrapper", label: "Bootstrapper", width: "w-44" },
  {
    key: "category",
    label: "Category",
    width: "w-36",
    options: ["Founder", "Founder-Curious", "Side Projects"],
  },
  { key: "product", label: "Product", width: "w-44" },
  {
    key: "stage",
    label: "Stage",
    width: "w-40",
    options: [
      "Ideation",
      "POC",
      "Development",
      "MVP",
      "Early Distribution",
      "Active Sales",
      "Launched",
      "On Hold",
      "TBD",
    ],
  },
  { key: "hrs_wk", label: "Hrs / Wk", width: "w-24", options: ["<10", "10-40", ">40"] },
  {
    key: "ask",
    label: "Ask",
    width: "w-32",
    options: ["Testing", "Advice / Input", "TBD", "N/A"],
  },
  { key: "notes", label: "Notes" },
];

export default function BootstrapperTable() {
  const [rows, setRows] = useState<Bootstrapper[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bootstrappers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows);
      setError(null);
    } catch {
      // Only surface load errors when we have nothing to show; a failed
      // background poll shouldn't wipe out a table that's already rendered.
      setRows((r) => {
        if (!r) setError("Couldn't load the table. Refresh to try again.");
        return r;
      });
    }
  }, []);

  useEffect(() => {
    load();
    // Light polling so everyone sees each other's edits without a manual refresh.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const flashSaved = () => {
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 1500);
  };

  const saveCell = async (id: number, field: string, value: string) => {
    setSaving((n) => n + 1);
    try {
      const res = await fetch(`/api/bootstrappers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
      if (!res.ok) throw new Error();
      flashSaved();
    } catch {
      setError("A change failed to save. Refresh to see the current data.");
    } finally {
      setSaving((n) => n - 1);
    }
  };

  const addRow = async () => {
    const res = await fetch("/api/bootstrappers", { method: "POST" });
    if (res.ok) {
      const { row } = await res.json();
      setRows((r) => (r ? [...r, row] : [row]));
    }
  };

  const deleteRow = async (id: number) => {
    if (!confirm("Delete this row for everyone?")) return;
    const res = await fetch(`/api/bootstrappers/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => (r ? r.filter((row) => row.id !== id) : r));
  };

  if (error) return <p className="mt-8 text-sm text-red-500">{error}</p>;
  if (!rows) return <p className="mt-8 text-sm text-muted-foreground">Loading table…</p>;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Bootstrapper Details</h2>
        <span className="text-xs text-muted-foreground">
          {saving > 0 ? "Saving…" : justSaved ? "Saved" : "Click any cell to edit"}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.width ?? ""}`}>
                  {c.label}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-1 py-0.5">
                    {c.options ? (
                      <select
                        className="w-full appearance-none rounded bg-transparent px-2 py-1.5 outline-none focus:bg-background focus:ring-1 focus:ring-foreground/30 [&>option]:bg-background [&>option]:text-foreground"
                        value={row[c.key]}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRows((r) =>
                            r ? r.map((x) => (x.id === row.id ? { ...x, [c.key]: value } : x)) : r
                          );
                          saveCell(row.id, c.key, value);
                        }}
                      >
                        {row[c.key] === "" && <option value="" />}
                        {!c.options.includes(row[c.key]) && row[c.key] !== "" && (
                          <option value={row[c.key]}>{row[c.key]}</option>
                        )}
                        {c.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="w-full rounded bg-transparent px-2 py-1.5 outline-none focus:bg-background focus:ring-1 focus:ring-foreground/30"
                        defaultValue={row[c.key]}
                        onBlur={(e) => {
                          if (e.target.value !== row[c.key]) {
                            row[c.key] = e.target.value;
                            saveCell(row.id, c.key, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                      />
                    )}
                  </td>
                ))}
                <td className="px-2 py-0.5 text-center">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-muted-foreground/50 hover:text-red-500 transition-colors"
                    aria-label="Delete row"
                    title="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="mt-3 rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
      >
        + Add row
      </button>
    </div>
  );
}
