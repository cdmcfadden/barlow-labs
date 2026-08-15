"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Doc = {
  id: number;
  filename: string;
  size: number;
  content_type: string;
  uploaded_by: string;
  uploaded_at: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DocumentsArea() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs(data.docs);
    } catch {
      setDocs((d) => d ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const uploadFiles = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      if (file.size > 500 * 1024 * 1024) {
        setError(`${file.name} is over the 500 MB limit.`);
        continue;
      }
      setUploading((u) => [...u, file.name]);
      try {
        // Upload straight to Blob storage (bypasses API body-size limits),
        // then register the metadata so it shows up for everyone.
        const blob = await upload(`documents/${file.name}`, file, {
          access: "private",
          handleUploadUrl: "/api/documents/upload",
        });
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, filename: file.name, contentType: file.type }),
        });
        if (!res.ok) throw new Error();
        const { doc } = await res.json();
        setDocs((d) => (d ? [doc, ...d] : [doc]));
      } catch (e) {
        setError(
          `Failed to upload ${file.name}${e instanceof Error && e.message ? ` (${e.message})` : ""}.`
        );
      } finally {
        setUploading((u) => u.filter((n) => n !== file.name));
      }
    }
  };

  const deleteDoc = async (doc: Doc) => {
    if (!confirm(`Delete "${doc.filename}" for everyone?`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) setDocs((d) => (d ? d.filter((x) => x.id !== doc.id) : d));
  };

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold tracking-tight">Shared Documents</h2>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInput.current?.click()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-foreground/60 bg-muted/50"
            : "border-border hover:border-foreground/40"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          {dragging ? "Drop to upload" : "Drag files here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">Up to 500 MB per file</p>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploading.map((name) => (
        <p key={name} className="mt-2 text-sm text-muted-foreground">
          Uploading {name}…
        </p>
      ))}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {docs === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing shared yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <a
                href={`/api/documents/${doc.id}`}
                className="min-w-0 flex-1 truncate font-medium hover:underline underline-offset-4"
                download={doc.filename}
              >
                {doc.filename}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(Number(doc.size))}
              </span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {doc.uploaded_by} · {formatDate(doc.uploaded_at)}
              </span>
              <button
                onClick={() => deleteDoc(doc)}
                className="shrink-0 text-muted-foreground/50 hover:text-red-500 transition-colors"
                aria-label={`Delete ${doc.filename}`}
                title="Delete"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
