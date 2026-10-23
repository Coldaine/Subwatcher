#!/usr/bin/env node
// Erzeugt .superdesign/init/*.md aus dem echten Code (keine erfundenen Inhalte).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/opt/data/projects/coding-plan-comparison";
const OUT = join(ROOT, ".superdesign/init");
mkdirSync(OUT, { recursive: true });

const html = readFileSync(join(ROOT, "public/index.html"), "utf8");
const js = readFileSync(join(ROOT, "public/app.js"), "utf8");
const lines = html.split("\n");
const iso = (n) => lines.slice(n - 1, n + 1).join("\n");
const range = (a, b) => lines.slice(a - 1, b).join("\n");

// ---------- theme.md ----------
const roots = [...html.matchAll(/:root\s*\{[\s\S]*?\n\}/g)].map((m) => m[0]);
const darks = [...html.matchAll(/\[data-theme="dark"\]\s*\{[\s\S]*?\n\}/g)].map((m) => m[0]);
const tokens = (block) => [...block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => `--${m[1]}: ${m[2].trim()}`);
writeFileSync(join(OUT, "theme.md"), `# Theme tokens

Source: \`public/index.html\` (inline <style>). Vanilla CSS, no framework, no Tailwind.

## Part 1, Token summary

### Light (\`:root\`)
${(tokens(roots[0] ?? "") || []).map((t) => `- \`${t}\``).join("\n")}

### Dark (\`[data-theme="dark"]\`)
${(tokens(darks[0] ?? "") || []).map((t) => `- \`${t}\``).join("\n")}

- Type: system stack for UI, one display font for headings (see \`--font-display\` above), monospace numerals via \`.num\` (\`font-variant-numeric: tabular-nums\`).
- Breakpoint in use: \`@media (max-width: 760px)\` (mobile shell), plus a wider table breakpoint.
- Radius/shadows come from the tokens above; there is no spacing scale variable, paddings are literal.

## Part 2, Raw source

\`\`\`css
${roots[0] ?? ""}
\`\`\`

\`\`\`css
${darks[0] ?? ""}
\`\`\`
`);

// ---------- layouts.md ----------
const navStart = html.indexOf("<!-- ===== NAV ===== -->");
const tabsStart = html.indexOf("<!-- ===== EINE Navigation: Tab-Leiste ===== -->");
const tabsEnd = html.indexOf("<!-- ===== VIEW: ÜBERSICHT ===== -->");
const footStart = html.indexOf("<!-- ===== FOOTER (schlank, ein Block) ===== -->");
const footEnd = html.indexOf('<div class="toast"');
writeFileSync(join(OUT, "layouts.md"), `# Layouts

Vanilla HTML in \`public/index.html\`; the app shell is static markup, views are toggled by \`.view.active\` from \`app.js\` (\`showView\`).

## App shell / top nav + app header
\`\`\`html
${html.slice(navStart, tabsStart)}
\`\`\`

## Tab bar (the only navigation)
\`\`\`html
${html.slice(tabsStart, tabsEnd)}
\`\`\`

## Footer
\`\`\`html
${html.slice(footStart, footEnd)}
\`\`\`

## View wrapper pattern
Six siblings in \`<main>\`: \`#view-overview\`, \`#view-plans\`, \`#view-calc\`, \`#view-changelog\`, \`#view-method\`, \`#view-legal\`.
Only one carries \`.active\` (\`display: block\`); the rest are \`display: none\`. Sections inside use \`.panel\` with \`.panel-head\`.

\`\`\`css
.view { display: none; }
.view.active { display: block; }
.panel { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 14px; ... }
\`\`\`
`);

// ---------- components.md ----------
const compCss = [
  ".panel", ".panel-head", ".kpi", ".kpi-grid", ".btn", ".tab", ".badge",
  ".sortable-table", ".table-wrap", ".dash-controls", ".dash-detail", ".more-row", ".cl-row",
].map((sel) => {
  const re = new RegExp(`^\\${sel}[^{]*\\{[\\s\\S]*?\\n\\}`, "gm");
  const found = html.match(re);
  return found ? `\`\`\`css\n${found.join("\n")}\n\`\`\`` : "";
}).filter(Boolean).join("\n\n");
writeFileSync(join(OUT, "components.md"), `# UI primitives

All shared UI lives as CSS classes in \`public/index.html\` and is rendered by \`public/app.js\`.
There is no component library (no React/Vue/Tailwind). Reproduce by reusing these classes.

## Class definitions (verbatim from index.html)
${compCss}

## Rendered markup examples (verbatim from app.js)

### KPI card
\`\`\`html
<div class="kpi"><div class="k" data-i18n="stats.plans">Plans tracked</div><div class="v num" id="stat-plans">-</div><div class="s" id="stat-plans-sub"></div></div>
\`\`\`

### Chart detail panel (\`showDashDetail\`)
\`\`\`html
<div class="dash-detail"> ... plan name, provider, tokens per money, AI score, plan price, tokens per month ... </div>
\`\`\`

### Table row (one row per plan+model combination)
\`\`\`html
<tr><td class="cell-head">Plan name<span class="rank-tag">#3</span><div class="muted">provider</div></td><td class="cell-sub">model</td>...</tr>
\`\`\`

### Chart
\`<canvas id="dash-canvas">\` drawn in 2D by \`renderDashboardInner()\` (log X axis, dots, Pareto line, target zone). SVG is not used.
`);

// ---------- routes.md ----------
writeFileSync(join(OUT, "routes.md"), `# Views (client-side "routes")

Hash-routed in \`public/app.js\` (\`VIEW_ALIASES\` + \`showView\`); no server routing, single \`index.html\`.

| hash | view id | content |
|---|---|---|
| \`#overview\` | \`view-overview\` | KPI cards, positioning chart (canvas), "best value" table (6 rows) |
| \`#plans\` | \`view-plans\` | search/filter toolbar, sortable plan+model table (25 rows, "show more"), column picker, mobile filter sheet, family comparison table (12 rows) |
| \`#calc\` | \`view-calc\` | budget calculator: input + ranked plan list with monthly tokens and plan cap |
| \`#changelog\` | \`view-changelog\` | changelog entries from \`data/changelog.yml\` |
| \`#method\` | \`view-method\` | methodology steps (collapsible), formula block, FAQ accordion |
| \`#legal\` | \`view-legal\` | privacy, imprint, disclaimer |

Legacy anchors redirect: \`#pareto\`/\`#stats\` -> overview, \`#models\` -> plans, \`#faq\` -> method, \`#privacy\`/\`#imprint\`/\`#disclaimer\` -> legal.
`);

// ---------- pages.md ----------
writeFileSync(join(OUT, "pages.md"), `# Page dependency trees

## / (single page, all views)
Entry: \`public/index.html\`
Dependencies:
- \`public/app.js\`
  - \`public/data/latest.json\` (fetched at runtime; offline fallback to \`public/data/latest.json\` cache)
  - i18n dictionaries \`I18N.en\` / \`I18N.de\` (in app.js)
  - render functions: renderStats, renderTop, renderPlans, renderDashboard(+Inner), renderFamily, renderCalculator, renderChangelog, renderFormula
  - interaction: initTabs/showView, initDashboard, initCalculator, initSheet, initBackToTop, initMethodMore, bindSortHeader, bindDashTooltip
- (generated) \`public/data/latest.json\` <- \`scripts/build.mjs\` <- \`sources.yml\`, \`data/overrides.yml\`, \`cache/\`
`);

// ---------- extractable-components.md ----------
writeFileSync(join(OUT, "extractable-components.md"), `# Extractable components

## AppShell (top nav + tab bar + footer)
- Source: \`public/index.html\`
- Category: layout
- Description: brand + currency/theme/language controls, one horizontal tab bar, slim footer
- Extractable props: activeTab (string), currency (string), theme (light|dark), lang (en|de)

## TabBar
- Source: \`public/index.html\` (\`.tabs\`), logic \`showView\` in app.js
- Category: layout
- Description: single navigation for the six views
- Extractable props: activeView, items[]

## KpiCard
- Source: \`public/index.html\` (\`.kpi\`), filled by \`renderStats()\`
- Category: basic
- Description: label / big numeric value / caption
- Extractable props: label, value, caption

## Panel
- Source: \`public/index.html\` (\`.panel\`, \`.panel-head\`)
- Category: basic
- Description: bordered surface with heading, optional action button in the header
- Extractable props: title, subtitle, actionLabel

## DataTable
- Source: \`.sortable-table\` + \`.table-wrap\`, rendered by \`renderPlans()\` / \`renderTop()\` / \`renderFamily()\`
- Category: basic
- Description: sortable table with sticky header, numeric cells, mobile card reflow via \`data-label\`
- Extractable props: columns[], rows[], sortKey, sortDir

## PositioningChart
- Source: \`renderDashboardInner()\` (canvas 2D)
- Category: basic
- Description: log-X scatter of plan+model points, Pareto frontier line, target zone, click-to-detail
- Extractable props: xMetric, yMetric, showPareto, points[]

## Badge
- Source: \`.badge\`, \`.rank-tag\`, \`.privacy-badges\` in index.html
- Category: basic
- Description: small pill for data tier, privacy flags, calculator rank
- Extractable props: text, tone (neutral|info|warn)
`);

console.log("init written:", ["theme", "layouts", "components", "routes", "pages", "extractable-components"].map((f) => `${f}.md`).join(", "));
