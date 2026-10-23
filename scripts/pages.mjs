#!/usr/bin/env node
/**
 * Plan- und Anbieterseiten plus deutsche Einstiegsseite, erzeugt aus public/data/latest.json.
 *
 * Warum: die Hauptseite ist eine einzige URL mit clientseitigen Ansichten. Suchanfragen sind aber
 * konkret ("<Tarif> Preis", "<Anbieter> Tarife"). Diese Seiten decken den Longtail ab, mit denselben
 * Zahlen wie die App, ohne die App selbst anzufassen. Default-Ansicht der Hauptseite bleibt unberuehrt.
 *
 * Design wird aus public/coding-plan-comparison/index.html uebernommen, damit es kein zweites gibt.
 * Lauf: nach scripts/landing.mjs (das liefert das Stylesheet), vor scripts/seo.mjs (das listet die Seiten).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PUB = join(ROOT, "public");
const SITE = "https://vibeplan.cc";
const ALL_PLANS = `${SITE}/coding-plan-comparison/`;
const d = JSON.parse(readFileSync(join(PUB, "data", "latest.json"), "utf8"));
const plans = d.plans ?? [];
const today = (d.generatedAt ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
const stats = d.statistics ?? {};

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = (n) => (Number.isFinite(n) ? Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "");
const usd = (n) => (Number.isFinite(n) ? `$${Number(n).toFixed(2)}` : "");
const big = (n) => {
  if (!Number.isFinite(n)) return "";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
};
const med = (a) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return NaN; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Stylesheet der bestehenden Vergleichsseite (kein zweites Design)
const landing = join(PUB, "coding-plan-comparison", "index.html");
if (!existsSync(landing)) { console.error("coding-plan-comparison/index.html fehlt, erst landing.mjs laufen lassen"); process.exit(1); }
const style = readFileSync(landing, "utf8").match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
if (!style) { console.error("Kein <style> in der Vergleichsseite gefunden"); process.exit(1); }

// Quellen-URLs fuer die Nachweise
let sources = [];
try { sources = (parseYaml(readFileSync(join(ROOT, "sources.yml"), "utf8")).sources ?? []); } catch { /* optional */ }
const srcById = new Map(sources.map((s) => [s.id, s]));

// Verlauf: eine Zeile pro Tag, gebaut von scripts/history.mjs aus der Git-Historie
let history = [];
try {
  history = readFileSync(join(ROOT, "data", "history.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
} catch { /* ohne Verlauf fehlt nur dieser Abschnitt */ }
const historyById = new Map();
for (const rec of history) {
  for (const [id, v] of Object.entries(rec.plans ?? {})) {
    if (!historyById.has(id)) historyById.set(id, []);
    historyById.get(id).push({ date: rec.date, p: v.p, t: v.t, d: v.d });
  }
}
const fmtDelta = (now, before, unit) => {
  if (before == null || now == null || before === now) return "";
  const rel = before === 0 ? null : (now - before) / before;
  const abs = big(Math.abs(now - before));
  if (rel == null) return ` (was ${big(before)})`;
  const pct = `${rel > 0 ? "+" : "−"}${Math.abs(rel * 100).toFixed(1)}%`;
  return ` (${pct}, ${rel > 0 ? "+" : "−"}${abs} ${unit})`;
};

// Kennzahl wie auf der Vergleichsseite und in der App: Median der Tokens pro Dollar
const excluded = (p) => p.tag === "no API" || p.tag === "CLI only";
const measured = [];
for (const p of plans) {
  if (excluded(p)) continue;
  const paid = p.price?.paidPrice ?? p.price?.monthlyUsd ?? null;
  if (!(paid > 0)) continue; // Gratis-Tarife haben keine sinnvolle Kennzahl pro Dollar
  const rows = (p.modelRows ?? []).filter((r) => r.rawTokensPerMonth > 0);
  if (rows.length < 3) continue; // gleiche Huerde wie die Vergleichsseite, sonst zu duenne Seiten
  measured.push({ p, paid, rows, tokensPerUsd: med(rows.map((r) => r.rawTokensPerMonth / (paid || 1))) });
}
measured.sort((a, b) => b.tokensPerUsd - a.tokensPerUsd);
const rankById = new Map(measured.map((m, i) => [m.p.id, i + 1]));
const medianTokens = med(measured.map((m) => m.tokensPerUsd));

function shell(title, description, canonical, body, ld) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<meta name="theme-color" content="#0b0f0e">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="vibeplan.cc changelog" href="/feed.xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${style}</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="brand" href="/"><img src="/favicon.svg" alt="">vibeplan.cc</a>
  <a class="cta" href="/#overview">Open the interactive comparison</a>
</header>
${body}
</div>
</body>
</html>
`;
}

function sourceList(ids, verifiedAt) {
  const items = (ids ?? []).map((id) => {
    const s = srcById.get(id);
    return s ? `<li><a href="${esc(s.url)}" rel="nofollow noopener">${esc(s.url)}</a>${s.note ? ` <span class="prov">${esc(s.note)}</span>` : ""}</li>` : `<li><span class="prov">${esc(id)}</span></li>`;
  }).join("\n");
  return `<ul>${items || "<li>No source recorded</li>"}</ul>\n<p class="note">Last checked${verifiedAt ? `: ${esc(verifiedAt)}` : ""}. Every figure on this page comes from the sources listed above; nothing is estimated. Method and caveats: <a href="/#method">methodology</a>, price changes: <a href="/feed.xml">changelog feed</a>.</p>`;
}

// ----------------------------------------------------------------- Planseiten
const planDirs = [];
for (const { p, paid, rows, tokensPerUsd } of measured) {
  const rank = rankById.get(p.id);
  const provSlug = slug(p.provider);
  const url = `${SITE}/plans/${slug(p.id)}/`;
  const siblings = measured.filter((m) => m.p.provider === p.provider && m.p.id !== p.id);
  const quotaRows = (p.quotas ?? []).map((q) => `      <tr><td>${esc(q.label)}</td><td class="num">${q.amount != null ? esc(String(q.amount)) : "not published"}${q.unit ? ` ${esc(q.unit)}` : ""}</td><td>${esc(q.window ?? "")}</td><td>${esc(q.refresh ?? "")}</td><td>${esc(q.disclosure ?? "")}</td></tr>`).join("\n");
  const modelRows = [...rows].sort((a, b) => (b.requestsPerMonth ?? 0) - (a.requestsPerMonth ?? 0)).slice(0, 30).map((r) => `      <tr><td>${esc(r.model)}</td><td class="num">${big(r.rawTokensPerMonth)}</td><td class="num">${usd(r.costPerRequest)}</td><td class="num">${num(r.requestsPerMonth)}</td><td>${r.capUsd != null ? `${usd(r.capUsd)} cap` : ""}${r.privacy?.retentionDays === true ? " zero retention" : ""}${r.privacy?.training === true ? " trains on data" : ""}</td></tr>`).join("\n");
  // Verlauf: nur Tage, an denen sich Preis, Rate oder Offenlegung geaendert haben
  const hist = historyById.get(p.id) ?? [];
  const changes = [];
  for (let i = 0; i < hist.length; i++) {
    const prev = i > 0 ? hist[i - 1] : null;
    if (!prev || prev.p !== hist[i].p || prev.t !== hist[i].t || prev.d !== hist[i].d) changes.push({ ...hist[i], prev });
  }
  const histRows = changes.slice(-12).reverse().map((h) => `      <tr><td>${esc(h.date)}</td><td class="num">${usd(h.p)}${h.prev ? fmtDelta(h.p, h.prev.p, "USD") : ""}</td><td class="num">${h.t ? big(h.t) + fmtDelta(h.t, h.prev?.t, "tokens") : ""}</td><td>${esc(h.d)}</td></tr>`).join("\n");
  const histSection = hist.length > 1
    ? `<h2>History</h2>
<p class="note">Tracked since ${esc(hist[0].date)}: ${changes.length === 1 ? "1 recorded change" : `${changes.length} recorded changes`} in price, tokens per dollar or disclosure, newest first. Rebuilt from the daily snapshots in the repository history, not maintained by hand.</p>
<table>
  <thead><tr><th>Date</th><th>Price</th><th>Tokens per dollar</th><th>Disclosure</th></tr></thead>
  <tbody>
${histRows}
  </tbody>
</table>`
    : "";

  const title = `${p.name} pricing and limits${p.provider ? ` (${p.provider})` : ""}: what $1 buys`;
  const desc = `${p.name} costs ${usd(paid)} per month with fees included. Published quotas, per-model rates and ${big(tokensPerUsd)} tokens per dollar, from official sources, rebuilt daily.`;
  const body = `<nav class="note"><a href="/coding-plan-comparison/">All plans</a> · <a href="/providers/${provSlug}/">${esc(p.provider)}</a> · <a href="/de/">Deutsch</a></nav>
<h1>${esc(p.name)}: pricing and limits</h1>
<p class="lede">${esc(p.name)} by ${esc(p.provider)} costs <strong>${usd(paid)}</strong> per month, fees included. Inside this plan the median model gives you about <strong>${big(tokensPerUsd)} tokens per dollar</strong>${Number.isFinite(medianTokens) ? `, against a median of ${big(medianTokens)} across all tracked plans` : ""}. Rank ${rank ? `${rank} of ${measured.length}` : "not ranked"} among the comparable plans. ${rows.length} model${rows.length === 1 ? "" : "s"} with a published rate. Disclosure status: ${esc(p.disclosure ?? "undisclosed")}.</p>
<div class="facts">
  <span><b>${usd(paid)}</b>per month, fees included</span>
  <span><b>${big(tokensPerUsd)}</b>tokens per dollar</span>
  <span><b>${rows.length}</b>models with a rate</span>
  <span><b>${esc(p.disclosure ?? "undisclosed")}</b>disclosure</span>
</div>
<h2>What the plan publishes</h2>
${quotaRows ? `<table>\n    <thead><tr><th>Quota</th><th>Amount</th><th>Window</th><th>Refresh</th><th>Source says</th></tr></thead>\n    <tbody>\n${quotaRows}\n    </tbody>\n  </table>` : `<p class="note">This plan does not publish a numeric quota. That is why it is not part of the ranking.</p>`}
${p.priceNote ? `<p class="note">${esc(p.priceNote)}</p>` : ""}
${p.notes ? `<p class="note">${esc(p.notes)}</p>` : ""}
<h2>What the models cost inside this plan</h2>
${modelRows ? `<table>\n    <thead><tr><th>Model</th><th>Tokens per month</th><th>Per request</th><th>Requests per month</th><th>Notes</th></tr></thead>\n    <tbody>\n${modelRows}\n    </tbody>\n  </table>\n  <p class="note">${rows.length > 30 ? `Showing the 30 models with the most headroom, all ${rows.length} are in the ` : "All figures come from the "}<a href="${ALL_PLANS}">full comparison</a> and the open dataset.</p>` : `<p class="note">No per-model rates published for this plan.</p>`}
<h2>Where these numbers come from</h2>
${sourceList(p.sourceIds, p.verifiedAt)}
${siblings.length ? `<h2>Other ${esc(p.provider)} plans</h2>\n<ul>${siblings.slice(0, 12).map((m) => `<li><a href="${SITE}/plans/${slug(m.p.id)}/">${esc(m.p.name)}</a> (${usd(m.paid)}, ${big(m.tokensPerUsd)} tokens per dollar)</li>`).join("")}</ul>` : ""}
${histSection}
<h2>Compare</h2>
<p>Rankings, chart and filters for all ${stats.totalPlans ?? plans.length} tracked plans: <a href="${ALL_PLANS}">AI coding plan comparison</a>. German entry page: <a href="/de/">KI-Coding-Abos im Vergleich</a>.</p>`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: desc,
    url,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: "vibeplan.cc", url: SITE },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "AI coding plan comparison", item: ALL_PLANS },
      { "@type": "ListItem", position: 2, name: `${p.name} pricing and limits`, item: url },
    ] },
    ...(p.verifiedAt ? { dateModified: p.verifiedAt } : {}),
  };
  const dir = join(PUB, "plans", slug(p.id));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shell(title, desc, url, body, ld));
  planDirs.push(slug(p.id));
}

// -------------------------------------------------------------- Anbieterseiten
const byProvider = new Map();
for (const m of measured) {
  const k = m.p.provider;
  if (!byProvider.has(k)) byProvider.set(k, []);
  byProvider.get(k).push(m);
}
const provDirs = [];
for (const [provider, list] of byProvider) {
  const ps = slug(provider);
  const url = `${SITE}/providers/${ps}/`;
  list.sort((a, b) => b.tokensPerUsd - a.tokensPerUsd);
  const rowsHtml = list.map((m) => `      <tr><td><a href="${SITE}/plans/${slug(m.p.id)}/">${esc(m.p.name)}</a></td><td class="num">${usd(m.paid)}</td><td class="num strong">${big(m.tokensPerUsd)}</td><td class="num">${m.rows.length}</td><td>${esc(m.p.disclosure ?? "undisclosed")}</td></tr>`).join("\n");
  const title = `${provider} AI coding plans: prices and what you get`;
  const desc = `All ${list.length} tracked ${provider} plan${list.length === 1 ? "" : "s"} with price, published quotas and tokens per dollar paid, from official sources and rebuilt daily.`;
  const body = `<nav class="note"><a href="/coding-plan-comparison/">All plans</a>${list.length === 1 ? ` · <a href="${SITE}/plans/${slug(list[0].p.id)}/">${esc(list[0].p.name)}</a>` : ""} · <a href="/de/">Deutsch</a></nav>
<h1>${esc(provider)} AI coding plans</h1>
<p class="lede">${list.length === 1 ? "One tracked plan" : `${list.length} tracked plans`} from ${esc(provider)}, sorted by tokens per dollar paid. Cheapest documented option first.</p>
<div class="facts"><span><b>${list.length}</b>tracked plans</span><span><b>${esc(provider)}</b>provider</span><span><b>${today}</b>snapshot</span></div>
<h2>Plans from ${esc(provider)}</h2>
<table>
  <thead><tr><th>Plan</th><th>Price</th><th>Tokens per dollar</th><th>Models</th><th>Disclosure</th></tr></thead>
  <tbody>
${rowsHtml}
  </tbody>
</table>
<h2>Compare</h2>
<p>All ${stats.totalPlans ?? plans.length} plans from every provider, with the chart and filters: <a href="${ALL_PLANS}">AI coding plan comparison</a>.</p>`;
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description: desc, url, inLanguage: "en", isPartOf: { "@type": "WebSite", name: "vibeplan.cc", url: SITE } };
  const dir = join(PUB, "providers", ps);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), shell(title, desc, url, body, ld));
  provDirs.push(ps);
}

// ------------------------------------------------------- Deutsche Einstiegsseite
{
  const top = measured.slice(0, 20);
  const rowsHtml = top.map((m, i) => `      <tr><td class="num">${i + 1}</td><td><a href="${SITE}/plans/${slug(m.p.id)}/">${esc(m.p.name)}</a><span class="prov">${esc(m.p.provider)}</span></td><td class="num">${usd(m.paid)}</td><td class="num strong">${big(m.tokensPerUsd)}</td><td class="num">${m.rows.length}</td><td>${esc(m.p.disclosure ?? "undisclosed")}</td></tr>`).join("\n");
  const url = `${SITE}/de/`;
  const title = "KI-Coding-Abos im Vergleich: was ein Dollar wirklich bringt";
  const desc = `${stats.totalPlans ?? plans.length} KI-Coding-Abos nach Tokens pro gezahltem Dollar sortiert, nur mit veroeffentlichten Preisen und Limits, taeglich neu aus offiziellen Quellen. Preise inklusive Gebuehren.`.replace("veroeffentlichten", "veröffentlichten").replace("taeglich", "täglich").replace("Gebuehren", "Gebühren");
  const body = `<nav class="note"><a href="/coding-plan-comparison/">English</a> · <a href="/#overview">Interaktive Ansicht</a></nav>
<h1>KI-Coding-Abos im Vergleich 2026</h1>
<p class="lede">Welches KI-Abo bringt am meisten Arbeit fürs Geld? Diese Übersicht ordnet die ${measured.length} Tarife mit veröffentlichten, wiederkehrenden Zahlen nach Tokens pro gezahltem Dollar, täglich neu gebaut aus offiziellen Quellen. Preise inklusive Bearbeitungsgebühren, wo welche anfallen. Keine Schätzungen: was ein Anbieter nicht veröffentlicht, steht hier nicht.</p>
<div class="facts">
  <span><b>${stats.totalPlans ?? plans.length}</b>Tarife erfasst</span>
  <span><b>${measured.length}</b>mit belastbaren Zahlen</span>
  <span><b>${stats.sourceCount ?? ""}</b>Quellen</span>
  <span><b>${today}</b>Stand</span>
</div>
<h2>Die stärksten Tarife</h2>
<table>
  <thead><tr><th>Rang</th><th>Tarif</th><th>Preis</th><th>Tokens pro $</th><th>Modelle</th><th>Angaben</th></tr></thead>
  <tbody>
${rowsHtml}
  </tbody>
</table>
<p class="note">Gerechnet auf einen Vergleichspreis von einem Dollar pro Monat: veröffentlichter Umfang geteilt durch den tatsächlich gezahlten Monatspreis, jeweils als Median über die Modelle des Tarifs. Tarife ohne API-Zugang bleiben draußen, ebenso Modelle, die laut Anbieter mit den Daten trainieren.</p>
<h2>Häufige Fragen</h2>
<h3>Warum fehlen manche Tarife im Ranking?</h3>
<p>Nur Tarife mit veröffentlichtem, wiederkehrendem Limit sind vergleichbar. Anbieter, die ihre Grenzen offenlassen, bleiben bewusst draußen statt geschätzt zu werden.</p>
<h3>Sind die Preise inklusive Gebühren?</h3>
<p>Ja. Bearbeitungsgebühren sind eingerechnet, damit eine Zahl steht, die man wirklich zahlt. Wo ein Anbieter nur einen Listenpreis nennt, steht der Listenpreis.</p>
<h3>Wie aktuell sind die Zahlen?</h3>
<p>Die Pipeline läuft jeden Tag, jede Zeile trägt ihr Prüfdatum und ihre Quelle. Änderungen stehen im <a href="/feed.xml">Changelog-Feed</a>.</p>
<h3>Was bedeutet "Angaben"?</h3>
<p>Wie offen der Anbieter seinen Umfang dokumentiert: disclosed, partial, reported, reference oder undisclosed. Nur disclosed und partial landen im Ranking.</p>
<h2>Weiter</h2>
<p>Interaktive Ansicht mit Chart, Filtern und Rechner: <a href="/#overview">vibeplan.cc</a>. English version: <a href="/coding-plan-comparison/">AI coding plan comparison</a>.</p>`;
  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url, inLanguage: "de", isPartOf: { "@type": "WebSite", name: "vibeplan.cc", url: SITE } };
  const dir = join(PUB, "de");
  mkdirSync(dir, { recursive: true });
  let html = shell(title, desc, url, body, ld).replace('<html lang="en">', '<html lang="de">');
  html = html.replace(`<link rel="canonical" href="${url}">`, `<link rel="canonical" href="${url}">\n<link rel="alternate" hreflang="en" href="${ALL_PLANS}">\n<link rel="alternate" hreflang="de" href="${url}">\n<link rel="alternate" hreflang="x-default" href="${ALL_PLANS}">`);
  writeFileSync(join(dir, "index.html"), html);
}

// Aufraeumen: nur selbst erzeugte Verzeichnisse, die nicht mehr gebraucht werden
for (const [base, keep] of [["plans", planDirs], ["providers", provDirs]]) {
  const dir = join(PUB, base);
  if (!existsSync(dir)) continue;
  const mark = join(dir, ".generated.json");
  let before = [];
  try { before = JSON.parse(readFileSync(mark, "utf8")); } catch { before = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); }
  for (const old of before) {
    if (!keep.includes(old)) rmSync(join(dir, old), { recursive: true, force: true });
  }
  writeFileSync(mark, JSON.stringify(keep.sort(), null, 0));
}

console.log(`Seiten erzeugt: ${planDirs.length} Plaene, ${provDirs.length} Anbieter, 1 deutsche Einstiegsseite, Stand ${today}`);
