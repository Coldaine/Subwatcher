#!/usr/bin/env node
/**
 * Veroeffentlicht die erzeugten Dateien aus public/ in die Root-Spiegel und
 * staged genau diese Pfade. Kein `git add .`, keine Caches, keine Secrets.
 *
 * Root-Spiegel sind Pflicht, weil GitHub Pages die Legacy-Seite vom Root
 * serviert. Die Liste ist bewusst explizit: ein neuer Generator-Output wird
 * nicht automatisch veroeffentlicht, sondern muss hier eingetragen werden.
 *
 * Nutzung:
 *   node scripts/publish.mjs mirror --version "$GITHUB_SHA"
 *   node scripts/publish.mjs stage
 *   node scripts/publish.mjs mirror --dry-run
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const VERSION_PLACEHOLDER = "__VERSION__";

// Quelldatei in public/ -> Ziel im Root. Reihenfolge ist die Staging-Reihenfolge.
const FILE_MIRRORS = [
  { from: "app.js", to: "app.js", required: true },
  { from: "index.html", to: "index.html", required: true },
  { from: "favicon.ico", to: "favicon.ico", required: true },
  { from: "favicon.svg", to: "favicon.svg", required: true },
  { from: "data/latest.json", to: "data/latest.json", required: true },
  { from: "sitemap.xml", to: "sitemap.xml", required: true },
  { from: "feed.xml", to: "feed.xml", required: true },
  { from: "apple-touch-icon.png", to: "apple-touch-icon.png", required: false },
  { from: "og-image.png", to: "og-image.png", required: false },
];

const DIR_MIRRORS = [
  { from: "fonts", to: "fonts", required: true },
  { from: "vendor", to: "vendor", required: true },
  { from: "plans", to: "plans", required: true },
  { from: "de", to: "de", required: true },
  { from: "coding-plan-comparison", to: "coding-plan-comparison", required: true },
  { from: "providers", to: "providers", required: false },
  { from: "preview", to: "preview", required: false },
];

// Alles, was die Pipeline erzeugen darf. Root-Spiegel und public/ sind getrennt
// aufgefuehrt, damit ein Fehler in einem der beiden sichtbar wird.
export const GENERATED_PATHS = [
  "data/changelog.yml",
  "data/history.jsonl",
  "data/latest.json",
  "public/app.js",
  "public/index.html",
  "public/data/latest.json",
  "public/favicon.ico",
  "public/favicon.svg",
  "public/apple-touch-icon.png",
  "public/og-image.png",
  "public/sitemap.xml",
  "public/feed.xml",
  "public/coding-plan-comparison",
  "public/plans",
  "public/providers",
  "public/de",
  "public/preview",
  "public/fonts",
  "public/vendor",
  "index.html",
  "app.js",
  "favicon.ico",
  "favicon.svg",
  "apple-touch-icon.png",
  "og-image.png",
  "sitemap.xml",
  "feed.xml",
  "coding-plan-comparison",
  "plans",
  "providers",
  "de",
  "preview",
  "fonts",
  "vendor",
];

const FORBIDDEN_PREFIXES = [
  "cache/",
  "parsed/",
  "node_modules/",
  ".git/",
  ".github/",
  ".agents/",
  ".factory/",
  ".opencode/",
  ".pi/",
  ".kilo/",
  ".omp/",
  ".entire/",
  ".claude/",
  ".codex/",
  ".cursor/",
  ".aistudio/",
  "src/",
];

const FORBIDDEN_NAMES = /^(\.env(\..*)?|.*\.(pem|key)|.*(credential|secret|token).*)$/i;

function normalize(path) {
  return String(path).replace(/\\/g, "/").replace(/^\.\//, "");
}

export function isGeneratedPath(path) {
  const p = normalize(path);
  if (!p || p.startsWith("../") || p.includes("/../")) return false;
  return GENERATED_PATHS.some((allowed) => p === allowed || p.startsWith(`${allowed}/`));
}

export function assertStagingPolicy(paths) {
  const bad = [];
  for (const raw of paths) {
    const p = normalize(raw);
    if (FORBIDDEN_PREFIXES.some((prefix) => p.startsWith(prefix)) || FORBIDDEN_NAMES.test(basename(p)) || !isGeneratedPath(p)) {
      bad.push(p);
    }
  }
  if (bad.length) {
    throw new Error(`staging policy rejected: ${bad.join(", ")}`);
  }
  return true;
}

function assertInside(base, target) {
  const rel = relative(base, target);
  if (rel === "") return;
  if (rel.startsWith("..") || resolve(base, rel) !== target) {
    throw new Error(`path escapes mirror root: ${target}`);
  }
}

function transform(relPath, buf, version) {
  if (!version) return buf;
  if (!/\.(html|js|json|xml|txt)$/i.test(relPath)) return buf;
  const text = buf.toString("utf8");
  if (!text.includes(VERSION_PLACEHOLDER)) return buf;
  return Buffer.from(text.replaceAll(VERSION_PLACEHOLDER, version));
}

function writeIfChanged(target, buf, dryRun) {
  if (existsSync(target)) {
    try {
      if (readFileSync(target).equals(buf)) return false;
    } catch { /* Verzeichnis oder unlesbar: ersetzen */ }
  }
  if (!dryRun) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buf);
  }
  return true;
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...listFiles(full).map((p) => `${entry.name}/${p}`));
    else if (entry.isFile()) out.push(entry.name);
  }
  return out;
}

function pruneEmptyDirs(dir, stopAt) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(join(dir, entry.name), stopAt);
  }
  if (resolve(dir) !== resolve(stopAt) && readdirSync(dir).length === 0) rmdirSync(dir);
}

export function mirrorAll({ publicDir, rootDir, version = "", dryRun = false }) {
  const pub = resolve(publicDir);
  const root = resolve(rootDir);
  if (!existsSync(pub)) throw new Error(`public dir missing: ${pub}`);
  if (!existsSync(root)) throw new Error(`root dir missing: ${root}`);
  const changed = [];

  for (const item of FILE_MIRRORS) {
    const source = resolve(pub, item.from);
    assertInside(pub, source);
    if (!existsSync(source)) {
      if (item.required) throw new Error(`mirror source missing: public/${item.from}`);
      continue;
    }
    const target = resolve(root, item.to);
    assertInside(root, target);
    const buf = transform(item.from, readFileSync(source), version);
    if (writeIfChanged(target, buf, dryRun)) changed.push(normalize(item.to));
  }

  for (const item of DIR_MIRRORS) {
    const source = resolve(pub, item.from);
    assertInside(pub, source);
    if (!existsSync(source)) {
      if (item.required) throw new Error(`mirror source missing: public/${item.from}`);
      continue;
    }
    const target = resolve(root, item.to);
    assertInside(root, target);
    let targetIsDir = existsSync(target) && lstatSync(target).isDirectory();
    if (existsSync(target) && !targetIsDir) {
      if (!dryRun) unlinkSync(target);
      changed.push(normalize(item.to));
      targetIsDir = false;
    }
    const sourceFiles = new Set(listFiles(source));
    const targetFiles = new Set(targetIsDir ? listFiles(target) : []);
    for (const rel of [...sourceFiles].sort()) {
      const sourceFile = join(source, rel);
      const targetFile = join(target, rel);
      assertInside(root, targetFile);
      const buf = transform(rel, readFileSync(sourceFile), version);
      if (writeIfChanged(targetFile, buf, dryRun)) changed.push(normalize(join(item.to, rel)));
    }
    for (const rel of [...targetFiles].sort()) {
      if (sourceFiles.has(rel)) continue;
      const targetFile = join(target, rel);
      assertInside(root, targetFile);
      if (existsSync(targetFile)) {
        if (!dryRun) unlinkSync(targetFile);
        changed.push(normalize(join(item.to, rel)));
      }
    }
    if (!dryRun && targetIsDir) {
      pruneEmptyDirs(target, target);
    }
  }

  return changed;
}

export function stageGenerated({
  root = ROOT,
  paths = GENERATED_PATHS,
  runGit = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }),
} = {}) {
  const addable = paths.filter((path) => {
    if (existsSync(join(root, path))) return true;
    try { return runGit(["ls-files", "--", path]).trim().length > 0; } catch { return false; }
  });
  if (addable.length) runGit(["add", "--", ...addable]);
  const staged = runGit(["diff", "--cached", "--name-only"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  assertStagingPolicy(staged);
  return staged;
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  try {
    if (command === "mirror") {
      const version = argValue("--version") ?? process.env.GITHUB_SHA ?? "local";
      const dryRun = process.argv.includes("--dry-run");
      const changed = mirrorAll({ publicDir: join(ROOT, "public"), rootDir: ROOT, version, dryRun });
      console.log(`mirror: ${changed.length} path(s) ${dryRun ? "would change" : "changed"} (version ${version.slice(0, 12)})`);
      for (const path of changed) console.log(`  ${path}`);
    } else if (command === "stage") {
      const staged = stageGenerated({ root: ROOT });
      console.log(`stage: ${staged.length} path(s) staged, staging policy ok`);
      for (const path of staged) console.log(`  ${path}`);
    } else {
      console.error("usage: node scripts/publish.mjs <mirror|stage> [--version SHA] [--dry-run]");
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
