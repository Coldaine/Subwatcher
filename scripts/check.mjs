#!/usr/bin/env node
/**
 * check.mjs, Change-Detection & Diff-Report.
 *
 * Läuft nach fetch.mjs und zeigt, welche Quellen sich geändert haben
 * (sha256-Vergleich gegen letzten Snapshot im Manifest).
 * Bei Änderung: parsed/ + public/data/latest.json müssen neu gebaut werden.
 *
 * Nutzung:
 *   node scripts/fetch.mjs && node scripts/check.mjs
 *   # exit code 0 = keine Änderung, 2 = Änderungen (für CI-Gating)
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = join(ROOT, "cache/manifest.json");

async function main() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    console.error("Kein Manifest gefunden. Zuerst: node scripts/fetch.mjs");
    process.exit(1);
  }
  const sources = manifest.sources ?? {};
  const entries = Object.values(sources);
  const changed = entries.filter((e) => e.changed);
  const firstRun = entries.filter((e) => !e.prevSha256);

  console.log(`Manifest: ${entries.length} Quellen, ${firstRun.length} Erst-Snapshots, ${changed.length} geändert\n`);

  for (const e of entries.sort((a, b) => a.id.localeCompare(b.id))) {
    const status = e.changed ? "CHANGED" : (e.prevSha256 ? "ok" : "first");
    console.log(`  [${status.padEnd(7)}] ${e.id.padEnd(24)} ${e.httpStatus} ${(e.bytes / 1024).toFixed(0)}KB  sha=${e.sha256.slice(0, 10)}  fetched=${e.fetchedAt.slice(0, 19)}`);
  }

  if (changed.length) {
    console.log(`\n⚠  ${changed.length} Quelle(n) geändert → node scripts/parse-all.mjs && node scripts/build.mjs`);
    process.exit(2);
  }
  if (firstRun.length) {
    console.log(`\nℹ  ${firstRun.length} Erst-Snapshot(s). Zweiter Lauf zeigt Änderungen.`);
  }
  console.log("\n✓ Keine Änderungen, Daten aktuell.");
}

main().catch((e) => { console.error(e); process.exit(1); });
