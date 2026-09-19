"use client";

import { useState } from "react";

type Bin = { start: number; end: number; created: number; shipped: number; backlog: number };

// Validated as a pair against the card surface (#171c26): CVD ΔE 26.8,
// both ≥ 3:1. Values and labels stay in text colours, never these.
const CREATED = "#3987e5";
const SHIPPED = "#d95926";
// The backlog rides a different scale (hundreds against tens), so it gets its
// own panel below rather than a second y-axis on the same plot.
const BACKLOG = "#c98500";

const BH = 96; // backlog panel height

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 32 };

function fmt(t: number) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function FlowChart({ series, daily }: { series: Bin[]; daily: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.flatMap((b) => [b.created, b.shipped]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / series.length;
  const bar = Math.min(18, (band - 10) / 2);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const labelEvery = Math.ceil(series.length / 7);
  const bStep = niceStep(Math.max(1, ...series.map((b) => b.backlog)));

  return (
    <figure className="relative">
      <div className="mb-3 flex items-center gap-5 text-sm text-muted-foreground">
        <Legend color={CREATED} label="Created" />
        <Legend color={SHIPPED} label="Shipped to Live" />
        <Legend color={BACKLOG} label="Backlog (open tickets)" dashed />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Tickets created and shipped to Live over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="hsl(220 20% 22%)" strokeWidth={t === 0 ? 1 : 0.5} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="hsl(40 20% 65%)">
              {t}
            </text>
          </g>
        ))}
        {series.map((b, i) => {
          const cx = PAD.left + band * i + band / 2;
          return (
            <g key={b.end} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} fill={hover === i ? "hsl(220 20% 18% / 0.6)" : "transparent"} />
              <Bar x={cx - bar - 1} w={bar} y0={y(0)} y1={y(b.created)} color={CREATED} />
              <Bar x={cx + 1} w={bar} y0={y(0)} y1={y(b.shipped)} color={SHIPPED} />
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="hsl(40 20% 65%)">
                  {fmt(daily ? b.end - 1 : b.start)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <svg
        viewBox={`0 0 ${W} ${BH}`}
        className="w-full h-auto"
        role="img"
        aria-label="Open tickets at the end of each period"
      >
        {(() => {
          const bTop = Math.ceil(Math.max(1, ...series.map((b) => b.backlog)) / bStep) * bStep;
          const by = (v: number) => 18 + (BH - 30) - (v / bTop) * (BH - 30);
          const x = (i: number) => PAD.left + band * i + band / 2;
          const path = series.map((b, i) => `${i ? "L" : "M"}${x(i)},${by(b.backlog)}`).join(" ");
          const last = series.at(-1)!;
          return (
            <>
              <text x={PAD.left} y={10} fontSize={11} fill="hsl(40 20% 65%)">
                Backlog: open tickets at each period end
              </text>
              {[0, bTop].map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={by(t)} y2={by(t)} stroke="hsl(220 20% 22%)" strokeWidth={t === 0 ? 1 : 0.5} />
                  <text x={PAD.left - 8} y={by(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="hsl(40 20% 65%)">
                    {t}
                  </text>
                </g>
              ))}
              <path d={path} fill="none" stroke={BACKLOG} strokeWidth={2} strokeDasharray="5 4" />
              {hover !== null && (
                <circle cx={x(hover)} cy={by(series[hover].backlog)} r={4} fill={BACKLOG} stroke="hsl(220 25% 12%)" strokeWidth={2} />
              )}
              <text x={W - PAD.right} y={by(last.backlog) - 8} textAnchor="end" fontSize={11} fill="hsl(40 20% 65%)">
                {last.backlog}
              </text>
            </>
          );
        })()}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-8 rounded-md border bg-[hsl(220_25%_10%)] px-3 py-2 text-sm shadow-lg"
          style={{ left: `clamp(0px, ${((PAD.left + band * hover + band / 2) / W) * 100}% - 70px, calc(100% - 150px))` }}
        >
          <div className="text-muted-foreground">
            {daily ? fmt(series[hover].end - 1) : `${fmt(series[hover].start)} – ${fmt(series[hover].end)}`}
          </div>
          <Row color={CREATED} label="Created" value={series[hover].created} />
          <Row color={SHIPPED} label="Shipped" value={series[hover].shipped} />
          <Row color={BACKLOG} label="Backlog" value={series[hover].backlog} dashed />
        </div>
      )}
    </figure>
  );
}

function Bar({ x, w, y0, y1, color }: { x: number; w: number; y0: number; y1: number; color: string }) {
  const h = y0 - y1;
  if (h <= 0) return null;
  const r = Math.min(4, h, w / 2);
  // Rounded at the data end only; square where it meets the baseline.
  return (
    <path
      d={`M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`}
      fill={color}
    />
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {dashed ? (
        <svg width="16" height="10" aria-hidden>
          <line x1="0" y1="5" x2="16" y2="5" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
        </svg>
      ) : (
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}

function Row({ color, label, value, dashed }: { color: string; label: string; value: number; dashed?: boolean }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      {dashed ? (
        <svg width="12" height="8" aria-hidden>
          <line x1="0" y1="4" x2="12" y2="4" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
      ) : (
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
      )}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-4 tabular-nums">{value}</span>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  // Tickets are whole; a 0.5 gridline would be a lie.
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag);
}
