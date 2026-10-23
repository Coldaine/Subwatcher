#!/usr/bin/env node
/**
 * Verlauf der Tarife aus der Git-Historie (data/history.jsonl).
 *
 * Warum: die Website kennt nur den heutigen Stand. Aenderungen an Preis, Rate und
 * Quellenlage sollen sichtbar bleiben, ohne Handarbeit. Quelle ist die Git-Historie
 * selbst: jede Fassung von public/data/latest.json ist der Stand eines Tages.
 *
 * Ablauf: fehlende Tage werden aus der Historie nachgetragen (Backfill), dann kommt
 * heute dazu. Idempotent: ein Tag wird nie zweimal geschrieben. Eine Zeile pro Tag:
 *   {"date":"2026-10-13","plans":{"opencode-go":{"p":10,"t":93420000,"d":"disclosed"}, ...}}
 * p = tatsaechlich gezahlter Monatspreis in USD, t = Median Tokens pro Dollar,
 * d = Offenlegungsstatus. Kurz gehalten, damit die Datei klein bleibt.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA = join(ROOT, "public", "data", "latest.json");
const OUT = join(ROOT, "data", "history.jsonl");
const FILE_IN_GIT = "public/data/latest.json";
const MAX_BACKFILL_DAYS = 120;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};

function recordFrom(rawJson) {
  const d = JSON.parse(rawJson);
  const plans = {};
  for (const p of d.plans ?? []) {
    const paid = p.price?.paidPrice ?? p.price?.monthlyUsd ?? null;
    const rows = (p.modelRows ?? []).filter((r) => r.rawTokensPerMonth > 0);
    const t = paid > 0 && rows.length ? median(rows.map((r) => r.rawTokensPerMonth / paid)) : null;
    plans[p.id] = { p: paid, t, d: p.disclosure ?? "undisclosed" };
  }
  return { date: String(d.generatedAt ?? "").slice(0, 10), plans };
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// Vorhandene Tage einlesen
const lines = existsSync(OUT) ? readFileSync(OUT, "utf8").split("\n").filter(Boolean) : [];
const byDate = new Map();
for (const l of lines) {
  try {
    const r = JSON.parse(l);
    if (r?.date) byDate.set(r.date, r);
  } catch { /* kaputte Zeile ignorieren, wird neu geschrieben */ }
}

// Backfill: pro Tag der letzte Commit, der die Datei angefasst hat
let added = 0;
try {
  const log = git(["log", "--format=%H %ad", "--date=short", "--", FILE_IN_GIT]).trim().split("\n");
  const days = new Map(); // date -> sha (der letzte des Tages)
  for (const l of log) {
    const [sha, date] = l.split(" ");
    if (sha && date && !days.has(date)) days.set(date, sha);
  }
  const wanted = [...days.keys()].sort().slice(-MAX_BACKFILL_DAYS);
  for (const date of wanted) {
    if (byDate.has(date)) continue;
    try {
      const rec = recordFrom(git(["show", `${days.get(date)}:${FILE_IN_GIT}`]));
      rec.date = date;
      if (Object.keys(rec.plans).length) { byDate.set(date, rec); added++; }
    } catch { /* Fassung nicht lesbar: Tag auslassen */ }
  }
} catch (e) {
  console.error(`history: Historie nicht lesbar (${e.message}), schreibe nur den heutigen Stand`);
}

// Heute dazu
const today = recordFrom(readFileSync(DATA, "utf8"));
if (today.date && Object.keys(today.plans).length) {
  const existing = byDate.get(today.date);
  // Tag erneut geschrieben, wenn sich etwas geaendert hat (spaeterer Lauf am selben Tag)
  if (!existing || JSON.stringify(existing.plans) !== JSON.stringify(today.plans)) {
    byDate.set(today.date, today);
    added++;
  }
}

const sorted = [...byDate.keys()].sort();
writeFileSync(OUT, sorted.map((d) => JSON.stringify(byDate.get(d))).join("\n") + "\n");
console.log(`history: ${sorted.length} Tage (${sorted[0]} bis ${sorted[sorted.length - 1]}), ${added} neu/aktualisiert`);
