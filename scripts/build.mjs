#!/usr/bin/env node
/**
 * coding-plan-compare generator.
 * Builds public/data/latest.json dynamically from parsed/*.json (sources) + data/overrides.yml.
 *
 * Normalization (ai-10-usd method, extended):
 *  - Cost per request per model from token prices + workload pattern:
 *      cost = (0.05×input + 0.95×cachedWrite)×pattern.input
 *           + cachedRead×pattern.cachedRead + output×pattern.output, /1M
 *    (Input priced 5% fresh + 95% cache-write; cache-read and output separately)
 *  - Requests/month = meter / cost  (meter: credits | $usage | requests | prompts)
 *  - Per-dollar normalization: requests / paidPrice (tokens/requests per $1,
 *    NOT scaled up to $10, a $1 plan shows what $1 buys)
 *  - Subscriptions are single per account (no stacking): the rate is a rate,
 *    not a purchasable multiple. The frontend budget calculator compares
 *    single plans within a budget.
 *  - Draw < 10%; outlier = Tukey IQR on log2 ratio
 *  - Provider-owned requestEstimate (Command Code) kept as official reference
 *  - undisclosed stays undisclosed; no direct credit conversion between providers
 *
 * Reproducible: deterministic from committed inputs (data + feed snapshots).
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TARGET_PRICE = 1;
const DRAW_THRESHOLD_PERCENT = 10;
// ai-10-usd workload fallback: average message profile
const FALLBACK_PATTERN = { input: 800, cachedRead: 50000, output: 162 };

// Feed-Modellnamen finden. Default: Substring (der Feed-Name enthält den Quell-Namen).
// "normalized": Gleichheit ohne Trennzeichen/Case und ohne "V" vor Zahlen, weil Quellen
// "GLM 5.3 Flash" / "MiMo 2.6 Flash" schreiben und der Feed "GLM-5.3-Flash" / "MiMo V2.6 Flash".
const modelKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "").replace(/([a-z])v(?=\d)/g, "$1");
function findFeedModel(allModels, modelName, mode) {
  if (mode === "normalized") {
    const key = modelKey(modelName);
    return allModels.find((m) => m.name && modelKey(m.name) === key) ?? null;
  }
  return allModels.find((m) => m.name && m.name.toLowerCase().includes(String(modelName).toLowerCase())) ?? null;
}

// ---------- Dynamischer Plan-Katalog aus geparsten Quellen + Overrides ----------
function buildPlanCatalog(parsed, overrides, overridesData) {
  const plans = [];
  const add = (p) => { if (p) plans.push(p); };

  // --- OpenCode Go (aus ocgo-Feed) ---
  // Die Tarif-Liste kommt aus dem Feed (Go $10 / Go Plus $40): ein neuer Tarif darf
  // nicht still aus dem Katalog fallen. Fallback nur fuer die alte Feed-Form ohne plans[].
  const oc = parsed["ocgo-pricing"];
  if (oc) {
    const ocPlans = oc.plans?.length
      ? oc.plans
      : [{ id: "go", name: "Go", priceMonthly: oc.monthlyCost ?? 10, creditsMonthly: oc.monthlyCredit ?? 60 }];
    // Fenster-Regel aus den Docs (opencode.ai/docs/go, "Usage limits"): je Modell
    // 5 h = 20 % des Monatslimits, Woche = 50 %, Monat = 100 %. Abgeleitet, nicht geraten.
    const ocWindows = (monthly) => [
      { label: "5h window", unit: "usd", amount: monthly == null ? null : +(monthly * 0.2).toFixed(2), window: "5h", refresh: "rolling", disclosure: "exact" },
      { label: "Weekly", unit: "usd", amount: monthly == null ? null : +(monthly * 0.5).toFixed(2), window: "week", refresh: "weekly", disclosure: "exact" },
      { label: "Monthly", unit: "usd", amount: monthly, window: "month", refresh: "monthly", disclosure: "exact" },
    ];
    for (const ocp of ocPlans) {
      const monthly = ocp.creditsMonthly ?? null;
      add({
        id: `opencode-${ocp.id}`,
        provider: "opencode",
        name: `OpenCode ${ocp.name}`,
        price: { monthlyUsd: ocp.priceMonthly ?? null, paidPrice: ocp.priceMonthly ?? null, advertisedPrice: ocp.priceMonthly ?? null, billingNote: "beta", altPrice: null },
        meter: "dollar_usage",
        quotas: ocWindows(monthly),
        tokenPricing: { source: "ocgo-pricing", note: "Feed: usage = Monatslimit in $ je Modell und Tarif, pattern = token profile, input/output/cachedRead/cachedWrite = API prices" },
        workload: { pattern: null, taskConversion: null },
        models: (oc.models ?? []).map((m) => m.name),
        dataTier: "A",
        dataTierNote: "Official per-model monthly limit in USD from the feed; 5h/weekly windows are the documented shares of it (20 % / 50 %)",
        disclosure: "disclosed",
        sourceIds: ["ocgo-pricing"],
        verifiedAt: oc.fetchedAt ? oc.fetchedAt.slice(0, 10) : "2026-09-28",
      });
    }
  }

  // --- Command Code Pläne (aus cc-Feed) ---
  const cc = parsed["cc-pricing"];
  // Fallback-Betrag, falls overrides.yml keinen Preis mitbringt. GOAT: am
  // 2026-10-02 abgebucht (10,78 $ inkl. Kartengebuehr), Quelle overrides.yml.
  const CC_PAID = { goat: 10.78 };
  if (cc) {
    for (const p of cc.plans ?? []) {
      if (!p.creditsMonthly) continue; // provider-Plan ohne credits überspringen
      const id = `command-code-${p.id}`;
      // Tier: goat/pro haben eigene allowances (A), go/max10/max20 nutzen
      // offizielle requestEstimate als Anker (B)
      const hasOwnAllowances = cc.models.some((m) => (m.allowances?.[p.id] ?? null) != null);
      const dataTier = hasOwnAllowances ? "A" : (p.requestEstimate ? "B" : "C");
      const dataTierNote = hasOwnAllowances
        ? "Official per-model allowances from feed"
        : (p.requestEstimate ? `Official total ${p.requestEstimate.toLocaleString()} req/mo as anchor` : "Scaled from GOAT, no official anchor");
      add({
        id,
        provider: "command-code",
        name: `Command Code ${p.name}`,
        // Fertiger Preis aus overrides.yml (Command Code: inkl. Kartengebuehr),
        // sonst Listenpreis + verifizierter Fallback.
        price: (() => {
          const ov = overrides[`command-code-${p.id}`];
          if (ov?.price) return ov.price;
          const paid = CC_PAID[p.id] ?? p.priceMonthly;
          return { monthlyUsd: p.priceMonthly, paidPrice: paid, advertisedPrice: p.priceMonthly, billingNote: CC_PAID[p.id] ? `paid $${paid.toFixed(2)} (verified checkout price)` : "", altPrice: null };
        })(),
        meter: "credits",
        quotas: [
          { label: "5h window", unit: "credits", amount: p.limits?.h5 ?? null, window: "5h", refresh: "rolling", disclosure: "exact" },
          { label: "Weekly", unit: "credits", amount: p.limits?.weekly ?? null, window: "week", refresh: "weekly", disclosure: "exact" },
          { label: "Monthly", unit: "credits", amount: p.creditsMonthly, window: "month", refresh: "monthly", disclosure: "exact" },
        ],
        tokenPricing: { source: "cc-pricing", note: "allowances = credits/month per model; requestEstimate = official request estimate" },
        workload: { pattern: null, taskConversion: p.requestEstimate ? `Official requestEstimate: ${p.requestEstimate.toLocaleString()} req/mo` : null },
        models: [],
        dataTier,
        dataTierNote,
        disclosure: "disclosed",
        sourceIds: ["cc-pricing"],
        verifiedAt: cc.fetchedAt ? cc.fetchedAt.slice(0, 10) : "2026-08-28",
        requestEstimate: p.requestEstimate ?? null,
      });
    }
  }

  // --- GLM Pläne (Quoten+Formel dynamisch aus Docs; Preise aus overrides) ---
  const glm = parsed["glm-coding-overview"];
  if (glm) {
    const tierMap = { lite: "Lite", pro: "Pro", max: "Max" };
    for (const q of glm.quotas ?? []) {
      const tierName = tierMap[q.tier];
      if (!tierName) continue;
      const id = `glm-${q.tier}`;
      const ov = overrides[id];
      add({
        id,
        provider: "zhipu",
        name: `GLM Coding Plan ${tierName}`,
        price: ov?.price ?? { monthlyUsd: null, paidPrice: null, advertisedPrice: null, billingNote: "Price not scrapeable (API auth), see overrides.yml", altPrice: null },
        meter: "credits",
        quotas: [
          { label: "5h rolling", unit: "credits", amount: q.h5, window: "5h", refresh: "rolling", disclosure: "exact" },
          { label: "7-day", unit: "credits", amount: q.weekly, window: "week", refresh: "weekly", disclosure: "exact" },
        ],
        tokenPricing: { source: "glm-coding-overview", note: glm.formula ?? "Credit-Formel aus Docs" },
        providerCost: {
          formula: glm.formula ?? "(input×a + cachedRead×b + output×c)/10000",
          perModel: (glm.models ?? []).map((m) => ({ model: m.model, input: m.input, cachedRead: m.cachedRead, output: m.output })),
          mcpPerCall: glm.mcpPerCall ?? null,
          offPeakDiscount: glm.offPeakDiscount ?? null,
          note: "Officially verified (docs.bigmodel.cn/cn/coding-plan/overview)",
        },
        workload: { pattern: null, taskConversion: null },
        models: (glm.models ?? []).map((m) => m.model),
        dataTier: "A",
        dataTierNote: "Official quotas (5h/weekly credits) from GLM docs",
        disclosure: "disclosed",
        sourceIds: ["glm-coding-overview", ...(ov ? ["overrides"] : [])],
        verifiedAt: "2026-08-28",
        priceSource: ov ? "overrides (API-Auth)" : "undisclosed",
      });
    }
  }

  // --- Qwen Coding Plan Pro (dynamisch aus Docs) ---
  const qwen = parsed["qwen-coding-plan"];
  if (qwen?.plans?.[0]) {
    const p = qwen.plans[0];
    add({
      id: "qwen-coding-pro",
      provider: "alibaba",
      name: "Qwen Coding Plan Pro",
      price: { monthlyUsd: p.price, paidPrice: p.price, advertisedPrice: p.price, billingNote: "仅月付, 库存每日 UTC+8 00:00 补充", altPrice: null },
      meter: "requests",
      quotas: [
        { label: "5h rolling", unit: "requests", amount: p.quota5h, window: "5h", refresh: "rolling", disclosure: "exact" },
        { label: "Weekly", unit: "requests", amount: p.quotaWeek, window: "week", refresh: "weekly", disclosure: "exact" },
        { label: "Monthly", unit: "requests", amount: p.quotaMonth, window: "month", refresh: "monthly", disclosure: "exact" },
      ],
      tokenPricing: null,
      workload: { pattern: null, taskConversion: qwen.taskConversion },
      models: ["Qwen Code", "Claude Code", "Codex", "Cursor", "OpenCode"],
      // Offizielle Request-Quote: 6.000 pro 5h, 45.000 pro Woche, 90.000 pro Monat.
      // Die Monatsmenge ist direkt eine Request-Zahl, deshalb braucht der Plan
      // keine Token-Preise (die Credits der Token-Tarife sind ein eigenes System).
      requestPlan: p.quotaMonth > 0 ? {
        requests: p.quotaMonth,
        label: "Requests (Coding Plan)",
        note: `requests (official monthly quota ${p.quotaMonth.toLocaleString()}; ${p.quota5h.toLocaleString()} per 5h, ${p.quotaWeek.toLocaleString()} per week)`,
      } : null,
      disclosure: "disclosed",
      sourceIds: ["qwen-coding-plan"],
      verifiedAt: "2026-08-28",
    });
  }

  // --- Qwen Token Personal (dynamisch aus Docs) ---
  // HINWEIS: Qwen-Credits sind ein eigenes Währungssystem ("tiered deduction
  // coefficients by model", Koeffizienten NICHT öffentlich). Die API-Dollar-Preise
  // sind NICHT die Credit-Kosten → keine Requests-Normalisierung möglich.
  // Ehrlich: Rohdaten mit offiziellen Multiplikatoren (Lite 1× / Standard 4× / Pro 16×).
  const qwenTok = parsed["qwen-token-personal"];
  // Offizielle Multiplikatoren aus der Doku ("2.25x/4x/16x Lite usage"), Stand 2026-09-21.
  const qwenTierMap = { Lite: "lite", Essential: "essential", Standard: "standard", Pro: "pro" };
  const qwenTierMult = { lite: 1, essential: 2.25, standard: 4, pro: 16 };
  for (const p of qwenTok?.plans ?? []) {
    const tierKey = qwenTierMap[p.name];
    if (!tierKey) continue;
    add({
      id: `qwen-token-personal-${tierKey}`,
      provider: "alibaba",
      name: `Qwen Token Plan Personal ${p.name}`,
      price: { monthlyUsd: p.limitedPrice, paidPrice: p.limitedPrice, advertisedPrice: p.originalPrice, billingNote: `Limited-time $${p.limitedPrice} (Original $${p.originalPrice})`, altPrice: null },
      meter: "credits",
      quotas: [
        { label: "7-day rolling", unit: "credits", amount: p.quota7d, window: "rolling", refresh: "rolling", disclosure: "exact" },
      ],
      tokenPricing: null,
      workload: { pattern: null, taskConversion: `Tiered deduction coefficients by model (official); coefficients not published. Official multiplier: ${qwenTierMult[tierKey]}× Lite` },
      models: ["Qwen 文本与多模态", "Claude Code", "Cursor", "Qwen Code", "OpenClaw"],
      disclosure: "disclosed",
      sourceIds: ["qwen-token-personal"],
      verifiedAt: "2026-08-28",
    });
  }

  // --- Kimi Pläne (Preise aus kimi.ai Goods-API, Primär; Quota-Regeln aus Code-Docs) ---
  const kimiPrices = parsed["kimi-membership-pricing"]; // Fallback (kimi.com, CNY)
  const kimiGoods = parsed["kimi-goods"];               // Primär (kimi.ai, USD, Monat/Jahr, Waitlist)
  const kimiCode = parsed["kimi-code-membership"];
  // Tarifnamen: kimi.com (CN) = Andante/Moderato/Allegretto/Allegro/Vivace,
  // die internationale Goods-API (kimi.ai) liefert DIESELBEN Tarife unter den
  // Checkout-Titeln Plus/Pro/Max/Ultra. Preis-Identität belegt die Zuordnung:
  // $19/$39/$99/$199 bzw. Jahrespreise $180/$372/$948/$1908 entsprechen exakt der
  // internationalen Preistabelle (https://www.kimi.ai/help/membership/membership-pricing).
  const kimiTierMap = {
    Moderato: "moderato", Allegretto: "allegretto", Allegro: "allegro", Vivace: "vivace",
    Plus: "moderato", Pro: "allegretto", Max: "allegro", Ultra: "vivace",
  };
  const kimiTierLabel = { moderato: "Moderato", allegretto: "Allegretto", allegro: "Allegro", vivace: "Vivace" };
  // Offizielle relative Credits (Index): Andante 1×, Moderato 4×, Allegretto 20×, Allegro 60×
  const kimiTierMult = { moderato: 4, allegretto: 20, allegro: 60, vivace: 120 };
  // Offizielle Billing-Beispiele (kimi.com/code/docs): einfacher Request ~¥0.03,
  // komplexer Task ~¥1.6. Membership-Preis ÷ Kosten/Request = Requests/Monat.
  // HINWEIS: Kimi hat auf kimi.com CNY-Preise, auf kimi.ai USD (international).
  // Primärquelle kimi.ai: USD, monatlich UND jährlich (jährlich günstiger), nur Waitlist.
  const KIMI_SIMPLE_REQUEST_CNY = 0.03;
  const USD_PER_CNY = 0.14; // dokumentierter Umrechnungskurs (nur Fallback-Anzeige)

  // Kimi-Goods-Pläne (bevorzugt): Monats-Preis als paidPrice, Jahres-Preis + Waitlist als Metadaten
  const kimiGoodsPlans = kimiGoods?.plans ?? [];
  const goodsByTier = {};
  for (const gp of kimiGoodsPlans) {
    const tierKey = kimiTierMap[gp.name];
    if (!tierKey) continue;
    goodsByTier[tierKey] = goodsByTier[tierKey] ?? { name: gp.name, month: null, year: null, waitlist: true };
    if (gp.billingCycle === "month") goodsByTier[tierKey].month = gp.priceUsd;
    if (gp.billingCycle === "year") goodsByTier[tierKey].year = gp.priceUsd;
    goodsByTier[tierKey].waitlist = goodsByTier[tierKey].waitlist && gp.waitlist;
  }
  // Offizielle CNY-Listenpreise (kimi.com) als Basis für die Request-Schätzung.
  // Für internationale Käufer (kimi.ai, USD) ist der Credit-Grund der gleiche wie für den
  // CNY-Kunden: USD-Preis in CNY umrechnen ÜBERSCHÄTZT (z.B. $19/0.14 = ¥135.71 vs. offiziell ¥99).
  // Fallback nur, wenn kein CNY-Listenpreis existiert (z.B. Vivace fehlt in kimi.com-Docs).
  const kimiListCny = Object.fromEntries(
    (kimiPrices?.plans ?? []).map((pl) => [kimiTierMap[pl.name], pl.priceCny]).filter(([k, v]) => k && v != null)
  );
  for (const [tierKey, g] of Object.entries(goodsByTier)) {
    if (!g.month) continue; // Monatspreis ist die Basis
    const yearlyMonthly = g.year ? Math.round((g.year / 12) * 100) / 100 : null;
    const billingNote = g.year
      ? `$${g.month}/Monat monatlich, oder $${g.year}/Jahr ($${yearlyMonthly}/Monat effektiv)`
      : `$${g.month}/Monat`;
    add({
      id: `kimi-${tierKey}`,
      provider: "moonshot",
      name: `Kimi Code ${kimiTierLabel[tierKey] ?? g.name}`,
      price: {
        monthlyUsd: g.month,
        paidPrice: g.month,
        advertisedPrice: g.month,
        currency: "USD",
        monthlyCny: null,
        billingNote,
        altPrice: g.year ? `$${g.year}/Jahr` : null,
        yearlyUsd: g.year ?? null,
        waitlist: g.waitlist,
      },
      meter: "credits",
      quotas: [
        { label: "7-day quota", unit: "credits", amount: null, window: "week", refresh: "weekly", disclosure: "undisclosed", shared: "Kimi Code + Kimi Membership" },
        { label: "5h rate window", unit: "credits", amount: null, window: "5h", refresh: "rolling", disclosure: "undisclosed" },
      ],
      tokenPricing: { source: "kimi-code-membership", note: kimiCode?.extraUsage ?? "Credit balance; extra usage pay-as-you-go" },
      workload: { pattern: null, taskConversion: kimiCode?.extraUsage ?? null },
      models: ["Kimi K3", "Kimi K2.7 Code"],
      dataTier: "D",
      dataTierNote: "No published quota (waitlist only), requests derived from price / cost",
      // Offizielle Umrechnung: Membership-Preis ÷ offizieller Request-Kosten (¥0.03)
      // Request-Basis: offizieller CNY-Listenpreis (sonst USD→CNY-Fallback), Kimi rechnet RMB
      providerCost: {
        formula: "requests = monthlyPriceCNY / 0.03 (offizielles Billing-Beispiel: einfacher Request ~¥0.03)",
        monthlyPriceCny: kimiListCny[tierKey] ?? Math.round((g.month / USD_PER_CNY) * 100) / 100,
        requestCostCny: KIMI_SIMPLE_REQUEST_CNY,
        tierMultiplier: kimiTierMult[tierKey] ?? null,
        feedModels: ["Kimi K3", "Kimi K2.7 Code", "Kimi K2.6", "Kimi K2.5"],
      },
      disclosure: g.waitlist ? "partial" : "disclosed",
      sourceIds: ["kimi-goods", "kimi-code-membership", "kimi-ai-pricing"],
      verifiedAt: "2026-09-21",
      // kimi.ai (international) benennt die Tarife im Checkout anders als kimi.com (CN).
      notes: g.name === kimiTierLabel[tierKey] ? null : `Sold on kimi.ai as "${g.name}" (identical tier and price as ${kimiTierLabel[tierKey]} on kimi.com).`,
      notesDe: g.name === kimiTierLabel[tierKey] ? null : `Auf kimi.ai heißt der Tarif "${g.name}" (gleicher Tarif und Preis wie ${kimiTierLabel[tierKey]} auf kimi.com).`,
    });
  }

  // Fallback: Kimi-Preise aus kimi.com (CNY) nur wenn kimi-goods nichts lieferte
  if (Object.keys(goodsByTier).length === 0) {
    for (const p of kimiPrices?.plans ?? []) {
      const tierKey = kimiTierMap[p.name];
      if (!tierKey) continue;
      const usd = Math.round(p.priceCny * USD_PER_CNY * 10) / 10;
      add({
        id: `kimi-${tierKey}`,
        provider: "moonshot",
        name: `Kimi Code ${p.name}`,
        price: { monthlyUsd: usd, paidPrice: p.priceCny, advertisedPrice: p.priceCny, currency: "CNY", monthlyCny: p.priceCny, billingNote: `¥${p.priceCny}/month (official, kimi.com)`, altPrice: `$${usd}/mo ≈` },
        meter: "credits",
        quotas: [
          { label: "7-day quota", unit: "credits", amount: null, window: "week", refresh: "weekly", disclosure: "undisclosed", shared: "Kimi Code + Kimi Membership" },
          { label: "5h rate window", unit: "credits", amount: null, window: "5h", refresh: "rolling", disclosure: "undisclosed" },
        ],
        tokenPricing: { source: "kimi-code-membership", note: kimiCode?.extraUsage ?? "Credit balance; extra usage pay-as-you-go" },
        workload: { pattern: null, taskConversion: kimiCode?.extraUsage ?? null },
        models: ["Kimi K3", "Kimi K2.7 Code"],
        providerCost: {
          formula: "requests = monthlyPriceCNY / 0.03 (offizielles Billing-Beispiel: einfacher Request ~¥0.03)",
          monthlyPriceCny: p.priceCny,
          requestCostCny: KIMI_SIMPLE_REQUEST_CNY,
          tierMultiplier: kimiTierMult[tierKey] ?? null,
          feedModels: ["Kimi K3", "Kimi K2.7 Code", "Kimi K2.6", "Kimi K2.5"],
        },
        disclosure: "partial",
        sourceIds: ["kimi-membership-pricing", "kimi-code-membership"],
        verifiedAt: "2026-08-28",
      });
    }
  }

  // --- Nicht-scrapebare Pläne aus overrides.yml (MiniMax) ---
  for (const ov of overridesData?.overrides ?? []) {
    if (plans.some((p) => p.id === ov.id)) continue; // schon dynamisch
    add({
      id: ov.id,
      provider: ov.provider ?? "unknown",
      name: ov.name ?? ov.id,
      price: ov.price ?? { monthlyUsd: null, paidPrice: null, advertisedPrice: null },
      meter: ov.measured ? "tokens" : (ov.meter ?? "credits"),
      quotas: ov.measured
        ? [{ label: "Monthly (measured)", unit: "tokens", amount: ov.measured.monthlyTokens, window: "month", refresh: "monthly", disclosure: "measured" }]
        : (ov.quotas ?? (ov.quota ? [ov.quota] : [])),
      tokenPricing: null,
      workload: { pattern: null, taskConversion: null },
      models: [],
      feedModels: ov.feedModels ?? null,
      // MiniMax: offizielles 5h-Cap als Mengen-Basis (Tier A, wenn Quota vorhanden)
      dataTier: ov.measured ? "M" : ((ov.quotas ?? ov.quota) ? "A" : "C"),
      dataTierNote: ov.measured
        ? `Measured (third party): ${ov.measured.sample}`
        : (ov.dataTierNote ?? ((ov.quotas ?? ov.quota) ? "Official quota from docs/overrides" : "No official quota, derived")),
      // Referenz-Plaene (grosse Anbieter ohne veroeffentlichte Token-Quote) tragen
      // disclosure "reference" und bewusst keine Modellzeilen: sie stehen in der Liste,
      // aber nicht in der Token-pro-Dollar-Rangliste.
      disclosure: ov.disclosure ?? "undisclosed",
      // Gemessene Plaene: eigene Modellpreise (Anbieterliste) + Messblock. Sie
      // bekommen Modellzeilen, weil die Menge gemessen ist und nicht geraten.
      measured: ov.measured ?? null,
      creditPlan: ov.creditPlan ?? null,
      requestPlan: ov.requestPlan ?? null,
      dollarPlan: ov.dollarPlan ?? null,
      localModelPricing: ov.localModelPricing ?? null,
      // Token-Kontingente aus overrides (z.B. Bolt.new: Tokens/Monat als 1 Credit
      // pro Token) nutzen dieselbe Formel wie die geparsten Cerebras-Tarife.
      providerCost: ov.providerCost ?? null,
      models: ov.measured && ov.localModelPricing ? ov.localModelPricing.map((m) => m.model) : [],
      // Keine feedModels für undisclosed, sonst entstehen erfundene modelStats
      feedModels: null,
      sourceIds: ["overrides"],
      verifiedAt: ov.lastVerified ?? "2026-08-28",
      notes: ov.note ?? null,
    });
  }

  // --- Freebuff (werbefinanziert): Gratis-Tarif + drei bezahlte Tarife ---
  // Quelle: freebuff.com/plans (je Tarif "<X> max spend / mo") + Homepage-FAQ (JSON-LD).
  // Mengen-Basis ist ein USD-Volumen (wie OpenCode Go), nicht Token/Credits:
  // Requests = Volumen ÷ $/Request aus den Feed-Tokenpreisen. Modelle ohne Tokenpreis
  // im Feed bekommen KEINE Zeile, statt erfundener Werte.
  // Der Gratis-Tarif nennt seit 09/2026 KEIN Dollar-Volumen mehr (die Seite sagt nur
  // noch "Sign in to see your account's allowance", die Homepage "100 Freebucks every
  // day" je Region). Ohne veroeffentlichtes Volumen: keine Modell-Zeilen, keine Rate
  // pro $, ehrlich null statt der frueheren $31.
  const fbPricing = parsed["freebuff-pricing"];
  const fbFaq = parsed["freebuff-faq"];
  // Modell-Katalog aus der Quelle (FAQ-JSON-LD, "regular picker"), nie hart kodieren:
  // Umbenennungen (GPT 5.6 Luna → GPT-6 Luna, MiMo V2.5 → MiMo 2.6) fielen sonst still raus.
  const FREEBUFF_MODELS = fbFaq?.models ?? [];
  if (fbPricing?.plans?.length) {
    const freebucksNote = (fbFaq?.freebucksPerDay ?? []).map((b) => `${b.regions}: ${b.perDay}`).join("; ");
    const freebucksPerDayUs = (fbFaq?.freebucksPerDay ?? []).find((b) => b.regions === "US")?.perDay ?? null;
    const fbPlans = [
      { name: "Free", monthlyUsd: 0, maxSpendUsd: fbPricing.freeTierMonthlyUsd, adFunded: true },
      ...fbPricing.plans,
    ];
    for (const p of fbPlans) {
      const isFree = p.monthlyUsd === 0;
      const hasUsdVolume = typeof p.maxSpendUsd === "number" && p.maxSpendUsd > 0;
      // Ohne Dollar-Volumen gibt es nichts zu teilen: kein feedModels, damit der
      // Build keine Zeilen mit nicht vergleichbarer Basis erzeugt.
      const feedModels = hasUsdVolume ? FREEBUFF_MODELS : null;
      // Kein API-Zugang: die Terms erlauben Inferenz NUR ueber ein offizielles
      // Freebuff-Produkt (keine direkten Endpoint-Aufrufe, keine Wrapper/Skripte,
      // ein Mensch muss jede Session starten und anwesend bleiben). Der Free-Tarif
      // wird ueber Textanzeigen finanziert.
      add({
        id: `freebuff-${p.name.toLowerCase()}`,
        provider: "freebuff",
        name: `Freebuff ${p.name}`,
        price: {
          monthlyUsd: p.monthlyUsd,
          paidPrice: p.monthlyUsd,
          advertisedPrice: p.monthlyUsd,
          billingNote: isFree
            ? `$0 (supported by text ads). Allowance published only as daily Freebucks by region (${freebucksNote}); freebuff.com/plans no longer names a monthly dollar volume. Region spoofing by VPN or proxy is prohibited by the Terms`
            : `$${p.dailyUsd}/day + $${p.flexibleMonthlyUsd}/mo flexible, $${p.maxSpendUsd} max spend/mo${fbPricing.yearlyDiscountPercent ? `; yearly ~${fbPricing.yearlyDiscountPercent}% off` : ""}`,
          altPrice: null,
        },
        meter: hasUsdVolume ? "dollar_usage" : "credits",
        quotas: hasUsdVolume
          ? [{ label: "Monthly", unit: "usd", amount: p.maxSpendUsd, window: "month", refresh: "monthly", disclosure: "exact" }]
          // Freebucks sind die Credits der Quelle (1 Freebuck = 1 Stunde Modell-Session).
          : [{ label: "Daily Freebucks (US; regional)", unit: "credits", amount: freebucksPerDayUs, window: "day", refresh: "daily", disclosure: "exact" }],
        tokenPricing: null,
        workload: { pattern: null, taskConversion: null },
        models: [],
        feedModels,
        modelMatch: "normalized",
        dataTier: "A",
        dataTierNote: hasUsdVolume
          ? "Official monthly usage volume in USD from freebuff.com/plans (not a published request count)"
          : "Official daily Freebucks allowance by region (freebuff.com FAQ); no monthly dollar volume published",
        // Kein veröffentlichter Request-Zaehler, Freibetrag je Region, Limits laut Seite anpassbar
        disclosure: "partial",
        tag: "no API",
        tagDe: "kein API",
        notes: "No API access: model inference only through an official Freebuff product (CLI, Desktop, Web, Cloud, Chat), no direct calls to servers or endpoints, no scripts, wrappers or third-party software, and a human must start each session and stay present. Usage is metered in Freebucks: they buy one-hour model sessions, requests here are derived from the published USD volume at feed token prices. Source: freebuff.com/terms-of-service (Free Access and Human Use)",
        notesDe: "Kein API-Zugang: Modell-Inferenz nur ueber ein offizielles Freebuff-Produkt (CLI, Desktop, Web, Cloud, Chat), keine direkten Aufrufe der Server oder Endpunkte, keine Skripte, Wrapper oder Drittanbieter-Software, und ein Mensch muss jede Session starten und anwesend bleiben. Die Nutzung wird in Freebucks gemessen: sie kaufen einstuendige Modell-Sessions, die Requests hier werden aus dem veroeffentlichten Dollar-Volumen und den Token-Preisen des Feeds abgeleitet. Quelle: freebuff.com/terms-of-service (Free Access and Human Use)",
        sourceIds: ["freebuff-pricing", "freebuff-faq"],
        verifiedAt: "2026-09-28",
      });
    }
  }

  // --- OpenDesign Design Plan (aus den beiden HTML-Quellen) ---
  // Offizielle Mengenbasis: Monats-Credits in Dollar, dazu die Fenster der Credit-Seite
  // (Monat / 7 Tage / 5 Stunden) und eine veroeffentlichte Dollar-Obergrenze JE MODELL
  // (z.B. GPT-6 Luna 15 $, GLM-5.3 Flash-X 30 $, sonst die Plan-Summe). Token-Preise
  // kommen aus den Feeds: dieselben Modelle, dieselben API-Preise. Der Plan hat keine
  // eigene API-Preisliste, deshalb keine erfundenen Preise.
  const od = parsed["opendesign-pricing"];
  const odCr = parsed["opendesign-credits"];
  // Alle vier Tarife sind inzwischen geparst (Preis, Monats-Credits, Erstmonats-
  // und Jahrespreis, Modell-Obergrenzen je Tarif und die 7-Tage-Fenster der
  // Credit-Seite), deshalb werden sie gebaut. Vorher stand hier nur Go, solange
  // der Parser die uebrigen Karten nicht belegte (kein Raten).
  const OD_BUILD_TIERS = ["go", "plus", "pro", "max"];
  for (const p of od?.plans ?? []) {
    if (!OD_BUILD_TIERS.includes(p.tier)) continue;
    const w = odCr?.windows?.[p.tier] ?? null;
    const billingNote = [
      p.introPrice ? `first month $${p.introPrice}` : null,
      p.priceYearlyMonthly ? `$${p.priceYearlyMonthly}/mo billed yearly` : null,
    ].filter(Boolean).join(", ");
    add({
      id: `opendesign-${p.tier}`,
      provider: "opendesign",
      name: `OpenDesign ${p.name}`,
      price: {
        monthlyUsd: p.priceMonthly,
        paidPrice: p.priceMonthly,
        advertisedPrice: p.priceMonthly,
        billingNote,
        altPrice: p.priceYearlyMonthly ?? null,
      },
      meter: "dollar_usage",
      quotas: [
        w?.design5h ? { label: "5h window", unit: "usd", amount: w.design5h, window: "5h", refresh: "rolling", disclosure: "exact" } : null,
        w?.design7d ? { label: "7-day window", unit: "usd", amount: w.design7d, window: "week", refresh: "weekly", disclosure: "exact" } : null,
        { label: "Monthly", unit: "usd", amount: p.creditsMonthly, window: "month", refresh: "monthly", disclosure: "exact" },
      ].filter(Boolean),
      tokenPricing: {
        source: "opendesign-pricing",
        note: "Monats-Credits in USD je Tarif, dazu je Modell eine veroeffentlichte Obergrenze; Requests = Obergrenze / Kosten pro Request aus den Feed-Tokenpreisen",
      },
      workload: { pattern: null, taskConversion: null },
      models: [],
      feedModels: (p.models ?? []).map((m) => ({ model: m.model, usd: m.usd })),
      modelMatch: "normalized",
      dataTier: "A",
      dataTierNote: "Official monthly credit amount and per-model USD caps from open-design.ai/pricing; 7-day and 5-hour windows from open-design.ai/model-credits",
      disclosure: "disclosed",
      sourceIds: ["opendesign-pricing", "opendesign-credits"],
      verifiedAt: "2026-10-02",
    });
  }

  // --- Xiaomi MiMo Token Plan (Monats-Credits + Credits pro Token je Modell) ---
  const mimo = parsed["mimo-token-plan"];
  if (mimo?.plans?.length && mimo?.models?.length) {
    const coeffs = mimo.models.map((m) => ({ model: m.name, input: m.input, cachedRead: m.cachedRead, output: m.output }));
    for (const p of mimo.plans) {
      add({
        id: `mimo-${p.name.toLowerCase()}`,
        provider: "xiaomi",
        name: `MiMo Token Plan ${p.name}`,
        price: {
          monthlyUsd: p.monthlyUsd,
          paidPrice: p.monthlyUsd,
          advertisedPrice: p.monthlyUsd,
          currency: "USD",
          yearlyUsd: p.yearlyUsd ?? null,
          altPrice: null,
          billingNote: "Individual edition; annual auto-renewal 12% off, first purchase 12% off; off-peak (UTC 16-24) 0.8x credits",
        },
        meter: "credits",
        quotas: [{ label: "Monthly", unit: "credits", amount: p.monthlyCredits, window: "month", refresh: "monthly", disclosure: "exact" }],
        tokenPricing: { source: "mimo-token-plan", note: mimo.note ?? "Credits pro Token je Modell" },
        providerCost: {
          formula: "Credits = cache-miss input x c_in + cache-hit input x c_hit + output x c_out",
          divisor: 1,
          perModel: coeffs,
          offPeakDiscount: 0.2,
          note: `Official per-model credit rates (mimo.mi.com docs, ${mimo.updatedAt ?? "2026-09-21"})`,
        },
        workload: { pattern: null, taskConversion: mimo.taskConversion ?? null },
        models: coeffs.map((c) => c.model),
        dataTier: "A",
        dataTierNote: `Official monthly credits and per-model credit rates from MiMo docs (${mimo.updatedAt ?? "2026-09-21"}); model token prices not in the feeds yet, so cost per request stays empty`,
        disclosure: "disclosed",
        sourceIds: ["mimo-token-plan"],
        verifiedAt: "2026-09-21",
        priceSource: "official docs",
      });
    }
  }

  // --- StepFun Step Plan (Monats-Credits, Credits an den API-Preis gekoppelt) ---
  const stepfun = parsed["stepfun-step-plan"];
  if (stepfun?.plans?.length && stepfun?.creditsPerUsd) {
    const feedModels = ["Step 3.7 Flash", "Step 3.5 Flash"];
    for (const p of stepfun.plans) {
      add({
        id: `stepfun-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
        provider: "stepfun",
        name: `Step Plan ${p.name}`,
        price: {
          monthlyUsd: p.monthlyUsd,
          paidPrice: p.monthlyUsd,
          advertisedPrice: p.monthlyUsd,
          currency: "USD",
          yearlyUsd: p.yearlyUsd ?? null,
          altPrice: null,
          billingNote: `Quarterly $${p.quarterlyUsd}, yearly $${p.yearlyUsd}; credits are issued monthly and do not roll over`,
        },
        meter: "credits",
        quotas: [{ label: "Monthly", unit: "credits", amount: p.monthlyCredits, window: "month", refresh: "monthly", disclosure: "exact" }],
        tokenPricing: { source: "stepfun-step-plan", note: stepfun.note ?? "1 $ Modellnutzung ~ 7M Credits" },
        providerCost: {
          formula: `Credits = USD usage x ${stepfun.creditsPerUsd}`,
          creditsFromUsd: stepfun.creditsPerUsd,
          feedModels,
          note: "Official conversion from the Step Plan docs (1 $ of model usage is about 7M Credits)",
        },
        workload: { pattern: null, taskConversion: null },
        models: feedModels,
        dataTier: "A",
        dataTierNote: "Official monthly credits and official USD->credits conversion from StepFun docs",
        disclosure: "disclosed",
        sourceIds: ["stepfun-step-plan"],
        verifiedAt: "2026-09-23",
        priceSource: "official docs",
      });
    }
  }

  // --- Cerebras Code (Tageslimit in Tokens, 1 Credit = 1 Token) ---
  const cerebras = parsed["cerebras-code"];
  if (cerebras?.plans?.length) {
    for (const p of cerebras.plans) {
      add({
        id: `cerebras-code-${p.name.toLowerCase()}`,
        provider: "cerebras",
        name: `Cerebras Code ${p.name}`,
        price: {
          monthlyUsd: p.monthlyUsd,
          paidPrice: p.monthlyUsd,
          advertisedPrice: p.monthlyUsd,
          currency: "USD",
          yearlyUsd: null,
          altPrice: null,
          billingNote: "Daily token limit, no weekly window; rate limits subject to change",
        },
        meter: "tokens",
        quotas: [{ label: "Daily", unit: "tokens", amount: p.tokensPerDay, window: "day", refresh: "daily", disclosure: "exact" }],
        tokenPricing: { source: "cerebras-code", note: cerebras.note ?? "Tageslimit in Tokens" },
        providerCost: {
          formula: "Credits = tokens (1 credit per token), daily limit",
          divisor: 1,
          perModel: [{ model: cerebras.model ?? "Qwen3-Coder", input: 1, cachedRead: 1, output: 1 }],
          note: "Allowance is published in tokens per day; modelled as 1 credit per token",
        },
        workload: { pattern: null, taskConversion: null },
        models: [cerebras.model ?? "Qwen3-Coder"],
        dataTier: "A",
        dataTierNote: "Official daily token limit from the Cerebras Code announcement; model token prices are not in the feeds",
        disclosure: "disclosed",
        sourceIds: ["cerebras-code"],
        verifiedAt: "2026-09-23",
        priceSource: "official announcement",
      });
    }
  }

  // --- GitHub Copilot (AI Credits: 1 Credit = 0,01 $, Modellpreise aus der Doku) ---
  const cpBilling = parsed["copilot-billing"];
  const cpModels = parsed["copilot-models"];
  if (cpBilling?.plans?.length && cpModels?.models?.length) {
    const priceList = cpModels.models;
    for (const p of cpBilling.plans) {
      const usd = +(p.totalCredits * (cpBilling.creditValueUsd ?? 0.01)).toFixed(2);
      add({
        id: `copilot-${p.name.toLowerCase().replace("+", "-plus")}`,
        provider: "github",
        name: `GitHub Copilot ${p.name}`,
        price: {
          monthlyUsd: p.priceUsd,
          paidPrice: p.priceUsd,
          advertisedPrice: p.priceUsd,
          currency: "USD",
          yearlyUsd: null,
          altPrice: null,
          billingNote: `${p.totalCredits} AI credits per month (${p.baseCredits} base + ${p.flexCredits} flex, 1 credit = $0.01); unused credits do not roll over; completions are not billed`,
        },
        meter: "dollar_usage",
        quotas: [{ label: "Monthly", unit: "USD credits", amount: usd, window: "month", refresh: "monthly", disclosure: "exact" }],
        tokenPricing: { source: "copilot-models", note: "Token prices published by GitHub for every model Copilot offers" },
        localModelPricing: priceList,
        workload: { pattern: null, taskConversion: null },
        models: priceList.map((m) => m.model),
        dataTier: "A",
        dataTierNote: `Official AI credit allowance (${p.totalCredits} credits = $${usd}) and official per-model token prices from the GitHub Copilot docs`,
        disclosure: "disclosed",
        sourceIds: ["copilot-billing", "copilot-models"],
        verifiedAt: "2026-09-23",
        priceSource: "official docs",
      });
    }
  }

  // --- GitHub Copilot Business/Enterprise (Preis pro Sitz, Credits pro Nutzer) ---
  // Quelle: Docs-Plantabelle. Credits sind wie bei den Individual-Tarifen
  // 0,01 $ wert, die Modellpreise kommen aus derselben Copilot-Doku.
  const cpBiz = parsed["copilot-plans"];
  if (cpBiz?.plans?.length && cpModels?.models?.length) {
    const priceList = cpModels.models;
    for (const p of cpBiz.plans) {
      const usd = +(p.creditsPerUser * (cpBilling?.creditValueUsd ?? 0.01)).toFixed(2);
      add({
        id: `copilot-${p.name.toLowerCase()}`,
        provider: "github",
        name: `GitHub Copilot ${p.name}`,
        price: {
          monthlyUsd: p.priceUsd,
          paidPrice: p.priceUsd,
          advertisedPrice: p.priceUsd,
          currency: "USD",
          yearlyUsd: null,
          altPrice: null,
          billingNote: `${p.priceUsd} $ pro Sitz und Monat; ${p.creditsPerUser.toLocaleString()} AI-Credits pro Nutzer`,
        },
        meter: "dollar_usage",
        quotas: [{ label: "Monthly", unit: "USD credits", amount: usd, window: "month", refresh: "monthly", disclosure: "exact" }],
        tokenPricing: { source: "copilot-models", note: "Token-Preise von GitHub fuer alle Copilot-Modelle" },
        localModelPricing: priceList,
        workload: { pattern: null, taskConversion: null },
        models: priceList.map((m) => m.model),
        dataTier: "A",
        dataTierNote: `Official seat price and ${p.creditsPerUser.toLocaleString()} AI credits per user per month from the GitHub Copilot docs`,
        disclosure: "disclosed",
        sourceIds: ["copilot-plans", "copilot-models"],
        verifiedAt: "2026-09-23",
        priceSource: "official docs",
      });
    }
  }

  // --- Ollama Cloud (Dollar-Credits, eigene Token-Preise je Modell) ---
  const ollama = parsed["ollama-pricing"];
  if (ollama?.plans?.length && ollama?.models?.length) {
    for (const p of ollama.plans) {
      add({
        id: `ollama-${p.name.toLowerCase()}`,
        provider: "ollama",
        name: `Ollama Cloud ${p.name}`,
        price: {
          monthlyUsd: p.monthlyUsd,
          paidPrice: p.monthlyUsd,
          advertisedPrice: p.monthlyUsd,
          currency: "USD",
          yearlyUsd: p.name === "Pro" ? 200 : null,
          altPrice: null,
          billingNote: `$${p.creditsUsd} of usage credits per month; usage credits do not roll over`,
        },
        meter: "dollar_usage",
        quotas: [{ label: "Monthly", unit: "USD credits", amount: p.creditsUsd, window: "month", refresh: "monthly", disclosure: "exact" }],
        tokenPricing: { source: "ollama-pricing", note: "Model prices published by Ollama (per 1M tokens)" },
        localModelPricing: ollama.models,
        workload: { pattern: null, taskConversion: null },
        models: ollama.models.map((m) => m.model),
        dataTier: "A",
        dataTierNote: `Official credit allowance ($${p.creditsUsd}) and official model prices from the Ollama pricing page`,
        disclosure: "disclosed",
        sourceIds: ["ollama-pricing"],
        verifiedAt: "2026-09-23",
        priceSource: "official pricing page",
      });
    }
  }

  // Manuelle Notizen an bereits dynamisch gebaute Plaene haengen. Der Loop
  // darueber ueberspringt existierende ids, deshalb hier separat: eine Notiz
  // aus overrides.yml ist eine Ergaenzung, kein Ersatz fuer die Feed-Daten.
  for (const ov of overridesData?.overrides ?? []) {
    const plan = plans.find((p) => p.id === ov.id);
    if (!plan) continue;
    if (ov.note) plan.notes = ov.note;
    if (ov.noteDe) plan.notesDe = ov.noteDe;
    if (ov.tag) plan.tag = ov.tag;
    if (ov.tagDe) plan.tagDe = ov.tagDe;
    // Preis-Zuschlaege (z.B. Karten-Gebuehr): gehoeren sichtbar an den Preis
    if (ov.priceNote) plan.priceNote = ov.priceNote;
    if (ov.priceNoteDe) plan.priceNoteDe = ov.priceNoteDe;
    if (ov.priceNoteSource) plan.priceNoteSource = ov.priceNoteSource;
    // Fertiger Preis aus overrides.yml (Command Code: Preis inkl. Kartengebuehr)
    if (ov.price) plan.price = ov.price;
  }

  return plans;
}
function validatePlan(p) {
  const errors = [];
  for (const field of ["id", "provider", "name", "price", "meter", "quotas", "sourceIds", "verifiedAt"]) {
    if (!(field in p)) errors.push(`${p.id || "(unknown)"}: missing ${field}`);
  }
  if (p.price && typeof p.price.monthlyUsd !== "number") errors.push(`${p.id}: price.monthlyUsd must be number`);
  if (!Array.isArray(p.quotas)) errors.push(`${p.id}: quotas must be array`);
  return errors;
}

// ---------- Kostenmodell (ai-10-usd) ----------
function requestCost(model, pattern) {
  if (!model) return null; // Modell ohne Feed-Preis (z.B. nicht im ocgo/cc-Feed gelistet)
  const input = typeof model.input === "number" ? model.input : null;
  const cachedRead = typeof model.cachedRead === "number" ? model.cachedRead : null;
  const output = typeof model.output === "number" ? model.output : null;
  const cachedWrite = typeof model.cachedWrite === "number" ? model.cachedWrite : (input ?? null);
  if (input === null || cachedRead === null || output === null || !pattern) return null;
  if (pattern.input === undefined || pattern.cachedRead === undefined || pattern.output === undefined) return null;
  const inputPrice = 0.05 * input + 0.95 * cachedWrite;
  return (inputPrice * pattern.input + cachedRead * pattern.cachedRead + output * pattern.output) / 1_000_000;
}

function avg(values) {
  const usable = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : null;
}

function percentile(values, frac) {
  const sorted = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * frac;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function distribution(values) {
  const usable = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  return {
    count: usable.length,
    min: usable.length ? Math.min(...usable) : null,
    max: usable.length ? Math.max(...usable) : null,
    mean: avg(usable),
    median: percentile(usable, 0.5),
    p25: percentile(usable, 0.25),
    p75: percentile(usable, 0.75),
  };
}

// ---------- Modelle aus Feeds für einen Plan auswählen ----------
function modelsForPlan(plan, feeds) {
  const out = [];
  if (plan.id.startsWith("command-code")) {
    const cc = feeds["cc-pricing.json"];
    if (!cc?.models) return out;
    const planId = plan.id.replace("command-code-", "");
    // Eigene allowances vorhanden (goat/pro) ODER von GOAT abgeleitet (go/max10/max20).
    // WICHTIG (verifiziert mit offiziellem Calculator): Die Allowances sind DOLLAR-Werte
    // (1 Credit = $1 Nutzung; "premium models get $1 of usage per credit"). Der Calculator
    // zeigt je Modell: "($allowance ÷ $costPerRequest per request)" = Modell-Limit.
    // Die requestEstimate (~75K) ist die TYPISCHE Nutzung (Plan mix), NICHT die Summe
    // der Modell-Limits, also kein Summen-Anker, der die Limits verfälscht.
    const own = cc.models.some((m) => (m.allowances?.[planId] ?? null) != null);
    const thisPlan = cc.plans?.find((p) => p.id === planId);
    // Quelle der allowances: eigene (goat/pro) oder GOAT-skaliert (go/max10/max20)
    let sourceList = null;
    if (own) {
      sourceList = cc.models.map((m) => ({ m, allowance: m.allowances?.[planId] ?? null })).filter((x) => x.allowance != null);
    } else {
      const goatPlan = cc.plans?.find((p) => p.id === "goat");
      if (!goatPlan?.creditsMonthly || !thisPlan?.creditsMonthly) return out;
      const scale = thisPlan.creditsMonthly / goatPlan.creditsMonthly;
      sourceList = cc.models
        .map((m) => ({ m, allowance: (m.allowances?.goat ?? null) != null ? m.allowances.goat * scale : null }))
        .filter((x) => x.allowance != null);
    }
    if (!sourceList.length) return out;
    // Modell-Limit je Modell: allowance (Dollar) / cost ($/request), wie der Calculator.
    for (const { m, allowance } of sourceList) {
      out.push({
        name: m.name,
        allowance, // Dollar-Allowance (Modell-Limit)
        pattern: m.pattern ?? FALLBACK_PATTERN,
        pricing: m,
        allowanceIsDollar: true,
        officialPlanEstimate: thisPlan?.requestEstimate ?? null, // typische Nutzung (Referenz)
      });
    }
    return out;
  }
  if (plan.provider === "opencode") {
    const oc = feeds["ocgo-pricing.json"];
    if (!oc?.models) return out;
    // usage ist je Tarif ein Objekt ({go: 60, "go-plus": 180}); die alte Feed-Form
    // hatte eine Zahl (nur ein Tarif). Der Tarif-Key ist das id-Suffix.
    const planKey = plan.id.replace("opencode-", "");
    const usageOf = (m) => (typeof m.usage === "number" ? m.usage : (m.usage?.[planKey] ?? null));
    for (const m of oc.models) {
      const usage = usageOf(m);
      if (typeof usage !== "number" || usage <= 0) continue;
      out.push({ name: m.name, usage, pattern: m.pattern ?? FALLBACK_PATTERN, pricing: m, privacy: m.privacy ?? null });
    }
    return out;
  }
  // Generische Pläne: NUR Preis-Infos aus dem Feed nutzen (Token-Preise + Pattern sind
  // modelleigen, nicht plan-eigen). Die Allowance kommt aus dem Plan selbst.
  // providerCost: anbietereigene Credit-Formel (z.B. GLM) als Daten im Plan.
  // Formel: creditsPerRequest = (input×c_input + cachedRead×c_cached + output×c_output) / 10000
  // Angewendet auf das Pattern (aus Feed oder Fallback).
  // Plan-eigene Modellpreise: GitHub Copilot veroeffentlicht die Token-Preise aller
  // Modelle im eigenen Doku-Repo. Allowance ist ein Dollar-Volumen (AI Credits x 0,01 $),
  // die Rate kommt aus allowance / Kosten pro Request.
  // Dollar-Plaene: die Menge ist ein offizielles USD-Volumen (Credits = 1 USD,
  // enthaltene Nutzung in Dollar), die Modellpreise kommen aus der Plan-Quelle.
  // Requests = Volumen / Kosten pro Request bei den Preisen des Plans.
  if (plan.dollarPlan?.usd > 0 && plan.dollarPlan.models?.length) {
    for (const lm of plan.dollarPlan.models) {
      out.push({
        name: lm.model,
        allowance: plan.dollarPlan.usd,
        window: "month",
        pattern: FALLBACK_PATTERN,
        pricing: lm,
        usageInUsd: true,
      });
    }
    return out;
  }

  // Kiro: offizielle Credit-Multiplikatoren je Modell (relativ zu Auto = 1 Credit
  // pro Task). Requests = Credits des Tarifs / Multiplikator.
  if (plan.creditPlan?.credits > 0 && plan.creditPlan.multipliers?.length) {
    for (const m of plan.creditPlan.multipliers) {
      if (!(m.credits > 0)) continue;
      out.push({
        name: m.model,
        directRequests: Math.round(plan.creditPlan.credits / m.credits),
        directNote: `requests (official credit multiplier ${m.credits}x Auto)`,
        window: "month",
        pattern: FALLBACK_PATTERN,
        pricing: null,
      });
    }
    return out;
  }

  // Plaene mit offizieller Request-Menge (Amazon Q Free: 50 agentische Requests).
  if (plan.requestPlan?.requests > 0) {
    out.push({
      name: plan.requestPlan.label ?? "Agent requests",
      directRequests: plan.requestPlan.requests,
      directNote: plan.requestPlan.note ?? "requests (official monthly limit)",
      window: "month",
      pattern: FALLBACK_PATTERN,
      pricing: null,
    });
    return out;
  }

  // Gemessene Plaene: die Menge kommt aus einer Drittmessung in sichtbaren
  // Tokens, die Modellpreise vom Anbieter selbst. Requests = gemessene Token
  // geteilt durch unser Muster (FALLBACK_PATTERN), damit die Zeile mit allen
  // anderen Plaenen auf derselben Skala vergleichbar bleibt.
  if (plan.measured?.monthlyTokens > 0 && plan.localModelPricing?.length) {
    const tokensPerRequest = FALLBACK_PATTERN.input + FALLBACK_PATTERN.cachedRead + FALLBACK_PATTERN.output;
    const requests = Math.round(plan.measured.monthlyTokens / tokensPerRequest);
    for (const lm of plan.localModelPricing) {
      out.push({
        name: lm.model,
        directRequests: requests,
        directNote: plan.measured.directNote ?? "measured (third party)",
        window: "month",
        pattern: FALLBACK_PATTERN,
        pricing: lm,
        measured: true,
      });
    }
    return out;
  }

  if (plan.localModelPricing?.length) {
    const oc = feeds["ocgo-pricing.json"];
    const cc = feeds["cc-pricing.json"];
    const allModels = [...(oc?.models ?? []), ...(cc?.models ?? [])];
    const monthly = plan.quotas.find((q) => q.window === "month")?.amount ?? null;
    if (!(monthly > 0)) return out;
    for (const lm of plan.localModelPricing) {
      const match = allModels.find((m) => m.name && m.name.toLowerCase().includes(lm.model.toLowerCase()));
      out.push({
        name: lm.model,
        pricing: lm, // Preis aus der Plan-Quelle, nicht aus dem Feed
        pattern: match?.pattern ?? FALLBACK_PATTERN,
        allowance: monthly,
        window: "month",
        planLocalPrice: true,
      });
    }
    return out;
  }

  if (plan.providerCost?.perModel || plan.providerCost?.creditsFromUsd) {
    const oc = feeds["ocgo-pricing.json"];
    const cc = feeds["cc-pricing.json"];
    const allModels = [...(oc?.models ?? []), ...(cc?.models ?? [])];
    // Divisor: GLM rechnet Credits = (Tokens × Koeffizient)/10000, MiMo dagegen
    // direkt in Credits pro Token (Divisor 1). Default bleibt 10000.
    const divisor = plan.providerCost.divisor ?? 10000;
    // creditsFromUsd: Anbieter veroeffentlicht "1 $ Modellnutzung = N Credits"
    // (StepFun: 7M). Dann kommt der Credit-Preis aus dem API-Preis des Modells.
    const perModel = plan.providerCost.perModel
      ?? (plan.providerCost.feedModels ?? []).map((name) => ({ model: name, creditsFromUsd: plan.providerCost.creditsFromUsd }));
    for (const pc of perModel) {
      // find model pricing in feeds
      const match = allModels.find((m) => m.name && m.name.toLowerCase().includes(pc.model.toLowerCase()));
      const pattern = match?.pattern ?? FALLBACK_PATTERN;
      let creditCostPerReq;
      if (pc.creditsFromUsd) {
        const usdCost = requestCost(match, pattern);
        if (usdCost === null || !(usdCost > 0)) continue;
        creditCostPerReq = usdCost * pc.creditsFromUsd;
      } else {
        creditCostPerReq = (pattern.input * pc.input + pattern.cachedRead * pc.cachedRead + pattern.output * pc.output) / divisor;
      }
      if (!(creditCostPerReq > 0)) continue;
      for (const q of plan.quotas) {
        if (typeof q.amount !== "number" || q.amount <= 0) continue;
        out.push({
          name: pc.model,
          allowance: q.amount,
          window: q.window,
          pattern,
          pricing: match,
          providerCost: {
            formula: plan.providerCost.formula ?? "(input×a + cachedRead×b + output×c)/10000",
            creditsPerRequest: creditCostPerReq,
            offPeakDiscount: plan.providerCost.offPeakDiscount ?? null,
          },
        });
      }
    }
    return out;
  }

  // Kimi-Membership (providerCost mit monthlyPriceCny): offizielles Billing-Beispiel
  // "einfacher Request ~¥0.03" → requests/mo = monthlyPriceCNY / 0.03.
  // Modell-Kosten aus Feed für die Verteilung.
  // WICHTIG: totalRequests ist BEREITS eine Request-Anzahl → als directRequests markieren,
  // damit die generische Schleife sie NICHT noch einmal durch $/Request teilt (Doppeldivision).
  if (plan.providerCost?.monthlyPriceCny && plan.providerCost?.feedModels) {
    const oc = feeds["ocgo-pricing.json"];
    const cc = feeds["cc-pricing.json"];
    const allModels = [...(oc?.models ?? []), ...(cc?.models ?? [])];
    const totalRequests = plan.providerCost.monthlyPriceCny / plan.providerCost.requestCostCny;
    for (const modelName of plan.providerCost.feedModels) {
      const match = allModels.find((m) => m.name && m.name.toLowerCase().includes(modelName.toLowerCase()));
      if (!match) continue;
      const pattern = match.pattern ?? FALLBACK_PATTERN;
      out.push({
        name: match.name,
        directRequests: totalRequests, // BEREITS Requests/Monat, keine weitere Division
        directNote: "requests (price-based estimate: monthlyPriceCNY / ¥0.03)",
        window: "month",
        pattern,
        pricing: match,
        feedModel: true,
        fromOfficialBilling: true,
      });
    }
    return out;
  }

  // Generische feedModels-Pläne (Qwen Token, Kimi, MiniMax): Modelle aus dem Feed
  // mit Token-Preisen + Pattern. "1 Request" kostet die Modell-Token-Kosten
  // (ai-10-usd-Formel). Quota (Credits/7d) wird als Monats-Menge genutzt (≈ 4.33×).
  if (plan.feedModels?.length) {
    const oc = feeds["ocgo-pricing.json"];
    const cc = feeds["cc-pricing.json"];
    const allModels = [...(oc?.models ?? []), ...(cc?.models ?? [])];
    // Monats-Quota: 7d-Fenster × 4.33, Monats-Fenster × 1
    const quota = plan.quotas.find((q) => q.amount != null);
    if (!quota || typeof quota.amount !== "number" || quota.amount <= 0) return out;
    const monthly = quota.window === "rolling" || quota.window === "week" ? quota.amount * 4.33 : quota.amount;
    for (const entry of plan.feedModels) {
      // Eintrag ist entweder ein Modellname (Plan-Menge gilt fuer alle Modelle)
      // oder { model, usd }: eine je Modell veroeffentlichte Obergrenze in Dollar.
      const modelName = typeof entry === "string" ? entry : entry?.model;
      const cap = entry && typeof entry === "object" && entry.usd > 0 ? entry.usd : monthly;
      const match = findFeedModel(allModels, modelName, plan.modelMatch);
      if (!match) continue;
      const pattern = match.pattern ?? FALLBACK_PATTERN;
      out.push({
        name: match.name,
        allowance: cap, // Monats-Credits
        window: "month",
        pattern,
        pricing: match,
        feedModel: true,
      });
    }
    return out;
  }
  return out;
}

// ---------- Main ----------
async function main() {
  // ============ DYNAMISCHE QUELLEN (statt statischer plans.yml) ============
  // Die Plan-Definitionen werden zur Laufzeit aus den geparsten Quellen gebaut:
  //   - ocgo-pricing / cc-pricing (JSON-Feeds): Preise, Modelle, Allowances, Patterns
  //   - glm-coding-overview (HTML-Docs): Quoten, Credit-Formel, MCP, Off-Peak
  //   - qwen-* (HTML-Docs): Preise, Quoten, Task-Konvertierung
  //   - kimi-* (HTML-Docs): Preise (CNY), Quota-Regeln
  //   - data/overrides.yml: NUR nicht-scrapebares (GLM-Preise via API-Auth, MiniMax-SPA)
  const parsedDir = join(ROOT, "parsed");
  const parsedFiles = (await readdir(parsedDir)).filter((f) => f.endsWith(".json"));
  const parsed = {};
  for (const f of parsedFiles) {
    parsed[f.replace(/\.json$/, "")] = JSON.parse(await readFile(join(parsedDir, f), "utf8"));
  }

  const overridesYml = await readFile(join(ROOT, "data/overrides.yml"), "utf8");
  const overridesData = parseYaml(overridesYml);
  const overrides = Object.fromEntries((overridesData.overrides ?? []).map((o) => [o.id, o]));

  // Plan-Katalog dynamisch bauen
  const plans = buildPlanCatalog(parsed, overrides, overridesData);
  if (!plans.length) throw new Error("keine Pläne aus Quellen+Overrides aufgelöst");

  const errors = plans.flatMap(validatePlan);
  if (errors.length) {
    console.error("SCHEMA ERRORS:\n" + errors.join("\n"));
    process.exit(1);
  }

  // Feeds laden (aus parsed/, das aus cache/ kommt)
  const feeds = {
    "ocgo-pricing.json": parsed["ocgo-pricing"],
    "cc-pricing.json": parsed["cc-pricing"],
  };

  // Modell-Familien-Matching (ai-10-usd-Prinzip): pro gemeinsamer Familie vergleichen,
  // statt Plan-Mittelwerte (die teure/billige Modelle vermischen).
  const FAMILY_ALIASES = {
    "hy3": "tencent hy3", "hy4": "tencent hy4", "hy4 preview": "tencent hy4",
    "gpt 5.6 luna": "gpt-5.6 luna", "glm-5.3-flash": "glm-5.3 flash",
    "deepseek v4": "deepseek v4", "deepseek v4 vision exp": "deepseek v4 flash vision exp",
  };
  function familyOf(name) {
    let n = String(name).toLowerCase();
    n = n.replace(/\s*\(latest\)\s*/g, " ").replace(/\s*\(exp\)\s*/g, " exp")
         .replace(/\s*preview\s*$/, " preview");
    // strip tier/peak-offpeak/variant suffixes for family grouping
    const clean = n.replace(/\s*(off[- ]?peak|peak|highspeed|fast|contributor|preview|vision exp|exp)\s*$/, "")
                   .replace(/\s+/g, " ").trim();
    return FAMILY_ALIASES[clean] ?? clean;
  }

  const warnings = [];
  const rows = [];
  const planSummaries = [];

  // Pattern-Unifizierung (ai-10-usd-Fairnessregel): Für geteilte Familien nutze das
  // OpenCode-Go-Pattern (echte per-Modell-Tokenstatistik) für ALLE Provider, weil das
  // CC-Feed für fast alle Modelle nur das generische 800/50000/162-Pattern hat.
  const ocFeed = feeds["ocgo-pricing.json"];
  const patternByFamily = new Map();
  if (ocFeed?.models) {
    for (const m of ocFeed.models) {
      const fam = familyOf(m.name);
      if (m.pattern && !patternByFamily.has(fam)) patternByFamily.set(fam, m.pattern);
    }
  }
  function unifiedPattern(family, providerPattern) {
    const ocPat = patternByFamily.get(family);
    return ocPat ?? providerPattern ?? FALLBACK_PATTERN;
  }

  for (const plan of plans) {
    const models = modelsForPlan(plan, feeds);
    // Normalisierungs-Basis: USD. Bei CNY-Plänen (Kimi, GLM) ist der
    // paidPrice in CNY, aber die Normalisierung braucht den USD-Preis.
    // monthlyUsd (mit dokumentiertem Kurs umgerechnet) ist die korrekte Basis.
    const paid = plan.price.currency === "CNY" && plan.price.monthlyUsd
      ? plan.price.monthlyUsd
      : (plan.price.paidPrice ?? plan.price.monthlyUsd);
    const meterAmount = plan.meter === "dollar_usage"
      ? plan.quotas.find((q) => q.label === "Monthly")?.amount
      : plan.quotas.find((q) => q.window === "month")?.amount;

    const modelRows = [];
    for (const m of models) {
      const pattern = unifiedPattern(familyOf(m.name), m.pattern);
      const cost = requestCost(m.pricing, pattern);
      const allowance = m.allowance ?? m.usage ?? null;
      // directRequests sind BEREITS eine Request-Anzahl und brauchen kein Allowance-Gating
      // (und darf nicht noch einmal durch $/Request geteilt werden).
      if (m.directRequests == null && (allowance == null || allowance <= 0)) continue;
      let requests = null;
      let unit = "requests";
      if (m.directRequests != null) {
        // CC: offizielle Gesamtmenge (Kosten-Anteil) ODER Kimi: Preis-Basis-Schätzung (CNY/¥0.03)
        requests = m.directRequests;
        unit = m.directNote ?? "requests (official total, cost-share allocation)";
      } else if (m.providerCost) {
        // Anbieter-eigene Credit-Formel: Credits / Credits-pro-Request
        if (m.providerCost.creditsPerRequest > 0) {
          requests = allowance / m.providerCost.creditsPerRequest;
          unit = "requests (provider credit formula)";
        }
      } else if (cost !== null && cost > 0) {
        // Feed-Preise: Meter (USD oder Credits) / Kosten pro Request
        requests = allowance / cost;
      }
      if (requests === null || requests <= 0) continue;
      // Fenster-Korrektur (Methodik-Regel: "5h-Windows als Cap, nicht ×180"):
      // - Wochen-Credits sind die Monats-Basis: 1 Woche ≈ 4.33 Wochen/Monat
      // - Monats-Credits = 1× (bereits monatlich)
      // - 5h-Credits sind ROLLING-Caps (Durchsatz), KEINE Monats-Menge → nicht hochrechnen
      const window = m.window ?? null;
      let monthlyRequests = requests;
      let windowNote = null;
      if (window === "week") {
        monthlyRequests = requests * 4.33;
        windowNote = "weekly×4.33→monthly";
      } else if (window === "day") {
        // Tageslimits sind die Monatsbasis: 365.25/12 = 30.44 Tage
        monthlyRequests = requests * 30.44;
        windowNote = "daily×30.44→monthly";
      } else if (window === "5h") {
        // 5h-Cap bleibt als Durchsatz-Grenze; für Monats-Vergleich NICHT nutzen
        monthlyRequests = null;
        windowNote = "5h rolling cap (throughput), not a monthly volume";
      }
      if (monthlyRequests === null) continue;
      // Preis 0 (Freebuff-Gratis-Tarif): keine Rate pro $ möglich. Ehrlich null statt
      // Infinity (würde die Familien-Mediane und die Pareto-Front verfälschen).
      const normalized = paid > 0 ? monthlyRequests / paid : null; // pro 1 $ bezahlt (TARGET_PRICE=1)
      modelRows.push({
        model: m.name,
        family: familyOf(m.name),
        allowance,
        window,
        windowNote,
        costPerRequest: cost,
        patternUsed: pattern,
        creditsPerRequest: m.providerCost?.creditsPerRequest ?? null,
        unit,
        requestsPerMonth: monthlyRequests,
        requestsRawInWindow: requests,
        normalizedPer1: normalized,
        privacy: m.privacy ?? null,
        // Honesty: estimate from official billing examples, not a published limit
        estimate: m.fromOfficialBilling === true ? "price-based estimate (official billing example, not a published limit)" : null,
        // Derived: tokens per month = requests/month × tokens per request (from pattern).
        // Not an independently published quota; kept as rawTokensPerMonth for API
        // compatibility, with derivedTokensPerMonth as the honestly named alias.
        rawTokensPerMonth: monthlyRequests && pattern ? monthlyRequests * ((pattern.input || 0) + (pattern.cachedRead || 0) + (pattern.output || 0)) : null,
        derivedTokensPerMonth: monthlyRequests && pattern ? monthlyRequests * ((pattern.input || 0) + (pattern.cachedRead || 0) + (pattern.output || 0)) : null,
      });
    }

    // Fenster-Obergrenze: 5h-Windows als Cap, nicht ×180
    const h5 = plan.quotas.find((q) => q.window === "5h");
    const weekly = plan.quotas.find((q) => q.window === "week");
    const monthly = plan.quotas.find((q) => q.window === "month");
    const windowCaps = {
      h5: h5?.amount ?? null,
      weekly: weekly?.amount ?? null,
      monthly: monthly?.amount ?? null,
    };

    planSummaries.push({
      id: plan.id,
      name: plan.name,
      provider: plan.provider,
      price: {
        monthlyUsd: plan.price.monthlyUsd ?? null,
        paidPrice: plan.price.paidPrice ?? paid, // Original-Preis (CNY bei Kimi)
        advertised: plan.price.advertisedPrice ?? plan.price.monthlyUsd,
        currency: plan.price.currency ?? "USD",
        monthlyCny: plan.price.monthlyCny ?? null,
        altPrice: plan.price.altPrice ?? null,
        yearlyUsd: plan.price.yearlyUsd ?? null,
        waitlist: plan.price.waitlist ?? null,
        billingNote: plan.price.billingNote ?? null,
      },
      meter: plan.meter,
      quotas: plan.quotas,
      windowCaps,
      officialConversion: plan.workload?.taskConversion ?? null,
      disclosure: plan.disclosure,
      sourceIds: plan.sourceIds ?? [],
      verifiedAt: plan.verifiedAt ?? null,
      modelCount: modelRows.length,
      modelStats: plan.disclosure === "undisclosed" ? null : (modelRows.length ? distribution(modelRows.map((r) => r.requestsPerMonth)) : null),
      // Datenqualitäts-Tier für die Mengen-Basis:
      // A = offizielle Quota-Menge (usage/allowances/quotas aus Feed/Docs)
      // B = offizielle Gesamtmenge als Anker (requestEstimate normiert)
      // C = abgeleitet (skaliert ohne offiziellen Anker)
      // D = preisbasiert (keine veröffentlichte Menge, Preis÷Kosten)
      dataTier: plan.dataTier ?? null,
      dataTierNote: plan.dataTierNote ?? null,
      // Manuelle Hinweise aus overrides.yml (z.B. "kein API-Zugang"): reisen mit
      // in den Plan-Summaries, sonst erreichen sie die Seite nicht.
      notes: plan.notes ?? null,
      notesDe: plan.notesDe ?? null,
      priceNote: plan.priceNote ?? null,
      priceNoteDe: plan.priceNoteDe ?? null,
      priceNoteSource: plan.priceNoteSource ?? null,
      tag: plan.tag ?? null,
      tagDe: plan.tagDe ?? null,
      modelRows,
    });

    if (modelRows.length === 0 && plan.disclosure === "disclosed") {
      warnings.push(`${plan.id}: no model pricing from feeds (meter=${plan.meter}), raw quotas only, no request normalization`);
    }
  }

  // Vergleichbarkeit: Paarweise Draw-Analyse über die normalisierten Requests
  const comparablePlans = planSummaries.filter((p) => p.modelStats && p.modelStats.mean > 0);
  const pairwise = [];
  for (let i = 0; i < comparablePlans.length; i++) {
    for (let j = i + 1; j < comparablePlans.length; j++) {
      const a = comparablePlans[i], b = comparablePlans[j];
      const ratio = a.modelStats.mean / b.modelStats.mean;
      const advantagePct = Math.abs(ratio - 1) * 100;
      pairwise.push({
        planA: a.id,
        planB: b.id,
        meanRequestsA: a.modelStats.mean,
        meanRequestsB: b.modelStats.mean,
        advantagePercent: advantagePct,
        winner: advantagePct < DRAW_THRESHOLD_PERCENT ? "draw" : (a.modelStats.mean > b.modelStats.mean ? a.id : b.id),
      });
    }
  }

  // Baue Modell-Vergleichszeilen: pro Plan, pro Familie der Median der pro-$ Requests
  const modelComparisons = [];

  for (const plan of planSummaries) {
    if (!plan.modelRows?.length) continue;
    const famMap = new Map();
    for (const r of plan.modelRows) {
      if (typeof r.normalizedPer1 !== "number") continue; // Gratis-Tarif: keine Rate pro $
      const fam = familyOf(r.model);
      const arr = famMap.get(fam) ?? [];
      arr.push(r.normalizedPer1);
      famMap.set(fam, arr);
    }
    for (const [fam, vals] of famMap) {
      modelComparisons.push({
        planId: plan.id,
        family: fam,
        modelCount: vals.length,
        normalizedPer1Median: percentile(vals, 0.5),
        normalizedPer1Mean: avg(vals),
      });
    }
  }
  // Paarweise Familien-Vergleiche zwischen Feed-Plänen (haben echte Modell-Preise)
  const feedPlans = planSummaries.filter((p) => ["opencode-go", "command-code-goat", "command-code-pro"].includes(p.id));
  const familyComparisons = [];
  for (let i = 0; i < feedPlans.length; i++) {
    for (let j = i + 1; j < feedPlans.length; j++) {
      const a = feedPlans[i], b = feedPlans[j];
      const aFams = new Map(modelComparisons.filter((m) => m.planId === a.id).map((m) => [m.family, m]));
      const bFams = new Map(modelComparisons.filter((m) => m.planId === b.id).map((m) => [m.family, m]));
      const shared = [...aFams.keys()].filter((f) => bFams.has(f));
      for (const fam of shared) {
        const ma = aFams.get(fam).normalizedPer1Median;
        const mb = bFams.get(fam).normalizedPer1Median;
        if (ma == null || mb == null || ma <= 0 || mb <= 0) continue;
        const advantagePct = Math.abs(ma / mb - 1) * 100;
        familyComparisons.push({
          family: fam,
          planA: a.id,
          planB: b.id,
          requestsA: ma,
          requestsB: mb,
          advantagePercent: advantagePct,
          winner: advantagePct < DRAW_THRESHOLD_PERCENT ? "draw" : (ma > mb ? a.id : b.id),
        });
      }
    }
  }

  // Quellen, deren Snapshot zu alt ist (Fetch fehlgeschlagen und Fallback auf den letzten
  // Stand): als Warnung ausweisen, statt frische Daten vorzutaeuschen.
  const staleSources = loadStaleSources(ROOT);
  for (const s of staleSources) {
    warnings.push(`${s.id}: snapshot ${s.hours}h old (${s.fetchedAt.slice(0, 10)}), this source did not update`);
  }

  const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    targetMonthlyPrice: TARGET_PRICE,
    methodology: {
      basis: "Official raw data + provider credit formulas + workload patterns. '60 for 10' is only the sticker value; comparability comes from base credits (token prices) + cache model + pattern.",
      costPerRequest: "(0.05×input + 0.95×cachedWrite)×pattern.input + cachedRead×pattern.cachedRead + output×pattern.output, /1M",
      normalizedMetric: "requests and tokens per $1 paid (rate, not a purchasable multiple, subscriptions are single per account, no stacking)",
      derivedMetrics: "rawTokensPerMonth (alias: derivedTokensPerMonth) is derived as requestsPerMonth × tokens-per-request from the workload pattern, not an independently published quota.",
      fallbackPattern: FALLBACK_PATTERN,
      drawThresholdPercent: DRAW_THRESHOLD_PERCENT,
      patternUnification: "For shared model families the OpenCode-Go pattern (real per-model token statistics) is used for both providers; the CC feed otherwise reuses one generic 800/50000/162 pattern, which would skew costs.",
      fenster: "5h windows are throughput caps, never multiplied into monthly volumes; weekly credits scale ×4.33 to monthly; undisclosed stays undisclosed; no direct credit conversion between providers.",
    },
    sources: Object.fromEntries(Object.entries(feeds).map(([k, v]) => [k, v.fetchedAt ?? null])),
    staleSources,
    plans: planSummaries,
    pairwiseComparisons: pairwise,
    modelComparisons,
    familyComparisons,
    aiScores: (() => { const s = loadAiScores(ROOT); const added = applyScoreAliases(s.scores, planSummaries); s.count += added.size; return s; })(),
    privacy: loadPrivacy(ROOT),
    changelog: loadChangelog(ROOT),
    fx: parsed["fx-rates"] ?? { base: "USD", rates: { EUR: 0.86, CNY: 6.75, GBP: 0.74, JPY: 160 } },
    statistics: {
      totalPlans: plans.length,
      comparablePlans: comparablePlans.length,
      plansWithModels: planSummaries.filter((p) => p.modelCount > 0).length,
      undisclosed: planSummaries.filter((p) => p.disclosure === "undisclosed").length,
      sourceCount: (() => {
        // Definierte Quellen aus sources.yml (nicht nur die zwei Feeds im Build)
        try {
          const sy = parseYaml(readFileSync(join(ROOT, "sources.yml"), "utf8"));
          return Array.isArray(sy.sources) ? sy.sources.length : null;
        } catch (e) { return null; }
      })(),
    },
    warnings,
  };

  const outPath = join(ROOT, "public/data/latest.json");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Generated ${outPath}: ${plans.length} plans, ${comparablePlans.length} comparable, ${warnings.length} warnings`);
  for (const w of warnings) console.log("  WARN:", w);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// AI-Scores aus LLM Stats Leaderboard Index: conservative (0-100)
// Feed-Modellnamen werden automatisch per Fuzzy-Match auf Scores gemappt.
function loadAiScores(root) {
  const result = { source: "LLM Stats (zeroeval.com)", fetchedAt: null, count: 0, scores: {} };
  try {
    const mPath = join(root, "parsed", "llm-stats-indexes.json");
    const m = JSON.parse(readFileSync(mPath, "utf8"));
    if (m?.scores && Object.keys(m.scores).length > 0) {
      result.fetchedAt = m.fetchedAt ?? null;
      result.source = m.source ?? result.source;
      for (const [slug, s] of Object.entries(m.scores)) {
        if (s.intelligence != null) {
          result.scores[slug] = { intelligence: s.intelligence };
          result.count++;
        }
      }
    }
  } catch (e) { /* kein parsed */ }

  return result;
}

// Quellen mit zu altem Snapshot (STALE_SOURCE_HOURS). Quelle ist das Manifest aus dem
// Fetch-Lauf; fehlt es (frischer Checkout ohne cache/), gibt es nichts zu melden.
const STALE_SOURCE_HOURS = 48;
function loadStaleSources(root) {
  try {
    const m = JSON.parse(readFileSync(join(root, "cache/manifest.json"), "utf8"));
    const now = Date.now();
    return Object.values(m.sources ?? {})
      .filter((s) => s.fetchedAt && (now - new Date(s.fetchedAt).getTime()) / 3600000 > STALE_SOURCE_HOURS)
      .map((s) => ({ id: s.id, fetchedAt: s.fetchedAt, hours: Math.round((now - new Date(s.fetchedAt).getTime()) / 3600000) }))
      .sort((a, b) => b.hours - a.hours);
  } catch { return []; }
}

// Fuzzy-Match: Feed-Modellname → Score-Slug aus vorhandenen Scores.
// Build bereitet die Scores vor, damit das Frontend nur noch lookup braucht.
// Phasen (strikte Reihenfolge, exakte Normalisierungen schlagen unscharfe
// Prefix-Treffer, damit z.B. "Muse Spark 1.3 Contributor" auf muse-spark-1-3
// (54.41) zeigt und nicht auf den generischen muse-spark-Key (41.72):
//   Phase 1: exakter Slug-Match über ALLE Kandidaten (roh, Family, ohne
//     Klammern/Provider-Prefixe/"contributor"-Suffixe/Datum/Kürzungen)
//   Phase 2: Compact-Match (ohne Trennzeichen) über alle Kandidaten
//   Phase 3: Prefix-Match (kürzester Key, z.B. "deepseek-v4-flash-0423"
//     vor "deepseek-v4-flash-vision-exp")
//   Phase 4: Word-Overlap (meiste gemeinsame Wörter)
function fuzzyScoreMatch(rawName, family, scores) {
  const raw = (rawName ?? family ?? "").toLowerCase();
  const keys = Object.keys(scores);
  if (keys.length === 0) return null;
  // Alias-Einträge (fallback) sind nie Match-Ziele: Treffer landen immer auf
  // originalen Leaderboard-Keys, sonst entstehen Ketten-Aliase (Alias → Alias)
  // und Versions-Sprünge wie qwen-3-6 → qwen-3-8. Direkte Slug-Hits (Phase 1)
  // bleiben erlaubt, weil der Build sie vorberechnet und flaggt.

  // Helfer: Slug normalisieren
  const slug = (s) => s.replace(/\./g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const compact = (s) => s.replace(/[^a-z0-9]/g, "");
  const words = (s) => s.split(/[\s-]+/).filter(Boolean);
  const commonWords = (a, b) => words(a).filter(w => w.length > 1 && words(b).includes(w)).length;

  // Kandidaten generieren
  const candidates = [];
  // 1. Roh-Slug
  candidates.push(slug(raw));
  // 2. Family-Slug
  if (family) candidates.push(slug(family.toLowerCase()));
  // 3. Ohne Klammern: "(latest)" → "", "(exp)" → ""
  const noParen = raw.replace(/\([^)]*\)/g, "").trim();
  if (noParen !== raw) candidates.push(slug(noParen));
  // 4. Ohne bekannte Provider-Prefixe
  const PREFIXES = ["tencent ", "alibaba ", "google ", "openai ", "anthropic ", "meta "];
  for (const p of PREFIXES) {
    if (noParen.startsWith(p)) candidates.push(slug(noParen.slice(p.length)));
  }
  // 5. Ohne "contributor" / "preview" / "highspeed" / "fast" Suffixe
  const noSuffix = noParen.replace(/\s+(contributor|preview|highspeed|fast|latest|exp)\s*$/i, "").trim();
  if (noSuffix !== noParen) candidates.push(slug(noSuffix));
  // 6. Ohne Datums-Suffix (4-stellige Zahl am Ende)
  const noDate = noParen.replace(/[\s-]+\d{4}$/, "").trim();
  if (noDate !== noParen) candidates.push(slug(noDate));
  // 7. Sukzessive Kürzung: letztes Wort entfernen
  let parts = words(noParen);
  while (parts.length > 2) {
    parts.pop();
    candidates.push(slug(parts.join(" ")));
  }

  // Match gegen Scores, Phasen strikt nacheinander, jede über alle Kandidaten.
  // Ein generischer Prefix-Treffer (z.B. "muse-spark") darf nie eine exakte
  // Normalisierung (z.B. "muse-spark-1-3") verdrängen.
  const uniq = [...new Set(candidates.filter(Boolean))];
  const solid = keys.filter((k) => !scores[k]?.fallback);
  // Phase 1: exakte Treffer
  for (const c of uniq) {
    if (scores[c]) return c;
  }
  // Phase 2: Compact-Match (ohne Trennzeichen)
  for (const c of uniq) {
    const cc = compact(c);
    if (cc.length >= 4) {
      const found = solid.find(k => compact(k) === cc);
      if (found) return found;
    }
  }
  // Phase 3: Prefix-Match (kürzester Key zuerst)
  for (const c of uniq) {
    // Prefix match: kürzeste passende Key nehmen (z.B. "deepseek-v4-flash-0423" vor "deepseek-v4-flash-vision-exp")
    const prefix = solid.filter(k => k === c || k.startsWith(c + "-") || c.startsWith(k + "-"))
      .sort((a, b) => a.length - b.length)[0];
    if (prefix) return prefix;
  }

  // 8. Word-Overlap: finde Score-Key mit meisten gemeinsamen Wörtern
  const rawWords = words(noParen);
  let best = null, bestOverlap = 0;
  for (const k of solid) {
    const overlap = commonWords(k, noParen);
    if (overlap >= 2 && overlap > bestOverlap) {
      bestOverlap = overlap;
      best = k;
    }
  }
  return best;
}

// Wende Fuzzy-Match auf alle Feed-Modelle an, damit Scores direkt auffindbar sind.
// Jeder hinzugefügte Alias trägt Provenance (aliasOf + fallback), damit das
// Frontend ihn mit "~" markiert statt als exakten Leaderboard-Wert auszugeben.
function applyScoreAliases(scores, plans) {
  const added = new Set();
  const slug = (s) => s.toLowerCase().replace(/\./g, "-").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  for (const plan of plans) {
    for (const row of plan.modelRows ?? []) {
      const match = fuzzyScoreMatch(row.model, row.family, scores);
      if (match) {
        const modelSlug = slug(row.model);
        if (!scores[modelSlug]) {
          // Transitive Auflösung: aliasOf zeigt immer auf den originalen
          // Leaderboard-Key, nie auf einen anderen Alias.
          const root = scores[match].aliasOf ?? match;
          scores[modelSlug] = { intelligence: scores[match].intelligence, aliasOf: root, fallback: true };
          added.add(modelSlug);
        }
      }
    }
  }
  return added;
}

// Changelog aus data/changelog.yml laden (von scripts/changelog-from-git.mjs
// aus der Git-Historie erzeugt, die CI schreibt sie vor jedem Build neu)
function loadChangelog(root) {
  try {
    const raw = readFileSync(join(root, "data", "changelog.yml"), "utf8");
    const parsed = parseYaml(raw);
    // text = Deutsch (Bestand), textEn = Englisch. Beide durchreichen, die UI
    // waehlt nach Sprache.
    const entries = (parsed.entries ?? [])
      .filter((e) => e.date && (e.text || e.textEn))
      // commit = Kurz-SHA, aus dem der Eintrag stammt (die UI verlinkt ihn)
      .map((e) => ({ date: e.date, commit: e.commit ?? null, text: e.text ?? null, textEn: e.textEn ?? null }));
    return { entries };
  } catch (e) {
    console.warn("WARN: changelog.yml nicht lesbar:", e.message);
    return { entries: [] };
  }
}

// Privacy-Aussagen aus data/privacy.yml laden (selbst erhoben, offizielle Quellen)
function loadPrivacy(root) {
  const entries = [];
  // 1. Statische Basis aus data/privacy.yml (selbst erhoben, für alle Anbieter)
  try {
    const raw = readFileSync(join(root, "data", "privacy.yml"), "utf8");
    const parsed = parseYaml(raw);
    entries.push(...(parsed.privacy ?? []));
  } catch (e) {
    console.warn("WARN: privacy.yml nicht lesbar:", e.message);
  }
  // 2. Geparste Privacy-Quellen (aus Crawl) ergänzen/überschreiben, z.B. Command Code
  //    aus der offiziellen Policy, automatisch extrahiert statt manuell.
  try {
    const parsedFile = join(root, "parsed", "privacy-command-code.json");
    const parsed = JSON.parse(readFileSync(parsedFile, "utf8"));
    if (parsed?.provider) {
      const idx = entries.findIndex((e) => e.provider === parsed.provider);
      const entry = {
        provider: parsed.provider,
        scope: "provider",
        training: parsed.training,
        trainingNote: parsed.trainingQuote ? parsed.trainingQuote.slice(0, 200) : null,
        zeroRetention: parsed.zeroRetention,
        zeroRetentionNote: parsed.zeroRetentionQuote ? parsed.zeroRetentionQuote.slice(0, 200) : null,
        retentionDays: parsed.retentionDays,
        retentionNote: parsed.retentionQuote ? parsed.retentionQuote.slice(0, 200) : null,
        sourceUrl: "https://commandcode.ai/privacy",
        verifiedAt: new Date().toISOString().slice(0, 10),
        crawled: true,
      };
      if (idx >= 0) entries[idx] = entry;
      else entries.push(entry);
    }
  } catch (e) {
    // Kein geparstes Privacy → statische Daten bleiben
  }
  return entries;
}
