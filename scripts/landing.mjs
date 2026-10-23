#!/usr/bin/env node
/**
 * Statische Landingpage fuer die Suchanfrage "coding plan comparison":
 * public/coding-plan-comparison/index.html
 *
 * Warum eine eigene Seite: die App ist eine einzige URL mit clientseitigen
 * Ansichten, Suchmaschinen sehen dort kaum Text. Diese Seite bringt echte
 * Saetze, eine statische Rangliste aus dem Datensatz und FAQ-Antworten ins
 * HTML, mit der Suchphrase in Titel, Ueberschrift und URL. Erzeugt aus
 * public/data/latest.json, also jeden Tag frisch und ohne Handarbeit.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "public", "coding-plan-comparison");
const SITE = "https://vibeplan.cc";
const URL_SELF = `${SITE}/coding-plan-comparison/`;

const d = JSON.parse(readFileSync(join(ROOT, "public", "data", "latest.json"), "utf8"));
const plans = d.plans ?? [];
const date = (d.generatedAt ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
const year = date.slice(0, 4);

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const usd = (n) => `$${Number(n).toFixed(2)}`;
const big = (n) => {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return "-";
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
};
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// --- Plan-Kennzahlen im Standardblick der App -------------------------------
// Ausgeschlossen wie in der App per Default: Plaene ohne API-Zugang und Modelle,
// die laut Quelle auf den Daten trainieren.
const excluded = (p) => p.tag === "no API" || p.tag === "CLI only";
const considered = [];
for (const p of plans) {
  if (excluded(p)) continue;
  const paid = p.price?.paidPrice ?? p.price?.monthlyUsd ?? null;
  if (!paid || paid <= 0) continue;
  const rows = (p.modelRows ?? []).filter((r) => r.privacy?.training !== true && r.rawTokensPerMonth > 0);
  if (rows.length < 3) continue;
  considered.push({
    id: p.id,
    name: p.name,
    provider: p.provider,
    price: paid,
    disclosure: p.disclosure ?? "undisclosed",
    rows: rows.length,
    tokensPerUsd: median(rows.map((r) => r.rawTokensPerMonth / paid)),
    requestsPerUsd: median(rows.map((r) => r.normalizedPer1).filter((x) => x > 0)),
    score: median(rows.map((r) => r.aiScore).filter((x) => typeof x === "number")),
  });
}
considered.sort((a, b) => b.tokensPerUsd - a.tokensPerUsd);
const top = considered.slice(0, 20);
const leader = top[0];

const comparableRows = plans.flatMap((p) => (excluded(p) ? [] : (p.modelRows ?? [])));
const zdrRows = comparableRows.filter((r) => r.privacy?.retentionDays === true).length;
const trainingRows = plans.flatMap((p) => p.modelRows ?? []).filter((r) => r.privacy?.training === true).length;
const disclosed = plans.filter((p) => p.disclosure === "disclosed").length;
const sources = d.statistics?.sourceCount ?? Object.keys(d.sources ?? {}).length;

const rowsHtml = top.map((p, i) => `      <tr>
        <td class="num">${i + 1}</td>
        <td><a href="${SITE}/#overview">${esc(p.name)}</a><span class="prov">${esc(p.provider)}</span></td>
        <td class="num">${usd(p.price)}</td>
        <td class="num strong">${big(p.tokensPerUsd)}</td>
        <td class="num">${num(p.requestsPerUsd)}</td>
        <td class="num">${p.rows}</td>
        <td>${esc(p.disclosure)}</td>
      </tr>`).join("\n");

const faq = [
  {
    q: "What is an AI coding plan?",
    a: `A fixed monthly subscription that gives you an AI coding agent plus a quota of model usage, instead of paying per token. This comparison covers ${plans.length} plans from ${sources} official sources: prices, published quotas, per-model rates and what one dollar actually buys.`,
  },
  {
    q: "Which coding plan gives the most tokens per dollar right now?",
    a: leader
      ? `On ${date}, ${leader.name} at ${usd(leader.price)} per month leads the ranking with a median of ${big(leader.tokensPerUsd)} tokens per dollar across ${leader.rows} comparable models (median ${num(leader.requestsPerUsd)} requests per dollar). The interactive chart shows the whole Pareto front of AI score against tokens per dollar, so you can trade quality against volume instead of chasing a single number.`
      : "The ranking is rebuilt daily; open the interactive comparison for today's numbers.",
  },
  {
    q: "How is the comparison calculated?",
    a: `Every plan is converted to requests and tokens per dollar paid, using the model's published API prices: cost per request = (0.05 x input + 0.95 x cached write) x input tokens + cached read x cached read tokens + output x output tokens, per million. Cash credits convert at the published rate, weekly windows scale x4.33 to a month, and five-hour windows are throughput caps, never multiplied into a monthly volume.`,
  },
  {
    q: "Do these plans publish how much usage is included?",
    a: `No, not all of them. ${disclosed} of ${plans.length} plans in the catalogue publish an included amount; the rest only show it at checkout or not at all. Undisclosed stays undisclosed here: those plans appear with their list price and a note instead of a guessed number, so a made-up quota never moves the ranking.`,
  },
  {
    q: "Which plans keep my code out of training, and which keep zero retention?",
    a: `Training and retention are tracked per model and vendor, not per brand: ${trainingRows} model rows in the catalogue are flagged as training on your data and are hidden by default. Zero retention (confirmed zero-day retention for that exact model at that vendor) applies to ${zdrRows} model rows. A vendor saying "zero retention" on its pricing page is not enough; the statement has to cover the model you actually use.`,
  },
  {
    q: "Why is this coding plan comparison built on tokens per dollar instead of tokens per plan?",
    a: `Because "60 for 10" tells you nothing: a plan with a large credit number can buy less work than a cheaper plan with better cache pricing. Rates here are normalised per dollar paid, cache-aware, and computed per model, so plans with different meters become comparable. Plans that cannot be compared that way (no published amount, no API access) are listed separately rather than mixed into the ranking.`,
  },
  {
    q: "How often is the data updated?",
    a: `Daily. A scheduled build fetches all ${sources} sources, parses them, and rebuilds the dataset; the changelog is generated from the repository commits, so every change is traceable to a commit. The dataset is served as JSON at ${SITE}/data/latest.json and each plan row keeps its verification date.`,
  },
  {
    q: "Can I reuse the numbers?",
    a: `Yes. The data is MIT licensed and served as JSON. Link to the page rather than copying numbers, because rates change daily as prices and model lineups move.`,
  },
];

const faqHtml = faq.map((f) => `    <h3>${esc(f.q)}</h3>\n    <p>${esc(f.a)}</p>`).join("\n");

const ld = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${URL_SELF}#page`,
      url: URL_SELF,
      name: `AI Coding Plan Comparison ${year}`,
      description: "Compare AI coding plans by tokens and requests per dollar paid, with published quotas, per-model rates and an open dataset.",
      isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "vibeplan.cc" },
      inLanguage: "en",
      dateModified: date,
    },
    {
      "@type": "ItemList",
      name: "AI coding plans ranked by tokens per dollar paid",
      numberOfItems: top.length,
      itemListElement: top.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${p.name} (${p.provider}), ${usd(p.price)} per month, ${big(p.tokensPerUsd)} tokens per dollar`,
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
}, null, 1);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Coding Plan Comparison ${year}: what $1 buys in tokens and requests</title>
<meta name="description" content="AI coding plan comparison for ${year}: ${plans.length} plans ranked by tokens per dollar paid, with published quotas, per-model rates, zero-retention flags and an open JSON dataset. Rebuilt daily from ${sources} official sources.">
<link rel="canonical" href="${URL_SELF}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="AI Coding Plan Comparison ${year}">
<meta property="og:description" content="${plans.length} AI coding plans ranked by what $1 buys, rebuilt daily from official sources.">
<meta property="og:url" content="${URL_SELF}">
<meta property="og:image" content="${SITE}/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${ld}</script>
<style>
:root{--bg:#0b0f0e;--surface:#111817;--line:#1f2b29;--text:#e6f1ee;--text2:#9db3ae;--accent:#6ee7c7;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--accent)}
.wrap{max-width:980px;margin:0 auto;padding:28px 20px 72px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:34px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;text-decoration:none;color:var(--text)}
.brand img{width:24px;height:24px}
.cta{font-family:var(--mono);font-size:13px;text-transform:uppercase;letter-spacing:.06em;text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:9px 14px}
h1{font-size:clamp(28px,4.4vw,44px);line-height:1.15;letter-spacing:-.02em;margin:0 0 14px}
h2{font-size:clamp(20px,2.6vw,26px);letter-spacing:-.01em;margin:44px 0 12px}
h3{font-size:17px;margin:22px 0 6px}
p{color:var(--text2);margin:0 0 14px}
.lede{font-size:clamp(17px,2.1vw,20px);color:var(--text);max-width:70ch}
.facts{display:flex;flex-wrap:wrap;gap:10px 26px;font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--text2);margin:22px 0 6px}
.facts b{display:block;color:var(--text);font-size:19px;letter-spacing:0}
table{width:100%;border-collapse:collapse;margin:14px 0 6px;font-size:15px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--text2);font-weight:600}
td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
td.strong{color:var(--accent);font-weight:700}
.prov{display:block;font-size:12px;color:var(--text2)}
.note{font-size:13px;color:var(--text2)}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-top:18px}
footer{border-top:1px solid var(--line);margin-top:44px;padding-top:16px;font-size:13px;color:var(--text2)}
@media(max-width:640px){th:nth-child(5),td:nth-child(5),th:nth-child(6),td:nth-child(6){display:none}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="brand" href="/"><img src="/favicon.svg" alt="">vibeplan.cc</a>
  <a class="cta" href="/#overview">Open the interactive comparison</a>
</header>

<h1>AI Coding Plan Comparison ${year}</h1>
<p class="lede">Which AI coding subscription gives you the most work per dollar? This AI coding plan comparison ranks ${plans.length} plans by tokens and requests per dollar paid, using only published prices and quotas, with every number rebuilt daily from ${sources} official sources. Prices are what you pay, fees included.</p>
<div class="facts">
  <span><b>${plans.length}</b>plans tracked</span>
  <span><b>${considered.length}</b>in this ranking</span>
  <span><b>${sources}</b>official sources</span>
  <span><b>${zdrRows}</b>zero-retention rows</span>
  <span><b>${date}</b>data snapshot</span>
</div>

<h2>What one dollar buys</h2>
<p>Median across the models each plan covers, cache-aware and normalised per dollar paid. A plan enters this comparison when at least three of its models have a published rate; plans without API access or without a published included amount are listed separately on the site instead of being mixed in.</p>
<table>
  <thead><tr><th>#</th><th>Plan</th><th>Price / mo</th><th>Tokens / $</th><th>Requests / $</th><th>Models</th><th>Quota</th></tr></thead>
  <tbody>
${rowsHtml}
  </tbody>
</table>
<p class="note">Snapshot ${date}. Rates move with provider prices and model lineups, so treat this table as today's answer, not a permanent one. ${disclosed} of ${plans.length} plans publish an included amount; the rest stay marked undisclosed.</p>

<h2>How the numbers are computed</h2>
<div class="card">
<p>Cost per request = (0.05 x input price + 0.95 x cached write price) x input tokens + cached read price x cached read tokens + output price x output tokens, per million tokens. Credit plans use the vendor's own published conversion; cash plans convert at their published rate. Weekly windows scale x4.33 to a month, five-hour windows stay throughput caps and are never multiplied up.</p>
<p>The workload pattern behind those token counts comes from real per-model usage statistics, not from a generic assumption, and shared model families use the same pattern for every provider so no plan gets a cheaper comparison. Nothing is estimated: if a vendor does not publish it, the plan carries no rate.</p>
<p><a href="/#method">Read the full methodology</a> or <a href="${SITE}/data/latest.json">fetch the dataset as JSON</a>.</p>
</div>

<h2>Questions people ask</h2>
${faqHtml}

<h2>Data, sources and license</h2>
<p>Every source is listed with its URL and parser in <a href="https://github.com/harrytyp/coding-plan-comparison/blob/main/sources.yml">sources.yml</a>, manual entries and their verification dates in <a href="https://github.com/harrytyp/coding-plan-comparison/blob/main/data/overrides.yml">overrides.yml</a>. The dataset is MIT licensed: reuse it, but link rather than copy, because it changes daily.</p>
<p><a href="/#overview">Interactive chart and table</a> · <a href="${SITE}/data/latest.json">latest.json</a> · <a href="${SITE}/feed.xml">Atom feed of changes</a> · <a href="https://github.com/harrytyp/coding-plan-comparison">Repository</a></p>

<footer>
  Generated from the dataset on ${date}. No number on this page is estimated; undisclosed stays undisclosed.
</footer>
</div>
</body>
</html>
`;

mkdirSync(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, "index.html");
let before = "";
try { before = readFileSync(file, "utf8"); } catch { /* neu */ }
if (before === html) {
  console.log(`coding-plan-comparison/index.html unveraendert (${top.length} Plaene, Stand ${date})`);
} else {
  writeFileSync(file, html);
  console.log(`coding-plan-comparison/index.html geschrieben (${top.length} Plaene, Stand ${date}, ${considered.length} vergleichbar)`);
}
