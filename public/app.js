/* ============================================================
 * Coding Plan Compare , frontend app
 * Dependency-free. Loads public/data/latest.json, renders the
 * whole page, i18n EN/DE, dark mode, URL state.
 * ============================================================ */
/* Idempotenz-Schutz: verhindert Crash bei doppelt geladenem Script
 * (z.B. aggressive Caches, Browser-Addons, doppelter Refresh).
 * Sonst: "Identifier '$' has already been declared" → Seite tot. */
(function () {
if (typeof window !== "undefined" && window.__CPC_LOADED__) {
  return; // bereits geladen , nichts tun
}
if (typeof window !== "undefined") window.__CPC_LOADED__ = true;
"use strict";

/* ---------------- i18n ---------------- */
const I18N = {
  en: {
    "nav.brand": "vibeplan.cc",
    "nav.pareto": "Pareto",
    "nav.calc": "Calculator",
    "nav.changelog": "Changelog",
    "menu.currency": "Currency",
    "menu.theme": "Design",
    "menu.language": "Language",
    "tab.overview": "Overview",
    "tab.plans": "Plans",
    "tab.tools": "Tools Hub",
    "tab.compare": "Compare",
    "tab.sizer": "Workload Sizer",
    "tab.calc": "Calculator",
    "tab.sync": "Data Sync",
    "tab.method": "Method",
    "tab.changelog": "Changelog",
    "top.h3": "Best value right now",
    "top.sub": "One row per plan, strongest model, ranked by tokens per unit paid. Only plans that do not train on your data and come with API access.",
    "top.all": "All plans",
    "more.show": "Show more",
    "fcomp.scale": "Bars share one scale, full width =",
    "calc.th.plan": "Plan · model",
    "calc.th.tokens": "Tokens / mo",
    "calc.th.cost": "Price · left over",
    "calc.nospare": "no headroom",
    "hero.h1": "AI coding subscriptions, compared",
    "hero.scope": "Prices, quotas and token rates for AI coding plans and models",
    "foot.scope": "Published list prices and quotas, collected from provider sources",
    "nav.plans": "Plans",
    "nav.models": "Models",
    "nav.method": "Methodology",
    "nav.faq": "FAQ",
    "hero.live": "Live data · auto-updated daily",
    "hero.h1a": "AI Coding Subscriptions,",
    "hero.h1b": "Compared Honestly.",
    "hero.lead": `“60 for 10” is only the sticker price. We compare what you actually get. real token economics, provider credit formulas, cache-aware cost per request. from live official sources, reproduced daily.`,
    "hero.cta1": "Compare plans",
    "hero.cta2": "How it works",
    "hero.cta3": "Budget calculator",
    "hero.sources": "live sources",
    "stats.plans": "Plans tracked",
    "stats.comparable": "Directly comparable",
    "stats.comparable-sub": "with full model pricing",
    "stats.models": "Model families",
    "stats.models-sub": "matched across plans",
    "stats.sources": "Live sources",
    "stats.sources-sub": "official feeds & docs",
    "status.plans": "plans",
    "status.comparable": "comparable",
    "status.models": "model families",
    "status.sources": "sources",
    "plans.h2": "The plans",
    "plans.sub": "Every plan and model combination. Rates are tokens or requests per 1 paid unit, in your currency.",
    "plans.per": "/mo",
    "plans.noPrice": "price not public",
    "plans.meter": "Meter",
    "plans.quota": "Quota",
    "plans.source": "Source",
    "ref.title": "Reference plans without a published token quota ({n})",
    "ref.intro": "Tracked with their official price and, where the vendor publishes one, their quota (messages per five hours or credits per month). They are not ranked by tokens per dollar, because without a published token quota any rate would be invented. Third-party measurements are quoted with their source and date.",
    "ref.noQuota": "quota not published",
    "ref.perMonth": "per month",
    "plans.searchPh": "Filter plans...",
    "a11y.skip": "Skip to content",
    "a11y.status": "{n} of {total} plans shown",
    "a11y.statusCols": ", {c} columns hidden",
    "a11y.removeChip": "Remove filter",
    "plans.searchAria": "Filter plans",
    "plans.meterAria": "Usage meter",
    "plans.budgetAria": "Maximum plan price per month",
    "plans.aiAria": "Minimum AI score",
    "plans.hiddenCols": "columns hidden",
    "plans.caption": "Plans and models, sortable columns",
    "top.caption": "Best value plans and models",
    "sheet.sortKeyAria": "Sort field",
    "sheet.sortDirAria": "Sort direction",
    "sheet.searchAria": "Filter plans",
    "sheet.meterAria": "Usage meter",
    "sheet.budgetAria": "Maximum plan price per month",
    "sheet.aiAria": "Minimum AI score",
    "cmdk.aria": "Search plans and models or jump to a view",
    "dash.chartAria": "Scatter plot: tokens per money against AI score, one dot per plan and model",
    "dash.chartDesc": "Use the arrow keys to move between dots, Enter opens its numbers, Escape clears the selection. The same values are in the table below.",
    "dash.targetHint": "Activates as soon as the target zone is switched on",
    "plans.allMeters": "All meters",
    "plans.allStatus": "All statuses",
    "plans.meter.dollar": "Dollar usage",
    "plans.meter.credits": "Credits",
    "plans.meter.tokens": "Tokens",
    "plans.meter.requests": "Requests",
    "plans.meter.prompts": "Prompts",
    "plans.status.disclosed": "Verified",
    "plans.status.partial": "Partial",
    "plans.status.undisclosed": "Undisclosed",
    "plans.th.plan": "Plan",
    "plans.th.provider": "Provider",
    "plans.th.price": "Price / mo",
    "plans.th.meter": "Meter",
    "plans.th.quota": "Quota",
    "plans.th.models": "Models",
    "plans.th.avgreq": "Avg req / mo",
    "plans.th.status": "Status",
    "plans.th.tokens": "Tokens / $",
    "plans.th.model": "Model",
    "plans.th.score": "AI score",
    "plans.th.req10": "Requests / $",
    "plans.th.rawtokens": "Tokens / mo",
    "plans.th.rawreq": "Requests / mo",
    "plans.th.cap": "Included volume",
    "plans.scoreNA": "No benchmark available",
    "plans.th.privacy": "Other",
    "plans.budget": "Max $/mo",
    "plans.aiScore": "Min AI score",
    "plans.attrs": "Attributes",
    "plans.noTraining": "No training on my data",
    "plans.waitlist": "Waitlist",
    "plans.waitlist.title": "Currently waitlist only - not purchasable yet",
    "plans.estimate": "estimate",
    "plans.note": "Note",
    "attr.source": "Source",
    "attr.noTraining": "no training",
    "attr.noTraining.tip": "The provider states it does not train on your data.",
    "attr.trains": "trains",
    "attr.trains.tip": "The provider trains on your data or does not exclude it.",
    "attr.unknown": "not stated",
    "attr.unknown.tip": "No verifiable privacy statement found in the provider docs.",
    "attr.cli": "no API",
    "attr.zdr": "ZDR",
    "attr.zdr.tip": "Zero data retention confirmed for this model and provider: 0 days retention documented. Provider-wide promises and ZDR on request are not counted.",
    "attr.days": "days",
    "attr.retention.tip": "Standard retention window for request data, as stated by the provider.",

    "plans.includePriceBased": "Include price-based plans (Kimi)",
    "plans.includeNoApi": "Include no-API plans",
    "plans.includeTraining": "Include models that train on your data",
    "plans.trainingHidden": "training hidden",
    "plans.noApiHidden": "no API hidden",
    "plans.columns": "Columns",
    "plans.columns.title": "Show columns",
    "filters.toggle": "Filters",
    "sheet.title": "Customize list",
    "sheet.sort": "Sort by",
    "sheet.filter": "Filter",
    "sheet.done": "Done",
    "sort.label": "Sort",
    "sort.by": "Sort by",
    "sort.dir": "Direction",
    "sort.descShort": "highest first",
    "sort.ascShort": "lowest first",
    "sort.tokens": "Tokens / $",
    "sort.score": "AI score",
    "sort.req10": "Requests / $",
    "sort.rawtokens": "Tokens / mo",
    "sort.rawreq": "Requests / mo",
    "sort.price": "Plan price",
    "sort.plan": "Plan",
    "sort.model": "Model",
    "sort.desc": "desc",
    "sort.asc": "asc",
    "dash.h3": "Positioning",
    "dash.sub": "One dot per plan and model. Default axes: tokens per money against AI score.",
    "dash.x": "X axis",
    "dash.y": "Y axis",
    "dash.pareto": "Pareto line",
    "dash.green": "Show target",
    "dash.legend.green": "Target zone",
    "dash.legend.noTraining": "no training on your data",
    "dash.legend.trains": "trains on your data",
    "dash.legend.unknown": "privacy unknown",
    "dash.legend.pareto": "Pareto frontier",
    "dash.legend.frontier": "Pareto points",
    "dash.legend.shapes": "● no training · ■ trains · ▲ unknown",
    "dash.target": "Target:",
    "dash.targetX": "min X",
    "dash.targetY": "min Y",
    "dash.clickHint": "Pick a dot to see its numbers",
    "dash.empty": "No data for the plot with these filters.",
    "dash.emptyReset": "Reset filters",
    "dash.legendToggle": "Legend",
    "dash.controls": "Axes & target",
    "dash.detailTitle": "Selected detail",
    "dash.detailSub": "Click a dot to see the plan and model",
    "dd.method": "How these numbers are built",
    "cmdk.placeholder": "Search or jump to",
    "cmdk.view": "view",
    "cmdk.plan": "plan",
    "cmdk.model": "model",
    "cmdk.family": "family",
    "cmdk.empty": "Nothing matches",
    "cmdk.hint": "Type to search plans and models",
    "rail.filters": "Filters",
    "rail.trigger": "Filters",
    "rail.title": "Filters and axes",
    "rail.close": "Close filters",
    "rail.show": "Show results",
    "rail.axes": "Axes",
    "rail.target": "Target zone",
    "rail.stats": "In this view",
    "rail.points": "Points",
    "rail.paretoCount": "Pareto points",
    "rail.best": "Best rate",
    "rail.median": "Median score",
    "rail.minx": "Minimum X",
    "rail.miny": "Minimum Y",
    "dash.logx": "Logarithmic X",
    "dash.hint": "Wheel or pinch to zoom, drag to pan, double click to reset",
    "dash.zoomIn": "Zoom in",
    "dash.zoomOut": "Zoom out",
    "dash.resetZoom": "Reset zoom",
    "dash.reset": "Reset filters",
    "dash.shortlist": "Strongest plans in this view",
    "dash.m.tokens": "Tokens / $",
    "dash.m.req10": "Requests / $",
    "dash.m.rawtokens": "Tokens / mo",
    "dash.m.rawreq": "Requests / mo",
    "dash.m.score": "AI score",
    "dash.m.price": "Plan price / mo",
    "plans.badge.noTraining": "no training",
    "plans.badge.zeroRetention": "zero retention",
    "plans.badge.retention": "retention {d}d",
    "models.searchPh": "Filter models...",
    "models.h2": "Model for model, per $1",
    "models.sub": "The same model family compared across plans, per $1 paid. One subscription per account, so rates cannot be stacked.",
    "models.th.model": "Model family",
    "models.th.planA": "Plan A",
    "models.th.req": "Requests / $",
    "models.th.planB": "Plan B",
    "models.th.winner": "Winner",
    "models.th.edge": "Edge",
    "models.winner.draw": "Draw",
    "models.edge": "edge",
    "fcomp.h2": "Same model, different plans",
    "fcomp.sub": "Requests per $1 paid for the same model across plans.",
    "fcomp.th.family": "Model family",
    "fcomp.th.planA": "Plan A",
    "fcomp.th.reqA": "Req / $",
    "fcomp.th.planB": "Plan B",
    "fcomp.th.reqB": "Req / $",
    "fcomp.th.edge": "Difference",
    "fcomp.winner.draw": "Draw",
    "cl.h2": "Changelog",
    "cl.sub": "What changed for you, newest first. Generated from the repository commits, each entry links to its commit.",
    "method.h2": "What “60 for 10” actually buys",
    "method.sub": "An advertised “60 for 10” says little about what a plan delivers. This is how we make plans comparable, and every step is reproducible.",
    "method.formula.title": "Cost per request",
    "method.s1.t": "The provider's own token prices",
    "method.s1.p": "Every model behind a plan has published API token prices: input, output, cached-read and cached-write. We use them to turn credits or dollar usage into requests.",
    "method.s2.t": "Provider credit formulas",
    "method.s2.p": "Providers define their own credits (GLM: (in×6.9 + cached×1.7 + out×24)/10000). We take those formulas from the official docs instead of inventing them.",
    "method.s3.t": "Cache-aware workload model",
    "method.s3.p": "Coding agents hit the cache constantly. Input is priced 5% fresh + 95% cached-write, We price input as 5% fresh and 95% cached-write, and use the real rates for cached reads and output, per model and workload pattern.",
    "method.s4.t": "Time windows are throughput caps",
    "method.s4.p": "A 5-hour window is a throughput limit rather than a monthly quota. Weekly credits scale to a month (×4.33), and we never multiply 5-hour caps into monthly numbers.",
    "method.s5.t": "One workload pattern per model family",
    "method.s5.p": "Some feeds reuse one generic workload pattern. For shared model families we use the most precise per-model pattern for both plans, so neither plan gets a cheaper pattern.",
    "method.s6.t": "Undisclosed numbers stay empty",
    "method.s6.p": "If a provider does not publish its numbers, we say so. We do not invent credits or back-calculate quotas.",
    "method.s7.t": "Prices as you pay them",
    "method.s7.p": "Prices show what you pay. Normally that is the vendor list price; where a vendor adds a fee on top, the fee is already inside the number and the split stands in the plan note. Command Code adds a card processing fee to every plan and only shows the exact rate at checkout, so its prices carry the measured total (GOAT: $10.78 paid for the $10 tier on 2026-10-02, 7.8 %) and the other Command Code tiers use the same measured rate.",
    "method.more": "Show all steps",
    "method.less": "Show fewer",
    "faq.h2": "Frequently asked questions",
    "faq.q1": "Is this really reproducible?",
    "faq.a1": "Yes. The pipeline fetches official feeds and docs (sources.yml), parses them deterministically, and builds latest.json from the cached snapshots only; the build never fetches live. The same snapshots produce the same JSON. Change detection runs daily and hashes the parsed data, so HTML nonces do not register as changes.",
    "faq.q2": "Why is “60 for 10” misleading?",
    "faq.a2": "OpenCode Go advertises $60 of usage for $10. But real requests per month range from ~490 (Kimi K3) to ~226,000 (Muse Spark 1.2) depending on the model. The dollar value is real; what it buys depends entirely on token prices, cache behaviour and the workload pattern. We compute exactly that.",
    "faq.q3": "Why don't you compare all 17 plans directly?",
    "faq.a3": "Only 6 plans currently publish enough data (token prices or credit formulas) to compute requests per month honestly. The others show their raw quotas. We do not invent missing numbers, because a comparison built on them would be fiction.",
    "faq.q4": "Which prices do you show?",
    "faq.a4": "The paid checkout price (paidPrice), not the advertised one. Command Code GOAT advertises $10 but checkout is $10.77, so we scale by the real price. Where a plan is priced in CNY (GLM, Kimi) we keep that currency and say so.",
    "faq.q5": "How often does this update?",
    "faq.a5": "A GitHub Action fetches all sources daily at 03:17 UTC. If parsed content changed, it commits the new latest.json. If a non-scrapable price page (GLM, MiniMax) changed, it opens a review issue for manual verification.",
    "faq.q6": "Where do the AI scores come from?",
    "faq.a6": "Model benchmark scores come from llm-stats.com, a community model catalog. The data is cached locally and only re-fetched when the cache expires (24h TTL).",
    "faq.q7": "Can I just buy Command Code Go ten times?",
    "faq.a7": "No. A plan is a single per-account subscription: you pick one, and switching resets the rolling windows (per Command Code's own docs). Extra usage comes from top-up credits at model cost. The rates here are therefore per $1 paid, and the budget calculator compares single plans.",
    "faq.q8": "What does “per $1” mean?",
    "faq.a8": "It is a rate: monthly requests divided by the paid monthly price. Command Code Go at $1 shows what $1 buys; OpenCode Go at $10 shows what each dollar of its $10 buys. Rates follow your selected currency and cannot be stacked, because a plan is a single per-account subscription.",
    "faq.q9": "Why does plan X rank first in the calculator?",
    "faq.a9": "The calculator lists single plans within your budget, ordered by monthly tokens for each plan's strongest model. It is a sorted list rather than advice, because the right plan also depends on which models you need, the privacy terms and the rate limits.",
    "calc.h2": "Budget calculator",
    "calc.sub": "One subscription per account, no stacking. Enter what you pay per month and see the most tokens each single plan buys you.",
    "calc.budget": "Budget / mo",
    "calc.score": "Min AI score",
    "calc.plan": "Plan",
    "calc.model": "Best model in budget",
    "calc.tokensMo": "Tokens / mo",
    "calc.reqMo": "Requests / mo",
    "calc.price": "Price / mo",
    "calc.all": "all",
    "calc.leftover": "left",
    "calc.empty": "No single plan fits this budget.",
    "calc.note": "Ranked by monthly tokens. Rates follow your selected currency. Price-based estimates (Kimi) stay excluded unless enabled in the filters.",
    "calc.rankTitle": "Rank in the budget calculator",
    "foot.product": "Product",
    "foot.plans": "Plans",
    "foot.models": "Model comparison",
    "foot.method": "Methodology",
    "foot.faq": "FAQ",
    "foot.data": "Data",
    "foot.json": "latest.json (API)",
    "foot.compare": "AI coding plan comparison",
    "foot.repo": "GitHub",
    "foot.sources": "sources.yml",
    "foot.llmstats": "AI scores: llm-stats.com",
    "foot.legal": "Note",
    "foot.note": "Independent & informational. We don't sell plans and have no affiliate links. Always confirm on the official provider page.",
    "foot.legalTitle": "Legal",
    "foot.privacy": "Privacy",
    "foot.imprint": "Imprint",
    "foot.disclaimer": "Disclaimer",
    "foot.rights": "© 2026 vibeplan.cc · MIT License",
    "foot.lang": "English · Deutsch",
    "foot.feedback": "Feedback",
    "fbk.title": "Send feedback",
    "fbk.lead": "Wrong price, missing plan, something confusing? One sentence is enough. No account, no tracking.",
    "fbk.ph": "What is wrong or missing?",
    "fbk.contactPh": "Email or handle (optional, only if you want an answer)",
    "fbk.send": "Send",
    "fbk.sending": "Sending…",
    "fbk.ok": "Thanks, it arrived.",
    "fbk.err": "Not sent. Retry, or use the mail link.",
    "fbk.empty": "Please write something first.",
    "fbk.mail": "Open in mail app",
    "fbk.copy": "Copy text",
    "fbk.copied": "Copied.",
    "fbk.close": "Close",
    "fbk.privacy": "Goes to this site's own endpoint on vibeplan.cc and is stored there so it can be fixed. Nothing else is transmitted, no cookie is set.",
    "legal.h2": "Legal",
    "legal.sub": "Privacy, imprint and liability information.",
    "legal.privacy.h3": "Privacy",
    "legal.privacy.body": "<p>This site sets no cookies and makes no connections to third parties. All data, including anything you send, is served from this domain itself.</p><p>Your preferences (language, theme, currency, visible columns) are stored in your browser's localStorage so the page remembers them between visits. This data never leaves your device, and localStorage is not a cookie and is not used for tracking.</p><p>The site is hosted by GitHub Pages. As with any web host, GitHub's servers process technical access data (IP address, user agent, requested files) in server logs, which GitHub's privacy policy covers.</p><p>We use no analytics tools, advertising networks or third-party embeds.</p><p>If you use the feedback button, the text you write, the page you were on, the language and the time are transmitted to this site's own endpoint on vibeplan.cc and stored there. An optional contact address you enter is used only to answer you. No third-party service is involved and no cookie is set.</p><p>For any privacy request, use the contact details in the imprint.</p>",
    "legal.imprint.h3": "Imprint / Provider identification",
    "legal.imprint.body": "<p>This website is operated by an individual maintainer on a non-commercial, informational basis.</p><p>Operator: Kolja Knodel<br>Contact: <a href=https://github.com/harrytyp>GitHub: harrytyp</a></p><p>As a private, non-commercial website, a full postal address is not required. If this service becomes commercial or targets the DACH region, the imprint must be extended (e.g. §5 DDG in Germany) with your full name and address.</p>",
    "legal.disclaimer.h3": "Disclaimer",
    "legal.disclaimer.body": "<p>All prices, quotas, and conditions shown here are collected from public provider sources on a best-effort basis. They may change at any time. Always confirm current terms on the official provider website before purchasing.</p><p>This site is independent and not affiliated with, endorsed by, or sponsored by any provider shown. We do not sell plans and have no affiliate links.</p><p>Information is provided \"as is\" without warranty of any kind. We are not liable for any decisions made based on this data.</p>",
    "loading": "Loading live data…",
    "error": "Could not load data. Please check the connection or try again.",
    "updated": "Data snapshot",
    "stale.sources": "sources stale",
    "disclaimer.title": "Note:",
    "disclaimer.text": "Prices and quotas change frequently. This site is informational, so confirm them on the official provider page before subscribing.",
  },
  de: {
    "nav.brand": "vibeplan.cc",
    "nav.pareto": "Pareto",
    "nav.calc": "Rechner",
    "nav.changelog": "Changelog",
    "menu.currency": "Währung",
    "menu.theme": "Design",
    "menu.language": "Sprache",
    "tab.overview": "Übersicht",
    "tab.plans": "Pläne",
    "tab.tools": "Tools & Anbieter",
    "tab.compare": "Vergleich",
    "tab.sizer": "Workload-Rechner",
    "tab.calc": "Rechner",
    "tab.sync": "Daten-Sync",
    "tab.method": "Methodik",
    "tab.changelog": "Changelog",
    "top.h3": "Beste Rate gerade jetzt",
    "top.sub": "Eine Zeile pro Plan, stärkstes Modell, sortiert nach Tokens pro bezahlter Einheit. Nur Pläne ohne Training auf den Daten und mit API-Zugang.",
    "top.all": "Alle Pläne",
    "more.show": "Mehr anzeigen",
    "fcomp.scale": "Balken teilen eine Skala, volle Breite =",
    "calc.th.plan": "Plan · Modell",
    "calc.th.tokens": "Tokens / Monat",
    "calc.th.cost": "Preis · Rest",
    "calc.nospare": "kein Spielraum",
    "hero.h1": "KI-Coding-Abos im Vergleich",
    "hero.scope": "Preise, Quoten und Token-Raten für KI-Coding-Pläne und Modelle",
    "foot.scope": "Veröffentlichte Listenpreise und Quoten aus Anbieterquellen",
    "nav.plans": "Pläne",
    "nav.models": "Modelle",
    "nav.method": "Methodik",
    "nav.faq": "FAQ",
    "hero.live": "Live-Daten · täglich automatisch aktualisiert",
    "hero.h1a": "KI-Coding-Abos,",
    "hero.h1b": "Ehrlich verglichen.",
    "hero.lead": `„60 für 10“ ist nur der Aufkleberpreis. Wir vergleichen, was du wirklich bekommst. echte Token-Ökonomie, anbietereigene Credit-Formeln, cache-bewusste Kosten pro Request. aus Live-Quellen, täglich reproduziert.`,
    "hero.cta1": "Pläne vergleichen",
    "hero.cta2": "So funktioniert's",
    "hero.cta3": "Budget-Rechner",
    "hero.sources": "Live-Quellen",
    "stats.plans": "Erfasste Pläne",
    "stats.comparable": "Direkt vergleichbar",
    "stats.comparable-sub": "mit vollständigem Modell-Pricing",
    "stats.models": "Modell-Familien",
    "stats.models-sub": "über Pläne gematcht",
    "stats.sources": "Live-Quellen",
    "stats.sources-sub": "offizielle Feeds & Docs",
    "status.plans": "Pläne",
    "status.comparable": "vergleichbar",
    "status.models": "Modell-Familien",
    "status.sources": "Quellen",
    "plans.h2": "Die Pläne",
    "plans.sub": "Jede Plan-Modell-Kombination. Raten sind Tokens oder Requests pro 1 bezahlter Einheit, in deiner Währung.",
    "plans.per": "/Monat",
    "plans.noPrice": "Preis nicht öffentlich",
    "plans.meter": "Meter",
    "plans.quota": "Kontingent",
    "plans.source": "Quelle",
    "ref.title": "Referenzpläne ohne veröffentlichte Token-Quote ({n})",
    "ref.intro": "Geführt mit ihrem offiziellen Preis und, wo der Anbieter eine veröffentlicht, mit ihrer Quote (Nachrichten pro fünf Stunden oder Credits pro Monat). Sie stehen nicht in der Rangliste nach Token pro Dollar, weil ohne veröffentlichte Token-Quote jede Rate erfunden wäre. Drittseitige Messungen sind mit Quelle und Datum zitiert.",
    "ref.noQuota": "Quote nicht veröffentlicht",
    "ref.perMonth": "pro Monat",
    "plans.searchPh": "Pläne filtern...",
    "a11y.skip": "Zum Inhalt springen",
    "a11y.status": "{n} von {total} Plänen sichtbar",
    "a11y.statusCols": ", {c} Spalten ausgeblendet",
    "a11y.removeChip": "Filter entfernen",
    "plans.searchAria": "Pläne filtern",
    "plans.meterAria": "Abrechnungsart",
    "plans.budgetAria": "Maximaler Planpreis pro Monat",
    "plans.aiAria": "Mindest-AI-Score",
    "plans.hiddenCols": "Spalten ausgeblendet",
    "plans.caption": "Pläne und Modelle, sortierbare Spalten",
    "top.caption": "Beste Pläne und Modelle",
    "sheet.sortKeyAria": "Sortierfeld",
    "sheet.sortDirAria": "Sortierrichtung",
    "sheet.searchAria": "Pläne filtern",
    "sheet.meterAria": "Abrechnungsart",
    "sheet.budgetAria": "Maximaler Planpreis pro Monat",
    "sheet.aiAria": "Mindest-AI-Score",
    "cmdk.aria": "Pläne und Modelle suchen oder zu einer Ansicht springen",
    "dash.chartAria": "Streudiagramm: Tokens pro Geld gegen AI-Score, ein Punkt pro Plan und Modell",
    "dash.chartDesc": "Mit den Pfeiltasten zwischen den Punkten wechseln, Enter öffnet die Zahlen, Escape hebt die Auswahl auf. Dieselben Werte stehen in der Tabelle darunter.",
    "dash.targetHint": "Wird aktiv, sobald die Ziel-Zone eingeschaltet ist",
    "plans.allMeters": "Alle Meter",
    "plans.allStatus": "Alle Status",
    "plans.meter.dollar": "Dollar-Usage",
    "plans.meter.credits": "Credits",
    "plans.meter.tokens": "Tokens",
    "plans.meter.requests": "Requests",
    "plans.meter.prompts": "Prompts",
    "plans.status.disclosed": "Verifiziert",
    "plans.status.partial": "Teilweise",
    "plans.status.undisclosed": "Nicht veröffentlicht",
    "plans.th.plan": "Plan",
    "plans.th.provider": "Anbieter",
    "plans.th.price": "Preis / Monat",
    "plans.th.meter": "Meter",
    "plans.th.quota": "Kontingent",
    "plans.th.models": "Modelle",
    "plans.th.avgreq": "Ø Requests / Monat",
    "plans.th.status": "Status",
    "plans.th.tokens": "Tokens / $",
    "plans.th.model": "Modell",
    "plans.th.score": "AI-Score",
    "plans.th.req10": "Requests / $",
    "plans.th.rawtokens": "Tokens / Monat",
    "plans.th.rawreq": "Requests / Monat",
    "plans.th.cap": "Inkl. Volumen",
    "plans.scoreNA": "Kein Benchmark verfügbar",
    "plans.th.privacy": "Sonstiges",
    "plans.budget": "Max $/Monat",
    "plans.aiScore": "Min. AI-Score",
    "plans.attrs": "Attribute",
    "plans.noTraining": "Kein Training auf meinen Daten",
    "plans.waitlist": "Waitlist",
    "plans.waitlist.title": "Aktuell nur Waitlist - noch nicht kaufbar",
    "plans.estimate": "Schätzung",
    "plans.note": "Hinweis",
    "attr.source": "Quelle",
    "attr.noTraining": "kein Training",
    "attr.noTraining.tip": "Der Anbieter erklärt, nicht mit deinen Daten zu trainieren.",
    "attr.trains": "trainiert",
    "attr.trains.tip": "Der Anbieter trainiert mit deinen Daten oder schließt es nicht aus.",
    "attr.unknown": "keine Angabe",
    "attr.unknown.tip": "Keine prüfbare Datenschutz-Aussage in den Anbieter-Docs gefunden.",
    "attr.cli": "kein API",
    "attr.zdr": "ZDR",
    "attr.zdr.tip": "Zero Data Retention bestätigt: für diese Modell-/Anbieter-Kombination sind 0 Tage Aufbewahrung dokumentiert. Anbieterweite Zusagen und ZDR auf Anfrage zählen nicht.",
    "attr.days": "Tage",
    "attr.retention.tip": "Übliche Aufbewahrungsdauer für Request-Daten laut Anbieter.",

    "plans.includePriceBased": "Preisbasierte Pläne einblenden (Kimi)",
    "plans.includeNoApi": "Pläne ohne API einblenden",
    "plans.includeTraining": "Modelle einblenden, die auf den Daten trainieren",
    "plans.trainingHidden": "Training ausgeblendet",
    "plans.noApiHidden": "kein API ausgeblendet",
    "plans.columns": "Spalten",
    "plans.columns.title": "Spalten anzeigen",
    "filters.toggle": "Filter",
    "sheet.title": "Liste anpassen",
    "sheet.sort": "Sortieren nach",
    "sheet.filter": "Filtern",
    "sheet.done": "Fertig",
    "sort.label": "Sortieren",
    "sort.by": "Sortieren nach",
    "sort.dir": "Richtung",
    "sort.descShort": "höchste zuerst",
    "sort.ascShort": "niedrigste zuerst",
    "sort.tokens": "Tokens / $",
    "sort.score": "AI-Score",
    "sort.req10": "Requests / $",
    "sort.rawtokens": "Tokens / Monat",
    "sort.rawreq": "Requests / Monat",
    "sort.price": "Planpreis",
    "sort.plan": "Plan",
    "sort.model": "Modell",
    "sort.desc": "absteigend",
    "sort.asc": "aufsteigend",
    "dash.h3": "Lagebild",
    "dash.sub": "Ein Punkt pro Plan und Modell. Standardachsen: Tokens pro Geld gegen AI-Score.",
    "dash.x": "X-Achse",
    "dash.y": "Y-Achse",
    "dash.pareto": "Pareto-Linie",
    "dash.green": "Zielzone zeigen",
    "dash.legend.green": "Zielzone",
    "dash.legend.noTraining": "trainiert nicht mit deinen Daten",
    "dash.legend.trains": "trainiert mit deinen Daten",
    "dash.legend.unknown": "Datenschutz unbekannt",
    "dash.legend.pareto": "Pareto-Frontier",
    "dash.legend.frontier": "Pareto-Punkte",
    "dash.legend.shapes": "● kein Training · ■ trainiert · ▲ unbekannt",
    "dash.target": "Ziel:",
    "dash.targetX": "min X",
    "dash.targetY": "min Y",
    "dash.clickHint": "Punkt wählen für die Zahlen",
    "dash.empty": "Keine Daten für den Plot mit diesen Filtern.",
    "dash.emptyReset": "Filter zurücksetzen",
    "dash.legendToggle": "Legende",
    "dash.controls": "Achsen & Ziel",
    "dash.detailTitle": "Ausgewählter Punkt",
    "dash.detailSub": "Punkt anklicken für Plan und Modell",
    "dd.method": "Wie diese Zahlen entstehen",
    "cmdk.placeholder": "Suchen oder springen",
    "cmdk.view": "Ansicht",
    "cmdk.plan": "Plan",
    "cmdk.model": "Modell",
    "cmdk.family": "Familie",
    "cmdk.empty": "Nichts gefunden",
    "cmdk.hint": "Tippen, um Pläne und Modelle zu suchen",
    "rail.filters": "Filter",
    "rail.trigger": "Filter",
    "rail.title": "Filter und Achsen",
    "rail.close": "Filter schließen",
    "rail.show": "Ergebnisse zeigen",    "rail.axes": "Achsen",
    "rail.target": "Zielzone",
    "rail.stats": "In dieser Ansicht",
    "rail.points": "Punkte",
    "rail.paretoCount": "Pareto-Punkte",
    "rail.best": "Beste Rate",
    "rail.median": "Median-Score",
    "rail.minx": "Minimum X",
    "rail.miny": "Minimum Y",
    "dash.logx": "X logarithmisch",
    "dash.hint": "Mausrad oder Pinch zum Zoomen, Ziehen verschiebt, Doppelklick setzt zurück",
    "dash.zoomIn": "Vergrößern",
    "dash.zoomOut": "Verkleinern",
    "dash.resetZoom": "Zoom zurücksetzen",
    "dash.reset": "Filter zurücksetzen",
    "dash.shortlist": "Stärkste Pläne in dieser Ansicht",
    "dash.m.tokens": "Tokens / $",
    "dash.m.req10": "Requests / $",
    "dash.m.rawtokens": "Tokens / Monat",
    "dash.m.rawreq": "Requests / Monat",
    "dash.m.score": "AI-Score",
    "dash.m.price": "Planpreis / Monat",
    "plans.badge.noTraining": "kein Training",
    "plans.badge.zeroRetention": "Zero Retention",
    "plans.badge.retention": "Speicherung {d} T",
    "view.models": "Modell-Vergleich",
    "models.searchPh": "Modelle filtern...",
    "models.h2": "Modell für Modell, pro 1 $",
    "models.sub": "Dieselbe Modell-Familie im Vergleich über Pläne, pro 1 $ bezahlt. Ein Abo pro Konto, also sind Raten nicht stapelbar.",
    "models.th.model": "Modell-Familie",
    "models.th.planA": "Plan A",
    "models.th.req": "Requests / $",
    "models.th.planB": "Plan B",
    "models.th.winner": "Gewinner",
    "models.th.edge": "Vorsprung",
    "models.winner.draw": "Unentschieden",
    "models.edge": "Vorsprung",
    "fcomp.h2": "Gleiches Modell, andere Pläne",
    "fcomp.sub": "Requests pro 1 $ bezahlt für dasselbe Modell über Pläne.",
    "fcomp.th.family": "Modell-Familie",
    "fcomp.th.planA": "Plan A",
    "fcomp.th.reqA": "Req / $",
    "fcomp.th.planB": "Plan B",
    "fcomp.th.reqB": "Req / $",
    "fcomp.th.edge": "Unterschied",
    "fcomp.winner.draw": "Unentschieden",
    "cl.h2": "Changelog",
    "cl.sub": "Was sich für dich geändert hat, Neuestes zuerst. Erzeugt aus den Commits des Repos, jeder Eintrag verlinkt seinen Commit.",
    "method.h2": "Was „60 für 10“ wirklich kauft",
    "method.sub": "Ein beworbenes „60 für 10“ sagt wenig darüber, was ein Plan liefert. So machen wir Pläne vergleichbar, und jeder Schritt ist reproduzierbar.",
    "method.formula.title": "Kosten pro Request",
    "method.s1.t": "Die Token-Preise des Anbieters",
    "method.s1.p": "Jedes Modell hinter einem Plan hat veröffentlichte API-Token-Preise: Input, Output, Cached-Read und Cached-Write. Damit rechnen wir Credits oder Dollar-Usage in Requests um.",
    "method.s2.t": "Anbietereigene Credit-Formeln",
    "method.s2.p": "Anbieter definieren eigene Credits (GLM: (in×6,9 + cached×1,7 + out×24)/10000). Wir übernehmen diese Formeln aus den offiziellen Docs, statt sie zu erfinden.",
    "method.s3.t": "Cache-bewusstes Workload-Modell",
    "method.s3.p": "Coding-Agenten treffen ständig den Cache. Wir bepreisen Input mit 5% frisch und 95% Cached-Write und nutzen die echten Raten für Cached-Read und Output, pro Modell und Workload-Pattern.",
    "method.s4.t": "Zeitfenster sind Durchsatz-Caps",
    "method.s4.p": "Ein 5-Stunden-Fenster ist ein Durchsatz-Limit, kein Monatskontingent. Wochen-Credits skalieren auf den Monat (×4,33), und 5-Stunden-Caps multiplizieren wir nicht zu Monatszahlen.",
    "method.s5.t": "Ein Workload-Pattern pro Modell-Familie",
    "method.s5.p": "Manche Feeds nutzen ein generisches Workload-Pattern. Für geteilte Modell-Familien verwenden wir das präziseste per-Modell-Pattern für beide Pläne, damit kein Plan ein billigeres Pattern bekommt.",
    "method.s6.t": "Nicht veröffentlichte Zahlen bleiben leer",
    "method.s6.p": "Wenn ein Anbieter seine Zahlen nicht veröffentlicht, sagen wir das. Wir erfinden keine Credits und rechnen keine Kontingente zurück.",
    "method.s7.t": "Preise, wie du sie zahlst",
    "method.s7.p": "Preise zeigen, was du zahlst. Normalerweise ist das der Listenpreis des Anbieters; schlägt ein Anbieter etwas drauf, steckt die Gebühr schon in der Zahl und die Aufteilung steht in der Plan-Notiz. Command Code erhebt auf jeden Plan eine Gebühr für Kartenzahlung und zeigt den genauen Satz erst im Checkout, deshalb steht dort der gemessene Gesamtbetrag (GOAT: 10,78 $ für den 10-$-Tarif am 02.10.2026, 7,8 %) und für die übrigen Command-Code-Tarife derselbe gemessene Satz.",
    "method.more": "Alle Schritte zeigen",
    "method.less": "Weniger zeigen",
    "faq.h2": "Häufige Fragen",
    "faq.q1": "Ist das wirklich reproduzierbar?",
    "faq.a1": "Ja. Die Pipeline holt offizielle Feeds und Docs (sources.yml), parst sie deterministisch und baut latest.json nur aus den gecachten Snapshots. der Build holt nie live nach. Dieselben Snapshots ergeben dasselbe JSON. Die Change-Detection läuft täglich und hasht die geparsten Daten, damit HTML-Nonces keine Änderung vortäuschen.",
    "faq.q2": "Warum ist „60 für 10“ irreführend?",
    "faq.a2": "OpenCode Go bewirbt $60 Usage für $10. Aber die echten Requests pro Monat reichen von ~490 (Kimi K3) bis ~226.000 (Muse Spark 1.2) je nach Modell. Der Dollar-Wert ist real; was er kauft, hängt komplett von Token-Preisen, Cache-Verhalten und Workload-Pattern ab. Genau das rechnen wir aus.",
    "faq.q3": "Warum vergleicht ihr nicht alle 17 Pläne direkt?",
    "faq.a3": "Nur 6 Pläne veröffentlichen aktuell genug Daten (Token-Preise oder Credit-Formeln), um Requests pro Monat ehrlich zu berechnen. Die anderen zeigen ihre Roh-Kontingente. Wir erfinden keine fehlenden Zahlen, weil ein Vergleich darauf Fiktion wäre.",
    "faq.q4": "Welche Preise zeigt ihr?",
    "faq.a4": "Den bezahlten Checkout-Preis (paidPrice), nicht den beworbenen. Command Code GOAT bewirbt $10, aber der Checkout ist $10,77, also skalieren wir mit dem echten Preis. Wo ein Plan in CNY abgerechnet wird (GLM, Kimi), behalten wir diese Währung und sagen es dazu.",
    "faq.q5": "Wie oft wird aktualisiert?",
    "faq.a5": "Eine GitHub Action holt täglich um 03:17 UTC alle Quellen. Wenn sich geparster Inhalt geändert hat, committed sie das neue latest.json. Wenn sich eine nicht-scrapebare Preisseite (GLM, MiniMax) geändert hat, öffnet sie ein Review-Issue zur manuellen Prüfung.",
    "faq.q6": "Woher kommen die AI-Scores?",
    "faq.a6": "Die Modell-Benchmark-Scores (Intelligenz, Coding, Reasoning, Agents) kommen von llm-stats.com, einem Community-Modell-Katalog. Die Daten liegen lokal im Cache und werden nur bei Ablauf neu geladen (24h TTL).",
    "faq.q7": "Kann ich Command Code Go einfach zehnmal kaufen?",
    "faq.a7": "Nein. Ein Plan ist ein einzelnes Abo pro Konto: du wählst einen, und ein Wechsel setzt die rollierenden Fenster zurück (so steht es in Command Codes eigenen Docs). Mehr Nutzung kommt über Top-up-Credits zum Modellpreis. Die Raten hier sind deshalb pro 1 $ bezahlt, und der Rechner vergleicht Einzelpläne.",
    "faq.q8": "Was heißt „pro 1 €“?",
    "faq.a8": "Es ist eine Rate: Requests pro Monat geteilt durch den bezahlten Monatspreis. Command Code Go für 1 $ zeigt, was 1 $ kauft; OpenCode Go für 10 $ zeigt, was jeder Dollar seiner 10 $ kauft. Raten folgen deiner gewählten Währung und sind nicht stapelbar, weil ein Plan ein einzelnes Abo pro Konto ist.",
    "faq.q9": "Warum steht Plan X im Rechner oben?",
    "faq.a9": "Der Rechner listet Einzelpläne innerhalb deines Budgets, sortiert nach Tokens pro Monat des jeweils stärksten Modells. Das ist eine sortierte Liste und keine Empfehlung, denn der passende Plan hängt auch davon ab, welche Modelle du brauchst, von den Datenschutz-Bedingungen und den Rate-Limits.",
    "calc.h2": "Budget-Rechner",
    "calc.sub": "Ein Abo pro Konto, kein Stapeln. Gib an, was du im Monat zahlst, und sieh, welche Tokens jeder einzelne Plan dafür kauft.",
    "calc.budget": "Budget / Monat",
    "calc.score": "Min. AI-Score",
    "calc.plan": "Plan",
    "calc.model": "Bestes Modell im Budget",
    "calc.tokensMo": "Tokens / Monat",
    "calc.reqMo": "Requests / Monat",
    "calc.price": "Preis / Monat",
    "calc.all": "alle",
    "calc.leftover": "übrig",
    "calc.empty": "Kein einzelner Plan passt in dieses Budget.",
    "calc.note": "Sortiert nach Tokens pro Monat. Raten folgen deiner gewählten Währung. Preisbasierte Schätzungen (Kimi) bleiben ausgeschlossen, solange sie in den Filtern nicht eingeblendet sind.",
    "calc.rankTitle": "Rang im Budget-Rechner",
    "foot.product": "Produkt",
    "foot.plans": "Pläne",
    "foot.models": "Modellvergleich",
    "foot.method": "Methodik",
    "foot.faq": "FAQ",
    "foot.data": "Daten",
    "foot.json": "latest.json (API)",
    "foot.compare": "Vergleich der AI-Coding-Plaene",
    "foot.repo": "GitHub",
    "foot.sources": "sources.yml",
    "foot.llmstats": "AI-Scores: llm-stats.com",
    "foot.legal": "Hinweis",
    "foot.note": "Unabhängig & informativ. Wir verkaufen keine Pläne und haben keine Affiliate-Links. Bitte immer auf der offiziellen Anbieterseite bestätigen.",
    "foot.legalTitle": "Rechtliches",
    "foot.privacy": "Datenschutz",
    "foot.imprint": "Impressum",
    "foot.disclaimer": "Haftungsausschluss",
    "foot.rights": "© 2026 vibeplan.cc · MIT-Lizenz",
    "legal.h2": "Rechtliches",
    "legal.sub": "Datenschutz, Impressum und Haftungsinformationen.",
    "legal.privacy.h3": "Datenschutz",
    "legal.privacy.body": "<p>Diese Seite setzt keine Cookies und stellt keine Verbindungen zu Dritten her. Alle Daten, auch das, was du selbst sendest, werden von dieser Domain selbst ausgeliefert.</p><p>Deine Einstellungen (Sprache, Theme, Währung, sichtbare Spalten) liegen im localStorage deines Browsers, damit sich die Seite beim nächsten Besuch daran erinnert. Diese Daten verlassen dein Gerät nie, und localStorage ist kein Cookie und dient nicht dem Tracking.</p><p>Die Seite wird von GitHub Pages gehostet. Wie bei jedem Webhost verarbeiten GitHub-Server technische Zugriffsdaten (IP-Adresse, User-Agent, angeforderte Dateien) in Server-Logs; die Datenschutzerklärung von GitHub deckt das ab.</p><p>Wir nutzen keine Analysetools, Werbenetzwerke oder Drittanbieter-Embeds.</p><p>Wenn du den Feedback-Button nutzt, werden dein Text, die Seite auf der du warst, die Sprache und der Zeitpunkt an den eigenen Endpunkt dieser Seite auf vibeplan.cc übertragen und dort gespeichert. Eine optionale Kontaktadresse nutze ich nur, um dir zu antworten. Ein Drittanbieter ist nicht beteiligt, und es wird kein Cookie gesetzt.</p><p>Für Datenschutzanfragen nutze die Kontaktdaten im Impressum.</p>",
    "legal.imprint.h3": "Impressum / Anbieterkennzeichnung",
    "legal.imprint.body": "<p>Diese Website wird von einem einzelnen Betreiber auf nicht-kommerzieller, informativer Basis betrieben.</p><p>Betreiber: Kolja Knodel<br>Kontakt: <a href=https://github.com/harrytyp>GitHub: harrytyp</a></p><p>Als private, nicht-kommerzielle Website ist eine vollständige Postanschrift nicht erforderlich. Falls dieses Angebot kommerziell wird oder die DACH-Region anvisiert, muss das Impressum (z.B. §5 DDG in Deutschland) um deinen vollständigen Namen und deine Anschrift erweitert werden.</p>",
    "legal.disclaimer.h3": "Haftungsausschluss",
    "legal.disclaimer.body": "<p>Alle hier gezeigten Preise, Kontingente und Bedingungen werden nach bestem Bemühen aus öffentlichen Anbieterquellen gesammelt. Sie können sich jederzeit ändern. Bitte bestätige die aktuellen Konditionen vor dem Kauf immer auf der offiziellen Anbieterseite.</p><p>Diese Seite ist unabhängig und nicht mit einem der gezeigten Anbieter verbunden, von ihnen unterstützt oder gesponsert. Wir verkaufen keine Pläne und haben keine Affiliate-Links.</p><p>Die Informationen werden ohne jegliche Gewähr bereitgestellt. Wir haften nicht für Entscheidungen, die auf Grundlage dieser Daten getroffen werden.</p>",
    "foot.lang": "English · Deutsch",
    "foot.feedback": "Feedback",
    "fbk.title": "Feedback senden",
    "fbk.lead": "Falscher Preis, fehlender Plan, etwas Unklares? Ein Satz genügt. Kein Konto, kein Tracking.",
    "fbk.ph": "Was ist falsch oder fehlt?",
    "fbk.contactPh": "E-Mail oder Handle (optional, nur wenn du eine Antwort willst)",
    "fbk.send": "Senden",
    "fbk.sending": "Wird gesendet…",
    "fbk.ok": "Danke, ist angekommen.",
    "fbk.err": "Nicht gesendet. Nochmal versuchen oder den Mail-Link nutzen.",
    "fbk.empty": "Bitte erst etwas schreiben.",
    "fbk.mail": "Im Mailprogramm öffnen",
    "fbk.copy": "Text kopieren",
    "fbk.copied": "Kopiert.",
    "fbk.close": "Schließen",
    "fbk.privacy": "Geht an den eigenen Endpunkt dieser Seite auf vibeplan.cc und wird dort gespeichert, damit ich es beheben kann. Sonst wird nichts übertragen, kein Cookie gesetzt.",
    "loading": "Live-Daten werden geladen…",
    "error": "Daten konnten nicht geladen werden. Bitte Verbindung prüfen oder erneut versuchen.",
    "updated": "Datenstand",
    "stale.sources": "Quellen veraltet",
    "disclaimer.title": "Hinweis:",
    "disclaimer.text": "Preise und Kontingente ändern sich häufig. Diese Seite ist informativ, also bestätige die Angaben vor dem Abonnieren auf der offiziellen Anbieterseite.",
  },
};

/* ---------------- State ---------------- */
let lang = "en";
let theme = "light";
let data = null;

const KNOWN_PROVIDERS = new Set([
  "anthropic", "augment", "bytedance", "command-code", "cursor", "github",
  "jetbrains", "kilo", "kiro", "lovable", "moonshot", "ollama", "opencode",
  "opendesign", "qoder", "replit", "standardcompute", "vercel", "warp", "zed"
]);

const KNOWN_PLANS = new Set([
  "augment-business", "augment-standard", "claude-max-20x", "command-code-goat",
  "command-code-max10", "command-code-max20", "command-code-pro", "copilot-business",
  "copilot-enterprise", "copilot-max", "copilot-pro", "copilot-pro-plus", "cursor-pro",
  "cursor-ultra", "jetbrains-ai-business-pro", "jetbrains-ai-business-ultimate",
  "jetbrains-ai-pro", "jetbrains-ai-ultimate", "kilo-pass", "kilo-pass-199", "kilo-pass-49",
  "kimi-allegretto", "kimi-allegro", "kimi-moderato", "kimi-vivace", "kiro-power",
  "kiro-pro", "kiro-pro-max", "kiro-pro-plus", "lovable-business", "lovable-pro",
  "ollama-max", "ollama-pro", "ollama-team", "opencode-go", "opencode-go-plus",
  "opendesign-go", "opendesign-max", "opendesign-plus", "opendesign-pro", "qoder-pro",
  "qoder-pro-plus", "qoder-teams", "qoder-ultra", "replit-core", "replit-pro",
  "standardcompute-economy", "standardcompute-growth", "standardcompute-pro",
  "standardcompute-proplus", "standardcompute-scale", "standardcompute-standard",
  "standardcompute-starter", "trae-pro", "trae-pro-plus", "trae-ultra", "v0-business",
  "v0-plus", "warp-build", "warp-business", "warp-max", "zed-pro"
]);

function providerSlug(prov) {
  if (!prov) return "";
  const s = String(prov).toLowerCase().trim().replace(/\s+/g, "-");
  if (KNOWN_PROVIDERS.has(s)) return s;
  if (s === "kimi" || s === "kimi.ai") return "moonshot";
  if (s === "trae") return "bytedance";
  if (s === "v0") return "vercel";
  if (s === "claude") return "anthropic";
  if (s === "copilot") return "github";
  return "";
}

/* ---------------- Währung (einheitliche Anzeige, tägliche Kurse) ----------------
 * Alle Preise werden intern in USD geführt; die UI rechnet in die gewählte
 * Währung um. Kurse von open.er-api.com (kostenlos, täglich aktualisiert).
 */
let currency = "USD";
let exchangeRates = { USD: 1 }; // USD → Zielwährung
// Kurse kommen aus latest.json (fx-Source, 1x täglich mit-gescraped) ,
// KEIN Client-seitiger Live-API-Call (Datenschutz: keine Third-Party-Verbindung).
function loadExchangeRates() {
  const fx = data?.fx?.rates ?? null;
  if (fx) exchangeRates = { ...fx, USD: 1 };
}
// USD-Betrag → gewählte Währung (formatiert)
function fmtPrice(usd) {
  if (usd === null || usd === undefined || !isFinite(usd)) return "-";
  const rate = exchangeRates[currency] ?? 1;
  const value = usd * rate;
  const loc = lang === "de" ? "de-DE" : (currency === "EUR" ? "de-DE" : "en-US");
  const opts = { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2 };
  try { return value.toLocaleString(loc, opts); } catch { return `${currency} ${value.toFixed(2)}`; }
}
// Währungssymbol für Raten-Labels ("Tokens / €"): eindeutig auch bei ¥ (CNY/JPY)
function curSym() {
  return { USD: "$", EUR: "€", GBP: "£", CNY: "CN¥", JPY: "JP¥" }[currency] ?? currency + " ";
}
function rateTokensLabel() { return `Tokens / ${curSym()}`; }
function rateReqLabel() { return `Requests / ${curSym()}`; }
// Raten folgen der gewählten Währung: Tokens pro 1 Einheit (1 €, 1 ¥ …).
// USD-Rate durch den Kurs teilen: 1 Zieleinheit = 1/rate USD.
function rateOf(usdRate) {
  if (usdRate === null || usdRate === undefined || !isFinite(usdRate)) return null;
  return usdRate / (exchangeRates[currency] ?? 1);
}

/* ---------------- Basis-URL (robust, egal welche URL) ----------------
 * Leitet den Datenpfad aus dem Script-Src ab statt aus location.pathname.
 * Funktioniert mit/ohne trailing slash, mit Sub-Pfaden, mit Query-Parametern.
 */
function baseUrl() {
  try {
    const scripts = document.querySelectorAll("script[src]");
    for (const s of scripts) {
      const src = s.getAttribute("src") || "";
      if (src.includes("app.js")) {
        // z.B. "/coding-plan-comparison/app.js" → Basis "/coding-plan-comparison/"
        const idx = src.lastIndexOf("/");
        if (idx >= 0) return src.slice(0, idx + 1);
      }
    }
  } catch (e) { /* fallthrough */ }
  // Fallback: location (mit trailing slash erzwingen)
  let base = location.pathname;
  if (!base.endsWith("/")) base = base.slice(0, base.lastIndexOf("/") + 1);
  return base;
}
const DATA_URL = baseUrl() + "data/latest.json";

/* ---------------- Helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function t(key) {
  return I18N[lang][key] ?? I18N.en[key] ?? key;
}

function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || !isFinite(n)) return "-";
  return n.toLocaleString(lang === "de" ? "de-DE" : "en-US", { maximumFractionDigits: digits });
}

// Tokens kompakt: 1.6 Mrd → "1.6B", 45 Mio → "45M", 900k → "900K"
function fmtTokens(n) {
  if (n === null || n === undefined || !isFinite(n)) return "-";
  const loc = lang === "de" ? "de-DE" : "en-US";
  if (n >= 1e9) return (n / 1e9).toLocaleString(loc, { maximumFractionDigits: 1 }) + "B";
  if (n >= 1e6) return (n / 1e6).toLocaleString(loc, { maximumFractionDigits: 0 }) + "M";
  if (n >= 1e3) return (n / 1e3).toLocaleString(loc, { maximumFractionDigits: 0 }) + "K";
  return Math.round(n).toLocaleString(loc);
}

// Geldbeträge laufen intern als USD und werden in die gewählte Währung
// umgerechnet. Hier stand früher ein festes "$", wodurch Referenzpläne,
// Budget-Labels und das Dashboard-Detail beim Umschalten konstant blieben.
function fmtMoney(n) {
  return fmtPrice(n);
}

function fmtPct(n) {
  if (n === null || n === undefined || !isFinite(n)) return "-";
  return n.toLocaleString(lang === "de" ? "de-DE" : "en-US", { maximumFractionDigits: 1 }) + "%";
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- i18n DOM ---------------- */
function applyI18n() {
  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const val = t(key);
    // Keys mit HTML-Inhalt (legal.*.body) via innerHTML setzen,
    // damit <p>/<span> korrekt gerendert werden.
    if (typeof val === "string" && val.startsWith("<")) el.innerHTML = val;
    else el.textContent = val;
  });
  $$("[data-i18n-aria]").forEach((el) => {
    const v = t(el.getAttribute("data-i18n-aria"));
    if (v) el.setAttribute("aria-label", v);
  });
  $$("[data-i18n-ph]").forEach((el) => {
    const key = el.dataset.i18nPh;
    el.placeholder = t(key);
  });
  $$("[data-i18n-title]").forEach((el) => {
    const v = t(el.getAttribute("data-i18n-title"));
    if (v) el.setAttribute("title", v);
  });
  // Select-Optionen (data-i18n auf <option>) aktualisieren
  $$("option[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.documentElement.lang = lang;
  $$(".lang-switch button").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  // Titel mit der Suchphrase, in beiden Sprachen (Suchmaschinen führen JS aus,
  // der statische <title> im HTML allein würde überschrieben).
  document.title = lang === "de"
    ? "AI-Coding-Plan-Vergleich: Tokens und Requests pro Dollar | vibeplan.cc"
    : "AI coding plan comparison: tokens and requests per dollar paid | vibeplan.cc";
  renderAll();
  syncMethodMore();
}

/* ---------------- Theme ---------------- */
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("cpc-theme", theme);
}

/* ---------------- Command Palette (Cmd/Ctrl+K) ---------------- */
let cmdkIndex = 0;
let cmdkItems = [];
let cmdkReturnFocus = null;
function cmdkClose() {
  const box = $("#cmdk");
  if (box) box.hidden = true;
  // Fokus dorthin zurueck, wo er herkam (2.4.3)
  const back = cmdkReturnFocus;
  cmdkReturnFocus = null;
  if (back && document.contains(back) && typeof back.focus === "function") back.focus();
}
function cmdkOpen() {
  const box = $("#cmdk");
  const input = $("#cmdk-input");
  if (!box) return;
  cmdkReturnFocus = document.activeElement;
  box.hidden = false;
  cmdkIndex = 0;
  if (input) { input.value = ""; input.focus(); }
  cmdkRender("");
}
function cmdkRender(query) {
  const list = $("#cmdk-list");
  if (!list) return;
  const q = query.trim().toLowerCase();
  const items = [];
  // Ansichten
  for (const [view, key] of [["overview", "tab.overview"], ["plans", "tab.plans"], ["calc", "tab.calc"], ["method", "tab.method"], ["changelog", "tab.changelog"]]) {
    items.push({ label: t(key), kind: t("cmdk.view"), run: () => showView(view) });
  }
  // Pläne und Modelle
  if (data) {
    const seenPlan = new Set();
    for (const c of buildCombos()) {
      const name = `${c.planName}`;
      if (!seenPlan.has(c.planId)) {
        seenPlan.add(c.planId);
        items.push({ label: name, sub: c.provider, kind: t("cmdk.plan"), run: () => { showView("plans"); plansSearch = name; const ps = $("#plans-search"); if (ps) ps.value = name; rerender(); } });
      }
      items.push({ label: c.model, sub: name, kind: t("cmdk.model"), run: () => selectCombo(c) });
    }
    for (const f of (data.familyComparisons ?? []).slice(0, 40)) {
      items.push({ label: String(f.family), kind: t("cmdk.family"), run: () => { showView("plans"); const el = document.getElementById("models"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } });
    }
  }
  const filtered = (q ? items.filter((i) => `${i.label} ${i.sub ?? ""}`.toLowerCase().includes(q)) : items).slice(0, 40);
  cmdkItems = filtered;
  list.innerHTML = filtered.length
    ? filtered.map((i, idx) => `<button type="button" class="cmdk-item${idx === cmdkIndex ? " active" : ""}" data-idx="${idx}">`
      + `<span>${escapeHtml(i.label)}${i.sub ? ` <span class="muted">· ${escapeHtml(i.sub)}</span>` : ""}</span>`
      + `<span class="ci-kind">${escapeHtml(i.kind)}</span></button>`).join("")
    : `<div class="cmdk-empty">${t("cmdk.empty")}</div>`;
  list.querySelectorAll(".cmdk-item").forEach((el) => el.addEventListener("click", () => {
    const it = cmdkItems[Number(el.dataset.idx)];
    cmdkClose();
    if (it) it.run();
  }));
}
// Punkt im Chart auswählen (Palette, Shortlist, Tabelle): Detail-Panel fuellen, ohne zu scrollen
function selectCombo(c) {
  const key = `${c.planId}::${c.model}`;
  const p = dashPoints.find((x) => `${x.combo.planId}::${x.combo.model}` === key);
  dashSelected = key;
  if (p) showDashDetail(p);
  showView("overview");
  renderDashboard();
}
function initPalette() {
  const trigger = $("#cmdk-trigger");
  const box = $("#cmdk");
  const input = $("#cmdk-input");
  if (trigger) trigger.addEventListener("click", cmdkOpen);
  if (box) box.addEventListener("click", (e) => { if (e.target === box) cmdkClose(); });
  if (input) {
    input.addEventListener("input", () => { cmdkIndex = 0; cmdkRender(input.value); });
    input.addEventListener("keydown", (e) => {
      const list = $("#cmdk-list");
      if (e.key === "ArrowDown") { e.preventDefault(); cmdkIndex = Math.min(cmdkItems.length - 1, cmdkIndex + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cmdkIndex = Math.max(0, cmdkIndex - 1); }
      else if (e.key === "Enter") { e.preventDefault(); const it = cmdkItems[cmdkIndex]; cmdkClose(); if (it) it.run(); return; }
      else return;
      list.querySelectorAll(".cmdk-item").forEach((el, i) => el.classList.toggle("active", i === cmdkIndex));
      const act = list.querySelector(".cmdk-item.active");
      if (act) act.scrollIntoView({ block: "nearest" });
    });
  }
  document.addEventListener("keydown", (e) => {
    const open = box && !box.hidden;
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open ? cmdkClose() : cmdkOpen(); return; }
    if (e.key === "Escape" && open) { cmdkClose(); return; }
    // "/" öffnet die Palette, solange nicht in einem Feld getippt wird
    if (e.key === "/" && !open && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "")) {
      e.preventDefault(); cmdkOpen();
    }
  });
}

/* ---------------- Rendering ---------------- */
function renderAll() {
  if (!data) return;
  plansLimit = PAGE; famLimit = FAM_PAGE;
  syncRateLabels();
  renderStats();
  renderCalculator();
  renderCompareView();
  renderToolsView();
  renderSizerView();
  renderSyncView();
  renderPlans();
  renderDashboard();
  refreshDashDetail();
  renderFamily();
  renderChangelog();
  renderFormula();
  bindSortHeader("plans-table", plansSort, renderPlans);
  syncFilterUI();
}

// Statische Select-Optionen mit Raten-Labels folgen der Währung
// (applyI18n setzt sie erst auf $ zurück , danach wieder währungsgenau).
function syncRateLabels() {
  const map = { "sort.tokens": rateTokensLabel(), "sort.req10": rateReqLabel(), "dash.m.tokens": rateTokensLabel(), "dash.m.req10": rateReqLabel(), "plans.th.tokens": rateTokensLabel(), "plans.th.req10": rateReqLabel() };
  for (const [key, label] of Object.entries(map)) {
    document.querySelectorAll(`option[data-i18n="${key}"]`).forEach((el) => { el.textContent = label; });
  }
  document.querySelectorAll(`#col-picker-panel label span[data-i18n="plans.th.tokens"]`).forEach((el) => { el.textContent = rateTokensLabel(); });
  document.querySelectorAll(`#col-picker-panel label span[data-i18n="plans.th.req10"]`).forEach((el) => { el.textContent = rateReqLabel(); });
}

function syncFilterUI() {
  const budgetSlider = $("#budget-slider");
  const budgetOut = $("#budget-value");
  if (budgetSlider && budgetOut) {
    budgetSlider.value = maxBudget;
    budgetOut.textContent = maxBudget >= 300 ? (lang === "de" ? "beliebig" : "any") : fmtMoney(maxBudget);
  }
  const aiSlider = $("#ai-slider");
  const aiOut = $("#ai-value");
  if (aiSlider && aiOut) {
    aiSlider.value = minAiScore;
    aiOut.textContent = minAiScore === 0 ? (lang === "de" ? "keins" : "none") : String(minAiScore);
  }
  syncFilterChips();
}

/* ---------------- Filter-Toggle + aktive-Filter-Chips ---------------- */
// Gemeinsames Re-Rendering: Tabelle + Dashboard + Rechner + Filter-Chips
let announceTimer = null;
// Statusmeldung fuer Screenreader: Trefferzahl und ausgeblendete Spalten (4.1.3)
function announceResults(shown, total) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const el = $("#a11y-status");
    if (!el) return;
    const cols = ALL_COLUMNS.length - visibleColumns.length;
    let msg = t("a11y.status").replace("{n}", shown).replace("{total}", total);
    if (cols > 0) msg += t("a11y.statusCols").replace("{c}", cols);
    if (el.textContent !== msg) el.textContent = msg;
  }, 400);
}
function rerender() {
  renderCalculator();
  renderPlans();
  renderDashboard();
  syncFilterChips();
}
// Filterblock: der Nutzer kann ihn auf- und zuklappen, die Listenansicht
// startet aufgeklappt (dort ist Filtern die Hauptarbeit), der Graph zugeklappt.
let filtersOpenManual = null;
document.addEventListener("toggle", (e) => {
  if (e.target && e.target.id === "rail-filters") filtersOpenManual = e.target.open;
}, true);

// Aktive Filter als Chips anzeigen (mit Entfernen-Button) + Zähler-Badge
function syncFilterChips() {
  const container = $("#filter-active");
  const badge = $("#filter-count-badge");
  if (!container) return;
  const chips = [];
  if (plansSearch) chips.push({ label: `${t("plans.searchPh").replace("...", "")} "${plansSearch}"`, clear: () => { plansSearch = ""; const el = $("#plans-search"); if (el) el.value = ""; rerender(); } });
  if (plansMeter) chips.push({ label: meterLabel(plansMeter), clear: () => { plansMeter = ""; const el = $("#plans-meter-filter"); if (el) el.value = ""; rerender(); } });
  if (maxBudget < 300) chips.push({ label: `${t("plans.budget")} ≤ ${fmtMoney(maxBudget)}`, clear: () => { maxBudget = 300; syncFilterUI(); rerender(); } });
  if (minAiScore > 0) chips.push({ label: `${t("plans.aiScore")} ≥ ${minAiScore}`, clear: () => { minAiScore = 0; syncFilterUI(); rerender(); } });
  const attrLabel = { noTraining: "attr.noTraining", zdr: "attr.zdr", cli: "attr.cli", unknown: "attr.unknown" };
  // Akive Attribut-Filter: der Tooltip traegt den vollen Satz samt Vorbehalt und Quelle
  const attrTipKey = { noTraining: "attr.noTraining.tip", zdr: "attr.zdr.tip", cli: null, unknown: "attr.unknown.tip" };
  for (const k of attrFilter) {
    const tipKey = attrTipKey[k];
    chips.push({
      label: t(attrLabel[k]),
      tip: tipKey ? t(tipKey) : null,
      clear: () => { attrFilter.delete(k); syncAttrBoxes(); rerender(); },
    });
  }
  if (includePriceBased) chips.push({ label: t("plans.includePriceBased"), clear: () => { includePriceBased = false; const el = $("#tierd-toggle"); if (el) el.checked = false; rerender(); } });
  // Ausgeblendete No-API-Zeilen sichtbar machen: der Chip schaltet sie ein, sein x schaltet sie wieder aus
  if (includeNoApi) {
    chips.push({ label: t("plans.includeNoApi"), clear: () => { includeNoApi = false; syncNoApiBoxes(); rerender(); } });
  } else {
    if (hiddenNoApiCount) chips.push({ label: `${t("plans.noApiHidden")} (${hiddenNoApiCount})`, clear: () => { includeNoApi = true; syncNoApiBoxes(); rerender(); } });
  }
  // Ausgeblendete Trainings-Zeilen: gleiche Logik wie bei No-API
  if (includeTraining) {
    chips.push({ label: t("plans.includeTraining"), clear: () => { includeTraining = false; syncTrainingBoxes(); rerender(); } });
  } else {
    if (hiddenTrainingCount) chips.push({ label: `${t("plans.trainingHidden")} (${hiddenTrainingCount})`, clear: () => { includeTraining = true; syncTrainingBoxes(); rerender(); } });
  }
  // U3: ausgeblendete Spalten sichtbar machen (das x stellt die Voreinstellung wieder her)
  const hiddenCols = ALL_COLUMNS.length - visibleColumns.length;
  if (hiddenCols > 0) {
    chips.push({ label: `${hiddenCols} ${t("plans.hiddenCols")}`, clear: () => { visibleColumns = [...ALL_COLUMNS]; saveColumns(); syncColumnPicker(); rerender(); } });
  }
  container.innerHTML = chips.map((c) => `<span class="chip"${c.tip ? ` title="${escapeHtml(c.tip)}"` : ""}>${escapeHtml(c.label)}<button type="button" aria-label="${escapeHtml(t("a11y.removeChip"))}">×</button></span>`).join("");
  container.querySelectorAll(".chip button").forEach((btn, i) => {
    btn.addEventListener("click", chips[i].clear);
  });
  if (badge) {
    badge.hidden = chips.length === 0;
    badge.textContent = String(chips.length);
  }
  // Leere Zeile nicht als Balken stehen lassen
  const dock = $("#filter-dock");
  if (dock) dock.classList.toggle("is-empty", chips.length === 0);
  // Mobil: gleicher Stand auf dem Griff und am Abschluss-Button
  const triggerCount = $("#rail-trigger-count");
  if (triggerCount) {
    triggerCount.hidden = chips.length === 0;
    triggerCount.textContent = String(chips.length);
  }
  syncRailApplyCount();
}

function renderStats() {
  const setTxt = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
  setTxt("#stat-plans", fmtNum(data.statistics?.totalPlans));
  setTxt("#stat-comparable", fmtNum(data.statistics?.comparablePlans));
  setTxt("#stat-models", fmtNum(data.modelComparisons?.length ?? data.statistics?.plansWithModels));
  const srcCount = data.statistics?.sourceCount ?? Object.keys(data.sources ?? {}).length;
  setTxt("#stat-sources", fmtNum(srcCount));
  const ms = $("#meta-sources");
  if (ms) ms.textContent = `${fmtNum(srcCount)} ${lang === "de" ? "Live-Quellen" : "live sources"}`;
  const date = new Date(data.generatedAt);
  const day = date.toLocaleDateString(lang === "de" ? "de-DE" : "en-US");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const stamp = `${t("updated")} ${day}, ${hh}:${mm} UTC`;
  // Quellen mit zu altem Snapshot sichtbar machen: die Kopfzeile behauptet sonst
  // einen frischen Datenstand, obwohl eine Quelle ihren letzten Stand behalten hat.
  const stale = data.staleSources ?? [];
  const mu = $("#meta-updated");
  if (mu) mu.title = stale.length ? stale.map((s) => `${s.id} (${s.fetchedAt.slice(0, 10)})`).join(", ") : "";
  setTxt("#meta-updated", stale.length ? `${stamp} · ${stale.length} ${t("stale.sources")}` : stamp);
  // Anteilsbalken: zeigen das Verhältnis, nicht nur die Zahl
  const total = Number(data.statistics?.totalPlans) || 0;
  const comp = Number(data.statistics?.comparablePlans) || 0;
  const undisc = Number(data.statistics?.undisclosed) || 0;
  const meter = (id, parts) => {
    const el = $(id);
    if (!el || !total) return;
    el.innerHTML = parts
      .filter((p) => p.pct > 0)
      .map((p) => `<span class="${p.cls}" style="width:${p.pct}%"></span>`)
      .join("");
  };
  meter("#meter-plans", [
    { cls: "on", pct: ((total - undisc) / total) * 100 },
    { cls: "rest", pct: (undisc / total) * 100 },
  ]);
  meter("#meter-comparable", [
    { cls: "on", pct: (comp / total) * 100 },
    { cls: "rest", pct: ((total - comp) / total) * 100 },
  ]);
  setTxt("#stat-plans-sub", lang === "de" ? "davon " + data.statistics?.undisclosed + " ohne öffentliche Zahlen" : "of which " + data.statistics?.undisclosed + " undisclosed");
  setTxt("#stat-comparable-sub", lang === "de" ? "von " + total + " Plänen" : "of " + total + " plans");
  // Disclaimer-Banner
  const disc = $("#disclaimer");
  if (disc) {
    disc.style.display = "block";
    const dt = $("#disclaimer-title"); if (dt) dt.textContent = t("disclaimer.title");
    const dx = $("#disclaimer-text"); if (dx) dx.textContent = t("disclaimer.text");
  }
}

function meterLabel(meter) {
  const map = {
    dollar_usage: lang === "de" ? "Dollar-Usage" : "Dollar usage",
    credits: lang === "de" ? "Credits" : "Credits",
    tokens: "Tokens",
    requests: lang === "de" ? "Requests" : "Requests",
    prompts: lang === "de" ? "Prompts" : "Prompts",
    gpu: "GPU",
    allowance: lang === "de" ? "Kontingent" : "Allowance",
  };
  return map[meter] ?? meter;
}

function quotaSummary(plan) {
  const q = plan.quotas ?? [];
  const parts = q
    .map((x) => {
      const amt = typeof x.amount === "number" ? fmtNum(x.amount) : (x.amount ?? "-");
      return `${amt} ${x.unit ?? ""} / ${x.window ?? ""}`;
    })
    .filter(Boolean);
  return parts.join(" · ") || "-";
}

/* ---------------- Sortier-/Filter-State ---------------- */
let plansSort = { key: "tokens", dir: "desc" }; // Standard: meisten Tokens/$ zuerst
let plansSearch = "";
let plansMeter = "";
let maxBudget = 300;   // Budget-Filter: max $/Monat
let minAiScore = 0;    // AI-Score-Filter: mindestens
let attrFilter = new Set(); // Attribut-Filter: mehrere gleichzeitig, UND-verknuepft
let includePriceBased = false; // Tier-D (preisbasierte Mengen, z.B. Kimi) per Default aus , einblendbar
let includeNoApi = false; // Pläne ohne API-Zugang (CLI-only, Freebuff) per Default aus, einblendbar
let includeTraining = false; // Modelle, die auf den Daten trainieren, per Default aus, einblendbar
let hiddenNoApiCount = 0;   // wie viele Zeilen der aktuelle Filter gerade ausblendet (fuer die Chips)
let hiddenTrainingCount = 0;
// "no API" steht als manueller Tag aus overrides.yml am Plan, nicht in den Zahlen
function isNoApi(c) { return /(cli|no api|kein api)/i.test(c.planTag ?? ""); }

/* ---------------- Spalten-Auswahl (User-anpassbar) ---------------- */
// Alle verfügbaren Spalten; Auswahl wird in localStorage gespeichert.
const ALL_COLUMNS = ["plan", "model", "score", "tokens", "req10", "rawtokens", "rawreq", "cap", "price", "privacy"];
const DEFAULT_COLUMNS = ["plan", "model", "score", "tokens", "rawtokens", "cap", "price", "privacy"];
// Mobile Default: nur das Nötigste (Karten statt Tabelle)
const MOBILE_DEFAULT_COLUMNS = ["plan", "model", "rawtokens", "price", "privacy"];
let visibleColumns = loadColumns();
function loadColumns() {
  try {
    const stored = localStorage.getItem("cpc-columns");
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr) && arr.length) return arr.filter((c) => ALL_COLUMNS.includes(c));
    }
  } catch (e) { /* fallthrough */ }
  // Mobile ohne gespeicherte Wahl: schlanke Karten-Defaults
  try {
    if (window.matchMedia && window.matchMedia("(max-width: 760px)").matches) return [...MOBILE_DEFAULT_COLUMNS];
  } catch (e) { /* fallthrough */ }
  return [...DEFAULT_COLUMNS];
}
function saveColumns() {
  try { localStorage.setItem("cpc-columns", JSON.stringify(visibleColumns)); } catch (e) { /* ignore */ }
}
function columnVisible(col) { return visibleColumns.includes(col); }

/* ---------------- AI-Score (LLM Stats) ---------------- */
// Robuster Fuzzy-Match: findet Score für Feed-Modellnamen in den Scores.
// Memo: derselbe Modellname wird bei jedem Render erneut gesucht (Hover, Pan,
// Filterwechsel). Das Fuzzy-Matching darunter kostet rund 1 ms pro Aufruf, und
// genau das summierte sich auf über 100 ms pro Mausbewegung.
const aiScoreMemo = new Map();
function aiScoreFor(modelName, family) {
  const memoKey = `${modelName}\u0000${family || ""}`;
  if (aiScoreMemo.has(memoKey)) return aiScoreMemo.get(memoKey);
  const value = aiScoreForUncached(modelName, family);
  aiScoreMemo.set(memoKey, value);
  return value;
}

function aiScoreForUncached(modelName, family) {
  const scores = data?.aiScores?.scores ?? {};
  const keys = Object.keys(scores);
  if (!keys.length) return null;

  const raw = (modelName || family || "").toLowerCase();
  const slug = (s) => s.replace(/\./g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const compact = (s) => s.replace(/[^a-z0-9]/g, "");
  const words = (s) => s.split(/[\s-]+/).filter(Boolean);
  const commonWords = (a, b) => words(a).filter(w => w.length > 1 && words(b).includes(w)).length;

  // Kandidaten generieren
  const candidates = [];
  candidates.push(slug(raw));
  if (family) candidates.push(slug(family.toLowerCase()));
  const noParen = raw.replace(/\([^)]*\)/g, "").trim();
  if (noParen !== raw) candidates.push(slug(noParen));
  const PREFIXES = ["tencent ", "alibaba ", "google ", "openai ", "anthropic ", "meta "];
  for (const p of PREFIXES) {
    if (noParen.startsWith(p)) candidates.push(slug(noParen.slice(p.length)));
  }
  const noSuffix = noParen.replace(/\s+(contributor|preview|highspeed|fast|latest|exp)\s*$/i, "").trim();
  if (noSuffix !== noParen) candidates.push(slug(noSuffix));
  const noDate = noParen.replace(/[\s-]+\d{4}$/, "").trim();
  if (noDate !== noParen) candidates.push(slug(noDate));
  let parts = words(noParen);
  while (parts.length > 2) { parts.pop(); candidates.push(slug(parts.join(" "))); }

  // Match in strict phases: exact normalizations beat fuzzy prefix hits,
  // so "Muse Spark 1.3 Contributor" resolves to muse-spark-1-3, never to the
  // generic muse-spark key. Derived (non-exact) hits are flagged as fallback.
  const uniq = [...new Set(candidates.filter(Boolean))];
  // Alias entries (build-precomputed, flagged) are never fuzzy targets, only
  // direct hits: matches always land on original leaderboard keys, never chains.
  const solid = keys.filter((k) => !scores[k]?.fallback && !scores[k]?.familyFallback);
  const withFallback = (entry, aliasOf) => {
    if (!entry || (!entry.fallback && !entry.familyFallback && !aliasOf)) return entry;
    // Transitive Auflösung: aliasOf zeigt immer auf den originalen
    // Leaderboard-Key, nie auf einen anderen Alias (alte JSONs mit Ketten heilen).
    let root = entry.aliasOf ?? aliasOf ?? null;
    const seen = new Set();
    while (root && scores[root]?.aliasOf && !seen.has(root)) { seen.add(root); root = scores[root].aliasOf; }
    return { intelligence: entry.intelligence, fallback: true, aliasOf: root };
  };
  for (const c of uniq) {
    if (scores[c]) return withFallback(scores[c], c === slug(raw) ? null : c);
  }
  for (const c of uniq) {
    const cc = compact(c);
    if (cc.length >= 4) {
      const found = solid.find(k => compact(k) === cc);
      if (found) return withFallback(scores[found], found);
    }
  }
  for (const c of uniq) {
    const prefix = solid.filter(k => k === c || k.startsWith(c + "-") || c.startsWith(k + "-"))
      .sort((a, b) => a.length - b.length)[0];
    if (prefix) return withFallback(scores[prefix], prefix);
  }

  // Word-Overlap Fallback
  let best = null, bestOverlap = 0;
  for (const k of solid) {
    const overlap = commonWords(k, noParen);
    if (overlap >= 2 && overlap > bestOverlap) { bestOverlap = overlap; best = k; }
  }
  if (best) return withFallback(scores[best], best);

  // Familien-Mittelwert
  if (family || modelName) {
    const famKey = (family || modelName).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const prefixes = [
      famKey.split("-").slice(0, 2).join("-"),
      famKey.split("-").slice(0, 3).join("-"),
      famKey.split("-").slice(0, 3).join(""),
    ];
    let famScores = [];
    for (const prefix of prefixes) {
      if (!prefix || prefix.length < 3) continue;
      famScores = Object.entries(scores)
        .filter(([k, v]) => !v?.fallback && !v?.familyFallback)
        .filter(([k]) => k.startsWith(prefix + "-") || k.replace(/-+/g, "").startsWith(prefix))
        .map(([, v]) => v?.intelligence)
        .filter((v) => typeof v === "number");
      if (famScores.length >= 2) break;
    }
    if (famScores.length >= 2) {
      const mean = famScores.reduce((a, b) => a + b, 0) / famScores.length;
      return { intelligence: mean, familyFallback: true };
    }
  }
  return null;
}

/* ---------------- Kombinations-Zeilen (Plan + Modell) ---------------- */
// Privacy je Anbieter aus data.privacy (in latest.json), plus Modell-Privacy aus Feed
function providerPrivacy(provider) {
  const entries = data?.privacy ?? [];
  const match = entries.find((e) => e.provider === provider);
  return match || null;
}
// Globale Modell-Privacy-Map: Ein Modell hat dieselbe Training-Policy überall.
// Zwei Ebenen: exakter Modellname (z.B. "Muse Spark 1.2 Contributor") hat Vorrang,
// Familie ("muse spark 1.2") nur als Fallback. Behebt: Muse Spark 1.2 Contributor
// hat training=true (ocgo-Feed) → gilt AUCH in Command Code trotz Anbieter-Zusage.
const modelPrivacyMap = new Map();
const modelPrivacyByName = new Map();
function buildModelPrivacyMap() {
  modelPrivacyMap.clear();
  modelPrivacyByName.clear();
  for (const plan of data?.plans ?? []) {
    for (const row of plan.modelRows ?? []) {
      if (row.privacy && (row.privacy.training === true || row.privacy.training === false)) {
        const nameKey = row.model.toLowerCase();
        const famKey = row.family || nameKey;
        if (!modelPrivacyByName.has(nameKey)) modelPrivacyByName.set(nameKey, row.privacy);
        if (!modelPrivacyMap.has(famKey)) modelPrivacyMap.set(famKey, row.privacy);
      }
    }
  }
}

// Privacy einer Combo: Modell-genaue Privacy hat STRENGEN Vorrang.
// Ein Modell trainiert (oder nicht) unabhängig vom Plan/Anbieter.
// Anbieter-Policy gilt nur als Fallback für Modelle ohne eigene Aussage.
// Aussagen gelten fuer genau eine Modell/Anbieter-Kombination. Das Feed des
// jeweiligen Plans hat Vorrang: die globale Map waere falsch, weil dasselbe
// Modell bei mehreren Anbietern mit anderer Policy laeuft.
function comboPrivacy(plan, row) {
  const rowPriv = row.privacy ?? null;
  const modelPriv = rowPriv ?? modelPrivacyByName.get(row.model.toLowerCase()) ?? modelPrivacyMap.get(row.family);
  const pp = providerPrivacy(plan.provider);
  // ZDR nur, wenn fuer diese Kombination 0 Tage Aufbewahrung dokumentiert sind.
  // Anbietersaetze ("auf Anfrage", "mit Ausnahmen", Blanket-Policy) zaehlen nicht.
  const zdr = rowPriv?.retentionDays === true && rowPriv?.training !== true ? true : null;
  const rowDays = typeof rowPriv?.retentionDays === "number" ? rowPriv.retentionDays : null;
  if (modelPriv) {
    return {
      // training === null heisst "unbekannt", nicht "trainiert": sonst faerbt
      // jede Modellzeile ohne Aussage den Punkt als Training-Fall ein.
      noTraining: modelPriv.training === false ? true : (modelPriv.training === true ? false : null),
      retentionDays: rowDays ?? (typeof modelPriv.retentionDays === "number" ? modelPriv.retentionDays : (pp?.retentionDays ?? null)),
      zeroRetention: zdr,
      source: rowPriv ? "model" : "provider",
      known: true,
    };
  }
  if (pp) {
    return {
      noTraining: pp.training === false ? true : (pp.training === true ? false : null),
      retentionDays: rowDays ?? (pp.retentionDays ?? null),
      zeroRetention: zdr,
      source: "provider",
      known: pp.training != null || pp.zeroRetention != null,
    };
  }
  return { noTraining: null, retentionDays: rowDays, zeroRetention: zdr, source: rowPriv ? "model" : null, known: !!rowPriv };
}

function buildCombos() {
  const combos = [];
  for (const plan of data?.plans ?? []) {
    // Preis: USD als Vergleichs-Basis (Sortierung/Budget), Anzeige in gewählter Währung
    const priceUsd = plan.price?.monthlyUsd ?? (plan.price?.currency === "CNY" ? plan.price?.monthlyUsd : plan.price?.paidPrice) ?? null;
    const priceDisplay = priceUsd !== null && priceUsd !== undefined ? fmtPrice(priceUsd) : null;
    // Inklusives Volumen (Cap): ehrliche Obergrenze des Abos, keine Rate.
    // Monatsfenster zuerst; Tarife mit Tagesquote (Gemini Code Assist, Cerebras)
    // sollen ihre Zahl trotzdem zeigen, sonst steht dort nur ein Strich.
    const windows = lang === "de"
      ? { month: "Monat", week: "Woche", day: "Tag", "5h": "5 h", rolling: "rollierend" }
      : { month: "mo", week: "week", day: "day", "5h": "5h", rolling: "rolling" };
    const quotaAmounts = (plan.quotas ?? []).filter((q) => typeof q.amount === "number" && q.amount > 0);
    const monthlyQuota = quotaAmounts.find((q) => q.window === "month") ?? quotaAmounts[0] ?? null;
    const capStr = monthlyQuota
      ? `${fmtNum(monthlyQuota.amount)} ${monthlyQuota.unit ?? ""} / ${windows[monthlyQuota.window] ?? monthlyQuota.window}`
      : null;
    // Kurzform fuer die Tabellenzelle (Zahl + Einheit), voller Text steht in der Detailzeile
    const capShort = monthlyQuota
      ? `${fmtNum(monthlyQuota.amount)} ${monthlyQuota.unit ?? ""}`.trim()
      : null;
    for (const row of plan.modelRows ?? []) {
      const score = aiScoreFor(row.model, row.family);
      const tokensPerReq = tokensPerRequest(row);
      // Pro-$ Rate (USD-Basis); alte Artefakte mit normalizedPer10 bleiben lesbar (/10).
      const norm1 = row.normalizedPer1 ?? (row.normalizedPer10 != null ? row.normalizedPer10 / 10 : null);
      const tokensPerUsd = tokensPerReq && norm1 ? tokensPerReq * norm1 : null;
      const reqPerUsd = norm1;
      const priv = comboPrivacy(plan, row);
      combos.push({
        planId: plan.id,
        planName: plan.name,
        provider: plan.provider,
        price: priceUsd,
        priceDisplay,
        meter: plan.meter,
        waitlist: plan.price?.waitlist === true,
        dataTier: plan.dataTier ?? null,
        // Manuelle Hinweise (overrides.yml): kurzer Tag fuer Tabellen, langer Text fuer Details
        planTag: lang === "de" ? (plan.tagDe ?? plan.tag ?? null) : (plan.tag ?? null),
        planNote: lang === "de" ? (plan.notesDe ?? plan.notes ?? null) : (plan.notes ?? null),
        // Manuelle Preis-Notiz (overrides.yml): reist in die Kombination mit
        priceNote: lang === "de" ? (plan.priceNoteDe ?? plan.priceNote ?? null) : (plan.priceNote ?? null),
        priceNoteSource: plan.priceNoteSource ?? null,
        model: row.model,
        family: row.family,
        score: score?.intelligence ?? null,
        scoreFallback: score?.familyFallback === true || score?.fallback === true,
        // Raten in der gewählten Währung (pro 1 Einheit); USD-Rohwerte für den Rechner
        tokensPer: rateOf(tokensPerUsd),
        reqPer: rateOf(reqPerUsd),
        tokensPerUsd,
        reqPerUsd,
        // Rohdaten: Tokens/Monat und Requests/Monat (un-normalisiert)
        rawTokensPerMonth: row.rawTokensPerMonth ?? null,
        rawRequestsPerMonth: row.requestsPerMonth ?? null,
        // Inklusives Volumen des Plans (Cap, keine Rate)
        capStr,
        capShort,
        // Schätzung (kein offizielles Limit): z.B. Kimi price-based estimate
        estimateNote: row.estimate ?? null,
        // Privacy: kombinierte Aussage (Modell-Feed vorrangig, sonst Anbieter-Policy)
        noTraining: priv.noTraining,
        retentionDays: priv.retentionDays,
        zeroRetention: priv.zeroRetention,
        privacyKnown: priv.known,
        privacySource: priv.source,
      });
    }
  }
  return combos;
}

// Tokens pro Request aus dem Workload-Pattern (input + cachedRead + output)
function tokensPerRequest(row) {
  const p = row.patternUsed;
  if (!p) return null;
  return (p.input || 0) + (p.cachedRead || 0) + (p.output || 0);
}

function sortBy(key, dir) {
  return (a, b) => {
    let va, vb;
    if (key === "plan") { va = (a.planName || "").toLowerCase(); vb = (b.planName || "").toLowerCase(); }
    else if (key === "model") { va = (a.model || "").toLowerCase(); vb = (b.model || "").toLowerCase(); }
    else if (key === "score") { va = a.score ?? null; vb = b.score ?? null; }
    else if (key === "tokens") { va = a.tokensPer ?? null; vb = b.tokensPer ?? null; }
    else if (key === "req10") { va = a.reqPer ?? null; vb = b.reqPer ?? null; }
    else if (key === "rawtokens") { va = a.rawTokensPerMonth ?? null; vb = b.rawTokensPerMonth ?? null; }
    else if (key === "rawreq") { va = a.rawRequestsPerMonth ?? null; vb = b.rawRequestsPerMonth ?? null; }
    else if (key === "price") { va = a.price ?? null; vb = b.price ?? null; }
    else return 0;
    // Fehlende Werte (null) immer ans Ende
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
    va = String(va ?? ""); vb = String(vb ?? "");
    return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  };
}

function sortArrow(key, state) {
  const arrow = state.key === key ? (state.dir === "asc" ? "↑" : "↓") : "↕";
  return `<span class="sort-ind">${arrow}</span>`;
}

function bindSortHeader(tableId, state, renderFn) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.querySelectorAll("th[data-sort]").forEach((th) => {
    th.classList.remove("sorted");
    th.innerHTML = th.innerHTML.replace(/\s*<span class="sort-ind">.*<\/span>/, "");
    if (state.key === th.dataset.sort) {
      th.classList.add("sorted");
      th.setAttribute("aria-sort", state.dir === "asc" ? "ascending" : "descending");
      th.insertAdjacentHTML("beforeend", sortArrow(th.dataset.sort, state));
    } else {
      th.removeAttribute("aria-sort");
    }
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.key === key) state.dir = state.dir === "asc" ? "desc" : "asc";
      else { state.key = key; state.dir = key === "name" || key === "provider" || key === "meter" || key === "family" ? "asc" : "desc"; }
      renderFn();
    });
  });
}

// Privacy-Badge: "no training" grün, Retention-Zeit als Info
// Plan-Kürzel für die Tabellen-Miniatur: markenbasiert (CC, OG, GL, QW, KM, MM),
// damit gleiche Marken gleich aussehen und nicht "GC"/"QT" herauskommt.
const BRAND_MARKS = [
  [/opendesign/i, "OD"],
  [/opencode/i, "OG"],
  [/command\s*code/i, "CC"],
  [/glm|zhipu/i, "GL"],
  [/qwen|alibaba/i, "QW"],
  [/kimi|moonshot/i, "KM"],
  [/minimax/i, "MM"],
  [/freebuff/i, "FB"],
  [/anthropic|claude/i, "AN"],
  [/openai|gpt/i, "OA"],
  [/google|gemini/i, "GO"],
  [/cursor/i, "CU"],
];
function planInitials(name, provider) {
  const hay = `${name} ${provider || ""}`;
  for (const [re, mark] of BRAND_MARKS) if (re.test(hay)) return mark;
  return String(name).replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}
// Farbe hängt an der Marke, nicht am Plan: gleiche Marke = gleicher Marker
const MARK_COLORS = {
  OD: "#0f766e", OG: "#2563eb", CC: "#7c3aed", GL: "#0d9488", QW: "#db2777", KM: "#ea580c",
  MM: "#0891b2", FB: "#65a30d", AN: "#d97706", OA: "#059669", GO: "#4f46e5", CU: "#475569",
};
function planColor(name, provider) {
  return MARK_COLORS[planInitials(name, provider)] || "#475569";
}


// Zeilen-Deckel: 396 Modell-Kombinationen als Endlos-Tabelle sind unbrauchbar
let plansLimit = 50, famLimit = 12;
const PAGE = 50;
const FAM_PAGE = 12;
// Zahlen rechtsbündig: Standard in Datentabellen, sonst kein sauberer Scan
const RIGHT_COLS = new Set(["score", "tokens", "req10", "rawtokens", "rawreq", "price", "cap"]);
let scoreMax = 70; // für proportionale Balken statt willkürlicher 0-70-Skala
const plansOpen = new Set(); // aufgeklappte Tabellenzeilen

// Aufgeklappte Zeile: alle Werte einer Kombination auf einen Blick
function detailGrid(c) {
  const parts = [];
  const push = (k, v) => { if (v !== null && v !== undefined && v !== "" && v !== "-") parts.push([k, v]); };
  push(t("plans.th.model"), c.model);
  push(t("plans.th.privacy"), comboAttributes(c).map((a) => a.label).join(", ") || null);
  push(t("plans.th.score"), c.score !== null ? `${c.scoreFallback ? "~" : ""}${c.score.toFixed(1)}` : null);
  push(rateTokensLabel(), fmtTokens(c.tokensPer));
  push(rateReqLabel(), c.requestsPer10 != null ? fmtNum(c.requestsPer10) : null);
  push(t("plans.th.rawtokens"), fmtTokens(c.rawTokensPerMonth));
  push(t("plans.th.rawreq"), c.rawRequestsPerMonth != null ? fmtNum(c.rawRequestsPerMonth) : null);
  const priceVal = c.priceDisplay ?? (c.price != null ? fmtPrice(c.price) : null);
  push(t("plans.th.price"), priceVal ? (c.priceNote ? `${priceVal} · ${c.priceNote}` : priceVal) : null);
  push(t("plans.th.cap"), c.capStr ?? c.capShort ?? null);
  push(t("plans.meter"), c.meter ?? null);
  const grid = `<div class="detail-grid">${parts.map(([k, v]) => `<div><div class="dg-k">${escapeHtml(k)}</div><div class="dg-v">${escapeHtml(String(v))}</div></div>`).join("")}</div>`;
  // Hinweis als eigene Zeile unter dem Raster: als Grid-Zelle wuerde der lange
  // Text eine Spalte aufziehen und die Ausrichtung der ganzen Zeile zerstoeren.
  const note = c.planNote ? `<div class="detail-note">${escapeHtml(c.planNote)}</div>` : "";
  return grid + note;
}

// Hinweis zum Plan: kleines neutrales Info-Zeichen, voller Text im Tooltip.
// Es erscheint nur einmal pro Plan, nicht in jeder Modellzeile, und nur beim
// ersten Aufbau der Liste (siehe resetNoteMarks).
let notePlanSeen = new Set();
function resetNoteMarks() { notePlanSeen = new Set(); }
function noteMark(c) {
  if (!c.planNote && !c.planTag) return "";
  if (notePlanSeen.has(c.planId)) return "";
  notePlanSeen.add(c.planId);
  const tip = c.planNote ?? c.planTag;
  return `<span class="note-mark" title="${escapeHtml(tip)}" aria-label="${escapeHtml(tip)}">i</span>`;
}

// Attribute einer Kombination: alles, was den Plan jenseits von Preis und Rate
// ausmacht (Training, Zero Retention, Aufbewahrung, CLI-Bindung). Bewusst eine
// gemeinsame Liste statt einer Sonderkategorie pro Eigenschaft.
function comboAttributes(c) {
  // Jede Aussage nennt ihre Quelle im Tooltip: die Anbieter-URL aus privacy.yml
  const src = providerPrivacy(c.provider)?.sourceUrl;
  const withSrc = (tip) => (src ? `${tip} ${t("attr.source")}: ${src}` : tip);
  const attrs = [];
  if (c.noTraining === true) attrs.push({ tone: "ok", label: t("attr.noTraining"), tip: withSrc(t("attr.noTraining.tip")) });
  else if (c.noTraining === false) attrs.push({ tone: "warn", label: t("attr.trains"), tip: withSrc(t("attr.trains.tip")) });
  else attrs.push({ tone: "unknown", label: t("attr.unknown"), tip: withSrc(t("attr.unknown.tip")) });
  // Reihenfolge = Wichtigkeit: erst was auf einen Blick entscheidet, dann Details
  if (c.planTag) attrs.push({ tone: "plain", label: c.planTag, tip: c.planNote ?? c.planTag });
  if (c.zeroRetention === true) attrs.push({ tone: "plain", label: t("attr.zdr"), tip: withSrc(t("attr.zdr.tip")) });
  if (typeof c.retentionDays === "number") {
    attrs.push({ tone: "plain", label: `${c.retentionDays} ${t("attr.days")}`, tip: withSrc(t("attr.retention.tip")) });
  }
  return attrs;
}

// Attribut-Filter: jede angehakte Eigenschaft muss zutreffen
function syncAttrBoxes() {
  $$("input[data-attr]").forEach((el) => { el.checked = attrFilter.has(el.dataset.attr); });
}

// "Ohne API": Leiste und mobiles Sheet bleiben synchron
function syncNoApiBoxes() {
  const bar = $("#noapi-toggle"); if (bar) bar.checked = includeNoApi;
}
function syncTrainingBoxes() {
  const bar = $("#training-toggle"); if (bar) bar.checked = includeTraining;
}

function attrMatches(c) {
  for (const k of attrFilter) {
    if (k === "noTraining" && c.noTraining !== true) return false;
    if (k === "zdr" && c.zeroRetention !== true) return false;
    if (k === "cli" && !/(cli|no api|kein api)/i.test(c.planTag ?? "")) return false;
    if (k === "unknown" && c.noTraining !== null) return false;
  }
  return true;
}

// Zelle "Sonstiges": die Trainings-Aussage als einziger Chip (gleiche Farbe wie
// der Punkt im Chart), alles Weitere hinter "+n" mit Tooltip. So bleibt die
// Spalte ruhig und die Zeilen behalten dieselbe Hoehe.
function attrCell(c) {
  const attrs = comboAttributes(c);
  if (!attrs.length) return "-";
  const [head, ...rest] = attrs;
  // Alle Chips stehen im DOM: Desktop zeigt Kopf + "+n", Mobile zeigt alle auf einen Blick
  return `<span class="attr attr-${head.tone}" title="${escapeHtml(head.tip)}">${escapeHtml(head.label)}</span>`
    + rest.map((r) => `<span class="attr attr-${r.tone} attr-extra" title="${escapeHtml(r.tip)}">${escapeHtml(r.label)}</span>`).join("")
    + (rest.length ? `<span class="attr attr-more" title="${escapeHtml(rest.map((r) => r.label).join(", "))}">+${rest.length}</span>` : "");
}

// Referenz-Plaene (grosse Anbieter ohne veroeffentlichte Token-Quote): eigene
// Karten unter der Tabelle. Keine Modellzeilen heisst keine Rate, deshalb
// bewusst ausserhalb der Rangliste, aber mit Preis und offizieller Quote sichtbar.
function renderReferencePlans() {
  const box = $("#reference-plans");
  if (!box) return;
  const refs = (data.plans || []).filter((p) => p.disclosure === "reference");
  const list = $("#reference-plans-list");
  if (!list) return;
  if (!refs.length) { box.hidden = true; return; }
  box.hidden = false;
  const ttl = $("#reference-plans-title");
  if (ttl) ttl.textContent = t("ref.title").replace("{n}", refs.length);
  const intro = $("#reference-plans-intro");
  if (intro) intro.textContent = t("ref.intro");
  list.innerHTML = "";
  for (const p of refs) {
    const q = (p.quotas || [])[0];
    const amount = q ? (q.min != null && q.max != null && q.min !== q.max
      ? `${fmtNum(q.min)}-${fmtNum(q.max)}`
      : fmtNum(q.amount)) : null;
    const quota = q ? `${amount} ${q.unit} / ${q.window}` : t("ref.noQuota");
    const note = lang === "de" ? (p.notesDe ?? p.notes ?? null) : (p.notes ?? null);
    // innerHTML ist hier unkritisch: alle Textwerte laufen durch escapeHtml(),
    // Betrag/Preis sind Zahlen aus dem eigenen Katalog, der Rest sind i18n-Konstanten.
    const el = document.createElement("article");
    el.className = "ref-plan";
    el.innerHTML =
      `<div class="ref-head"><strong>${escapeHtml(p.name)}</strong>` +
      `<span class="ref-price">${p.price?.monthlyUsd != null ? fmtMoney(p.price.monthlyUsd) + " " + t("ref.perMonth") : "—"}</span></div>` +
      `<div class="ref-meta"><span>${escapeHtml(p.provider)}</span><span class="ref-quota">${escapeHtml(quota)}</span></div>` +
      (note ? `<p class="ref-note">${escapeHtml(note)}</p>` : "");
    list.appendChild(el);
  }
}

function renderPlans() {
  resetNoteMarks(); // "i" erscheint nur beim ersten Vorkommen eines Plans
  const tbody = $("#plans-tbody");
  if (!tbody) return;
  let combos = buildCombos();
  // Filter: Suche (Plan, Modell, Provider)
  if (plansSearch) {
    const q = plansSearch.toLowerCase();
    combos = combos.filter((c) => [c.planName, c.model, c.provider].join(" ").toLowerCase().includes(q));
  }
  // Filter: Meter
  if (plansMeter) combos = combos.filter((c) => c.meter === plansMeter);
  // Filter: Budget (max $/Monat)
  if (maxBudget < 300) combos = combos.filter((c) => (c.price ?? 0) <= maxBudget);
  // Filter: AI-Score (mindestens)
  if (minAiScore > 0) combos = combos.filter((c) => (c.score ?? 0) >= minAiScore);
  // Filter: Privacy , nur "no training on my data"
  if (attrFilter.size) combos = combos.filter(attrMatches);
  // Datenqualität: Tier-D (preisbasiert, z.B. Kimi) per Default ausblenden ,
  // keine veröffentlichte Menge = nicht sicher vergleichbar. Toggle zum Einblenden.
  if (!includePriceBased) combos = combos.filter((c) => c.dataTier !== "D");
  // Ohne API-Zugang sind die Token-Raten nicht vergleichbar , gleiche Logik wie Tier D
  hiddenNoApiCount = combos.filter(isNoApi).length;
  if (!includeNoApi) combos = combos.filter((c) => !isNoApi(c));
  // Modelle, die auf den Daten trainieren, per Default aus , "unbekannt" bleibt sichtbar,
  // weil dazu keine Aussage existiert und die Zeile sonst stillschweigend verschwindet.
  hiddenTrainingCount = combos.filter((c) => c.noTraining === false).length;
  if (!includeTraining) combos = combos.filter((c) => c.noTraining !== false);
  // Sortieren
  combos.sort(sortBy(plansSort.key, plansSort.dir));
  // Balken-Skala: relativ zum besten Score im Datensatz
  scoreMax = Math.max(1, ...buildCombos().map((c) => (typeof c.score === "number" ? c.score : 0)));
  // Count
  const count = $("#plans-count");
  const shown = combos.slice(0, plansLimit);
  if (count) count.textContent = `${shown.length} / ${combos.length}`;
  announceResults(shown.length, combos.length);
  renderReferencePlans();

  if (!combos.length) {
    tbody.innerHTML = `<tr><td colspan="${visibleColumns.length}" style="text-align:center;padding:28px;color:var(--text-3)">${lang === "de" ? "Keine Kombinationen gefunden." : "No combinations match."}</td></tr>`;
    const mb = $("#plans-more"); if (mb) mb.hidden = true;
    return;
  }

  tbody.innerHTML = shown.map((c, i) => {
    const cells = visibleColumns.map((col) => {
      const html = renderCell(col, c);
      if (!RIGHT_COLS.has(col)) return html;
      // Klasse ergänzen, NICHT ein zweites class-Attribut erzeugen
      return html.replace(/^<td([^>]*)>/, (m, attrs) => (/class="/.test(attrs)
        ? `<td${attrs.replace(/class="([^"]*)"/, 'class="$1 t-right"')}>`
        : `<td class="t-right"${attrs}>`));
    }).join("");
    // Zeile ist aufklappbar: die Detailzeile zeigt alle Werte auf einen Blick
    const key = `${c.planId}::${c.model}`;
    const open = plansOpen.has(key);
    return `<tr class="row-main${open ? " open" : ""}" data-key="${escapeHtml(key)}">${cells}</tr>`
      + `<tr class="row-detail" data-detail="${escapeHtml(key)}"${open ? "" : " hidden"}>`
      + `<td colspan="${visibleColumns.length}">${detailGrid(c)}</td></tr>`;
  }).join("");
  // Auf- und Zuklappen (Zeile anklicken)
  tbody.querySelectorAll("tr.row-main").forEach((tr) => {
    tr.addEventListener("click", () => {
      const key = tr.dataset.key;
      const detail = tbody.querySelector(`tr.row-detail[data-detail="${CSS.escape(key)}"]`);
      const nowOpen = !plansOpen.has(key);
      if (nowOpen) plansOpen.add(key); else plansOpen.delete(key);
      tr.classList.toggle("open", nowOpen);
      if (detail) detail.hidden = !nowOpen;
    });
  });
  const moreBtn = $("#plans-more");
  if (moreBtn) {
    const rest = combos.length - shown.length;
    moreBtn.hidden = rest <= 0;
    moreBtn.textContent = `${t("more.show")} (${rest})`;
  }
  syncColumnHeaders();
}

// Spalten-Factory: jede Spalte rendert ihre Zelle (nur sichtbare werden aufgerufen)
function renderCell(col, c) {
  const priceStr = c.priceDisplay ?? (c.price !== null && c.price !== undefined ? fmtMoney(c.price) : "-");
  // Familien-Fallback-Scores mit "~" markieren (Näherungswert, kein exakter AA-Wert)
  const scoreStr = c.score !== null
    ? `<span class="num strong">${c.scoreFallback ? "~" : ""}${c.score.toFixed(1)}</span>`
    : `<span class="muted" title="${escapeHtml(t("plans.scoreNA"))}">-</span>`;
  // Balken proportional zum Maximum im Datensatz, nicht zu einer willkürlichen 70er-Skala
  const scoreBar = c.score !== null
    ? `<div class="score-bar"><div class="score-fill" style="width:${Math.min(100, (c.score / (scoreMax || 70)) * 100)}%"></div></div>`
    : "";
  // Neutraler Rechner-Rang (grau, keine Empfehlung): nur Info, wo der Plan im Budget steht
  const rankTag = calcRanks.has(c.planId)
    ? `<span class="rank-tag" title="${escapeHtml(t("calc.rankTitle"))}">#${calcRanks.get(c.planId)}</span>`
    : "";
  switch (col) {
    case "plan": {
      const provSlug = providerSlug(c.provider);
      const provLink = provSlug
        ? `<a href="providers/${encodeURIComponent(provSlug)}/" class="provider-link" title="Open dedicated ${escapeHtml(c.provider)} tool page">${escapeHtml(c.provider)}</a>`
        : escapeHtml(c.provider);
      const planLink = KNOWN_PLANS.has(c.planId)
        ? `<a href="plans/${encodeURIComponent(c.planId)}/" class="strong plan-link" title="Open dedicated ${escapeHtml(c.planName)} plan page">${escapeHtml(c.planName)}</a>`
        : `<span class="strong">${escapeHtml(c.planName)}</span>`;
      return `<td class="cell-head" data-label="${t("plans.th.plan")}"><span class="plan-cell"><span class="plan-avatar" style="--av: ${planColor(c.planName, c.provider)}">${escapeHtml(planInitials(c.planName, c.provider))}</span><span>${planLink}${rankTag}${noteMark(c)}<div class="muted" style="font-size: var(--fs-sm)">${provLink}</div></span></span></td>`;
    }
    case "model": return `<td class="cell-sub" data-label="${t("plans.th.model")}"><span class="strong">${escapeHtml(c.model)}</span></td>`;
    case "score": return `<td data-label="${t("plans.th.score")}">${scoreStr}${scoreBar}</td>`;
    case "tokens": return `<td data-label="${rateTokensLabel()}"><span class="num">${fmtTokens(c.tokensPer)}</span></td>`;
    case "req10": {
      const mark = c.estimateNote ? "~" : "";
      return `<td data-label="${rateReqLabel()}"><span class="num">${c.reqPer ? mark + fmtNum(c.reqPer) : "-"}</span>${c.estimateNote ? `<div class="est-note" title="${escapeHtml(c.estimateNote)}">${t("plans.estimate")}</div>` : ""}</td>`;
    }
    case "rawtokens": return `<td data-label="${t("plans.th.rawtokens")}"><span class="num">${fmtTokens(c.rawTokensPerMonth)}</span></td>`;
    case "rawreq": {
      const mark = c.estimateNote ? "~" : "";
      return `<td data-label="${t("plans.th.rawreq")}"><span class="num">${c.rawRequestsPerMonth ? mark + fmtNum(c.rawRequestsPerMonth) : "-"}</span>${c.estimateNote ? `<div class="est-note" title="${escapeHtml(c.estimateNote)}">${t("plans.estimate")}</div>` : ""}</td>`;
    }
    case "cap": return `<td data-label="${t("plans.th.cap")}"><span class="num">${c.capShort ? escapeHtml(c.capShort) : "-"}</span></td>`;
    case "price": {
      const wl = c.waitlist === true
        ? `<div class="waitlist-badge" title="${t("plans.waitlist.title")}">${t("plans.waitlist")}</div>`
        : "";
      return `<td data-label="${t("plans.th.price")}"><span class="num">${priceStr}</span>${wl}</td>`;
    }
    case "privacy": return `<td class="td-attrs" data-label="${t("plans.th.privacy")}">${attrCell(c)}</td>`;
    default: return "";
  }
}

// Tabellenköpfe: nur sichtbare Spalten anzeigen
// Sortier-Popover: Chips für das Feld, Segment für die Richtung
const SORT_FIELDS = [
  { key: "tokens", label: () => rateTokensLabel() },
  { key: "rawtokens", label: () => t("sort.rawtokens") },
  { key: "score", label: () => t("sort.score") },
  { key: "req10", label: () => t("sort.req10") },
  { key: "rawreq", label: () => t("sort.rawreq") },
  { key: "price", label: () => t("sort.price") },
  { key: "plan", label: () => t("sort.plan") },
  { key: "model", label: () => t("sort.model") },
];
function renderSortUI() {
  const fields = $("#sort-fields");
  if (fields) {
    fields.innerHTML = SORT_FIELDS
      .map((f) => `<button type="button" class="chip-btn${plansSort.key === f.key ? " active" : ""}" data-key="${f.key}">${escapeHtml(f.label())}</button>`)
      .join("");
    fields.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      plansSort.key = b.dataset.key;
      plansLimit = PAGE;
      renderPlans();
    }));
  }
  const seg = $("#sort-dir-seg");
  if (seg) {
    seg.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.dir === plansSort.dir);
      if (b.dataset.bound) return;
      b.dataset.bound = "1";
      b.addEventListener("click", () => {
        plansSort.dir = b.dataset.dir;
        renderPlans();
      });
    });
  }
  const cur = $("#sort-current");
  if (cur) {
    const f = SORT_FIELDS.find((x) => x.key === plansSort.key);
    cur.textContent = f ? f.label() : plansSort.key;
  }
  const curDir = $("#sort-current-dir");
  if (curDir) curDir.textContent = plansSort.dir === "asc" ? "↑" : "↓";
}

function syncColumnHeaders() {
  const table = document.getElementById("plans-table");
  if (!table) return;
  renderSortUI();
  // Sort-Selector (Mobile) mit aktuellem Sort-Zustand synchronisieren
  const selKey = $("#sort-select-key");
  const selDir = $("#sort-select-dir");
  if (selKey) selKey.value = plansSort.key;
  if (selDir) selDir.value = plansSort.dir;
  const head = table.querySelector("thead tr");
  if (!head) return;
  const sortableMap = { plan: "plan", model: "model", score: "score", tokens: "tokens", req10: "req10", rawtokens: "rawtokens", rawreq: "rawreq", cap: null, price: "price", privacy: null };
  head.innerHTML = visibleColumns.map((col) => {
    const sortKey = sortableMap[col];
    const i18nKey = `plans.th.${col}`;
    const label = col === "tokens" ? rateTokensLabel() : col === "req10" ? rateReqLabel() : (t(i18nKey) || col);
    const th = document.createElement("th");
    if (sortKey) {
      th.dataset.sort = sortKey;
      th.scope = "col";
      th.innerHTML = `${label}<span class="sort-ind">${plansSort.key === sortKey ? (plansSort.dir === "asc" ? "↑" : "↓") : "↕"}</span>`;
      if (plansSort.key === sortKey) {
        th.classList.add("sorted");
        th.setAttribute("aria-sort", plansSort.dir === "asc" ? "ascending" : "descending");
      }
    } else {
      th.scope = "col";
      th.textContent = label;
    }
    if (RIGHT_COLS.has(col)) th.classList.add("t-right");
    return th.outerHTML;
  }).join("");
  bindSortHeader("plans-table", plansSort, renderPlans);
}

// Spalten-Picker UI synchronisieren
function syncColumnPicker() {
  document.querySelectorAll("#col-picker-panel input[data-col]").forEach((box) => {
    box.checked = visibleColumns.includes(box.dataset.col);
  });
}

/* ============ DASHBOARD / PARETO-PLOT (Canvas) ============ */
// Standard: Tokens pro Geld (X) gegen Intelligenz (Y) , ehrliche Rate, kein Kaufversprechen.
let dashX = "tokens";
let dashY = "score";
let dashPareto = true;
let dashGreen = false; // Zielzone default aus (wirkt sonst beliebig)
let dashTargetX = null; // Ziel-Schwelle X (Green Target)
let dashTargetY = null; // Ziel-Schwelle Y (Green Target)
let dashSelected = null; // "planId::model" des angetippten Punkts (Feedback-Ring)
let dashPoints = []; // gerenderte Punkte in CSS-Pixeln (für Hit-Test)
let dashLogX = true; // Log-Skala auf der X-Achse (Rail-Schalter)
let dashHover = null; // Punkt unter dem Zeiger (für Crosshair)
let dashZoom = null; // {x0,x1,y0,y1} in Datenkoordinaten, null = Auto-Ausschnitt
let dashBrush = null; // laufende Zoom-Auswahl in CSS-Pixeln
let dashPlotBox = null; // Plot-Rechteck in CSS-Pixeln (für Zoom-Umrechnung)
let dashAxisX = null; // aktuelle X-Achsengrenzen [min,max] aus dem letzten Render
let dashAxisY = null; // aktuelle Y-Achsengrenzen [min,max] aus dem letzten Render
let dashPanning = false; // laufende Zoom-/Pan-Geste: unterdrückt Tooltips und Klicks

// Log-Metriken: auf diesen Achsen zoomen wir im Log-Raum, sonst verzerrt der Zoom.
const LOG_METRICS = new Set(["tokens", "req10", "rawtokens", "rawreq", "price"]);
const isLogX = () => dashLogX && LOG_METRICS.has(dashX);
const isLogY = () => LOG_METRICS.has(dashY);

// Fenster um den Mittelpunkt skalieren (Buttons, Tasten). f < 1 zoomt hinein.
function scaleWindow(lo, hi, log, f) {
  if (!(hi > lo)) return [lo, hi];
  if (log) {
    const m = (Math.log(lo) + Math.log(hi)) / 2, half = (Math.log(hi) - Math.log(lo)) * f / 2;
    return [Math.exp(m - half), Math.exp(m + half)];
  }
  const m = (lo + hi) / 2, half = (hi - lo) * f / 2;
  return [m - half, m + half];
}

function zoomByFactor(f) {
  if (!dashAxisX || !dashAxisY) return;
  dashZoom = {
    x0: scaleWindow(dashAxisX[0], dashAxisX[1], isLogX(), f)[0],
    x1: scaleWindow(dashAxisX[0], dashAxisX[1], isLogX(), f)[1],
    y0: scaleWindow(dashAxisY[0], dashAxisY[1], isLogY(), f)[0],
    y1: scaleWindow(dashAxisY[0], dashAxisY[1], isLogY(), f)[1],
  };
  renderDashboard();
}

function resetZoom() {
  const rb = $("#dash-reset-btn"); if (rb) rb.hidden = true;
  if (!dashZoom) return;
  dashZoom = null; dashSelected = null;
  const c = $("#dash-canvas");
  if (c && window.d3zoom) window.d3zoom.select(c).property("__zoom", window.d3zoom.zoomIdentity);
  renderDashboard();
}

// Quantil für den Bildausschnitt (P2-P98 statt Min/Max: keine halbe Fläche Luft)
// Obergrenze des Bildausschnitts: P98, aber liegt der echte Höchstwert nur
// knapp darüber (Faktor 2.5), kommt er mit dazu. Sonst stünde der stärkste
// Punkt außerhalb der Achse und tauchte im Panel, aber nicht im Bild auf.
function cutHigh(sorted, log) {
  if (!sorted.length) return 1;
  const max = sorted[sorted.length - 1];
  const q = quantile(sorted, 0.98);
  if (!(q > 0)) return max;
  return max / q <= 2.5 ? max : q;
}
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
// CSS-Variablen als echte Farben für Canvas lesen
function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}

// Punkt-Wert für eine Metrik
function metricValue(combo, metric) {
  switch (metric) {
    case "tokens": return combo.tokensPer;
    case "req10": return combo.reqPer;
    case "rawtokens": return combo.rawTokensPerMonth;
    case "rawreq": return combo.rawRequestsPerMonth;
    case "score": return combo.score;
    case "price": return combo.price;
    default: return null;
  }
}
// Richtung einer Metrik: "max" = mehr ist besser (Tokens, Requests, Score),
// "min" = weniger ist besser (Preis). Bestimmt Pareto-Frontier + Zielzone.
function metricDir(metric) {
  return metric === "price" ? "min" : "max";
}
// Ist die Achsen-Kombination sinnvoll? (nicht beide Achsen sind "min")
// Preis als EINE Achse ist ok (Trade-off), beide min wäre unsinnig.
function validAxes(x, y) {
  return !(metricDir(x) === "min" && metricDir(y) === "min");
}
// Metrik-Label (i18n); Preis trägt die gewählte Währung im Label
function metricLabel(metric) {
  const map = {
    tokens: rateTokensLabel(), req10: rateReqLabel(), rawtokens: t("dash.m.rawtokens"),
    rawreq: t("dash.m.rawreq"), score: t("dash.m.score"), price: `${t("dash.m.price")} (${currency})`,
  };
  return map[metric] ?? metric;
}
// Kurz-Format für Tooltip
function metricFmt(metric, val) {
  if (val === null || val === undefined) return "-";
  if (metric === "price") return fmtPrice(val); // gewählte Währung (USD/EUR/CNY/...)
  if (metric === "score") return val.toFixed(1);
  return fmtTokens(val);
}

// Pareto-Frontier: Punkte die in beiden Achsen nicht dominiert werden.
// Richtungen werden respektiert: "max" = größer besser, "min" = kleiner besser.
// Ein Punkt p dominiert q, wenn p auf beiden Achsen mindestens so gut ist
// und auf einer besser , gemäß der jeweiligen Richtung.
function paretoFrontier(points) {
  const pts = points.filter((p) => p.x != null && p.y != null);
  if (pts.length < 2) return pts;
  const better = (a, b, dir) => (dir === "min" ? a < b : a > b);
  const atLeast = (a, b, dir) => (dir === "min" ? a <= b : a >= b);
  const dx = metricDir(dashX), dy = metricDir(dashY);
  const frontier = [];
  for (const p of pts) {
    let dominated = false;
    for (const q of pts) {
      if (q === p) continue;
      // q dominiert p?
      const xDom = atLeast(q.x, p.x, dx) && better(q.y, p.y, dy);
      const yDom = atLeast(q.y, p.y, dy) && better(q.x, p.x, dx);
      const eqX = q.x === p.x, eqY = q.y === p.y;
      if (!(eqX && eqY) && (xDom || yDom || (atLeast(q.x, p.x, dx) && atLeast(q.y, p.y, dy) && (q.x !== p.x || q.y !== p.y)))) {
        dominated = true;
        break;
      }
    }
    if (!dominated) frontier.push(p);
  }
  // Sortieren für die Linie: auf X-Achse aufsteigend (unabhängig von Richtung)
  return frontier.sort((a, b) => a.x - b.x);
}

// Fehler im Plot nie stumm verschlucken: sichtbare Meldung im Panel, kopierbar
function showPlotError(err) {
  const msg = (err && (err.message || err.reason || String(err))) || "unknown error";
  // Version mit ausgeben: unterscheidet kaputten Code von altem gecachten HTML
  let ver = "?";
  try {
    const tag = document.querySelector('script[src*="app.js"]');
    if (tag) ver = decodeURIComponent((tag.getAttribute("src").split("v=")[1] || "?").split("&")[0]);
  } catch (e) { /* ignore */ }
  const full = `${msg} [app.js ${ver}]`;
  const note = $("#dash-note");
  const plot = document.querySelector(".chart-stage");
  if (note) note.textContent = (lang === "de" ? "Plot-Fehler: " : "Plot error: ") + full;
  if (plot) {
    let box = document.getElementById("dash-error");
    if (!box) {
      box = document.createElement("div");
      box.id = "dash-error";
      box.className = "dash-error";
      plot.appendChild(box);
    }
    box.textContent = (lang === "de" ? "Diagramm konnte nicht gezeichnet werden: " : "Chart could not be drawn: ") + full;
  }
  try { console.error("[dashboard]", msg, err); } catch (e) { /* ignore */ }
}

// Zwischenstand des letzten Vollaufbaus: Hover, Zoom und Pan zeichnen nur die
// Canvas neu. Kombis, Filter, Pareto-Front und die Rail-Zahlen aendern sich dabei
// nicht, kosten zusammen aber >100 ms pro Mausbewegung.
let dashCache = null;

function renderDashboard(light) {
  try {
    renderDashboardInner(!!light);
    const box = document.getElementById("dash-error");
    if (box) box.remove();
  } catch (err) {
    showPlotError(err);
  }
}

function renderDashboardInner(light) {
  const canvas = $("#dash-canvas");
  const note = $("#dash-note");
  const resetBtn = $("#dash-reset-btn");
  if (!canvas || !canvas.getContext) {
    // Versions-Mismatch (altes HTML + neues JS oder umgekehrt): nicht schwarz bleiben
    if (note) note.textContent = lang === "de"
      ? "Plot startet nicht. Bitte hart neu laden (Strg+Shift+R)."
      : "Plot won't start. Please hard-reload (Ctrl+Shift+R).";
    return;
  }
  // Achsen-Guards zuerst: ungültige Auswahl korrigieren, bevor Punkte fallen
  const ALLOWED_Y = ["score", "tokens", "req10", "rawtokens", "rawreq"];
  if (!ALLOWED_Y.includes(dashY)) { dashY = "score"; const ys = $("#dash-y"); if (ys) ys.value = "score"; }
  if (!validAxes(dashX, dashY)) { dashX = "tokens"; const xs = $("#dash-x"); if (xs) xs.value = "tokens"; }
  // Leichter Pfad (Hover, Zoom, Pan): Punkte aus dem letzten Vollaufbau nutzen
  let points;
  if (light && dashCache) {
    points = dashCache.points;
  } else {
  // Gleiche Filter wie die Tabelle anwenden (Suche, Budget, AI, Privacy)
  let combos = buildCombos();
  if (plansSearch) {
    const q = plansSearch.toLowerCase();
    combos = combos.filter((c) => [c.planName, c.model, c.provider].join(" ").toLowerCase().includes(q));
  }
  if (plansMeter) combos = combos.filter((c) => c.meter === plansMeter);
  if (maxBudget < 300) combos = combos.filter((c) => (c.price ?? 0) <= maxBudget);
  if (minAiScore > 0) combos = combos.filter((c) => (c.score ?? 0) >= minAiScore);
  if (attrFilter.size) combos = combos.filter(attrMatches);
  if (!includePriceBased) combos = combos.filter((c) => c.dataTier !== "D");
  // Ohne API-Zugang sind die Token-Raten nicht vergleichbar , gleiche Logik wie Tier D
  if (!includeNoApi) combos = combos.filter((c) => !isNoApi(c));
  // Gleiche Ausschluesse wie die Tabelle: sonst zeigt der Plot Zeilen,
  // die in der Liste per Default fehlen (und umgekehrt).
  if (!includeTraining) combos = combos.filter((c) => c.noTraining !== false);

  points = combos.map((c) => ({
    combo: c,
    x: metricValue(c, dashX),
    y: metricValue(c, dashY),
  })).filter((p) => p.x != null && p.y != null && p.x > 0 && p.y > 0);
  }

  // Canvas-Größe: CSS-Pixel × Gerätepixel-Verhältnis (scharf auf Retina + Mobile)
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(rect.width, 300);
  const cssH = Math.max(rect.height, 240);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cssW, H = cssH;
  const PAD_L = Math.max(34, cssW * 0.05), PAD_B = Math.max(40, cssH * 0.1);
  const PAD_T = 22, PAD_R = 30;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const C = {
    grid: cssVar("--grid", "#1c2836"),
    axis: cssVar("--text-3", "#62748a"),
    text: cssVar("--text-3", "#62748a"),
    ring: cssVar("--text", "#e9eef5"),
    dot: cssVar("--data-c", "#8091a5"),
    dotStrong: cssVar("--data-c", "#8091a5"),
    dotUnknown: cssVar("--data-c", "#8091a5"),
    ok: cssVar("--data-a", "#6ec1e4"),
    bad: cssVar("--data-b", "#f0a05a"),
    info: cssVar("--data-a", "#6ec1e4"),
    primary: cssVar("--data-pareto", "#ffffff"),
    accent: cssVar("--accent", "#6ee7c7"),
    crosshair: cssVar("--text-3", "#62748a"),
  };
  // Hintergrund ZUERST und nur hier füllen (ein clearRect danach würde ihn wieder löschen)
  ctx.fillStyle = cssVar("--surface", "#101721");
  ctx.fillRect(0, 0, W, H);
  ctx.font = "11px Inter, system-ui, sans-serif";

  if (!points.length) {
    dashPoints = [];
    if (note) note.textContent = t("dash.empty");
    if (resetBtn) { resetBtn.hidden = false; resetBtn.textContent = t("dash.emptyReset"); }
    return;
  }
  if (resetBtn) resetBtn.hidden = true;

  // Skalen: log für Token/Request/Preis-Metriken (riesige Spannen), linear für Score
  const logScale = (m) => m === "tokens" || m === "req10" || m === "rawtokens" || m === "rawreq" || m === "price";
  // Log-X ist jetzt eine bewusste Nutzerentscheidung (Rail-Schalter), nicht automatisch
  const xLog = dashLogX && logScale(dashX), yLog = logScale(dashY);
  // Bildausschnitt aus Perzentilen (P2-P98) + 4 % Luft: Daten füllen den Plot,
  // keine halbe Fläche Leerraum. Linear startet am Daten-Minimum, nicht bei 0.
  const xSorted = points.map((p) => p.x).sort((a, b) => a - b);
  const ySorted = points.map((p) => p.y).sort((a, b) => a - b);
  const pad = (lo, hi, log) => {
    if (!(hi > lo)) return [lo * 0.9 || 0.9, lo * 1.1 || 1.1];
    if (log) return [lo * 0.96, hi * 1.04];
    const span = hi - lo, m = span * 0.08 || 1;
    return [lo - m, hi + m];
  };
  const [xMin0, xMax0raw] = dashZoom
    ? [dashZoom.x0, dashZoom.x1]
    : pad(quantile(xSorted, 0.02), cutHigh(xSorted, xLog), xLog);
  const [yMin, yMax0] = dashZoom
    ? [dashZoom.y0, dashZoom.y1]
    : pad(quantile(ySorted, 0.02), cutHigh(ySorted, yLog), yLog);
  // Lineare Achse nach oben auf einen runden Wert ziehen (58.3 -> 60), damit die
  // Skala nicht mit einem krummen Anschlag endet. Log-Achsen bleiben wie sie sind.
  const roundUpTo = (v, step) => Math.ceil(v / step) * step;
  const ySpan = Math.max(1e-9, yMax0 - yMin);
  const yMax = (yLog || dashZoom) ? yMax0 : roundUpTo(yMax0, Math.max(1, Math.round(ySpan / 5)));
  const xMax = xMax0raw;
  const xMin = xMin0;

  const sx = (v) => PAD_L + (xLog ? (Math.log(v) - Math.log(xMin)) / (Math.log(xMax) - Math.log(xMin)) : (v - xMin) / (xMax - xMin)) * plotW;
  const sy = (v) => H - PAD_B - (yLog ? (Math.log(v) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin)) : (v - yMin) / (yMax - yMin)) * plotH;

  // Identische Datenpunkte leicht versetzen (deterministischer Jitter), sonst verdecken sie sich
  const seen = new Map();
  const px = points.map((p) => {
    const key = `${p.x.toFixed(6)}:${p.y.toFixed(6)}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    let jx = 0, jy = 0;
    if (n > 0) { const ang = n * 2.399, rad = 6 + 4 * Math.sqrt(n); jx = Math.cos(ang) * rad; jy = Math.sin(ang) * rad * 0.7; }
    return { ...p, px: sx(p.x) + jx, py: sy(p.y) + jy };
  });

  const axesValid = validAxes(dashX, dashY);
  const dx = metricDir(dashX), dy = metricDir(dashY);
  let targetX = dashTargetX;
  let targetY = dashTargetY;
  if (targetX === null || targetX === undefined) targetX = quantile(xSorted, 0.5); // Median
  if (targetY === null || targetY === undefined) targetY = quantile(ySorted, 0.5); // Median
  const tX = sx(Math.min(Math.max(targetX, xMin), xMax));
  const tY = sy(Math.min(Math.max(targetY, yMin), yMax));

  // Hier KEIN clearRect: der Hintergrund wurde oben gefüllt und bleibt stehen
  // Zielzone (nur wenn eingeschaltet)
  if (dashGreen && axesValid) {
    ctx.save();
    ctx.fillStyle = C.ok; ctx.globalAlpha = 0.12;
    if (dx === "max" && dy === "max") ctx.fillRect(tX, PAD_T, PAD_L + plotW - tX, Math.max(0, tY - PAD_T));
    else if (dx === "min" && dy === "max") ctx.fillRect(PAD_L, PAD_T, Math.max(0, tX - PAD_L), Math.max(0, tY - PAD_T));
    else if (dx === "max" && dy === "min") ctx.fillRect(tX, tY, PAD_L + plotW - tX, Math.max(0, H - PAD_B - tY));
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.ok; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(tX, PAD_T); ctx.lineTo(tX, H - PAD_B); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD_L, tY); ctx.lineTo(W - PAD_R, tY); ctx.stroke();
    ctx.restore();
  }
  // Ticks + Grid (Mobile: höchstens 4)
  const maxTicks = cssW < 760 ? 4 : 6;
  // Runde Schritte für lineare Achsen (23/32/41 wirkt willkürlich, 25/30/35 nicht)
  const niceStep = (span, n) => {
    const raw = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
    return 10 * mag;
  };
  const tickVals = (log, min, max, n) => {
    if (log) {
      const out = [];
      let v = Math.pow(10, Math.ceil(Math.log10(min)));
      while (v <= max && out.length < 8) { if (v >= min) out.push(v); v *= 10; }
      return out;
    }
    const step = niceStep(max - min, n);
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
    return out;
  };
  // Rand-Tick auf eine runde Zahl runden (821M -> 800M): grosse Werte grob,
  // kleine exakt. Liegt gerundet innerhalb der Achse, wird es beschriftet.
  const round2 = (v) => {
    const a = Math.abs(v);
    const digits = a >= 1e8 ? 1 : 2;
    const mag = Math.pow(10, Math.floor(Math.log10(a)) - (digits - 1));
    return Math.round(v / mag) * mag;
  };
  const tickFmt = (m, v) => m === "price" ? fmtPrice(v) : (m === "score" ? String(Math.round(v)) : fmtTokens(round2(v)));
  const xTicks = tickVals(xLog, xMin, xMax, maxTicks);
  const yTicks = tickVals(yLog, yMin, yMax, maxTicks);
  // Achse bis zum Rand beschriften: sonst wirkt die Skala kürzer als die Daten
  const xStep = xLog ? 0 : niceStep(xMax - xMin, maxTicks);
  const yStep = yLog ? 0 : niceStep(yMax - yMin, maxTicks);
  // Log-Achse: nur Dekaden beschriften. Ein Zwischenwert wie "2B" würde wie ein
  // voller Dekadenschritt aussehen und die Abstände falsch erscheinen lassen.
  const isDecade = (v) => { const l = Math.log10(v); return Math.abs(l - Math.round(l)) < 1e-9; };
  const edgeTick = (log, v) => (log ? (isDecade(round2(v)) ? round2(v) : null) : v);
  const xEdge = edgeTick(xLog, xMax), yEdge = edgeTick(yLog, yMax);
  if (xTicks.length && xMax - xTicks[xTicks.length - 1] > (xStep || (xMax - xMin) * 0.35) * 0.6 && xEdge) xTicks.push(xEdge);
  if (yTicks.length && yMax - yTicks[yTicks.length - 1] > (yStep || (yMax - yMin) * 0.35) * 0.6 && yEdge) yTicks.push(yEdge);
  ctx.save();
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  ctx.fillStyle = C.axis; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (const v of xTicks) {
    const X = sx(v);
    ctx.beginPath(); ctx.moveTo(X, PAD_T); ctx.lineTo(X, H - PAD_B); ctx.stroke();
    // Letzter Tick klebt sonst am Rand: dann rechtsbündig beschriften
    ctx.textAlign = X > W - PAD_R - 16 ? "right" : "center";
    ctx.fillText(tickFmt(dashX, v), X, H - PAD_B + 6);
  }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (const v of yTicks) {
    const Y = sy(v);
    ctx.beginPath(); ctx.moveTo(PAD_L, Y); ctx.lineTo(W - PAD_R, Y); ctx.stroke();
    ctx.fillText(tickFmt(dashY, v), PAD_L - 6, Y);
  }
  // Achsen
  ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(PAD_L, H - PAD_B); ctx.lineTo(W - PAD_R, H - PAD_B); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, H - PAD_B); ctx.stroke();
  ctx.fillStyle = C.text; ctx.font = "600 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText(metricLabel(dashX), PAD_L + plotW / 2, H - 8);
  ctx.save();
  ctx.translate(14, PAD_T + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center";
  ctx.fillText(metricLabel(dashY), 0, 0);
  ctx.restore();
  ctx.restore();
  // Pareto-Linie (wird unten im geclippten Bereich gezeichnet)
  const frontier = light && dashCache ? dashCache.frontier : (dashPareto ? paretoFrontier(points) : []);
  // Punkte: klein genug, dass 400 davon unterscheidbar bleiben (Trefferfläche bleibt groß)
  const frontierKeys = new Set(frontier.map((f) => `${f.combo.planId}::${f.combo.model}`));
  const touchSize = cssW < 760;
  // Zeichenfläche beschneiden: nichts ragt über Achsen/Labels hinaus
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD_L - 6, PAD_T - 6, plotW + 12, plotH + 12);
  ctx.clip();
  // Hex-Farbe -> rgba (CSS-Variablen sind Hex-Werte, Canvas braucht Alpha)
  const rgba = (c, a) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(c).trim());
    return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : c;
  };
  const roundRectPath = (x, y, w, h, r) => {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  if (frontier.length > 1) {
    // Treppe statt schräger Linie: zwischen zwei Frontier-Punkten ist nichts
    // erreichbar, eine Diagonale würde Punkte behaupten, die es nicht gibt.
    const fkeys = new Set(frontier.map((f) => `${f.combo.planId}::${f.combo.model}`));
    const fpts = px.filter((p) => fkeys.has(`${p.combo.planId}::${p.combo.model}`))
      .sort((a, b) => a.px - b.px)
      .map((p) => ({ x: p.px, y: p.py }));
    const steps = (move, line) => {
      line(fpts[0].x, fpts[0].y);
      for (let i = 1; i < fpts.length; i++) { line(fpts[i].x, fpts[i - 1].y); line(fpts[i].x, fpts[i].y); }
    };
    ctx.save();
    ctx.beginPath();
    steps(null, (x, y) => ctx.lineTo(x, y));
    ctx.strokeStyle = rgba(C.primary, 0.16); ctx.lineWidth = 7; ctx.lineJoin = "miter"; ctx.lineCap = "round";
    ctx.stroke();
    ctx.strokeStyle = C.primary; ctx.lineWidth = 2; ctx.lineJoin = "miter"; ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }
  const counts = { noTraining: 0, trains: 0, unknown: 0 };
  for (const p of px) {
    const isFrontier = frontierKeys.has(`${p.combo.planId}::${p.combo.model}`);
    if (p.combo.noTraining === true) counts.noTraining++;
    else if (p.combo.noTraining === false) counts.trains++;
    else counts.unknown++;
    const r = isFrontier ? (touchSize ? 5.5 : 4.5) : (touchSize ? 3.6 : 2.9);
    p.pr = r;
    const fill = isFrontier ? C.primary
      : (p.combo.noTraining === true ? C.ok : (p.combo.noTraining === false ? C.bad : C.dotUnknown));
    ctx.save();
    // Heller Rand in Kartenfarbe trennt überlappende Punkte sichtbar
    ctx.beginPath(); ctx.arc(p.px, p.py, r + 1.1, 0, Math.PI * 2);
    ctx.fillStyle = rgba(cssVar("--surface", "#101721"), 0.9); ctx.fill();
    ctx.globalAlpha = isFrontier ? 1 : 0.9;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(p.px, p.py, r, 0, Math.PI * 2); ctx.fill();
    if (isFrontier) {
      // Akzent-Ring: Frontier-Punkte sind weiß mit Ring, nicht nur weiß
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(p.px, p.py, r + 2.4, 0, Math.PI * 2);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.restore();
  }
  // Legende ehrlich halten: Kategorien ohne Punkte und ausgeschaltete Ebenen
  // werden gedimmt, jede Kategorie zeigt ihre Anzahl.
  const lg = $("#dash-legend");
  if (lg) {
    counts.frontier = frontier.length;
    for (const [k, v] of Object.entries(counts)) {
      const el = lg.querySelector(`[data-legend="${k}"]`);
      if (!el) continue;
      el.classList.toggle("off", v === 0);
      // Kategorien ohne Punkte ganz ausblenden, statt sie als leeren Eintrag zu zeigen
      el.hidden = v === 0;
      const n = el.querySelector(`[data-count="${k}"]`);
      if (n) n.textContent = fmtNum(v);
    }
    const tz = lg.querySelector('[data-legend="target"]');
    if (tz) tz.classList.toggle("off", !dashGreen);
    const pf = lg.querySelector('[data-legend="pareto"]');
    if (pf) pf.classList.toggle("off", !dashPareto || frontier.length < 2);
  }
  // Frontier-Punkte bekommen ihren Wert: die Frontier wird damit nachprüfbar
  // statt nur behauptet. Bei vielen Knoten entfällt das, sonst wird es Brei.
  if (dashPareto && frontier.length > 1 && frontier.length <= 6) {
    ctx.save();
    ctx.font = "600 10px var(--font-num), " + (cssVar("--font-num", "Inter") || "Inter") + ", system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const fkeys2 = new Set(frontier.map((f) => `${f.combo.planId}::${f.combo.model}`));
    for (const p of px) {
      if (!fkeys2.has(`${p.combo.planId}::${p.combo.model}`)) continue;
      const label = metricFmt(dashX, p.x);
      const w = ctx.measureText(label).width;
      const right = p.px + (p.pr ?? 4) + 8;
      const left = right + w > W - PAD_R;
      ctx.textAlign = left ? "right" : "left";
      ctx.fillStyle = rgba(C.text, 0.95);
      ctx.fillText(label, left ? p.px - (p.pr ?? 4) - 8 : right, p.py - (p.pr ?? 4) - 5);
    }
    ctx.restore();
  }
  // Nichts ausgewählt? Dann den stärksten Punkt IM sichtbaren Bereich zeigen.
  // Punkte außerhalb der Skala (Perzentil-Cut) würden im Panel stehen, aber im
  // Plot unsichtbar sein.
  if (!dashSelected && px.length) {
    const inView = px.filter((p) => p.px >= PAD_L && p.px <= PAD_L + plotW && p.py >= PAD_T && p.py <= H - PAD_B);
    const pool = inView.length ? inView : px;
    const cand = frontier.length
      ? pool.filter((p) => frontier.some((f) => f.combo.planId === p.combo.planId && f.combo.model === p.combo.model))
      : [];
    const use = cand.length ? cand : pool;
    let best = use[0];
    for (const p of use) if ((p.y ?? -Infinity) > (best.y ?? -Infinity)) best = p;
    dashSelected = `${best.combo.planId}::${best.combo.model}`;
    showDashDetail(best);
  }
  // Auswahl: Ring + Label-Chip. Verbindet Chart und Detailspalte sichtbar.
  if (dashSelected) {
    const sel = px.find((p) => `${p.combo.planId}::${p.combo.model}` === dashSelected);
    if (sel) {
      const r = (sel.pr ?? 6) + 4.5;
      ctx.save();
      ctx.beginPath(); ctx.arc(sel.px, sel.py, r + 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(cssVar("--surface", "#101721"), 0.95); ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(sel.px, sel.py, r, 0, Math.PI * 2);
      ctx.strokeStyle = C.primary; ctx.lineWidth = 2; ctx.stroke();
      const raw = String(sel.combo.model);
      const label = raw.length > 22 ? raw.slice(0, 21) + "…" : raw;
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      const bw = ctx.measureText(label).width + 16, bh = 20;
      // Oben am Rand: Label unter den Punkt legen, damit es nicht die Achse trifft
      const below = sel.py < PAD_T + 34;
      let bx = sel.px + r + 10, by = below ? sel.py + r + 8 : sel.py - bh / 2;
      if (bx + bw > W - PAD_R - 2) bx = sel.px - r - 10 - bw;
      bx = Math.max(PAD_L + 8, Math.min(bx, W - PAD_R - bw - 2));
      by = Math.max(PAD_T + 2, Math.min(by, H - PAD_B - bh - 2));
      roundRectPath(bx, by, bw, bh, 6);
      ctx.fillStyle = cssVar("--surface", "#101721"); ctx.fill();
      ctx.strokeStyle = rgba(C.primary, 0.4); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.primary; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(label, bx + 8, by + bh / 2 + 0.5);
      ctx.restore();
    } else dashSelected = null;
  }
  ctx.restore(); // Clip der Zeichenfläche aufheben
  // Crosshair auf dem Punkt unter dem Zeiger: macht Werte ablesbar
  if (dashHover) {
    const h = px.find((p) => `${p.combo.planId}::${p.combo.model}` === dashHover);
    if (h) {
      ctx.save();
      ctx.strokeStyle = rgba(C.crosshair, 0.55); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(h.px, PAD_T); ctx.lineTo(h.px, H - PAD_B); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD_L, h.py); ctx.lineTo(W - PAD_R, h.py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(h.px, h.py, (h.pr ?? 4) + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  // Zoom-Auswahl (Ziehen)
  if (dashBrush) {
    ctx.save();
    ctx.fillStyle = rgba(C.accent, 0.12);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1;
    const bx = Math.min(dashBrush.x0, dashBrush.x1), by = Math.min(dashBrush.y0, dashBrush.y1);
    const bw = Math.abs(dashBrush.x1 - dashBrush.x0), bh = Math.abs(dashBrush.y1 - dashBrush.y0);
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();
  }
  // Werkbank-Kennzahlen im Rail füllen: was gerade wirklich im Bild ist
  // (im leichten Pfad unverändert: Zahlen und Shortlist bleiben stehen)
  if (!light) {
  const rp = $("#rail-points");
  if (rp) rp.textContent = fmtNum(px.length);
  const rpar = $("#rail-pareto");
  if (rpar) rpar.textContent = fmtNum(frontier.length);
  const rb = $("#rail-best");
  if (rb) {
    let best = null;
    for (const p of px) if (best === null || p.x > best.x) best = p;
    rb.textContent = best ? metricFmt(dashX, best.x) : "-";
  }
  const rm = $("#rail-median");
  if (rm) rm.textContent = ySorted.length ? metricFmt(dashY, quantile(ySorted, 0.5)) : "-";
  renderShortlist(px);
  }
  // Plot-Rechteck merken: Zoom und Crosshair rechnen damit
  dashPlotBox = { l: PAD_L, t: PAD_T, w: plotW, h: plotH, w0: W, h0: H };
  dashAxisX = [xMin, xMax];
  dashAxisY = [yMin, yMax];
  // Zustand nach aussen geben: das Chart ist Canvas und sonst nicht prüfbar
  window.__dashState = { axisX: dashAxisX, axisY: dashAxisY, zoom: dashZoom, points: px.length };
  const rbBtn = $("#dash-reset-btn");
  if (rbBtn) rbBtn.hidden = !dashZoom;
  dashPoints = px;
  dashCache = { points, frontier };
  if (note && !light) {
    if (dashPareto && frontier.length === 1 && points.length > 1) {
      // Genau 1 Pareto-Punkt: dieser Plan dominiert alle anderen auf beiden Achsen.
      note.textContent = lang === "de"
        ? `1 Pareto-Punkt: dieser Plan dominiert alle anderen (${points.length} Kombinationen im Plot)`
        : `1 Pareto point: this plan dominates all others (${points.length} combinations plotted)`;
    } else {
      note.textContent = `${points.length} ${lang === "de" ? "Kombinationen im Plot" : "combinations plotted"} · ${frontier.length} ${lang === "de" ? "Pareto-Punkte" : "Pareto points"}`;
    }
  }
}

// Shortlist im Detail-Rail: die stärksten Punkte der aktuellen Ansicht
function renderShortlist(pts) {
  const host = $("#sl-list");
  if (!host) return;
  // Titel trägt die Einheit, sonst stehen nackte Zahlen ohne Bezug da
  const title = $(".sl-title");
  if (title) title.textContent = `${t("dash.shortlist")} · ${metricLabel(dashX)}`;
  const top = [...pts].sort((a, b) => b.x - a.x).slice(0, 5);
  if (!top.length) { host.innerHTML = ""; return; }
  // Alle eingesetzten Werte sind escaped: Plan- und Modellnamen kommen aus den Daten.
  host.innerHTML = top.map((p, i) => {
    const key = `${p.combo.planId}::${p.combo.model}`;
    return `<button type="button" class="sl-item" data-key="${escapeHtml(key)}" title="${escapeHtml(p.combo.planName + " · " + p.combo.model)}">`
      + `<span class="sl-rank">${i + 1}</span>`
      + `<span class="sl-name">${escapeHtml(p.combo.planName)} · ${escapeHtml(p.combo.model)}</span>`
      + `<span class="sl-val">${escapeHtml(metricFmt(dashX, p.x))}</span></button>`;
  }).join("");
  host.querySelectorAll(".sl-item").forEach((b) => b.addEventListener("click", () => {
    const p = dashPoints.find((x) => `${x.combo.planId}::${x.combo.model}` === b.dataset.key);
    if (!p) return;
    dashSelected = b.dataset.key;
    showDashDetail(p);
    renderDashboard(true);
  }));
}

// Klick auf Punkt, Detail-Panel mit Plan/Modell/Werten füllen
function showDashDetail(p) {
  const content = $("#dash-detail-content");
  const empty = $("#dash-detail-empty");
  if (!content) return;
  if (!p) { content.hidden = true; if (empty) empty.style.display = ""; return; }
  if (empty) empty.style.display = "none";
  content.hidden = false;
  const priv = comboAttributes(p.combo).map((a) => `<span class="attr attr-${a.tone}" title="${escapeHtml(a.tip)}">${escapeHtml(a.label)}</span>`).join("");
  // Keine doppelten Zeilen: Was schon als Achse oben steht, unten nicht wiederholen
  const rows = [
    `<div class="dd-row"><span class="k">${metricLabel(dashX)}</span><span class="v">${metricFmt(dashX, p.x)}</span></div>`,
    `<div class="dd-row"><span class="k">${metricLabel(dashY)}</span><span class="v">${metricFmt(dashY, p.y)}</span></div>`,
  ];
  if (dashY !== "score") rows.push(`<div class="dd-row"><span class="k">AI ${lang === "de" ? "Score" : "score"}</span><span class="v">${p.combo.score !== null ? p.combo.score.toFixed(1) : "-"}</span></div>`);
  rows.push(`<div class="dd-row"><span class="k">${t("plans.th.price")}</span><span class="v">${p.combo.price !== null ? fmtPrice(p.combo.price) : "-"}${p.combo.priceNote ? ` · ${escapeHtml(p.combo.priceNote)}` : ""}</span></div>`);
  if (dashX !== "tokens") rows.push(`<div class="dd-row"><span class="k">${rateTokensLabel()}</span><span class="v">${fmtTokens(p.combo.tokensPer)}</span></div>`);
  rows.push(`<div class="dd-row"><span class="k">${t("plans.th.rawtokens")}</span><span class="v">${fmtTokens(p.combo.rawTokensPerMonth)}</span></div>`);
  if (p.combo.planNote) rows.push(`<div class="dd-note">${escapeHtml(p.combo.planNote)}</div>`);
  content.innerHTML = `
    <div class="dd-name">${escapeHtml(p.combo.model)}</div>
    <div class="dd-plan">${escapeHtml(p.combo.planName)} · ${escapeHtml(p.combo.provider)}</div>
    ${rows.join("")}
    ${priv ? `<div class="dd-badges">${priv}</div>` : ""}
    <div class="dd-foot">
      <button class="btn" id="dd-method" type="button">${t("dd.method")}</button>
    </div>
  `;
  const mBtn = document.getElementById("dd-method");
  if (mBtn) mBtn.addEventListener("click", () => showView("method"));
  // Kein automatisches Scrollen zum Detail-Panel: das hat die Seite beim Laden
  // von selbst nach unten gezogen. Wer das Panel sehen will, scrollt selbst.
}

// Detail-Panel neu aufbauen, wenn Sprache oder Währung wechseln.
// renderDashboard() läuft auch beim Hovern und darf das Panel nicht anfassen,
// deshalb hängt das Refresh an renderAll() (Sprache, Währung, Filter).
function refreshDashDetail() {
  if (!dashSelected) return;
  const p = (dashPoints || []).find((x) => `${x.combo.planId}::${x.combo.model}` === dashSelected);
  if (p) showDashDetail(p);
}

// Tooltip + Auswahl auf Canvas (Hover, Klick, Touch mit Hit-Test)
function bindDashTooltip() {
  const canvas = $("#dash-canvas");
  const tip = document.getElementById("dash-tooltip") || (() => { const d = document.createElement("div"); d.id = "dash-tooltip"; d.className = "dash-tooltip"; document.body.appendChild(d); return d; })();
  if (!canvas) return;
  const pick = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    let bestP = null, bestD = 30; // Treffer-Radius in CSS-Pixeln
    for (const p of dashPoints) {
      const d = Math.hypot(p.px - x, p.py - y);
      if (d < bestD) { bestD = d; bestP = p; }
    }
    return bestP;
  };
  const showTip = (p, clientX, clientY) => {
    tip.style.display = "block";
    // Karte mit Titel, Untertitel und Wertzeilen statt einer Textzeile
    tip.innerHTML = `<div class="tt-title">${escapeHtml(p.combo.model)}</div>`
      + `<div class="tt-sub">${escapeHtml(p.combo.planName)} · ${escapeHtml(p.combo.provider)}</div>`
      + `<div class="tt-row"><span class="k">${escapeHtml(metricLabel(dashX))}</span><span>${escapeHtml(metricFmt(dashX, p.x))}</span></div>`
      + `<div class="tt-row"><span class="k">${escapeHtml(metricLabel(dashY))}</span><span>${escapeHtml(metricFmt(dashY, p.y))}</span></div>`
      + (p.combo.price !== null ? `<div class="tt-row"><span class="k">${escapeHtml(t("plans.th.price"))}</span><span>${escapeHtml(fmtPrice(p.combo.price))}</span></div>` : "");
    const r = tip.getBoundingClientRect();
    // Nicht aus dem Fenster laufen lassen
    let x = clientX + 14, y = clientY + 14;
    if (x + r.width > window.innerWidth - 8) x = clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = clientY - r.height - 14;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  };
  const select = (p) => {
    if (!p) return;
    dashSelected = `${p.combo.planId}::${p.combo.model}`;
    showDashDetail(p);
    renderDashboard(true); // nur den Ring neu zeichnen
  };
  // Crosshair nur neu zeichnen, wenn sich der Punkt ändert (rAF-gebremst)
  let hoverRaf = null;
  const setHover = (p) => {
    const key = p ? `${p.combo.planId}::${p.combo.model}` : null;
    if (key === dashHover) return;
    dashHover = key;
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => { hoverRaf = null; renderDashboard(true); });
  };
  // Tastatur: mit den Pfeiltasten von Punkt zu Punkt, Enter oeffnet die Zahlen (2.1.1)
  let kbdPoint = null;
  const kbdAnnounce = (p) => {
    const el = document.getElementById("chart-status");
    if (el) el.textContent = `${p.combo.model}, ${p.combo.planName}: ${metricLabel(dashX)} ${metricFmt(dashX, p.x)}, ${metricLabel(dashY)} ${metricFmt(dashY, p.y)}`;
  };
  const moveTo = (dx, dy) => {
    if (!dashPoints.length) return;
    const cur = kbdPoint || dashPoints.reduce((a, b) => (b.y > a.y ? b : a));
    let best = null, bestScore = Infinity;
    for (const p of dashPoints) {
      const vx = p.px - cur.px, vy = p.py - cur.py;
      const dot = vx * dx + vy * dy;
      if (dot <= 1) continue; // nur in Blickrichtung
      const score = Math.hypot(vx, vy) - dot * 0.35; // nah und geradlinig bevorzugt
      if (score < bestScore) { bestScore = score; best = p; }
    }
    if (!best) return;
    kbdPoint = best;
    dashSelected = `${best.combo.planId}::${best.combo.model}`;
    showDashDetail(best);
    const r = canvas.getBoundingClientRect();
    showTip(best, r.left + best.px, r.top + best.py);
    setHover(best);
    renderDashboard(true);
    kbdAnnounce(best);
  };
  canvas.addEventListener("keydown", (e) => {
    const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[e.key]) { e.preventDefault(); moveTo(dirs[e.key][0], dirs[e.key][1]); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (kbdPoint) select(kbdPoint); return; }
    if (e.key === "Escape") {
      kbdPoint = null; dashSelected = null; tip.style.display = "none";
      setHover(null); showDashDetail(null); renderDashboard(true);
    }
    // Zoom per Tastatur: + / - / 0
    if (e.key === "+" || e.key === "=") { e.preventDefault(); zoomByFactor(0.6); return; }
    if (e.key === "-" || e.key === "_") { e.preventDefault(); zoomByFactor(1 / 0.6); return; }
    if (e.key === "0") { e.preventDefault(); resetZoom(); return; }
  });
  canvas.addEventListener("blur", () => { kbdPoint = null; tip.style.display = "none"; setHover(null); });
  canvas.addEventListener("mousemove", (e) => {
    if (e.pointerType === "touch") return;
    if (dashBrush || dashPanning) return; // während Zoom/Pan keine Tooltips
    const p = pick(e.clientX, e.clientY);
    setHover(p);
    if (p) showTip(p, e.clientX, e.clientY);
    else tip.style.display = "none";
  });
  canvas.addEventListener("mouseleave", () => { tip.style.display = "none"; setHover(null); });

  // Zoom: Ziehen verschiebt (Live-Pan), Rad/Pinch zoomt, Shift+Ziehen die Auswahl
  canvas.addEventListener("click", (e) => {
    if (dashPanning || dashBrush) return; // nach einer Geste nicht auswählen
    tip.style.display = "none";
    select(pick(e.clientX, e.clientY));
  });
  // Touch: Antippen wählt direkt (kein Hover auf Mobile). Zwei Finger sind Zoom/Pan.
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const p = pick(t.clientX, t.clientY);
    if (p) { e.preventDefault(); tip.style.display = "none"; select(p); }
  }, { passive: false });
}

// Live-Zoom und Live-Pan auf dem Chart.
// Die Gesten liefert d3-zoom (Mausrad, Ziehen, Zwei-Finger-Pinch); pro Geste wird
// das Achsenfenster in Datenkoordinaten umgerechnet, damit auch Log-Achsen stimmen.
// Shift+Ziehen bleibt die Rechteck-Auswahl, Doppelklick setzt zurück.
function bindDashZoom() {
  const canvas = $("#dash-canvas");
  if (!canvas) return;
  const inv = (a, t, log) => (log ? Math.exp(Math.log(a[0]) + t * (Math.log(a[1]) - Math.log(a[0]))) : a[0] + t * (a[1] - a[0]));
  let frame = null;
  const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = null; renderDashboard(true); }); };

  // Rechteck-Auswahl: grobe Sprünge mit der Maus
  const applyBrush = (b) => {
    const box = dashPlotBox, xa = dashAxisX, ya = dashAxisY;
    if (!box || !xa || !ya) return;
    const r = canvas.getBoundingClientRect();
    const nx0 = Math.min(b.x0, b.x1) - r.left, nx1 = Math.max(b.x0, b.x1) - r.left;
    const ny0 = Math.min(b.y0, b.y1) - r.top, ny1 = Math.max(b.y0, b.y1) - r.top;
    if (nx1 - nx0 < 12 || ny1 - ny0 < 12) return; // Mini-Zieher ignorieren
    const fr = (v, l, w) => Math.min(1, Math.max(0, (v - l) / w));
    dashZoom = {
      x0: inv(xa, fr(nx0, box.l, box.w), isLogX()), x1: inv(xa, fr(nx1, box.l, box.w), isLogX()),
      y0: inv(ya, 1 - fr(ny1, box.t, box.h), isLogY()), y1: inv(ya, 1 - fr(ny0, box.t, box.h), isLogY()),
    };
    dashSelected = null;
    renderDashboard(true);
  };

  if (window.d3zoom) {
    let base = null;
    const zoom = window.d3zoom.zoom()
      // Nur gegen Entartung begrenzt: frei navigieren ist gewollt, Reset holt zurück
      .scaleExtent([0.2, 500])
      // Ein Finger bleibt Seiten-Scroll, zwei Finger zoomen, Shift+Ziehen ist Auswahl
      .filter((ev) => {
        if (ev.type === "touchstart") return ev.touches.length >= 2;
        if (ev.type === "wheel") return true;
        return ev.button === 0 && !ev.shiftKey;
      })
      .clickDistance(4)
      // Touch nicht von der Feature-Erkennung abhängig machen: ohne Touch
      // (Maus-Geräte) passiert nichts, mit Touch greift Pinch/Zwei-Finger-Pan.
      .touchable(true)
      .on("start", () => {
        if (!dashAxisX || !dashAxisY || !dashPlotBox) return;
        base = { x: dashAxisX.slice(), y: dashAxisY.slice(), logX: isLogX(), logY: isLogY(), box: { ...dashPlotBox } };
        dashPanning = true;
        const tipEl = document.getElementById("dash-tooltip"); if (tipEl) tipEl.style.display = "none";
        canvas.style.cursor = "grabbing";
      })
      .on("zoom", (ev) => {
        if (!base) return;
        const tr = ev.transform, b = base.box;
        // d3 rechnet im Canvas-Raum (auch die Ränder), die Achsen aber im
        // Plot-Rechteck. Deshalb erst die Kanten des Rechtecks transformieren
        // und daraus den sichtbaren Bruchteil [0,1] je Achse bestimmen: sonst
        // schiebt jeder Pan zusätzlich die Ränder ins Bild und zoomt langsam raus.
        const cx = (b.l * (tr.k - 1) + tr.x) / b.w;
        const cy = (b.t * (tr.k - 1) + tr.y) / b.h;
        const f0x = -cx / tr.k, f1x = (1 - cx) / tr.k;
        const fx0 = 1 - (1 - cy) / tr.k, fx1 = 1 + cy / tr.k; // y: 0 = unten
        dashZoom = {
          x0: inv(base.x, f0x, base.logX),
          x1: inv(base.x, f1x, base.logX),
          y0: inv(base.y, fx0, base.logY),
          y1: inv(base.y, fx1, base.logY),
        };
        queue();
      })
      .on("end", () => {
        dashPanning = false;
        canvas.style.cursor = "";
        base = null;
        // Internen Transform zurücksetzen: die nächste Geste startet relativ zum
        // aktuellen Ausschnitt, sonst summieren sich Gesten still auf.
        window.d3zoom.select(canvas).property("__zoom", window.d3zoom.zoomIdentity);
      });
    window.d3zoom.select(canvas).call(zoom);
    window.d3zoom.select(canvas).on("dblclick.zoom", null); // eigener Reset unten
  }

  // Shift+Ziehen: Rechteck aufziehen
  let brush = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!e.shiftKey || e.pointerType === "touch") return;
    brush = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
    dashBrush = brush;
  });
  window.addEventListener("pointermove", (e) => {
    if (!brush) return;
    brush.x1 = e.clientX; brush.y1 = e.clientY;
    queue();
  });
  window.addEventListener("pointerup", () => {
    if (!brush) return;
    const b = brush; brush = null; dashBrush = null;
    applyBrush(b);
  });

  canvas.addEventListener("dblclick", () => resetZoom());

  const zin = $("#dash-zoom-in"), zout = $("#dash-zoom-out");
  if (zin) zin.addEventListener("click", () => zoomByFactor(0.6));
  if (zout) zout.addEventListener("click", () => zoomByFactor(1 / 0.6));
}

// Dashboard-Controls initialisieren
function initDashboard() {
  const xSel = $("#dash-x"), ySel = $("#dash-y");
  if (xSel) { xSel.value = dashX; xSel.addEventListener("change", (e) => { dashX = e.target.value; syncViewUrl(); renderDashboard(); }); }
  if (ySel) { ySel.value = dashY; ySel.addEventListener("change", (e) => { dashY = e.target.value; syncViewUrl(); renderDashboard(); }); }
  const logX = $("#dash-logx");
  if (logX) { logX.checked = dashLogX; logX.addEventListener("change", (e) => { dashLogX = e.target.checked; renderDashboard(); }); }
  const pSel = $("#dash-pareto");
  if (pSel) pSel.addEventListener("change", (e) => { dashPareto = e.target.checked; renderDashboard(); });
  const gSel = $("#dash-green");
  // Schwellenfelder sind erst mit der Zielzone bedienbar: ein Feld, das "auto"
  // zeigt und nichts tut, liest sich wie ein unfertiger Zustand.
  const syncTargetInputs = () => {
    for (const el of [tx, ty]) {
      if (!el) continue;
      el.disabled = !dashGreen;
      el.placeholder = dashGreen ? (el === tx ? "min X" : "min Y") : "auto";
    }
  };
  if (gSel) { gSel.checked = dashGreen; gSel.addEventListener("change", (e) => { dashGreen = e.target.checked; syncTargetInputs(); renderDashboard(); }); }
  // Ziel-Schwellen (Green Target)
  const tx = $("#dash-target-x"), ty = $("#dash-target-y");
  if (tx) tx.addEventListener("input", (e) => { dashTargetX = e.target.value === "" ? null : parseFloat(e.target.value); renderDashboard(); });
  if (ty) ty.addEventListener("input", (e) => { dashTargetY = e.target.value === "" ? null : parseFloat(e.target.value); renderDashboard(); });
  syncTargetInputs();
  // Leerer Plot oder Zoom: je nach Zustand Zoom oder Filter zurücksetzen
  const rb = $("#dash-reset-btn");
  if (rb) rb.addEventListener("click", () => {
    if (dashZoom) { resetZoom(); return; }
    resetAllFilters();
  });
  bindDashZoom();
  bindDashTooltip();
}

// Alle Listen-Filter auf Anfang (für den Reset-Button am leeren Plot)
function resetAllFilters() {
  plansSearch = ""; plansMeter = ""; maxBudget = 300; minAiScore = 0; attrFilter.clear();
  const ps = $("#plans-search"); if (ps) ps.value = "";
  const pm = $("#plans-meter-filter"); if (pm) pm.value = "";
  syncFilterUI();
  rerender();
}

// Ansicht in der URL teilen: Achsen + Rechner (Filter bleiben lokal)
function syncViewUrl() {
  try {
    const p = new URLSearchParams(location.search);
    p.set("lang", lang);
    p.set("dx", dashX); p.set("dy", dashY);
    p.set("budget", String(calcBudget)); p.set("score", String(calcScore));
    history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
  } catch (e) { /* ignore */ }
}

/* ============ BUDGET-RECHNER (kein Stacking: ein Abo pro Konto) ============ */
// Vergleicht EINZELPLÄNE innerhalb des Budgets: pro Plan das beste Modell
// (meiste Tokens/Monat), sortiert nach Tokens/Monat. Budget in gewählter Währung.
let calcBudget = 20;
let calcScore = 0;
// Neutraler Rang je Plan im aktuellen Rechner-Ergebnis (grau, keine Empfehlung)
let calcRanks = new Map();
function renderCalculator() {
  resetNoteMarks(); // eigener Durchlauf: der Marker darf hier nicht fehlen
  const list = $("#calc-results");
  const empty = $("#calc-empty");
  if (!list || !data) return;
  const rate = exchangeRates[currency] ?? 1;
  const budgetUsd = calcBudget / rate;
  let combos = buildCombos().filter((c) => c.price != null && c.price <= budgetUsd + 1e-9);
  if (calcScore > 0) combos = combos.filter((c) => (c.score ?? 0) >= calcScore);
  if (!includePriceBased) combos = combos.filter((c) => c.dataTier !== "D");
  // Ohne API-Zugang sind die Token-Raten nicht vergleichbar , gleiche Logik wie Tier D
  if (!includeNoApi) combos = combos.filter((c) => !isNoApi(c));
  if (!includeTraining) combos = combos.filter((c) => c.noTraining !== false);
  // Pro Plan nur das beste Modell (Tokens/Monat), dann Top 5
  const best = new Map();
  for (const c of combos) {
    const cur = best.get(c.planId);
    if (!cur || (c.rawTokensPerMonth ?? 0) > (cur.rawTokensPerMonth ?? 0)) best.set(c.planId, c);
  }
  const top = [...best.values()]
    .filter((c) => c.rawTokensPerMonth != null)
    .sort((a, b) => b.rawTokensPerMonth - a.rawTokensPerMonth)
    .slice(0, 5);
  // Ränge für die neutrale Markierung in der Tabelle (keine Empfehlung, nur Rang)
  calcRanks = new Map(top.map((c, i) => [c.planId, i + 1]));
  const curOut = $("#calc-cur");
  if (curOut) curOut.textContent = curSym();
  const scoreOut = $("#calc-score-out");
  // Der Regler muss seinen aktuellen Wert zeigen, sonst bleibt der Filter blind
  if (scoreOut) scoreOut.textContent = calcScore === 0 ? t("calc.all") : "\u2265 " + calcScore;
  if (!top.length) {
    list.innerHTML = "";
    calcRanks = new Map();
    renderPlans();
    if (empty) { empty.hidden = false; empty.textContent = t("calc.empty"); }
    return;
  }
  if (empty) empty.hidden = true;
  // Neutrale Liste (sortiert, kein Sieger-Podest): Zahlen, keine Beratung
  list.innerHTML = top.map((c, i) => {
    const left = budgetUsd - c.price;
    return `<div class="calc-row">`
      + `<div class="calc-main"><span class="calc-ranknum">${i + 1}</span><span class="calc-plan">${escapeHtml(c.planName)}${noteMark(c)}${i === 0 ? "" : ""}<span class="calc-model">${escapeHtml(c.model)}${c.score != null ? ` <span class="calc-score">${c.scoreFallback ? "~" : ""}${c.score.toFixed(1)}</span>` : ""}</span></span></div>`
      + `<div class="calc-nums"><span class="num strong">${fmtTokens(c.rawTokensPerMonth)}</span></div>`
      + `<div class="calc-nums"><span class="num strong">${fmtPrice(c.price)}</span>`
      + `<span class="sub">${fmtPrice(Math.max(0, left))} ${t("calc.leftover")}</span></div>`
      + `</div>`;
  }).join("");
}
function initCalculator() {
  const b = $("#calc-budget");
  if (b) {
    b.value = calcBudget;
    b.addEventListener("input", (e) => {
      calcBudget = Math.max(0, parseFloat(e.target.value) || 0);
      syncViewUrl();
      renderCalculator();
    });
  }
  const s = $("#calc-score");
  if (s) {
    s.value = calcScore;
    s.addEventListener("input", (e) => {
      calcScore = parseInt(e.target.value, 10) || 0;
      syncViewUrl();
      renderCalculator();
    });
  }
}

/* =========================================================================
   Additional UIs: Compare Showdown, Workload Sizer, Data Sync Hub
   ========================================================================= */
let comparePlanIds = ["cursor-pro", "claude-pro", "copilot-pro", "opencode-go"];

function renderCompareView() {
  const host = $("#compare-cards-host");
  if (!host || !data) return;

  // Initialize selectors if needed
  [0, 1, 2, 3].forEach((colIdx) => {
    const sel = $(`#compare-select-${colIdx}`);
    if (sel && sel.options.length === 0) {
      sel.innerHTML = data.plans.map((p) => {
        const pr = p.price?.monthlyUsd !== null && p.price?.monthlyUsd !== undefined ? fmtPrice(p.price.monthlyUsd) : "-";
        return `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.provider)}) · ${pr}</option>`;
      }).join("");

      if (comparePlanIds[colIdx]) {
        sel.value = comparePlanIds[colIdx];
      }
      sel.addEventListener("change", (e) => {
        comparePlanIds[colIdx] = e.target.value;
        renderCompareView();
      });
    } else if (sel && comparePlanIds[colIdx]) {
      sel.value = comparePlanIds[colIdx];
    }
  });

  // Calculate highest tokens per dollar among selected
  const activePlans = comparePlanIds.map(id => data.plans.find(p => p.id === id)).filter(Boolean);
  
  let maxRate = 0;
  activePlans.forEach(p => {
    const bm = p.modelRows?.[0];
    const pat = bm?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
    const tokPerReq = pat.input + pat.cachedRead + pat.output;
    const rate = (bm?.normalizedPer1 ?? 0) * tokPerReq;
    if (rate > maxRate) maxRate = rate;
  });

  host.innerHTML = activePlans.map((plan) => {
    const bm = plan.modelRows?.[0];
    const pat = bm?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
    const tokPerReq = pat.input + pat.cachedRead + pat.output;
    const rate = (bm?.normalizedPer1 ?? 0) * tokPerReq;
    const isLeader = rate > 0 && rate === maxRate;
    const windowCap = plan.windowCaps?.[0];
    const priceDisplay = plan.price?.monthlyUsd !== null && plan.price?.monthlyUsd !== undefined ? fmtPrice(plan.price.monthlyUsd) : "-";

    return `
      <div class="compare-card ${isLeader ? 'leader' : ''}">
        <div class="compare-card-head">
          <div style="font-family: var(--pv-mono); font-size: var(--fs-xs); color: var(--text-3); text-transform: uppercase;">${escapeHtml(plan.provider)}</div>
          <h3 style="font-size: var(--fs-base); font-weight: 700; margin-top: 4px; color: var(--text);">${escapeHtml(plan.name)}</h3>
          <div style="margin-top: 10px; display: flex; align-items: baseline; gap: 8px;">
            <span style="font-family: var(--pv-mono); font-size: var(--fs-xl); font-weight: 800; color: var(--text);">${priceDisplay}</span>
            <span style="font-size: var(--fs-xs); color: var(--text-3);">${escapeHtml(plan.price?.billingNote || "per month")}</span>
          </div>
          ${isLeader ? `<div style="margin-top: 8px; font-family: var(--pv-mono); font-size: var(--fs-xs); color: var(--accent); background: var(--accent-soft); border: 1px solid var(--accent); padding: 2px 8px; border-radius: var(--radius-sm); text-align: center;">Leader: Highest Token Yield / $1</div>` : ''}
        </div>
        <div class="compare-card-body">
          <div class="compare-section">
            <span class="compare-kicker">Token Economics</span>
            <div class="compare-row"><span class="k">Tokens / $1:</span><span class="v highlight">${fmtTokens(rate)}</span></div>
            <div class="compare-row"><span class="k">Requests / $1:</span><span class="v">${bm?.normalizedPer1 ? bm.normalizedPer1.toFixed(1) + " req" : "—"}</span></div>
            <div class="compare-row"><span class="k">Monthly tokens:</span><span class="v">${fmtTokens(bm?.rawTokensPerMonth)}</span></div>
          </div>
          <div class="compare-section">
            <span class="compare-kicker">Throughput & Limits</span>
            <div class="compare-row"><span class="k">Meter:</span><span class="v" style="text-transform: capitalize;">${escapeHtml((plan.meter || "").replace("_", " "))}</span></div>
            <div class="compare-row"><span class="k">5h Window:</span><span class="v" style="color: ${windowCap ? 'var(--warn)' : 'var(--text-3)'};">${windowCap ? escapeHtml(windowCap.amount + " " + windowCap.unit + " / " + windowCap.window) : "No 5h cap reported"}</span></div>
          </div>
          <div class="compare-section">
            <span class="compare-kicker">Strongest Model</span>
            <div style="font-weight: 600; color: var(--text); font-size: var(--fs-sm);">${escapeHtml(bm?.model || "—")}</div>
            <div class="compare-row"><span class="k">Cost / req:</span><span class="v">$${(bm?.costPerRequest ?? 0).toFixed(4)}</span></div>
            <div class="compare-row"><span class="k">Models in plan:</span><span class="v">${plan.modelRows?.length || 0}</span></div>
          </div>
          <div class="compare-section">
            <span class="compare-kicker">Data Retention & Policy</span>
            <div class="compare-row"><span class="k">Privacy tier:</span><span class="v" style="color: ${plan.dataTier === 'A' ? 'var(--accent)' : 'var(--warn)'};">Tier ${escapeHtml(plan.dataTier || "—")}</span></div>
            <p style="font-size: var(--fs-xs); color: var(--text-3); margin-top: 4px; line-height: 1.4;">${escapeHtml(plan.dataTierNote || (plan.dataTier === 'A' ? 'Zero retention, no training on user code.' : 'Standard provider retention terms.'))}</p>
          </div>
          <div style="margin-top: auto; padding-top: 10px;">
            <button type="button" class="btn" style="width: 100%; justify-content: center;" onclick="showView('plans'); plansSearch = '${escapeHtml(plan.name)}'; const ps = $('#plans-search'); if (ps) ps.value = '${escapeHtml(plan.name)}'; rerender();">
              Inspect in Plans Table →
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Workload Sizer State
let sizerDaily = 80;
let sizerPrompt = 1000;
let sizerCache = 85;
let sizerOutput = 162;
let sizerBudget = 30;

function renderSizerView() {
  const host = $("#sizer-results-host");
  if (!host || !data) return;

  const workingDays = 22;
  const monthlyReqs = sizerDaily * workingDays;
  const cachedTokens = 50000; // typical 50k context cached read
  const totalTokensPerReq = sizerPrompt + cachedTokens + sizerOutput;
  const monthlyTokensNeeded = monthlyReqs * totalTokensPerReq;

  const dVal = $("#sizer-daily-val"); if (dVal) dVal.textContent = sizerDaily + " req/day";
  const pVal = $("#sizer-prompt-val"); if (pVal) pVal.textContent = fmtNum(sizerPrompt) + " tok";
  const cVal = $("#sizer-cache-val"); if (cVal) cVal.textContent = sizerCache + "% (50k context)";
  const oVal = $("#sizer-output-val"); if (oVal) oVal.textContent = sizerOutput + " tok";
  const bVal = $("#sizer-budget-val"); if (bVal) bVal.textContent = "$" + sizerBudget + " / mo";

  const reqEl = $("#sizer-kpi-req"); if (reqEl) reqEl.textContent = fmtNum(monthlyReqs) + " requests";
  const tokEl = $("#sizer-kpi-tokens"); if (tokEl) tokEl.textContent = fmtTokens(monthlyTokensNeeded) + " tokens";

  // Evaluate matching plans within budget
  const rate = exchangeRates[currency] ?? 1;
  const budgetUsd = sizerBudget / rate;

  const matches = [];
  for (const plan of data.plans) {
    const priceUsd = plan.price?.monthlyUsd ?? 0;
    if (priceUsd > budgetUsd) continue;

    const bm = plan.modelRows?.[0];
    if (!bm) continue;

    const pat = bm.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
    const tokPerReq = pat.input + pat.cachedRead + pat.output;
    const tokensPerDollar = (bm.normalizedPer1 ?? 0) * tokPerReq;
    const planMonthlyTokens = bm.rawTokensPerMonth ?? (tokensPerDollar * (priceUsd || 1));

    if (planMonthlyTokens <= 0) continue;

    const headroomPercent = ((planMonthlyTokens - monthlyTokensNeeded) / monthlyTokensNeeded) * 100;
    const leftover = budgetUsd - priceUsd;

    // Check 5-hour window burst risk: assumes 40% of daily requests occur in peak 5-hour window
    const peak5hRequests = Math.round(sizerDaily * 0.4);
    const windowCap = plan.windowCaps?.[0];
    let burstRisk = false;
    if (windowCap && windowCap.unit === 'requests' && windowCap.amount < peak5hRequests) {
      burstRisk = true;
    }

    matches.push({
      plan,
      bm,
      priceUsd,
      planMonthlyTokens,
      headroomPercent,
      leftover,
      burstRisk,
    });
  }

  // Sort by headroom descending
  matches.sort((a, b) => {
    if (a.headroomPercent >= 0 && b.headroomPercent < 0) return -1;
    if (b.headroomPercent >= 0 && a.headroomPercent < 0) return 1;
    return b.headroomPercent - a.headroomPercent;
  });

  const countOut = $("#sizer-count-out");
  if (countOut) countOut.textContent = `${matches.length} plans within $${sizerBudget}/mo budget`;

  if (!matches.length) {
    host.innerHTML = `<div class="table-note" style="padding: 24px; text-align: center;">No plans in the catalog fit within $${sizerBudget}/mo. Increase your budget cap slider.</div>`;
    return;
  }

  host.innerHTML = matches.slice(0, 8).map((m, idx) => {
    const hasHeadroom = m.headroomPercent >= 0;
    const statusCls = hasHeadroom ? (m.headroomPercent > 30 ? 'headroom-good' : 'headroom-warn') : 'headroom-bad';
    const pctUsed = Math.min(100, Math.round((monthlyTokensNeeded / m.planMonthlyTokens) * 100));
    const priceDisplay = fmtPrice(m.priceUsd);

    return `
      <div class="sizer-card ${statusCls}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: var(--text); font-size: var(--fs-base);">${escapeHtml(m.plan.name)}</span>
              <span style="font-size: var(--fs-xs); color: var(--text-3); text-transform: uppercase;">${escapeHtml(m.plan.provider)}</span>
              ${idx === 0 && hasHeadroom ? `<span class="badge" style="background: var(--accent); color: var(--accent-ink); font-weight: 700; font-size: 10px; padding: 2px 6px;">TOP FIT</span>` : ''}
            </div>
            <div style="font-size: var(--fs-xs); color: var(--text-2); margin-top: 2px;">
              Model: <span style="color: var(--accent);">${escapeHtml(m.bm.model)}</span> · Allowance: ${fmtTokens(m.planMonthlyTokens)} tokens/mo
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--pv-mono); font-weight: 700; font-size: var(--fs-base); color: var(--text);">${priceDisplay}</div>
            <div style="font-size: var(--fs-xs); color: var(--text-3);">${m.leftover > 0 ? fmtPrice(m.leftover) + " leftover" : "at budget"}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-xs); font-family: var(--pv-mono); margin-top: 4px;">
          <span style="color: var(--text-3);">Quota consumption: ${pctUsed}%</span>
          <span style="font-weight: 600; color: ${hasHeadroom ? 'var(--accent)' : 'var(--danger)'};">
            ${hasHeadroom ? `+${m.headroomPercent.toFixed(0)}% headroom` : `${Math.abs(m.headroomPercent).toFixed(0)}% throttled`}
          </span>
        </div>

        <div class="sizer-meter-bar">
          <div class="sizer-meter-fill" style="width: ${pctUsed}%; background: ${hasHeadroom ? 'var(--accent)' : 'var(--danger)'};"></div>
        </div>

        ${m.burstRisk ? `
          <div style="font-size: var(--fs-xs); color: var(--warn); background: var(--warn-soft); padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--warn);">
            ⚠️ Burst Warning: Peak 5-hour demand (~${Math.round(sizerDaily * 0.4)} req) may reach rolling throttle cap.
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}

// Data Sync Hub
function renderSyncView() {
  if (!data) return;
  const dEl = $("#sync-status-date");
  if (dEl) dEl.textContent = new Date(data.generatedAt).toLocaleString();

  const pEl = $("#sync-status-plans");
  if (pEl) {
    const providers = new Set(data.plans.map(p => p.provider)).size;
    pEl.textContent = `${data.plans.length} plans · ${providers} providers`;
  }

  // Provider distribution
  const host = $("#sync-prov-host");
  if (host) {
    const counts = new Map();
    data.plans.forEach(p => counts.set(p.provider, (counts.get(p.provider) || 0) + 1));
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    host.innerHTML = sorted.map(([prov, cnt]) => `
      <div class="sync-prov-item">
        <span style="font-weight: 600; text-transform: capitalize; color: var(--text);">${escapeHtml(prov)}</span>
        <span style="font-family: var(--pv-mono); color: var(--accent);">${cnt} plans</span>
      </div>
    `).join("");
  }
}

// Tools & Providers Hub
let toolsFilterQuery = "";

function renderToolsView() {
  if (!data) return;
  const filter = (toolsFilterQuery || "").toLowerCase().trim();

  // 1. Providers / Tools Grid
  const host = $("#tools-grid-host");
  if (host) {
    const provCards = [];
    const providersList = [...KNOWN_PROVIDERS];

    for (const slug of providersList) {
      const plans = data.plans.filter(p => {
        const ps = providerSlug(p.provider) || p.provider.toLowerCase().replace(/\s+/g, "-");
        return ps === slug;
      });

      const provName = plans[0]?.provider || slug.replace(/-/g, " ");
      const planCount = plans.length;
      
      const modelsSet = new Set();
      let bestTokensPer = 0;
      let minPrice = Infinity;
      let maxPrice = 0;

      for (const p of plans) {
        const price = p.price?.monthlyUsd ?? (p.price?.currency === "CNY" ? p.price?.monthlyUsd : p.price?.paidPrice);
        if (typeof price === "number") {
          if (price < minPrice) minPrice = price;
          if (price > maxPrice) maxPrice = price;
        }
        for (const row of p.modelRows ?? []) {
          if (row.model) modelsSet.add(row.model);
          const tokPerReq = tokensPerRequest(row);
          const norm1 = row.normalizedPer1 ?? (row.normalizedPer10 != null ? row.normalizedPer10 / 10 : null);
          const rate = tokPerReq && norm1 ? tokPerReq * norm1 : 0;
          if (rate > bestTokensPer) bestTokensPer = rate;
        }
      }

      const searchTarget = `${slug} ${provName} ${[...modelsSet].join(" ")} ${plans.map(p => p.name).join(" ")}`.toLowerCase();
      if (filter && !searchTarget.includes(filter)) continue;

      const topModels = [...modelsSet].slice(0, 3);
      const priceText = minPrice < Infinity ? (minPrice === maxPrice ? fmtPrice(minPrice) : `${fmtPrice(minPrice)} – ${fmtPrice(maxPrice)}`) : "Listed in docs";
      const rateText = bestTokensPer > 0 ? `${fmtTokens(rateOf(bestTokensPer))} / ${curSym()}` : "Quota managed";
      const pageUrl = `providers/${encodeURIComponent(slug)}/`;

      provCards.push(`
        <div class="tool-card">
          <div>
            <div class="tool-card-head">
              <span class="plan-avatar" style="--av: ${planColor(provName, provName)}; width: 36px; height: 36px; font-size: 14px;">
                ${escapeHtml(planInitials(provName, provName))}
              </span>
              <div>
                <div class="tool-card-title">${escapeHtml(provName)}</div>
                <div class="tool-card-sub">${planCount} ${planCount === 1 ? "plan" : "plans"} tracked</div>
              </div>
            </div>

            <div class="tool-card-body" style="margin-top: 14px;">
              <div>
                <span style="color: var(--text-3); display: block; margin-bottom: 2px;">Key models:</span>
                <span style="color: var(--text);">${topModels.length > 0 ? escapeHtml(topModels.join(", ")) + (modelsSet.size > 3 ? ` +${modelsSet.size - 3}` : "") : "Proprietary agent"}</span>
              </div>
              <div class="tool-card-meta">
                <span style="color: var(--text-3);">Pricing:</span>
                <span style="font-weight: 600; color: var(--text);">${priceText}</span>
              </div>
              <div class="tool-card-meta">
                <span style="color: var(--text-3);">Top yield:</span>
                <span style="font-weight: 600; color: var(--accent);">${rateText}</span>
              </div>
            </div>
          </div>

          <div class="tool-card-foot">
            <a href="${pageUrl}" class="btn btn-primary" style="flex: 1; text-align: center; text-decoration: none; font-size: 11px;">
              Open ${escapeHtml(provName)} UI →
            </a>
          </div>
        </div>
      `);
    }

    host.innerHTML = provCards.length > 0 ? provCards.join("") : `<div class="empty-state" style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-3);">No tools match "${escapeHtml(toolsFilterQuery)}".</div>`;
  }

  // 2. 62 Standalone Plan Pages
  const pillsHost = $("#plan-pills-host");
  if (pillsHost) {
    const planPills = [];
    for (const planId of KNOWN_PLANS) {
      const planObj = data.plans.find(p => p.id === planId);
      const name = planObj ? planObj.name : planId.replace(/-/g, " ");
      const prov = planObj ? planObj.provider : "";
      const priceUsd = planObj?.price?.monthlyUsd ?? planObj?.price?.paidPrice;
      const priceStr = typeof priceUsd === "number" ? fmtPrice(priceUsd) : "";

      if (filter && !`${planId} ${name} ${prov}`.toLowerCase().includes(filter)) continue;

      planPills.push(`
        <a href="plans/${encodeURIComponent(planId)}/" class="plan-pill-item" title="Open standalone page for ${escapeHtml(name)}">
          <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
            <span style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(name)}</span>
            <span style="font-size: 10px; color: var(--text-3); text-transform: uppercase;">${escapeHtml(prov)}</span>
          </div>
          <span style="font-family: var(--pv-mono); font-size: 11px; color: var(--accent); white-space: nowrap; margin-left: 8px;">${priceStr || "View →"}</span>
        </a>
      `);
    }

    pillsHost.innerHTML = planPills.length > 0 ? planPills.join("") : `<div class="empty-state" style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-3);">No plan deep-dives match "${escapeHtml(toolsFilterQuery)}".</div>`;
  }
}

function initAdditionalViews() {
  // Presets
  const btnPro = $("#compare-preset-pro");
  if (btnPro) btnPro.addEventListener("click", () => {
    comparePlanIds = ["cursor-pro", "claude-pro", "copilot-pro", "opencode-go"];
    renderCompareView();
  });

  const btnMax = $("#compare-preset-max");
  if (btnMax) btnMax.addEventListener("click", () => {
    comparePlanIds = ["claude-max-20x", "command-code-goat", "devin-individual", "chatgpt-pro-codex-20x"];
    renderCompareView();
  });

  const btnBudget = $("#compare-preset-budget");
  if (btnBudget) btnBudget.addEventListener("click", () => {
    comparePlanIds = ["opencode-go", "glm-coding-plan-lite", "qwen-token-plan-100", "cursor-free"];
    renderCompareView();
  });

  // Export CSV
  const expBtn = $("#compare-export-csv");
  if (expBtn) expBtn.addEventListener("click", () => {
    if (!data) return;
    const active = comparePlanIds.map(id => data.plans.find(p => p.id === id)).filter(Boolean);
    const rows = [
      ["Plan", "Provider", "Price", "Top Model", "Cost/Req", "Tokens/$", "Monthly Tokens", "5h Cap", "Data Tier"],
      ...active.map(p => {
        const bm = p.modelRows?.[0];
        const pat = bm?.patternUsed || { input: 800, cachedRead: 50000, output: 162 };
        const tokPerReq = pat.input + pat.cachedRead + pat.output;
        const rate = (bm?.normalizedPer1 ?? 0) * tokPerReq;
        return [
          p.name,
          p.provider,
          p.price?.monthlyUsd ?? 0,
          bm?.model || "",
          bm?.costPerRequest || "",
          Math.round(rate),
          Math.round(bm?.rawTokensPerMonth || 0),
          p.windowCaps?.[0] ? `${p.windowCaps[0].amount} ${p.windowCaps[0].unit}/${p.windowCaps[0].window}` : "None",
          p.dataTier || ""
        ];
      })
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "coding_plans_comparison.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Sizer Sliders
  const bindSlider = (id, setter, render) => {
    const el = $(id);
    if (el) el.addEventListener("input", (e) => {
      setter(Number(e.target.value));
      render();
    });
  };

  bindSlider("#sizer-daily", v => sizerDaily = v, renderSizerView);
  bindSlider("#sizer-prompt", v => sizerPrompt = v, renderSizerView);
  bindSlider("#sizer-cache", v => sizerCache = v, renderSizerView);
  bindSlider("#sizer-output", v => sizerOutput = v, renderSizerView);
  bindSlider("#sizer-budget", v => sizerBudget = v, renderSizerView);

  // Tools Hub search filter
  const toolsInput = $("#tools-filter-input");
  if (toolsInput) {
    toolsInput.addEventListener("input", (e) => {
      toolsFilterQuery = e.target.value;
      renderToolsView();
    });
  }

  // Sync Live Button
  const syncBtn = $("#sync-trigger-btn");
  if (syncBtn) syncBtn.addEventListener("click", async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = "Syncing live from vibeplan.cc...";
    try {
      const resp = await fetch("https://vibeplan.cc/data/latest.json", { cache: "no-cache" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      data = await resp.json();
      try { localStorage.setItem("cpc-data", JSON.stringify({ at: data.generatedAt, data })); } catch (e) {}
      renderAll();
      toast("Successfully synced fresh data from vibeplan.cc!");
      syncBtn.textContent = "Sync Complete ✓";
      setTimeout(() => {
        syncBtn.disabled = false;
        syncBtn.textContent = "Sync Live from vibeplan.cc";
      }, 3000);
    } catch (err) {
      toast("Sync failed: " + err.message);
      syncBtn.disabled = false;
      syncBtn.textContent = "Retry Sync";
    }
  });
}

/* ============ TABS / VIEWS (eine Navigation, kein Scroll-Marathon) ============ */
let currentView = "overview";
const VIEW_ALIASES = {
  overview: "overview", stats: "overview", pareto: "overview",
  plans: "plans", models: "plans",
  tools: "tools", providers: "tools", tool: "tools", provider: "tools",
  compare: "compare", showdown: "compare",
  sizer: "sizer", workload: "sizer",
  calc: "calc",
  sync: "sync", ops: "sync",
  method: "method", faq: "method",
  changelog: "changelog",
  legal: "legal", privacy: "legal", imprint: "legal", disclaimer: "legal",
};
// Aktiven Tab in Sicht holen: auf schmalen Displays laeuft die Leiste ueber.
// Es wird NUR die Leiste gescrollt (scrollLeft), nie die Seite selbst: ein
// scrollIntoView hat beim Laden die ganze Seite nach unten gezogen.
function revealActiveTab() {
  const tab = document.querySelector(".tab.active");
  const bar = tab && tab.parentElement;
  if (!tab || !bar || bar.scrollWidth <= bar.clientWidth) return;
  const target = tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2;
  bar.scrollLeft = Math.max(0, target);
}

function showView(name) {
  const view = VIEW_ALIASES[name] || "overview";
  const apply = () => {
    currentView = view;
    $$(".view").forEach((el) => el.classList.toggle("active", el.id === `view-${view}`));
    $$(".tab").forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    // Chart braucht nach dem Sichtbarwerden seine Größe: neu rendern
    if (view === "overview") requestAnimationFrame(() => renderDashboard());
    if (view === "tools") renderToolsView();
    if (view === "compare") renderCompareView();
    if (view === "sizer") renderSizerView();
    if (view === "sync") renderSyncView();
    // Filter-Dock gilt fuer Uebersicht (Pareto) und Plaene, nicht fuer Methodik/Changelog/Rechner
    const dock = $("#filter-dock");
    if (dock) dock.hidden = !(view === "overview" || view === "plans");
    // Derselbe Filterblock wandert mit: im Graph sitzt er im Rail-Menue,
    // in der Listenansicht ueber der Tabelle.
    const railTrigger = $("#rail-trigger");
    if (railTrigger) {
      railTrigger.hidden = !(view === "overview" && railIsDrawer());
      if (railTrigger.hidden) closeRail();
    }
    const filters = $("#rail-filters");
    if (filters) {
      const host = view === "plans" ? $("#filters-host") : document.querySelector(".rail");
      if (host && filters.parentElement !== host) host.insertBefore(filters, host.firstChild);
      // Liste: aufgeklappt, weil dort das Filtern die Hauptarbeit ist
      filters.open = view === "plans" ? true : filtersOpenManual === true;
    }
    try { history.replaceState(null, "", `#${view}`); } catch (e) { /* ignore */ }
    window.scrollTo({ top: 0, behavior: "auto" });
    revealActiveTab();
  };
  // Kein document.startViewTransition: der Aufruf wirft beim schnellen Wechsel
  // "Transition was aborted" in die Konsole. Der Ansichtswechsel blendet per CSS
  // ein (siehe .view.active), das ist ruhig und fehlerfrei.
  apply();
}
function initTabs() {
  $$(".tab").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  initAdditionalViews();
  const more = $("#plans-more");
  if (more) more.addEventListener("click", () => { plansLimit += PAGE; renderPlans(); });
  const moreFam = $("#fcomp-more");
  if (moreFam) moreFam.addEventListener("click", () => { famLimit += FAM_PAGE; renderFamily(); });
  const legal = $("#open-legal");
  if (legal) legal.addEventListener("click", () => showView("legal"));
  const all = $("#top-open-plans");
  if (all) all.addEventListener("click", () => showView("plans"));
  // Alte Links/Fremd-Anker weiter unterstützen
  const fromHash = () => showView((location.hash || "").replace("#", "") || "overview");
  window.addEventListener("hashchange", fromHash);
  fromHash();
}

// (Best-value-Panel entfernt: der Scatter-Plot steht jetzt oben, der Link
//  "Alle Pläne" sitzt im Chart-Kopf. renderTop() ist stillgelegt.)

// ---------------- Mobile Filterspalte: Griff + Schublade ----------------
// Auf schmalen Displays wandert der Rail-Block an die Body-Ebene: `main` traegt
// view-transition-name und waere sonst der Containing Block fuer position: fixed
// (die Schublade erschiene unsichtbar unter dem Fold). Dort liegt er als linke
// Schublade hinter einem festen Griff, damit Filtern ohne Scrollen geht.
const RAIL_DRAWER_MQ = "(max-width: 900px)";
function railIsDrawer() {
  return !!(window.matchMedia && window.matchMedia(RAIL_DRAWER_MQ).matches);
}
// Trefferzahl der aktuellen Filter auf den Abschluss-Button spiegeln
function syncRailApplyCount() {
  const src = $("#plans-count");
  const dst = $("#rail-apply-count");
  if (!dst) return;
  const txt = src && src.textContent ? src.textContent.trim() : "";
  dst.textContent = txt;
}
function openRail() {
  const rail = $("#rail"), scrim = $("#rail-scrim"), trigger = $("#rail-trigger");
  if (!rail || !railIsDrawer()) return;
  syncRailApplyCount();
  rail.removeAttribute("inert");
  rail.classList.add("open");
  if (scrim) scrim.hidden = false;
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  document.body.classList.add("rail-open");
  const close = $("#rail-close");
  if (close) close.focus({ preventScroll: true });
}
function closeRail() {
  const rail = $("#rail"), scrim = $("#rail-scrim"), trigger = $("#rail-trigger");
  if (!rail) return;
  const wasOpen = rail.classList.contains("open");
  rail.classList.remove("open");
  if (railIsDrawer()) rail.setAttribute("inert", "");
  if (scrim) scrim.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  document.body.classList.remove("rail-open");
  if (wasOpen && trigger && railIsDrawer()) trigger.focus({ preventScroll: true });
}
// Rail zwischen Raster (Desktop) und Body-Ebene (Schublade) umhaengen
function placeRail() {
  const rail = $("#rail");
  if (!rail) return;
  const drawer = railIsDrawer();
  const wasDrawer = rail.dataset.drawer === "1";
  rail.dataset.drawer = drawer ? "1" : "0";
  const trigger = $("#rail-trigger");
  if (drawer) {
    if (rail.parentElement !== document.body) document.body.appendChild(rail);
    if (!wasDrawer) closeRail();
    if (trigger) trigger.hidden = false;
  } else {
    const wb = document.querySelector(".workbench");
    if (wb && rail.parentElement !== wb) wb.insertBefore(rail, wb.firstChild);
    closeRail();
    if (trigger) trigger.hidden = true;
  }
}
function initRailDrawer() {
  const rail = $("#rail"), trigger = $("#rail-trigger"), scrim = $("#rail-scrim");
  if (!rail || !trigger) return;
  placeRail();
  trigger.addEventListener("click", () => {
    if (rail.classList.contains("open")) closeRail();
    else openRail();
  });
  scrim?.addEventListener("click", closeRail);
  $("#rail-close")?.addEventListener("click", closeRail);
  $("#rail-apply")?.addEventListener("click", () => {
    closeRail();
    // Direkt zum Ergebnis: das Chart steht mobil ganz oben
    const chart = document.querySelector(".chart-card");
    if (chart) chart.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && rail.classList.contains("open")) closeRail();
  });
  window.addEventListener("resize", () => { placeRail(); }, { passive: true });
}

function initBackTop() {
  const b = $("#back-top");
  if (!b) return;
  const onScroll = () => { b.hidden = !(window.scrollY > 900); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  b.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// Methodik-Details: Zusammenfassungstext folgt dem Aufklapp-Zustand
function syncMethodMore() {
  const d = document.querySelector(".method-more");
  const s = d?.querySelector("summary");
  if (d && s) s.textContent = d.open ? t("method.less") : t("method.more");
}
function initMethodMore() {
  const d = document.querySelector(".method-more");
  if (d) d.addEventListener("toggle", syncMethodMore);
}

/* ============ FAMILIENVERGLEICH + CHANGELOG (reine Zahlen, kein Podest) ============ */
function renderFamily() {
  const list = $("#fcomp-list");
  if (!list || !data) return;
  const rows = (data.familyComparisons ?? []).slice().sort((a, b) => b.advantagePercent - a.advantagePercent);
  if (!rows.length) { list.innerHTML = ""; return; }
  const shown = rows.slice(0, famLimit);
  // planA/planB sind IDs ("opencode-go") , für die Anzeige die echten Namen nehmen
  const nameMap = new Map((data.plans ?? []).map((p) => [p.id, p.name]));
  const planName = (id) => nameMap.get(id) || id;
  // Gemeinsame Skala über alle Zeilen: Balken sind dadurch zwischen Familien
  // vergleichbar (pro Zeile normiert wäre jede Zeile "100 %").
  const scaleMax = Math.max(1, ...shown.flatMap((r) => [Number(r.requestsA) || 0, Number(r.requestsB) || 0]));
  const bar = (plan, val, max, isWin) => `<div class="fc-bar-row">`
    + `<span class="fc-plan" title="${escapeHtml(plan)}">${escapeHtml(plan)}</span>`
    + `<span class="fc-track"><span class="fc-fill${isWin ? " win" : ""}" style="width:${Math.max(1, (val / max) * 100).toFixed(1)}%"></span></span>`
    + `<span class="fc-val num">${fmtNum(val)}</span></div>`;
  list.innerHTML = shown.map((r) => {
    const a = Number(r.requestsA) || 0, b = Number(r.requestsB) || 0;
    const winA = a >= b;
    const draw = !r.winner || r.winner === "draw";
    const fam = String(r.family).replace(/\b\w/g, (ch) => ch.toUpperCase());
    return `<div class="fc-row">`
      + `<div class="fc-head">`
      + `<span class="fc-family">${escapeHtml(fam)}</span>`
      + (draw
        ? `<span class="fc-delta draw">${t("fcomp.winner.draw")}</span>`
        : `<span class="fc-delta ${winA ? "up" : "down"}">${escapeHtml(planName(r.winner))} +${fmtPct(r.advantagePercent)}</span>`)
      + `</div>`
      + `<div class="fc-bars">${bar(planName(r.planA), a, scaleMax, winA)}${bar(planName(r.planB), b, scaleMax, !winA)}</div>`
      + `</div>`;
  }).join("");
  const legend = $("#fcomp-legend");
  if (legend) legend.textContent = `${t("fcomp.scale")} ${fmtNum(scaleMax)}`;
  const moreBtn = $("#fcomp-more");
  if (moreBtn) {
    const rest = rows.length - shown.length;
    moreBtn.hidden = rest <= 0;
    moreBtn.textContent = `${t("more.show")} (${rest})`;
  }
}

function renderChangelog() {
  const list = $("#cl-list");
  if (!list || !data) return;
  const entries = data.changelog?.entries ?? [];
  list.innerHTML = entries.map((e) => {
    let date = e.date;
    try { date = new Date(e.date + "T00:00:00").toLocaleDateString(lang === "de" ? "de-DE" : "en-US"); } catch (err) { /* keep */ }
    const text = lang === "de" ? (e.textDe ?? e.text ?? e.textEn ?? "") : (e.textEn ?? e.text ?? "");
    // Eintraege kommen aus Commits: der Kurz-SHA verlinkt den Commit, damit die
    // Aenderung nachpruefbar ist.
    const commit = e.commit
      ? ` <a class="cl-commit" href="https://github.com/harrytyp/coding-plan-comparison/commit/${encodeURIComponent(e.commit)}" target="_blank" rel="noopener">${escapeHtml(e.commit)}</a>`
      : "";
    return `<div class="cl-row"><span class="cl-date num">${escapeHtml(date)}</span><span>${escapeHtml(text)}${commit}</span></div>`;
  }).join("");
}

function renderFormula() {
  const block = $("#formula-block");
  const m = data.methodology ?? {};
  const title = `<div style="font-size: var(--fs-sm);text-transform:uppercase;letter-spacing:.06em;color:var(--text-2);margin-bottom:8px">${t("method.formula.title")}</div>`;
  const perUnit = lang === "de"
    ? "Requests pro 1 $ = Requests / Monat ÷ bezahlter Preis · Tokens pro 1 $ = Requests pro 1 $ × Tokens pro Request"
    : "Requests per $1 = monthly requests ÷ paid price · Tokens per $1 = requests per $1 × tokens per request";
  block.innerHTML = title + `<div>${escapeHtml(m.costPerRequest ?? "")}</div><div style="margin-top:10px">${escapeHtml(perUnit)}</div>`;
}

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ---------------- Data loading ---------------- */
async function loadData() {
  const main = $("#main");
  try {
    const resp = await fetch(DATA_URL, { cache: "no-cache" });
    if (!resp.ok) throw new Error("HTTP " + resp.status + " for " + DATA_URL);
    data = await resp.json();
    aiScoreMemo.clear(); // Scores sind neu: Memo verwerfen
    try { localStorage.setItem("cpc-data", JSON.stringify({ at: data.generatedAt, data })); } catch (e) { /* Quota: egal */ }
    buildModelPrivacyMap(); // Modell-Privacy-Map aufbauen, bevor gerendert wird
    // Loading-Note entfernen
    const note = document.getElementById("loading-note");
    if (note) note.remove();
    applyI18n();
    // Kurse aus latest.json (fx-Source) → Preise in gewählter Währung rendern
    loadExchangeRates();
    renderPlans();
    renderDashboard();
  } catch (e) {
    console.error("Coding Plan Compare: Daten konnten nicht geladen werden:", e);
    // Offline-Fallback: zuletzt gecachte Daten mit Stand-Hinweis
    try {
      const cached = JSON.parse(localStorage.getItem("cpc-data") || "null");
      if (cached?.data) {
        data = cached.data;
        buildModelPrivacyMap();
        const note = document.getElementById("loading-note");
        if (note) note.remove();
        applyI18n();
        loadExchangeRates();
        renderPlans();
        renderDashboard();
        toast(lang === "de"
          ? `Offline: Stand vom ${new Date(cached.at).toLocaleDateString("de-DE")}`
          : `Offline: snapshot from ${new Date(cached.at).toLocaleDateString("en-US")}`);
        return;
      }
    } catch (err) { /* kein Cache */ }
    const note = document.getElementById("loading-note");
    if (note) note.remove();
    const errBox = document.createElement("div");
    errBox.className = "state-box";
    errBox.innerHTML = `
      <p style="font-size:18px;font-weight:700;margin:0 0 8px">${t("error")}</p>
      <p style="font-size: var(--fs-base);color:var(--text-2);margin:0 0 16px" class="mono">${(e.message || e).replace(/</g, "&lt;")}</p>
      <button class="btn" onclick="location.reload()">↻ ${lang === "de" ? "Erneut versuchen" : "Retry"}</button>`;
    const mainEl = $("#main");
    if (mainEl) mainEl.prepend(errBox);
  }
}

/* ---------------- Init ---------------- */
function init() {
  // Language from URL or localStorage or browser
  const params = new URLSearchParams(location.search);
  const urlLang = params.get("lang");
  const storedLang = localStorage.getItem("cpc-lang");
  if (urlLang === "en" || urlLang === "de") lang = urlLang;
  else if (storedLang === "en" || storedLang === "de") lang = storedLang;
  else lang = navigator.language?.startsWith("de") ? "de" : "en";

  // Theme
  const urlTheme = params.get("theme");
  const storedTheme = localStorage.getItem("cpc-theme");
  theme = urlTheme === "dark" || urlTheme === "light"
    ? urlTheme
    : (storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  applyTheme();

  // Währung (gespeichert oder Standard USD) + tägliche Kurse laden
  const storedCur = localStorage.getItem("cpc-currency");
  currency = ["USD", "EUR", "CNY", "GBP", "JPY"].includes(storedCur) ? storedCur : "USD";
  loadExchangeRates();

  // Ansicht aus URL (teilbare Links): Achsen + Rechner
  const urlDx = params.get("dx");
  if (["tokens", "req10", "rawtokens", "rawreq", "price"].includes(urlDx)) dashX = urlDx;
  const urlDy = params.get("dy");
  if (["score", "tokens", "req10", "rawtokens", "rawreq"].includes(urlDy)) dashY = urlDy;
  const urlBudget = parseFloat(params.get("budget"));
  if (isFinite(urlBudget) && urlBudget >= 0) calcBudget = urlBudget;
  const urlScore = parseInt(params.get("score") ?? "", 10);
  if (isFinite(urlScore) && urlScore >= 0) calcScore = urlScore;

  // Events
  $$(".lang-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      lang = btn.dataset.lang;
      localStorage.setItem("cpc-lang", lang);
      const p = new URLSearchParams(location.search);
      p.set("lang", lang);
      history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
      applyI18n();
    });
  });
  $("#theme-toggle").addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme();
    const p = new URLSearchParams(location.search);
    if (theme === "dark") p.set("theme", "dark"); else p.delete("theme");
    history.replaceState(null, "", `${location.pathname}?${p.toString()}`);
  });

  // Währungs-Umschalter (einheitliche Preis-Anzeige)
  const currencySel = $("#currency-select");
  if (currencySel) {
    currencySel.value = currency;
    currencySel.addEventListener("change", (e) => {
      currency = e.target.value;
      localStorage.setItem("cpc-currency", currency);
      renderAll();
    });
  }

  // Filter-Event-Listener (aktualisieren Tabelle UND Dashboard; rerender ist global)
  const plansSearchEl = $("#plans-search");
  if (plansSearchEl) plansSearchEl.addEventListener("input", (e) => { plansSearch = e.target.value; rerender(); });
  const plansMeterEl = $("#plans-meter-filter");
  if (plansMeterEl) plansMeterEl.addEventListener("change", (e) => { plansMeter = e.target.value; rerender(); });

  // Zustand des Filterblocks merkt der toggle-Handler oben (filtersOpenManual)

  // Sort-Selector (Mobile): ändert Sortierung
  const sortKeySel = $("#sort-select-key");
  if (sortKeySel) sortKeySel.addEventListener("change", (e) => {
    plansSort.key = e.target.value;
    plansSort.dir = $("#sort-select-dir")?.value || "desc";
    renderPlans();
  });
  const sortDirSel = $("#sort-select-dir");
  if (sortDirSel) sortDirSel.addEventListener("change", (e) => {
    plansSort.dir = e.target.value;
    renderPlans();
  });

  // Budget-Slider (max $/Monat)
  const budgetSlider = $("#budget-slider");
  if (budgetSlider) budgetSlider.addEventListener("input", (e) => {
    maxBudget = parseInt(e.target.value, 10) || 300;
    syncFilterUI();
    rerender();
  });

  // AI-Score-Slider (mindestens)
  const aiSlider = $("#ai-slider");
  if (aiSlider) aiSlider.addEventListener("input", (e) => {
    minAiScore = parseInt(e.target.value, 10) || 0;
    syncFilterUI();
    rerender();
  });

  // Tier-D-Filter: preisbasierte Pläne (Kimi) einblenden
  const tierdToggle = $("#tierd-toggle");
  if (tierdToggle) tierdToggle.addEventListener("change", (e) => {
    includePriceBased = e.target.checked;
    rerender();
  });

  // No-API-Filter: Pläne ohne API-Zugang einblenden
  const noapiToggle = $("#noapi-toggle");
  if (noapiToggle) noapiToggle.addEventListener("change", (e) => {
    includeNoApi = e.target.checked;
    rerender();
  });

  // Modelle mit Training per Default aus, per Schalter einblendbar
  const trainingToggle = $("#training-toggle");
  if (trainingToggle) trainingToggle.addEventListener("change", (e) => {
    includeTraining = e.target.checked;
    rerender();
  });

  // Spalten-Picker: Dropdown öffnen/schließen
  const colBtn = $("#col-picker-btn");
  const colPanel = $("#col-picker-panel");
  if (colBtn && colPanel) {
    colBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      colPanel.hidden = !colPanel.hidden;
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#col-picker")) colPanel.hidden = true;
    });
  }
  // Spalten-Checkboxen: Sichtbarkeit togglen + speichern
  document.querySelectorAll("#col-picker-panel input[data-col]").forEach((box) => {
    box.addEventListener("change", () => {
      const col = box.dataset.col;
      if (box.checked) { if (!visibleColumns.includes(col)) visibleColumns.push(col); }
      else { visibleColumns = visibleColumns.filter((c) => c !== col); }
      saveColumns();
      renderPlans();
      syncFilterChips(); // Chip "n Spalten ausgeblendet" mitziehen
    });
  });
  syncColumnPicker();
  initDashboard();
  initCalculator();
  initTabs();
  initPalette();
  initBackTop();
  initRailDrawer();
  initMethodMore();

  // Chart-Auflösung dynamisch an Fenstergröße koppeln (debounced)
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderDashboard(), 150);
  });

  // Loading-Hinweis (OHNE #main zu überschreiben , die Sections enthalten die Ziel-Container
  // und dürfen nicht gelöscht werden, sonst crasht renderStats auf null-Elementen)
  const loadingNote = document.createElement("div");
  loadingNote.id = "loading-note";
  loadingNote.style.cssText = "text-align:center;padding:24px;color:var(--text-2);font-size: var(--fs-lg)";
  loadingNote.textContent = t("loading");
  const mainEl = $("#main");
  // Nur anhängen, nicht ersetzen
  if (mainEl && !document.getElementById("loading-note")) mainEl.prepend(loadingNote);
  applyI18n();
  loadData();
}

document.addEventListener("DOMContentLoaded", init);

})(); /* Ende Idempotenz-Schutz */
