#!/usr/bin/env node
/**
 * SEO-Dateien aktuell halten: public/sitemap.xml + public/feed.xml.
 *
 * Warum ueberhaupt ein Skript: die Sitemap trug ein handgeschriebenes lastmod
 * (2026-09-13) und die Feed-Datei fehlte. Beides wuerde wie der Changelog
 * veralten, deshalb kommt es hier deterministisch aus den Daten:
 *   - Sitemap: die Seite + die Sprachvarianten, lastmod = heute, changefreq daily
 *   - Feed (Atom): die Changelog-Eintraege (aus data/changelog.yml, also aus Git)
 * Die CI ruft das Skript nach dem Changelog-Schritt auf.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = "https://vibeplan.cc";
const TITLE = "vibeplan.cc: AI coding plan comparison";
const SUB = "What $1 really buys in AI coding subscriptions: tokens and requests per dollar, published quotas, open data.";

const today = new Date().toISOString().slice(0, 10);

function writeIfChanged(file, content) {
  let before = "";
  try { before = readFileSync(file, "utf8"); } catch { /* neu */ }
  if (before === content) return false;
  writeFileSync(file, content);
  return true;
}

// ---------------------------------------------------------------- Sitemap
// Plan-, Anbieter- und deutsche Seiten kommen aus scripts/pages.mjs und werden
// aus dem Dateisystem eingesammelt, damit die Sitemap nicht von Hand waechst.
const extra = [];
for (const [dir, prio] of [["plans", "0.7"], ["providers", "0.6"]]) {
  const base = join(ROOT, "public", dir);
  if (!existsSync(base)) continue;
  for (const e of readdirSync(base, { withFileTypes: true })) {
    if (e.isDirectory()) extra.push({ loc: `${SITE}/${dir}/${e.name}/`, prio });
  }
}
if (existsSync(join(ROOT, "public", "de", "index.html"))) extra.push({ loc: `${SITE}/de/`, prio: "0.8" });
extra.sort((a, b) => a.loc.localeCompare(b.loc));
const extraXml = extra.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${u.prio}</priority>
  </url>`).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/?lang=en"/>
    <xhtml:link rel="alternate" hreflang="de" href="${SITE}/?lang=de"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>
  </url>
  <url>
    <loc>${SITE}/coding-plan-comparison/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
${extraXml}
</urlset>
`;

// ---------------------------------------------------------------- Feed
let entries = [];
try {
  entries = (parseYaml(readFileSync(join(ROOT, "data", "changelog.yml"), "utf8")).entries ?? [])
    .slice(0, 30);
} catch { /* ohne Changelog kein Feed-Inhalt */ }

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const feedEntries = entries.map((e) => `  <entry>
    <title>${esc(e.textEn ?? e.text ?? "")}</title>
    <id>${SITE}/#${esc(e.commit ?? e.date)}</id>
    <updated>${esc(e.date)}T00:00:00Z</updated>
    <link rel="alternate" href="${esc(e.commit ? `https://github.com/harrytyp/coding-plan-comparison/commit/${e.commit}` : `${SITE}/#changelog`)}"/>
    <summary>${esc(e.textEn ?? e.text ?? "")}</summary>
  </entry>`).join("\n");

const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(TITLE)}</title>
  <subtitle>${esc(SUB)}</subtitle>
  <id>${SITE}/</id>
  <link rel="self" href="${SITE}/feed.xml"/>
  <link rel="alternate" href="${SITE}/"/>
  <updated>${(entries[0]?.date ?? today)}T00:00:00Z</updated>
  <author><name>Kolja Knodel</name><uri>https://github.com/harrytyp</uri></author>
  <rights>MIT</rights>
${feedEntries}
</feed>
`;

const a = writeIfChanged(join(ROOT, "public", "sitemap.xml"), sitemap);
const b = writeIfChanged(join(ROOT, "public", "feed.xml"), feed);
console.log(`sitemap.xml ${a ? "geschrieben" : "unveraendert"} (lastmod ${today}), feed.xml ${b ? "geschrieben" : "unveraendert"} (${entries.length} Eintraege)`);
