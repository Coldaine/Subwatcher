#!/usr/bin/env node
/**
 * parse-all.mjs, Parst alle gespeicherten Snapshots (cache/) → parsed/<sourceId>.json
 *
 * Deterministisch: nutzt NUR cache/ (von fetch.mjs gefüllt), nie Live-Fetch.
 * build.mjs liest dann die parsed/*.json, die eigentliche Datenwahrheit.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";
import { PARSERS } from "./parsers.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE_DIR = join(ROOT, "cache");
const PARSED_DIR = join(ROOT, "parsed");

async function main() {
  const yml = await readFile(join(ROOT, "sources.yml"), "utf8");
  const sources = parseYaml(yml).sources ?? [];
  await mkdir(PARSED_DIR, { recursive: true });
  const report = [];
  for (const s of sources) {
    if (!PARSERS[s.parser]) { report.push(`${s.id}: kein Parser (${s.parser})`); continue; }
    const ext = s.typ === "json-api" ? "json" : "html";
    const cachePath = join(CACHE_DIR, `${s.id}.${ext}`);
    const outPath = join(PARSED_DIR, `${s.id}.json`);
    try {
      const raw = await readFile(cachePath, "utf8");
      let parsed = PARSERS[s.parser](raw);
      if (isEmptyParse(parsed)) {
        // Frischer Snapshot ohne Daten (JS-Huelle, Bot-Schutz, Layoutwechsel):
        // letzten guten Snapshot derselben Quelle nehmen, sichtbar warnen.
        try {
          const prevRaw = await readFile(join(CACHE_DIR, `${s.id}.prev.${ext}`), "utf8");
          const prevParsed = PARSERS[s.parser](prevRaw);
          if (!isEmptyParse(prevParsed)) {
            report.push(`${s.id}: WARN frischer Snapshot ohne Daten, nutze letzten guten Stand`);
            parsed = prevParsed;
          }
        } catch { /* kein Rueckfall im Cache */ }
        if (isEmptyParse(parsed)) {
          // Letzter verifizierter Seitenstand im Repo (data/snapshots/): manche Quellen
          // blocken die CI-IP und liefern eine Challenge-Seite. Der Stand ist datiert,
          // die Warnung steht im Lauf, die Kopfzeile der Seite zeigt veraltete Quellen.
          try {
            const repoRaw = await readFile(join(ROOT, "data", "snapshots", `${s.id}.${ext}`), "utf8");
            const repoParsed = PARSERS[s.parser](repoRaw);
            if (!isEmptyParse(repoParsed)) {
              report.push(`${s.id}: WARN Quelle liefert keine Daten (Bot-Schutz?), nutze Stand aus data/snapshots/`);
              parsed = repoParsed;
            }
          } catch { /* kein Fallback im Repo */ }
        }
      }
      // Leerer Parse bei vorher vorhandenem Inhalt: die Quelle hat ausgeliefert, aber ohne
      // die erwarteten Daten (JS-Huelle, A/B-Variante, Layoutwechsel). Der alte Stand bleibt
      // dann stehen, sonst faellt ein Tarif still aus dem Katalog und die Tests kippen.
      // Gleiche Haltung wie fetch.mjs: Snapshot behalten und sichtbar warnen.
      if (isEmptyParse(parsed) && !(await isEmptyFile(outPath))) {
        report.push(`${s.id}: WARN leerer Parse (${Object.keys(parsed).join(", ")}), vorheriger Stand bleibt`);
        continue;
      }
      await writeFile(outPath, JSON.stringify(parsed, null, 2) + "\n");
      report.push(`${s.id}: ✓ (${Object.keys(parsed).join(", ")})`);
    } catch (e) {
      report.push(`${s.id}: FEHLER ${e.message}`);
    }
  }
  console.log(report.join("\n"));
}

// "Leer" heisst: kein einziges Element in den Listen des Ergebnisses. Objekte mit Feldern
// (z.B. Budget-Regeln) zaehlen weiter als Inhalt, sonst wuerde ein reiner Metadaten-Parser
// als leer gelten.
export function isEmptyParse(parsed) {
  if (!parsed || typeof parsed !== "object") return true;
  const counts = Object.values(parsed).filter((v) => Array.isArray(v)).map((v) => v.length);
  if (!counts.length) return Object.keys(parsed).length === 0;
  return counts.every((n) => n === 0);
}

export async function isEmptyFile(path) {
  try {
    const prev = JSON.parse(await readFile(path, "utf8"));
    return isEmptyParse(prev);
  } catch {
    return true; // keine Vorlage: dann ist Schreiben besser als Nichtstun
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
