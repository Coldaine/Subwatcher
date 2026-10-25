#!/usr/bin/env node
/**
 * Review-Issue fuer Quellen, die sich nicht maschinell parsen lassen.
 *
 * GLM-Preise, MiniMax und die kimi.ai-Preistabelle liegen hinter JS/Auth. Aendert
 * sich dort die oeffentliche Seite, muss ein Mensch die Werte pruefen und
 * data/overrides.yml (bzw. data/privacy.yml) mit einem neuen lastVerified
 * nachziehen. Dieses Skript erzeugt dafuer genau EIN offenes Issue: existiert
 * der Titel schon, wird kommentiert statt ein zweites Issue anzulegen.
 *
 * Nutzung:
 *   node scripts/review-issue.mjs --run-url "$RUN_URL"
 *   node scripts/review-issue.mjs --dry-run          # kein gh-Aufruf
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseYaml } from "./yaml.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const REVIEW_TITLE = "Manual review: SPA pricing sources changed";

// Nur Quellen, deren Aenderung eine manuelle Preis-/Limit-Pruefung ausloest.
const PRICING_FIELDS = new Set([
  "plan_meta",
  "plan_prices",
  "plan_quotas",
  "plan_quantities",
  "allowances",
  "model_allowances",
  "request_estimates",
]);

export function isManualPricingSource(source) {
  if (!source) return false;
  const provides = Array.isArray(source.provides) ? source.provides : [];
  const manual = source.typ === "js-spa" || source.parser === "none" || source.auth === "required";
  const pricing = provides.some((field) => PRICING_FIELDS.has(field));
  const privacyOnly = provides.length > 0 && provides.every((field) => field === "privacy");
  return manual && pricing && !privacyOnly;
}

const shortHash = (hash) => (hash ? String(hash).slice(0, 12) : null);

export function selectReviewSources(sources, manifest) {
  const entries = manifest?.sources ?? {};
  return (sources ?? [])
    .filter(isManualPricingSource)
    .map((source) => ({ source, entry: entries[source.id] }))
    .filter(({ entry }) => entry?.changed === true)
    .map(({ source, entry }) => ({
      id: source.id,
      url: source.url,
      previous: shortHash(entry.prevContentHash),
      current: shortHash(entry.contentHash),
      fetchedAt: entry.fetchedAt ?? null,
      httpStatus: entry.httpStatus ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function renderReviewBody({ sources, runUrl = "", date = new Date().toISOString().slice(0, 10) }) {
  const rows = sources
    .map((s) => `| \`${s.id}\` | ${s.url} | \`${s.previous ?? "none"}\` | \`${s.current ?? "none"}\` | ${s.fetchedAt ?? "unknown"} |`)
    .join("\n");
  return `The daily update detected changes in sources that are not machine-parseable. Their pricing needs a human check before \`data/overrides.yml\` can be updated (the site never guesses a number).

| Source | URL | Previous fingerprint | Current fingerprint | Fetched |
| --- | --- | --- | --- | --- |
${rows}

Next steps:
1. Open each source and verify the published prices, allowances and windows.
2. Update \`data/overrides.yml\` (prices/allowances) or \`data/privacy.yml\` (retention/training statements) with a fresh \`lastVerified\`.
3. Close this issue once the override is committed. The next run will baseline the new fingerprint.

Detected ${date}.${runUrl ? ` Run: ${runUrl}` : ""}
`;
}

export function syncReviewIssue({ sources, runGh, runUrl = "", date, log = console.log }) {
  if (!sources.length) {
    log("review: no changed manual-pricing source");
    return { action: "none" };
  }
  const body = renderReviewBody({ sources, runUrl, date });
  const raw = runGh([
    "issue", "list",
    "--state", "open",
    "--search", `in:title "${REVIEW_TITLE}"`,
    "--json", "number,title",
    "--limit", "20",
  ]);
  const existing = JSON.parse(raw || "[]").find((issue) => issue.title === REVIEW_TITLE);
  if (existing) {
    runGh(["issue", "comment", String(existing.number), "--body-file", "-"], body);
    log(`review: updated issue #${existing.number}`);
    return { action: "updated", number: existing.number };
  }
  const created = runGh(["issue", "create", "--title", REVIEW_TITLE, "--body-file", "-"], body);
  log(`review: created ${String(created).trim()}`);
  return { action: "created", url: String(created).trim() };
}

function runGh(args, input) {
  return execFileSync("gh", args, {
    cwd: ROOT,
    encoding: "utf8",
    input: input ?? undefined,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const sources = parseYaml(readFileSync(join(ROOT, "sources.yml"), "utf8")).sources ?? [];
    const manifest = JSON.parse(readFileSync(join(ROOT, "cache/manifest.json"), "utf8"));
    const candidates = selectReviewSources(sources, manifest);
    const runUrl = argValue("--run-url") ?? process.env.RUN_URL ?? "";
    if (process.argv.includes("--dry-run")) {
      console.log(JSON.stringify({ sources: candidates, body: renderReviewBody({ sources: candidates, runUrl }) }, null, 2));
    } else {
      syncReviewIssue({ sources: candidates, runGh, runUrl });
    }
  } catch (e) {
    console.error(`review-issue: ${e.message}`);
    process.exit(1);
  }
}
