#!/usr/bin/env node
/**
 * Changelog aus der Git-Historie erzeugen (data/changelog.yml).
 *
 * Der Changelog wird NICHT von Hand gepflegt: dieses Skript liest die
 * Commit-Betreffzeilen, wirft internes Rauschen raus (Sync-, Daten-, Test- und
 * CI-Commits) und schreibt daraus data/changelog.yml, das build.mjs in
 * latest.json uebernimmt. Die CI ruft es vor jedem Build auf, damit die Seite
 * ohne Zutun aktuell bleibt.
 *
 * Rein ableitend: die Datei ist eine Funktion der Git-Historie, zweimal laufen
 * ergibt dieselbe Datei. Handgeschriebene Eintraege aus der Zeit davor liegen
 * in data/changelog-archive.yml.
 *
 * Sprache: die Commit-Betreffzeilen sind englisch, deshalb steht derselbe Text
 * in `text` und `textEn` (Englisch genuegt, so gewuenscht).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FILE = join(ROOT, "data", "changelog.yml");
const MAX_ENTRIES = 100;
const LOG_LIMIT = 600;

// Internes Rauschen: Sync-Laeufe, Datenstand, Tests, CI, Reverts.
const SKIP = [
  /^chore\((web|data|ci|deps)\)/i,
  /^chore:\s/i,
  /^test[(:]/i,
  /^Merge\b/i,
  /^Revert\b/i,
  /^build[(:]/i,
];
// Typ-Praefix entfernen: "fix(web): Titel" -> "Titel"
const PREFIX = /^[a-z]+(\([^)]*\))?!?:\s*/i;

function gitCommits() {
  const raw = execFileSync(
    "git",
    ["log", "--no-merges", "-n", String(LOG_LIMIT), "--date=short", "--pretty=format:%h\x1f%ad\x1f%s"],
    { cwd: ROOT, encoding: "utf8" },
  );
  const seen = new Set();
  const out = [];
  for (const line of raw.split("\n")) {
    const [sha, date, subject] = line.trim().split("\x1f");
    if (!sha || !date || !subject) continue;
    if (SKIP.some((re) => re.test(subject))) continue;
    const text = subject.replace(PREFIX, "").trim();
    if (!text) continue;
    const key = `${date}|${text}`;
    if (seen.has(key)) continue; // gleicher Betreff am selben Tag: einmal reicht
    seen.add(key);
    out.push({ date, commit: sha, text: text.charAt(0).toUpperCase() + text.slice(1) });
  }
  return out;
}

function quote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function main() {
  const entries = gitCommits()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, MAX_ENTRIES);

  const lines = [
    "# ERZEUGT von scripts/changelog-from-git.mjs — nicht von Hand pflegen.",
    "# Quelle: Commit-Betreffzeilen (ohne Sync-, Daten-, Test- und CI-Commits),",
    "# neueste zuerst. Die CI schreibt die Datei vor jedem Build neu.",
    "# Handgeschriebene Eintraege von vorher: data/changelog-archive.yml.",
    "entries:",
  ];
  for (const e of entries) {
    // Datum und SHA gequotet: ein SHA wie 9e88544 liest YAML sonst als Zahl
    // (bzw. als Infinity) und kommt als null in latest.json an.
    lines.push(`  - date: "${e.date}"`);
    lines.push(`    commit: "${e.commit}"`);
    lines.push(`    text: ${quote(e.text)}`);
    lines.push(`    textEn: ${quote(e.text)}`);
  }
  const yml = lines.join("\n") + "\n";

  const before = (() => { try { return readFileSync(FILE, "utf8"); } catch { return ""; } })();
  if (before === yml) {
    console.log(`changelog.yml unveraendert (${entries.length} Eintraege)`);
    return;
  }
  writeFileSync(FILE, yml);
  console.log(`changelog.yml geschrieben: ${entries.length} Eintraege aus Commits`);
}

main();
