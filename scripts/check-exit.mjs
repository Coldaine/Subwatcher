#!/usr/bin/env node
/**
 * Uebersetzt den Exit-Code von scripts/check.mjs in eine Pipeline-Entscheidung.
 *
 * check.mjs nutzt 2 als positiven Signalwert "Quellen haben sich geaendert"
 * (fuer CI-Gating). Nur 0 und 2 sind Erfolg; alles andere ist ein echter Fehler
 * und darf den Tageslauf nicht als "unchanged" durchwinken.
 *
 * Nutzung:
 *   node scripts/check.mjs; code=$?
 *   node scripts/check-exit.mjs "$code"
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function classifyCheckExit(code) {
  const n = Number(code);
  if (n === 0) return { changed: false, status: "unchanged" };
  if (n === 2) return { changed: true, status: "changed" };
  throw new Error(`check.mjs exited ${code}: expected 0 (unchanged) or 2 (changed)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2];
  try {
    const result = classifyCheckExit(arg);
    console.log(`check: ${result.status}`);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `changed=${result.changed}\n`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
