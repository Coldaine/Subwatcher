import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseYaml } from "../scripts/yaml.mjs";
import { PARSERS } from "../scripts/parsers.mjs";
import { fingerprintHtml } from "../scripts/fingerprint.mjs";
import { classifyCheckExit } from "../scripts/check-exit.mjs";
import {
  REVIEW_TITLE,
  renderReviewBody,
  selectReviewSources,
  syncReviewIssue,
} from "../scripts/review-issue.mjs";
import {
  GENERATED_PATHS,
  assertStagingPolicy,
  mirrorAll,
  stageGenerated,
} from "../scripts/publish.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), "subwatcher-pipeline-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

test("check.mjs exit codes: 0 unchanged, 2 changed, everything else fails", () => {
  assert.deepEqual(classifyCheckExit(0), { changed: false, status: "unchanged" });
  assert.deepEqual(classifyCheckExit("2"), { changed: true, status: "changed" });
  assert.throws(() => classifyCheckExit(1), /exited 1/);
  assert.throws(() => classifyCheckExit(127), /exited 127/);
  assert.throws(() => classifyCheckExit(undefined), /exited undefined/);
});

test("sources.yml is at the documented root path and every parser exists", () => {
  const config = parseYaml(readFileSync(join(ROOT, "sources.yml"), "utf8"));
  const sources = config.sources ?? [];
  assert.ok(sources.length >= 25, `expected the full source list, got ${sources.length}`);
  assert.equal(new Set(sources.map((s) => s.id)).size, sources.length, "source ids must be unique");
  for (const source of sources) {
    assert.ok(source.id && source.url, `${source.id}: id and url required`);
    if (source.parser && source.parser !== "none") {
      assert.equal(typeof PARSERS[source.parser], "function", `${source.id}: unknown parser ${source.parser}`);
    }
  }
  assert.equal(sources.find((s) => s.id === "privacy-minimax")?.optional, true, "optional source contract");
  const ignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
  assert.match(ignore, /^cache\/$/m, "cache/ must be ignored");
  assert.match(ignore, /^parsed\/$/m, "parsed/ must be ignored");
});

test("HTML fingerprint ignores nonces/cache busters but catches content changes", () => {
  const a = `<html><script nonce="abc" src="/app.js?v=123"></script><body>GLM-5.3 75 USD</body></html>`;
  const b = `<html>\n<script nonce="xyz" src="/app.js?v=999"></script>\n<body>GLM-5.3 75 USD</body></html>`;
  assert.equal(fingerprintHtml(a), fingerprintHtml(b));
  assert.notEqual(fingerprintHtml(a), fingerprintHtml(a.replace("75", "80")));
});

function reviewFixture() {
  const sources = [
    { id: "glm-pricing-page", url: "https://open.bigmodel.cn/glm-coding", typ: "js-spa", parser: "none", provides: ["plan_prices"] },
    { id: "minimax-token-plan", url: "https://platform.minimax.io/subscribe/token-plan", typ: "js-spa", parser: "none", provides: ["plan_meta", "plan_quotas"] },
    { id: "privacy-zhipu", url: "https://open.bigmodel.cn/privacy", typ: "js-spa", parser: "none", provides: ["privacy"] },
    { id: "opencode-go", url: "https://example.test/feed.json", typ: "json-api", parser: "ocgo", provides: ["plan_meta"] },
    { id: "kimi-ai-pricing", url: "https://www.kimi.ai/help/membership/membership-pricing", typ: "html-docs", parser: "none", provides: ["plan_prices", "tier_names"] },
  ];
  const manifest = {
    sources: {
      "glm-pricing-page": { changed: true, prevContentHash: "a".repeat(64), contentHash: "b".repeat(64), fetchedAt: "2026-10-25T03:17:00Z" },
      "minimax-token-plan": { changed: false, prevContentHash: "c".repeat(64), contentHash: "c".repeat(64) },
      "privacy-zhipu": { changed: true, prevContentHash: "d".repeat(64), contentHash: "e".repeat(64) },
      "opencode-go": { changed: true, prevContentHash: "f".repeat(64), contentHash: "0".repeat(64) },
      "kimi-ai-pricing": { changed: true, prevContentHash: "1".repeat(64), contentHash: "2".repeat(64) },
    },
  };
  return { sources, manifest };
}

test("review selection: only changed manual pricing sources, never privacy-only", () => {
  const { sources, manifest } = reviewFixture();
  const selected = selectReviewSources(sources, manifest);
  assert.deepEqual(selected.map((s) => s.id), ["glm-pricing-page", "kimi-ai-pricing"]);
  assert.equal(selected[0].previous, "a".repeat(12));
  assert.equal(selected[0].current, "b".repeat(12));

  const unchanged = selectReviewSources(sources, { sources: {} });
  assert.deepEqual(unchanged, [], "no previous fingerprint means no alert");

  const body = renderReviewBody({ sources: selected, runUrl: "https://example.test/run" });
  assert.match(body, /glm-pricing-page/);
  assert.match(body, /kimi-ai-pricing/);
  assert.match(body, /data\/overrides\.yml/);
  assert.match(body, /lastVerified/);
  // A normalized page fingerprint is evidence of a page change, not of a price
  // change. The issue must ask for a check, not assert a new price.
  assert.match(body, /does not prove that a price changed/);
  assert.match(body, /page fingerprint/);
  assert.doesNotMatch(body, /price changed to|new price is/i);
  assert.doesNotMatch(body, /privacy-zhipu|opencode-go/);
  assert.doesNotMatch(body, /secret|token/i);
});

test("a changed manual-pricing source is reconciled when the generated-data diff is empty", (t) => {
  // Manual SPA pricing can change while no machine-generated artifact changes.
  // The review reconciliation must not depend on there being a data commit.
  const { pub, root } = mirrorFixture(t);
  mirrorAll({ publicDir: pub, rootDir: root, version: "abc1234" });
  assert.deepEqual(
    mirrorAll({ publicDir: pub, rootDir: root, version: "abc1234" }),
    [],
    "generated-data diff is empty, so nothing would be committed",
  );

  const { sources, manifest } = reviewFixture();
  const selected = selectReviewSources(sources, manifest);
  assert.deepEqual(selected.map((s) => s.id), ["glm-pricing-page", "kimi-ai-pricing"]);

  const calls = [];
  const result = syncReviewIssue({
    sources: selected,
    runGh: (args, input) => {
      calls.push({ args, input });
      if (args[0] === "issue" && args[1] === "list") return JSON.stringify([{ number: 12, title: REVIEW_TITLE }]);
      return "";
    },
    log: () => {},
  });
  assert.equal(result.action, "updated", "review runs despite the empty generated diff");
  assert.equal(calls[0].args[1], "list");
  assert.equal(calls[1].args[1], "comment");
  assert.match(calls[1].input, /glm-pricing-page/);
  assert.match(calls[1].input, /bbbbbbbbbbbb/, "changed-source evidence is kept");
});

test("an unchanged manual-pricing source makes no issue calls", () => {
  const { sources, manifest } = reviewFixture();
  const unchanged = {
    sources: {
      ...manifest.sources,
      "glm-pricing-page": { ...manifest.sources["glm-pricing-page"], changed: false, contentHash: "a".repeat(64) },
      "kimi-ai-pricing": { ...manifest.sources["kimi-ai-pricing"], changed: false, contentHash: "1".repeat(64) },
    },
  };
  assert.deepEqual(selectReviewSources(sources, unchanged), []);

  let called = false;
  const result = syncReviewIssue({
    sources: selectReviewSources(sources, unchanged),
    runGh: () => { called = true; return "[]"; },
    log: () => {},
  });
  assert.deepEqual(result, { action: "none" });
  assert.equal(called, false, "no gh call without a changed manual-pricing source");
});

test("review issue de-duplicates by exact title and comments instead of creating", () => {
  const { sources, manifest } = reviewFixture();
  const selected = selectReviewSources(sources, manifest);
  const calls = [];
  const runGh = (args, input) => {
    calls.push({ args, input });
    if (args[0] === "issue" && args[1] === "list") {
      return JSON.stringify([{ number: 12, title: REVIEW_TITLE }]);
    }
    return "https://github.com/Coldaine/Subwatcher/issues/12";
  };
  const result = syncReviewIssue({ sources: selected, runGh, runUrl: "https://example.test/run", log: () => {} });
  assert.deepEqual(result, { action: "updated", number: 12 });
  assert.equal(calls.filter((c) => c.args[1] === "create").length, 0);
  assert.ok(calls.some((c) => c.args[1] === "comment" && c.args[2] === "12"));
  assert.ok(calls.find((c) => c.args[1] === "comment").input.includes("glm-pricing-page"));

  const creating = [];
  const createResult = syncReviewIssue({
    sources: selected,
    runGh: (args, input) => {
      creating.push({ args, input });
      if (args[0] === "issue" && args[1] === "list") return "[]";
      return "https://github.com/Coldaine/Subwatcher/issues/13\n";
    },
    log: () => {},
  });
  assert.equal(createResult.action, "created");
  assert.ok(creating.some((c) => c.args[1] === "create" && c.args.includes(REVIEW_TITLE)));

  let called = false;
  const none = syncReviewIssue({ sources: [], runGh: () => { called = true; return "[]"; }, log: () => {} });
  assert.deepEqual(none, { action: "none" });
  assert.equal(called, false);
});

function mirrorFixture(t) {
  const base = tempDir(t);
  const pub = join(base, "public");
  const root = join(base, "root");
  mkdirSync(root, { recursive: true });
  write(join(pub, "app.js"), "console.log(1);\n");
  write(join(pub, "index.html"), '<script src="app.js?v=__VERSION__"></script>\n');
  write(join(pub, "favicon.ico"), "ico");
  write(join(pub, "favicon.svg"), "svg");
  write(join(pub, "data/latest.json"), '{"ok":true}\n');
  write(join(pub, "sitemap.xml"), "<urlset/>\n");
  write(join(pub, "feed.xml"), "<feed/>\n");
  write(join(pub, "fonts/fonts.css"), "body{}\n");
  write(join(pub, "vendor/d3.js"), "d3\n");
  write(join(pub, "plans/fresh/index.html"), "fresh\n");
  write(join(pub, "plans/.generated.json"), '["fresh"]');
  write(join(pub, "providers/acme/index.html"), "acme\n");
  write(join(pub, "de/index.html"), "de\n");
  write(join(pub, "coding-plan-comparison/index.html"), "landing\n");
  write(join(pub, "preview/index.html"), '<script src="../app.js?v=__VERSION__"></script>\n');

  write(join(root, "plans/stale/index.html"), "stale\n");
  write(join(root, "plans/.generated.json"), '["stale"]');
  write(join(root, "de/de/index.html"), "nested duplicate\n");
  write(join(root, "coding-plan-comparison/coding-plan-comparison/index.html"), "nested duplicate\n");
  write(join(root, "README.md"), "user file\n");
  write(join(root, "cache/manifest.json"), '{"secret":"snapshot"}\n');
  write(join(root, "parsed/source.json"), "{}\n");
  write(join(root, ".env"), "TOKEN=do-not-touch\n");
  write(join(root, ".github/workflows/update.yml"), "name: keep\n");
  return { base, pub, root };
}

test("mirror publisher writes only intended outputs and removes stale generated pages", (t) => {
  const { pub, root } = mirrorFixture(t);
  const changed = mirrorAll({ publicDir: pub, rootDir: root, version: "abc1234" });
  assert.ok(changed.length > 0);
  assert.match(readFileSync(join(root, "index.html"), "utf8"), /app\.js\?v=abc1234/);
  assert.doesNotMatch(readFileSync(join(root, "index.html"), "utf8"), /__VERSION__/);
  assert.match(readFileSync(join(root, "preview/index.html"), "utf8"), /app\.js\?v=abc1234/);
  assert.equal(readFileSync(join(root, "plans/fresh/index.html"), "utf8"), "fresh\n");
  assert.equal(existsSync(join(root, "plans/stale/index.html")), false, "stale plan removed");
  assert.equal(existsSync(join(root, "de/de/index.html")), false, "nested duplicate removed");
  assert.equal(existsSync(join(root, "coding-plan-comparison/coding-plan-comparison/index.html")), false);
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), "user file\n", "user file untouched");
  assert.equal(readFileSync(join(root, "cache/manifest.json"), "utf8"), '{"secret":"snapshot"}\n', "cache untouched");
  assert.equal(readFileSync(join(root, "parsed/source.json"), "utf8"), "{}\n", "parsed untouched");
  assert.equal(readFileSync(join(root, ".env"), "utf8"), "TOKEN=do-not-touch\n", "env untouched");
  assert.equal(readFileSync(join(root, ".github/workflows/update.yml"), "utf8"), "name: keep\n", "workflow untouched");

  assert.deepEqual(mirrorAll({ publicDir: pub, rootDir: root, version: "abc1234" }), [], "second run is idempotent");
});

test("mirror dry-run computes changes without writing", (t) => {
  const { pub, root } = mirrorFixture(t);
  const changed = mirrorAll({ publicDir: pub, rootDir: root, version: "deadbeef", dryRun: true });
  assert.ok(changed.some((p) => p === "index.html"));
  assert.equal(existsSync(join(root, "index.html")), false);
  assert.equal(existsSync(join(root, "plans/fresh/index.html")), false);
  assert.equal(existsSync(join(root, "plans/stale/index.html")), true, "dry-run does not delete");
});

test("mirror removes a generated root directory when its source disappeared", (t) => {
  const { pub, root } = mirrorFixture(t);
  mirrorAll({ publicDir: pub, rootDir: root, version: "abc1234" });
  assert.equal(existsSync(join(root, "providers/acme/index.html")), true);

  rmSync(join(pub, "providers"), { recursive: true, force: true });
  const changed = mirrorAll({ publicDir: pub, rootDir: root, version: "abc1234" });
  assert.ok(changed.includes("providers"), "removal is reported");
  assert.equal(existsSync(join(root, "providers")), false, "stale provider pages are gone");
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), "user file\n", "user file untouched");
});

test("staging stages only allowlisted generated paths", (t) => {
  const repo = tempDir(t);
  execFileSync("git", ["init", "-q"], { cwd: repo });
  const intended = [
    "public/app.js",
    "public/index.html",
    "public/data/latest.json",
    "data/changelog.yml",
    "data/history.jsonl",
    "app.js",
    "index.html",
    "plans/fresh/index.html",
  ];
  for (const path of intended) write(join(repo, path), `${path}\n`);
  const forbidden = ["cache/manifest.json", "parsed/source.json", ".env", ".github/workflows/update.yml", "src/data/latest.json", "README.md"];
  for (const path of forbidden) write(join(repo, path), "keep out\n");

  const staged = stageGenerated({ root: repo });
  assert.deepEqual([...staged].sort(), [...intended].sort());
  const names = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repo, encoding: "utf8" })
    .split("\n").map((s) => s.trim()).filter(Boolean);
  assert.deepEqual([...names].sort(), [...intended].sort());
  for (const path of forbidden) assert.ok(!names.includes(path), `${path} must not be staged`);

  assert.throws(() => assertStagingPolicy([...staged, "cache/manifest.json"]), /staging policy rejected/);
  assert.throws(() => assertStagingPolicy([".env"]), /staging policy rejected/);
  assert.throws(() => assertStagingPolicy([".github/workflows/update.yml"]), /staging policy rejected/);
  assert.throws(() => assertStagingPolicy(["src/data/latest.json"]), /staging policy rejected/);
  assert.ok(GENERATED_PATHS.includes("data/latest.json"));
});

const CHECKOUT_PIN = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const SETUP_NODE_PIN = "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1";
const CACHE_PIN = "actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9";
const CACHE_SAVE_PIN = "actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9";

test("update workflow structure: schedule, write scope, snapshot cache, step order", () => {
  const workflowText = readFileSync(join(ROOT, ".github/workflows/update.yml"), "utf8");
  const wf = parseYaml(workflowText);

  assert.deepEqual(Object.keys(wf.on).sort(), ["schedule", "workflow_dispatch"]);
  assert.equal(wf.on.schedule[0].cron, "17 3 * * *", "daily 03:17 UTC");
  assert.equal(wf.permissions, undefined, "write permissions belong to the job, not the workflow");
  assert.deepEqual(wf.concurrency, { group: "update-data", "cancel-in-progress": false });

  const job = wf.jobs.update;
  assert.deepEqual(job.permissions, { contents: "write", issues: "write" });

  const steps = job.steps;
  assert.deepEqual(steps.map((s) => s.name), [
    "Check out main with full history",
    "Set up Node",
    "Restore source snapshots",
    "Generate changelog from git history",
    "Fetch sources",
    "Detect source changes",
    "Parse snapshots",
    "Build dataset",
    "Record history",
    "Generate landing page",
    "Generate plan and provider pages",
    "Generate sitemap and feed",
    "Test",
    "Mirror generated output into the root",
    "Stage generated paths only",
    "Commit and push when changed",
    "Open or update the manual review issue",
    "Save source snapshots",
  ], "generation order and review-before-snapshot-save");
  const byName = Object.fromEntries(steps.map((s) => [s.name, s]));

  assert.ok(byName["Check out main with full history"].uses.startsWith(CHECKOUT_PIN));
  assert.equal(byName["Check out main with full history"].with.ref, "main");
  assert.equal(byName["Check out main with full history"].with["fetch-depth"], 0, "full history for changelog/history");
  assert.ok(byName["Set up Node"].uses.startsWith(SETUP_NODE_PIN));
  assert.ok(byName["Restore source snapshots"].uses.startsWith(CACHE_PIN));
  assert.equal(byName["Restore source snapshots"].with.path, "cache");
  assert.ok(byName["Save source snapshots"].uses.startsWith(CACHE_SAVE_PIN));
  assert.equal(byName["Fetch sources"].id, "fetch");
  assert.equal(byName["Detect source changes"].id, "check");

  // Regression for #3: review reconciliation must not depend on a generated
  // data commit, because manual SPA pricing can change without one.
  const review = byName["Open or update the manual review issue"];
  assert.match(review.if, /always\(\)/);
  assert.match(review.if, /steps\.fetch\.outcome == 'success'/);
  assert.match(review.if, /hashFiles\('cache\/manifest\.json'\)/);
  assert.doesNotMatch(review.if, /steps\.commit\.outputs\.changed/);

  const save = byName["Save source snapshots"];
  assert.match(save.if, /always\(\)/);
  assert.match(save.if, /hashFiles\('cache\/manifest\.json'\)/);

  for (const step of steps.filter((s) => s.uses)) {
    const [, ref] = step.uses.split("@");
    assert.match(ref, /^[0-9a-f]{40}(\s|$)/, `${step.name}: action must be pinned to a full SHA`);
  }
  // scripts/yaml.mjs does not expand block scalars, so the restore fallback is
  // checked in the raw text.
  assert.match(workflowText, /restore-keys:\s*\|\s*\n\s*snapshots-/);
  assert.doesNotMatch(workflowText, /pull_request_target/);
  assert.doesNotMatch(workflowText, /^\s*pull_request:/m);
  assert.doesNotMatch(workflowText, /git add \.|git add -A/);
  assert.doesNotMatch(workflowText, /npm run build/);
});

test("PR validation workflow is read-only, pinned and does not run acquisition", () => {
  const validationText = readFileSync(join(ROOT, ".github/workflows/validate-pipeline.yml"), "utf8");
  const wf = parseYaml(validationText);

  assert.deepEqual(wf.permissions, { contents: "read" });
  assert.ok(wf.on.pull_request, "runs on pull requests");
  assert.ok("workflow_dispatch" in wf.on);
  assert.ok(!("pull_request_target" in wf.on));

  const job = wf.jobs.validate;
  assert.equal(job.permissions, undefined, "job must not widen the read-only token");
  const steps = job.steps;
  const checkout = steps.find((s) => s.name === "Check out the pull request revision");
  assert.ok(checkout, "checks out the PR revision");
  assert.ok(checkout.uses.startsWith(CHECKOUT_PIN));
  assert.equal(checkout.with["persist-credentials"], false);
  assert.match(checkout.with.ref, /github\.event\.pull_request\.head\.sha/);

  for (const step of steps.filter((s) => s.uses)) {
    const [, ref] = step.uses.split("@");
    assert.match(ref, /^[0-9a-f]{40}(\s|$)/, `${step.name}: action must be pinned to a full SHA`);
  }

  const runs = steps.map((s) => s.run).filter((run) => run && run !== "|");
  assert.ok(runs.some((run) => run.includes("node --test tests/pipeline.test.mjs")));
  assert.ok(runs.some((run) => run.includes("node --test tests/fetch-retry.test.mjs")));

  assert.doesNotMatch(validationText, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(validationText, /node scripts\/review-issue\.mjs|gh issue (create|comment|list)/);
  assert.doesNotMatch(validationText, /node scripts\/publish\.mjs|git commit|git push/);
});
