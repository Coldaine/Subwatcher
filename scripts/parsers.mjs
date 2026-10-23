/**
 * parsers.mjs, Parser für alle Quellen aus sources.yml.
 * Jeder Parser nimmt den rohen Snapshot (Buffer/String) und liefert strukturierte Daten.
 * Deterministisch: gleicher Input → gleicher Output. Kein Netzwerk hier.
 */
import { parseYaml } from "./yaml.mjs";

// ---------- HTML → Text-Helfer ----------
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function findSection(text, startKw, endKws = []) {
  // Letztes Vorkommen (TOC-Erwähnungen überspringen, echte Section ist meist die letzte)
  const start = text.lastIndexOf(startKw);
  if (start < 0) return null;
  let end = text.length;
  for (const kw of endKws) {
    const idx = text.indexOf(kw, start + startKw.length);
    if (idx >= 0 && idx < end) end = idx;
  }
  return text.slice(start, end);
}

// ---------- Parser: fx-rates (Währungskurse, JSON) ----------
// Extrahiert NUR die relevanten Währungen → stabiler, kleiner Output
// (volles rates-Objekt würde bei jedem API-Refresh den contentHash ändern).
const FX_CURRENCIES = ["EUR", "CNY", "GBP", "JPY"];
export function parseFx(raw) {
  const data = JSON.parse(raw);
  const rates = data?.rates ?? {};
  const out = { base: data?.base_code ?? "USD", updatedAt: data?.time_last_update_utc ?? null, rates: {} };
  for (const c of FX_CURRENCIES) {
    if (typeof rates[c] === "number" && rates[c] > 0) out.rates[c] = rates[c];
  }
  return out;
}

// ---------- Parser: ocgo-pricing (JSON) ----------
export function parseOcgo(raw) {
  const data = JSON.parse(raw);
  return {
    // KEIN fetchedAt, volatiler Timestamp, würde contentHash falsch-positiv machen.
    sourceUrl: data.sourceUrl,
    // Tarif-Liste aus dem Feed (seit 09/2026: Go $10 / Go Plus $40). Nicht hart
    // kodieren: ein neu eingeschobener Tarif würde sonst still aus dem Katalog fallen.
    plans: (data.plans ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly ?? null,
      creditsMonthly: p.creditsMonthly ?? null,
      sourceUrl: p.sourceUrl ?? null,
    })),
    monthlyCredit: data.monthlyCredit,
    monthlyCost: data.monthlyCost,
    peakHours: data.peakHours,
    models: (data.models ?? []).map((m) => ({
      name: m.name,
      tier: m.tier ?? null,
      input: m.input,
      output: m.output,
      cachedRead: m.cachedRead,
      cachedWrite: m.cachedWrite ?? null,
      // usage ist seit dem Tarif-Split ein Objekt ({go, "go-plus"}), vorher eine Zahl.
      usage: m.usage,
      multiplier: m.multiplier ?? null,
      pattern: m.pattern ?? null,
      effectiveInput: m.effectiveInput ?? null,
      effectiveOutput: m.effectiveOutput ?? null,
      effectiveCachedRead: m.effectiveCachedRead ?? null,
      effectiveCachedWrite: m.effectiveCachedWrite ?? null,
      provider: m.provider ?? null,
      privacy: m.privacy ?? null,
    })),
  };
}

// ---------- Parser: cc-pricing (JSON) ----------
export function parseCc(raw) {
  const data = JSON.parse(raw);
  return {
    // KEIN fetchedAt, volatiler Timestamp, würde contentHash falsch-positiv machen.
    sourceUrl: data.sourceUrl,
    plans: (data.plans ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly,
      creditsMonthly: p.creditsMonthly,
      requestEstimate: p.requestEstimate ?? null,
      apiAccess: p.apiAccess ?? null,
      limits: p.limits ?? null,
      defaultAllowance: p.defaultAllowance ?? null,
      modelsIncluded: p.modelsIncluded ?? null,
      sourceUrl: p.sourceUrl ?? null,
    })),
    models: (data.models ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider ?? null,
      category: m.category ?? null,
      tier: m.tier ?? null,
      input: m.input,
      output: m.output,
      cachedRead: m.cachedRead,
      cachedWrite: m.cachedWrite ?? null,
      listInput: m.listInput ?? null,
      listOutput: m.listOutput ?? null,
      allowances: m.allowances ?? null,
      pattern: m.pattern ?? null,
      deal: m.deal ?? null,
      availability: m.availability ?? null,
    })),
  };
}

// ---------- Parser: GLM Coding Plan Overview (HTML) ----------
export function parseGlmOverview(html) {
  const text = htmlToText(html);
  const out = { quotas: [], formula: null, mcpPerCall: null, offPeakDiscount: null, models: [] };

  // Quoten: "Lite 套餐 2,000 10,000" Tabelle, direkt im Text suchen (Section-Grenzen sind fragil)
  const quotaRe = /(Lite|Pro|Max)\s*套餐\s*([\d,]+)\s*([\d,]+)/g;
  let qm;
  const seenTiers = new Set();
  while ((qm = quotaRe.exec(text))) {
    const tier = qm[1].toLowerCase();
    if (seenTiers.has(tier)) continue; // nur erste (echte) Tabelle
    seenTiers.add(tier);
    out.quotas.push({
      tier,
      h5: parseInt(qm[2].replace(/,/g, ""), 10),
      weekly: parseInt(qm[3].replace(/,/g, ""), 10),
    });
  }

  // Formel: "模型消耗积分数=（输入 Token × Input 抵扣系数 + 缓存命中 Token × Cached Input 抵扣系数 + 输出 Token × Output 抵扣系数） / 10000"
  const formulaSection = findSection(text, "积分抵扣计算方式", ["可用额度参考"]);
  if (formulaSection) {
    // Tabelle: "模型 GLM-5.3 6.9 1.7 24" und "GLM-5.3-Flash（含视觉理解 MCP） 2.3 0.56 8"
    const modelRe = /GLM-([\d.]+(?:-Flash)?)[^]*?([\d.]+)\s+([\d.]+)\s+([\d.]+)/g;
    let m;
    while ((m = modelRe.exec(formulaSection))) {
      out.models.push({ model: `GLM-${m[1]}`, input: parseFloat(m[2]), cachedRead: parseFloat(m[3]), output: parseFloat(m[4]) });
    }
    // MCP: "MCP 工具 联网搜索 -, 1.2"
    const mcpRe = /MCP\s*工具\s*联网搜索\s*-\s*-\s*([\d.]+)/;
    const mcpM = mcpRe.exec(formulaSection);
    if (mcpM) out.mcpPerCall = parseFloat(mcpM[1]);
    out.formula = "模型消耗积分数=（输入 Token × Input 抵扣系数 + 缓存命中 Token × Cached Input 抵扣系数 + 输出 Token × Output 抵扣系数）/ 10000";
  }

  // Off-Peak: "非高峰时段内，模型调用按基础积分消耗的 50% 抵扣"
  if (text.includes("非高峰时段内，模型调用按基础积分消耗的 50% 抵扣")) {
    out.offPeakDiscount = 0.5;
  }

  return out;
}

// ---------- Parser: Qwen Docs (HTML) ----------
export function parseQwenDocs(html) {
  const text = htmlToText(html);
  const out = { plans: [], taskConversion: null };
  // Preise + Quoten: "Price $ 50 /month Quota Up to 6,000 requests per 5 hours ..."
  const priceRe = /Price\s*\$?\s*([\d.]+)\s*\/month/g;
  const quota5hRe = /Up to\s*([\d,]+)\s*requests per 5 hours/g;
  const quotaWeekRe = /Up to\s*([\d,]+)\s*requests per week/g;
  const quotaMonthRe = /Up to\s*([\d,]+)\s*requests per month/g;
  let m;
  const prices = [];
  while ((m = priceRe.exec(text))) prices.push(parseFloat(m[1]));
  const q5h = [...text.matchAll(quota5hRe)].map((x) => parseInt(x[1].replace(/,/g, ""), 10));
  const qw = [...text.matchAll(quotaWeekRe)].map((x) => parseInt(x[1].replace(/,/g, ""), 10));
  const qm = [...text.matchAll(quotaMonthRe)].map((x) => parseInt(x[1].replace(/,/g, ""), 10));
  if (prices.length) {
    out.plans.push({ name: "Coding Plan Pro", price: prices[0], quota5h: q5h[0] ?? null, quotaWeek: qw[0] ?? null, quotaMonth: qm[0] ?? null });
  }
  const conv = /Simple tasks typically use\s*([\d–-]+)\s*calls?, while complex tasks may use\s*([\d–-]+)\s*or more/i.exec(text);
  if (conv) out.taskConversion = `simple ${conv[1]} calls, complex ${conv[2]}+ calls`;
  return out;
}

// ---------- Parser: Qwen Token Personal (HTML) ----------
export function parseQwenTokenPersonal(html) {
  const text = htmlToText(html);
  const out = { plans: [], extraBundle: null };
  const prices = [...text.matchAll(/Original price \$([\d.]+)\/month\s*Limited-time \$([\d.]+)\/month/g)].map((m) => ({ original: parseFloat(m[1]), limited: parseFloat(m[2]) }));
  // Tier-Namen dynamisch aus der Preistabelle (Namensliste steht VOR dem ersten
  // "Original price"-Block). Positional hart kodierte Namen waren der Bug: als
  // Qwen einen "Essential"-Tarif zwischen Lite und Standard einfügte, wanderten
  // die Preise in die falschen Tarife und der Pro-Tarif fiel raus.
  const tableHead = prices.length ? text.slice(0, text.indexOf("Original price")) : "";
  const names = [...tableHead.matchAll(/([A-Z][a-z]+) plan\b/g)].map((m) => m[1]);
  // Quoten: Block reicht von "7-day quota" bis "Concurrent Agents" (nicht fixe 200
  // Zeichen, sonst fehlt der letzte Tarif sobald ein Tarif dazukommt).
  const quotaIdx = text.indexOf("7-day quota");
  const quotaEnd = text.indexOf("Concurrent Agents", quotaIdx);
  const quotaText = quotaIdx >= 0 ? text.slice(quotaIdx, quotaEnd > quotaIdx ? quotaEnd : quotaIdx + 400) : text;
  const quotas = [...quotaText.matchAll(/([\d,]+)\s*Credits/g)].map((m) => parseInt(m[1].replace(/,/g, ""), 10));
  prices.forEach((p, i) => {
    out.plans.push({ name: names[i] ?? `Plan ${i + 1}`, originalPrice: p.original, limitedPrice: p.limited, quota7d: quotas[i] ?? null });
  });
  const bundle = /\$([\d.]+)\/bundle\/month\s*([\d,]+)\s*Credits\/bundle/.exec(text);
  if (bundle) out.extraBundle = { price: parseFloat(bundle[1]), credits: parseInt(bundle[2].replace(/,/g, ""), 10) };
  return out;
}


// ---------- Parser: Xiaomi MiMo Token Plan (HTML-Docs) ----------
// Zwei Tabellen: Tarife (Monat/Jahr, Credits) und Verbrauchsregeln
// (Credits pro Token je Modell: Cache-Hit, Cache-Miss, Output).
export function parseMimo(html) {
  const text = htmlToText(html);
  const out = { plans: [], models: [], updatedAt: null, taskConversion: null, note: null };
  const monthly = text.slice(text.indexOf("Monthly Plan"), text.indexOf("Annual Package"));
  const annual = text.slice(text.indexOf("Annual Package"), text.indexOf("Team Edition"));
  const tierNames = ["Lite", "Standard", "Pro", "Max"];
  const prices = [...monthly.matchAll(/\$([\d.]+)\/month/g)].map((m) => parseFloat(m[1]));
  const credits = [...monthly.matchAll(/([\d.]+) billion Credits/g)].map((m) => Math.round(parseFloat(m[1]) * 1e9));
  const yearly = [...annual.matchAll(/\$([\d,.]+)\/year|USD ([\d,.]+)\/year/g)].map((m) => parseFloat((m[1] ?? m[2]).replace(/,/g, "")));
  const yearlyCredits = [...annual.matchAll(/([\d.]+) billion Credits/g)].map((m) => Math.round(parseFloat(m[1]) * 1e9));
  tierNames.forEach((name, i) => {
    if (prices[i] == null || credits[i] == null) return;
    out.plans.push({
      name,
      monthlyUsd: prices[i],
      monthlyCredits: credits[i],
      yearlyUsd: yearly[i] ?? null,
      yearlyCredits: yearlyCredits[i] ?? null,
    });
  });
  // Verbrauchsregeln: "mimo-v2.6-pro 2.5 Credits 300 Credits 600 Credits"
  const re = /mimo-v2\.(\d+)(?:-(pro|flash))?\s+([\d.]+) Credits\s+([\d.]+) Credits\s+([\d.]+) Credits/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(text))) {
    const version = `V2.${m[1]}`;
    const variant = m[2] ? ` ${m[2][0].toUpperCase()}${m[2].slice(1)}` : "";
    const name = `MiMo ${version}${variant}`;
    if (seen.has(name)) continue;
    seen.add(name);
    // Nur die aktuellen Flaggschiffe (Docs: "all plans support the latest flagship
    // models mimo-v2.6-pro, mimo-v2.6-flash"); aeltere Versionen laufen aus.
    if (m[1] !== "6") continue;
    out.models.push({ name, apiId: `mimo-v2.${m[1]}${m[2] ? "-" + m[2] : ""}`, cachedRead: parseFloat(m[3]), input: parseFloat(m[4]), output: parseFloat(m[5]) });
  }
  const upd = /Update Time\s*([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(text);
  if (upd) out.updatedAt = upd[1];
  const rounds = [...text.matchAll(/approximately\s*([\d,]+)\s*rounds of medium-to-complex tasks/g)].map((x) => x[1]);
  if (rounds.length) out.taskConversion = `official scenario estimate (mimo-v2.6-flash baseline): ${rounds.join(" / ")} rounds of medium-to-complex tasks per tier`;
  out.note = "Individual edition. Off-peak (UTC 16:00-24:00) deducts 0.8x credits.";
  return out;
}

// ---------- Parser: StepFun Step Plan (HTML-Docs) ----------
export function parseStepfun(html) {
  const text = htmlToText(html);
  const out = { plans: [], creditsPerUsd: null, models: [], note: null };
  const re = /(Flash (?:Mini|Plus|Pro|Max))\s+[^0-9$]*?([\d,.]+)M\s+\$([\d.]+)\s+\$([\d.]+)\s+\$([\d.]+)/g;
  let m;
  while ((m = re.exec(text))) {
    out.plans.push({
      name: m[1],
      monthlyCredits: Math.round(parseFloat(m[2].replace(/,/g, "")) * 1e6),
      monthlyUsd: parseFloat(m[3]),
      quarterlyUsd: parseFloat(m[4]),
      yearlyUsd: parseFloat(m[5]),
    });
  }
  const conv = /\$1\s*[≈~]\s*7M Credits/.exec(text);
  out.creditsPerUsd = conv ? 7e6 : null;
  // Modellliste (Slug-Liste in den Docs)
  const models = [...text.matchAll(/step-[\d.]+(?:-flash)?(?:-[\d]+)?/g)].map((x) => x[0]);
  out.models = [...new Set(models)].slice(0, 8);
  out.note = "Credits sind monatlich, kein Zeitfenster, kein Rollover. 1 $ Modellnutzung ~ 7M Credits.";
  return out;
}

// ---------- Parser: Cerebras Code (HTML, offizielle Ankuendigung) ----------
export function parseCerebras(html) {
  const text = htmlToText(html);
  const out = { plans: [], model: null, note: null };
  const re = /Cerebras Code (Pro|Max)\s*-\s*\(\$([\d.]+)\/month\)([\s\S]{0,400}?)(?=Cerebras Code (?:Pro|Max)|$)/g;
  let m;
  while ((m = re.exec(text))) {
    const seg = m[3];
    const t = /up to ([\d.]+)\s*(million|m)\s*tokens\/day/i.exec(seg);
    if (!t) continue;
    const tokensPerDay = Math.round(parseFloat(t[1]) * 1e6);
    out.plans.push({ name: m[1], monthlyUsd: parseFloat(m[2]), tokensPerDay });
  }
  const model = /Qwen3-Coder/.exec(text);
  if (model) out.model = "Qwen3-Coder-480B";
  out.note = "Tageslimit fuer gesendete Tokens (Ankuendigung: 'All rate limits listed are subject to change').";
  return out;
}


// ---------- Parser: GitHub Copilot (AI-Credits + Modellpreise) ----------
// Beide Doku-Seiten sind serverseitig gerendert, die Tabellen sind direkt lesbar.
// 1 AI-Credit = 0,01 $ (offizielle Doku), Preise je 1M Token.
function tableRows(tbl) {
  return [...tbl.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) =>
    [...r[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => htmlToText(c[1])));
}
function htmlTables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
}
function firstNumber(s) {
  // Tausenderkommas ("1,000 Credits") gehoeren zur Zahl, nicht zum Trenner.
  const m = /([\d,]+(?:\.\d+)?)/.exec(String(s ?? ""));
  return m ? parseFloat(m[1].replace(/,/g, "")) : null;
}

export function parseCopilotBilling(html) {
  const out = { plans: [], creditValueUsd: 0.01 };
  for (const tbl of htmlTables(html)) {
    for (const cells of tableRows(tbl)) {
      const name = /^Copilot (Pro\+?|Max)$/.exec(cells[0] ?? "");
      if (!name) continue;
      const price = firstNumber(cells[1]);
      const base = firstNumber(cells[2]);
      const flex = firstNumber(cells[3]);
      const total = firstNumber(cells[4]);
      if (price === null || total === null) continue;
      out.plans.push({ name: name[1], priceUsd: price, baseCredits: base, flexCredits: flex, totalCredits: total });
    }
  }
  return out;
}

export function parseCopilotModels(html) {
  const out = { models: [], creditValueUsd: 0.01 };
  for (const tbl of htmlTables(html)) {
    const rows = tableRows(tbl);
    const head = (rows[0] ?? []).map((h) => h.toLowerCase());
    if (head[0] !== "model") continue;
    const at = (label) => head.findIndex((h) => h.startsWith(label));
    const iStatus = at("release status"), iTier = at("tier");
    const iIn = at("input"), iCached = at("cached"), iWrite = at("cache write"), iOut = at("output");
    if (iIn < 0 || iOut < 0) continue;
    for (const cells of rows.slice(1)) {
      const model = cells[0];
      const status = iStatus >= 0 ? cells[iStatus] : "GA";
      const tier = iTier >= 0 ? cells[iTier] : "Default";
      // Nur GA-Modelle, und von den Kontext-Staffeln nur die Standard-Stufe:
      // die Langkontext-Dublette waere eine zweite Zeile mit demselben Namen.
      if (!model || status !== "GA") continue;
      if (tier && tier !== "Default") continue;
      const input = firstNumber(cells[iIn]);
      const output = firstNumber(cells[iOut]);
      const cachedRead = iCached >= 0 ? firstNumber(cells[iCached]) : null;
      const cacheWrite = iWrite >= 0 ? firstNumber(cells[iWrite]) : null;
      if (input === null || output === null || cachedRead === null) continue;
      out.models.push({
        model,
        input,
        cachedRead,
        cachedWrite: cacheWrite === null ? input : cacheWrite,
        output,
        source: "copilot-models",
      });
    }
  }
  return out;
}


// ---------- Parser: Ollama Cloud (Tarife mit Dollar-Credits + Modellpreise) ----------
// Karten sind serverseitig gerendert. Die Pro-Karte hat Tabs: die Namen stehen in
// id="plan-header-<name>", der Monatspreis im Span data-billing="month" (der
// Jahrespreis steckt in data-billing="year" und darf nicht mitgezaehlt werden).
// Die Credit-Posten ("$60 of usage credits per month") werden positionell zugeordnet.
export function parseOllama(html) {
  const out = { plans: [], models: [] };
  const cards = html.split(/<div class="flex flex-col border border-neutral-200 rounded-2xl p-6">/).slice(1);
  for (const card of cards) {
    const h2 = /<h2[^>]*>([^<]+)<\/h2>/.exec(card);
    if (!h2) continue;
    const credits = [...card.matchAll(/\$([\d,]+)\s*of usage credits/g)].map((m) => parseFloat(m[1].replace(/,/g, "")));
    // Tabs (Pro-Karte: Pro und Max) ueber die plan-header-Segmente, Preis jeweils
    // der erste Monatspreis im Segment (der Jahrespreis folgt danach).
    const segs = card.split(/id="plan-header-([a-z0-9-]+)"/).slice(1);
    let pairs = [];
    for (let i = 0; i < segs.length; i += 2) {
      const name = segs[i];
      const txt = htmlToText(segs[i + 1] ?? "");
      const m = /\$([\d,]+)\s*\/\s*mo\./.exec(txt);
      pairs.push({ name, monthlyUsd: m ? parseFloat(m[1].replace(/,/g, "")) : null, creditsUsd: credits[pairs.length] ?? null });
    }
    if (!pairs.length) {
      const price = /\$([\d,]+)\s*\/\s*mo\./.exec(htmlToText(card));
      pairs = price ? [{ name: h2[1].trim().toLowerCase(), monthlyUsd: parseFloat(price[1].replace(/,/g, "")), creditsUsd: credits[0] ?? null }] : [];
    }
    for (const p of pairs) {
      if (!(p.monthlyUsd > 0) || !(p.creditsUsd > 0)) continue; // Free und "Custom" fallen raus
      out.plans.push({ name: p.name.charAt(0).toUpperCase() + p.name.slice(1), monthlyUsd: p.monthlyUsd, creditsUsd: p.creditsUsd });
    }
  }
  // Modellpreise je 1M Token (Off-Peak-Varianten ueberspringen)
  for (const tbl of htmlTables(html)) {
    const rows = tableRows(tbl);
    const head = (rows[0] ?? []).map((h) => h.toLowerCase());
    if (head[0] !== "model" || !head.includes("input")) continue;
    for (const cells of rows.slice(1)) {
      if (/off-peak/i.test(String(cells[0] ?? ""))) continue;
      const name = String(cells[0] ?? "").trim();
      const input = firstNumber(cells[1]);
      const cachedRead = firstNumber(cells[2]);
      const output = firstNumber(cells[3]);
      if (!name || input === null || output === null || cachedRead === null) continue;
      out.models.push({ model: name, input, cachedRead, cachedWrite: input, output, source: "ollama-pricing" });
    }
  }
  return out;
}

// ---------- Parser: Kimi Membership Pricing (HTML) ----------
// kimi.com hat die China-Tarife am 12.10.2026 umbenannt: Go ¥49, Plus ¥99, Pro ¥199, Max ¥699
// (monatlich), dazu Jahrespreise und Monatsaequivalent. Die alten Namen (Andante, Moderato,
// Allegretto, Allegro) sind laut Seite nur noch Legacy fuer Bestandskunden und werden nicht
// mehr verkauft. Die Preise werden ueber die Preisidentitaet den internationalen Tarifen
// zugeordnet (siehe kimiTierMap in build.mjs), der ¥-Anker haelt die Request-Schaetzung stabil.
export function parseKimiPricing(html) {
  const text = htmlToText(html);
  const out = { plans: [] };
  const names = "Go|Plus|Pro|Max|Andante|Moderato|Allegretto|Allegro|Vivace";
  // Neue Tabellenform: "Plus ¥99/month ¥948/year ¥79/month"
  const reTable = new RegExp(`\\b(${names})\\s*¥([\\d.]+)\\/month\\s*¥([\\d.,]+)\\/year\\s*¥([\\d.]+)\\/month`, "g");
  // Legacy-Form (Altbestand): "Andante Everyday use ¥49/month"
  const reFlat = new RegExp(`\\b(${names})\\s*[^¥]{0,40}?¥([\\d.]+)\\/month`, "g");
  const seen = new Set();
  let m;
  while ((m = reTable.exec(text))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.plans.push({
      name: m[1],
      priceCny: parseFloat(m[2]),
      priceCnyYear: parseFloat(m[3].replace(/,/g, "")),
      priceCnyYearlyMonthly: parseFloat(m[4]),
    });
  }
  while ((m = reFlat.exec(text))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.plans.push({ name: m[1], priceCny: parseFloat(m[2]) });
  }
  return out;
}

// ---------- Parser: Kimi Code Membership (HTML) ----------
export function parseKimiCode(html) {
  const text = htmlToText(html);
  const out = {
    quotaRefresh: null,
    rollover: null,
    fiveHourWindow: null,
    extraUsage: null,
    sharedWith: null,
  };
  if (/quota refreshes automatically every 7 days/i.test(text)) out.quotaRefresh = "7d";
  if (/unused quota does not roll over/i.test(text)) out.rollover = false;
  if (/rolling 5-hour rate window/i.test(text)) out.fiveHourWindow = true;
  if (/Extra Usage/i.test(text) && /charged by actual usage/i.test(text)) out.extraUsage = "RMB, charged by actual usage, rates close to platform API";
  if (/shares quota with your Kimi membership/i.test(text)) out.sharedWith = "Kimi membership";
  return out;
}

// ---------- Parser: Kimi Goods API (kimi.ai, JSON) ----------
// Offizielle Goods-API: Preise in USD-Cents, billingCycle (MONTH/YEAR),
// transitionSummary.reason (REASON_SUBSCRIPTION_NEED_APPLY = nur Waitlist).
// Stabiles, deterministisches Schema, kein volatiler Timestamp.
export function parseKimiGoods(raw) {
  const data = JSON.parse(raw);
  const goods = Array.isArray(data?.goods) ? data.goods : [];
  const plans = [];
  for (const g of goods) {
    if (!g?.title || g.membershipLevel === "LEVEL_FREE") continue; // Adagio (kostenlos) überspringen
    const amounts = Array.isArray(g.amounts) ? g.amounts : [];
    const usd = amounts.find((a) => a?.currency === "USD");
    if (!usd || !usd.priceInCents) continue;
    const cycle = g.billingCycle ?? {};
    plans.push({
      name: g.title,
      priceUsd: parseFloat(usd.priceInCents) / 100,
      billingCycle: cycle.timeUnit === "TIME_UNIT_YEAR" ? "year" : (cycle.timeUnit === "TIME_UNIT_MONTH" ? "month" : null),
      waitlist: g.transitionSummary?.reason === "REASON_SUBSCRIPTION_NEED_APPLY",
      membershipLevel: g.membershipLevel ?? null,
    });
  }
  return { source: "kimi.ai GoodsService ListGoods", plans };
}

// ---------- Parser: Freebuff Pricing (HTML) ----------
// Drei bezahlte Tarife. Mengen-Basis ist ein DOLLAR-Volumen ("$50 max spend / mo"),
// nicht Token oder Requests. Der Gratis-Tarif nennt seit 09/2026 kein Volumen mehr
// ("Sign in to see your account's allowance"); freeTierMonthlyUsd bleibt dann null.
// Karten stehen als <section><h3>Name</h3>... im HTML.
export function parseFreebuffPricing(html) {
  const text = htmlToText(html);
  const out = { freeTierMonthlyUsd: null, yearlyDiscountPercent: null, plans: [] };
  const free = /Up to \$ ?([\d.]+) of usage a month/i.exec(text);
  if (free) out.freeTierMonthlyUsd = parseFloat(free[1]);
  const yearly = /Save ~ ?([\d.]+)%/.exec(text);
  if (yearly) out.yearlyDiscountPercent = parseFloat(yearly[1]);

  const cardRe = /<h3[^>]*>([A-Za-z]+)<\/h3>([\s\S]*?)<\/section>/g;
  let m;
  while ((m = cardRe.exec(html))) {
    const name = m[1];
    const card = m[2];
    const cardText = htmlToText(card);
    const price = /\$ ?([\d.]+) \/month/.exec(cardText);
    if (!price) continue; // keine Preis-Karte (z.B. Feature-Spalte)
    const spend = /\$ ?([\d.]+) max spend \/ mo/.exec(cardText);
    const daily = /\$([\d.]+) daily \+ flexible \$ ?([\d.]+) \/ mo/.exec(cardText);
    // "Per day": Stunden je Modell, z.B. "GLM 5.3 Flash 30 hrs" / "or DeepSeek V4.1 Flash 10 hrs"
    const includedHours = [...cardText.matchAll(/([\w][\w.\- ]*?) ([\d,]+) hrs/g)]
      .map((h) => ({ model: h[1].replace(/^.*?\bor /, "").trim(), hours: parseInt(h[2].replace(/,/g, ""), 10) }));
    out.plans.push({
      name,
      monthlyUsd: parseFloat(price[1]),
      maxSpendUsd: spend ? parseFloat(spend[1]) : null,
      dailyUsd: daily ? parseFloat(daily[1]) : null,
      flexibleMonthlyUsd: daily ? parseFloat(daily[2]) : null,
      includedHours,
    });
  }
  return out;
}

// ---------- Parser: Freebuff FAQ (Homepage, JSON-LD FAQPage) ----------
// Die Homepage liefert die FAQ als schema.org-JSON-LD: stabil, kein HTML-Scraping.
// Nur die fuer den Vergleich relevanten Antworten werden extrahiert.
export function parseFreebuffFaq(html) {
  const out = {
    adFunded: null,
    freebucksPerDay: [],
    limitedAccessFreebucks: null,
    limitedAccessSessions: null,
    limitedAccessSubscriptions: {},
    models: [],
    dataNote: null,
  };
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let faq = null;
  for (const b of blocks) {
    try {
      const j = JSON.parse(b);
      if (j?.["@type"] === "FAQPage") { faq = j; break; }
    } catch { /* anderes JSON-LD */ }
  }
  if (!faq) return out;
  const answer = (q) => faq.mainEntity?.find((e) => e.name === q)?.acceptedAnswer?.text ?? null;

  out.adFunded = answer("How can it be free?");
  const freebucks = answer("How do Freebucks work?");
  if (freebucks) {
    // "- US: 100 Freebucks a day" / "- CA, GB, ...: 70" / "- Everywhere else, and any VPN: 25"
    for (const m of freebucks.matchAll(/^- (.+?): ([\d,]+)(?: Freebucks a day)?$/gm)) {
      out.freebucksPerDay.push({ regions: m[1], perDay: parseInt(m[2].replace(/,/g, ""), 10) });
    }
  }
  const limited = answer("What is limited mode?");
  if (limited) {
    const perDay = /free limited-access allowance is ([\d,]+) Freebucks a day/.exec(limited);
    if (perDay) out.limitedAccessFreebucks = parseInt(perDay[1].replace(/,/g, ""), 10);
    const sessions = /with ([\d,]+) one-hour sessions per day/.exec(limited);
    if (sessions) out.limitedAccessSessions = parseInt(sessions[1].replace(/,/g, ""), 10);
    const subs = /include ([\d,]+) a day on Starter, ([\d,]+) on Plus, or ([\d,]+) on Pro/.exec(limited);
    if (subs) out.limitedAccessSubscriptions = { Starter: parseInt(subs[1], 10), Plus: parseInt(subs[2], 10), Pro: parseInt(subs[3], 10) };
  }
  const models = answer("What models do you use?");
  if (models) {
    out.models = [...models.matchAll(/^- ([^:]+):/gm)].map((m) => m[1].trim());
  }
  out.dataNote = answer("Does Freebuff collect my data?");
  return out;
}

// ---------- Parser: Privacy-Policy-Text (z.B. Command Code) ----------
// Extrahiert strukturierte Privacy-Aussagen aus Policy-Text.
// Deterministisch: sucht nach dokumentierten Mustern; unbekannt bleibt unbekannt.
export function parsePrivacyText(html) {
  const text = htmlToText(html);
  const out = {
    training: null,
    trainingQuote: null,
    zeroRetention: null,
    zeroRetentionQuote: null,
    retentionDays: null,
    retentionQuote: null,
    provider: null,
  };

  // Anbieter erkennen (aus URL-Mustern im Text oder fix via Aufrufer)
  if (/command ?code/i.test(text)) out.provider = "command-code";

  // "does not train" / "never use for training" → training=false
  const noTrain = /(does not|never|will not|won't|do not)\s+(train|use[^.]*for (model )?training)/i.exec(text);
  if (noTrain) {
    out.training = false;
    out.trainingQuote = text.slice(Math.max(0, noTrain.index - 60), noTrain.index + 120).trim();
  }
  // "trains on" / "may use for training" → training=true
  const yesTrain = /(trains?|may use|uses)[^.]*\b(train(ing)?)\b/i.exec(text);
  if (!noTrain && yesTrain) {
    out.training = true;
    out.trainingQuote = text.slice(Math.max(0, yesTrain.index - 60), yesTrain.index + 120).trim();
  }

  // "zero data retention" / "never stored" → zeroRetention=true
  const zero = /(zero[ -]?data retention|never stored|not stored)/i.exec(text);
  if (zero) {
    out.zeroRetention = true;
    out.zeroRetentionQuote = text.slice(Math.max(0, zero.index - 70), zero.index + 120).trim();
  }

  // "retained for up to X days" / "thirty (30) days" / "30 days" → retentionDays
  const ret = /retained?[^.]{0,60}?\(?(\d{1,3})\)?\s*days?/i.exec(text)
    || /(?:up to|for)\s+(?:thirty|sixty|ninety)?\s*\(?(\d{1,3})\)?\s*days?/i.exec(text)
    || /retained?[^.]{0,40}?(\d{1,3})\s*days?/i.exec(text);
  if (ret) {
    out.retentionDays = parseInt(ret[1], 10);
    out.retentionQuote = text.slice(Math.max(0, ret.index - 70), ret.index + 120).trim();
  }

  return out;
}

// ---------- Parser: LLM Stats Leaderboard Index ----------
// Einziger Score: conservative (0-100) aus dem internen Leaderboard-Endpoint.
// Response: {general: {models: [{model_id, model_name, conservative, ...}]}}
export function parseLlamaStats(raw) {
  const data = JSON.parse(raw);
  const models = data?.general?.models ?? [];
  const scores = {};
  for (const m of models) {
    if (typeof m.conservative !== "number") continue;
    // Model IDs nutzen Dots (muse-spark-1.3) → Striche für Kompatibilität
    const slug = m.model_id.toLowerCase().replace(/\./g, "-").replace(/\s+/g, "-");
    scores[slug] = { intelligence: m.conservative, name: m.model_name };
  }
  return {
    source: "LLM Stats (zeroeval.com)",
    fetchedAt: new Date().toISOString(),
    count: Object.keys(scores).length,
    scores,
  };
}

// ---------- Registry ----------
// GitHub Copilot Business/Enterprise aus der Plantabelle der Docs.
// Roh-HTML: <th scope="row">Copilot Business</th><td>$19 USD per granted seat per month</td>
//           <td>Total per user per month: 1,900</td>
export function parseCopilotPlans(html) {
  const flat = String(html)
    .replace(/<\/t[dh]>/g, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ");
  const plans = [];
  for (const name of ["Business", "Enterprise"]) {
    const re = new RegExp(
      `Copilot ${name} \\| \\$([0-9]+) USD per granted seat per month \\| Total per user per month: ([0-9,]+)`,
      "i",
    );
    const m = re.exec(flat);
    if (!m) continue;
    plans.push({ name, priceUsd: Number(m[1]), creditsPerUser: Number(m[2].replace(/,/g, "")), seats: true });
  }
  return { plans, note: "GitHub Copilot Business/Enterprise: Preis pro Sitz und AI-Credits pro Nutzer aus der Docs-Plantabelle" };
}

const OD_TIERS = ["go", "plus", "pro", "max"];
const OD_TIER_NAME = { go: "Go", plus: "Plus", pro: "Pro", max: "Max" };

function odNum(v) {
  const t = String(v ?? "").replace(/[,$\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * OpenDesign (open-design.ai/pricing), statische Astro-Seite.
 * Modelltabelle: je Modell eine Zeile `.dpu-row`; jede Zahl steht in
 * <span data-usage-value="go|plus|pro|max">, erst die Spalte "Est. requests / 7 days",
 * dann "Monthly usage" (Dollar je Monat und Modell).
 * Wirft, wenn die Struktur fehlt, statt still Zahlenmuell zu liefern.
 */
export function parseOpenDesignPricing(html) {
  // Die Karte traegt weitere Klassen (z.B. "plan-pro new-plan-card recommended"),
  // deshalb ueber die Klassenliste filtern statt ueber das Zeilenende.
  const marks = [...html.matchAll(/class="([^"]*)"\s+data-tier="(go|plus|pro|max)"/g)]
    .filter((m) => new RegExp(`\\bplan-${m[2]}\\b`).test(m[1]))
    .map((m) => ({ tier: m[2], index: m.index }));
  if (!marks.length) throw new Error("OpenDesign: keine Tarifkarten gefunden");
  const cards = [];
  for (let i = 0; i < marks.length; i++) {
    const chunk = html.slice(marks[i].index, i + 1 < marks.length ? marks[i + 1].index : marks[i].index + 30000);
    const tier = marks[i].tier;
    const priceMonthly = odNum((chunk.match(/data-regular-price="([\d.]+)"/) || [])[1]);
    const introPrice = odNum((chunk.match(/data-intro-price="([\d.]+)"/) || [])[1]);
    const yearly = odNum((chunk.match(/<div class="price" data-when="yearly"[^>]*>[\s\S]{0,200}?rolling-price-number"[^>]*>([\d.]+)</) || [])[1]);
    const credits = odNum((chunk.match(/data-total-credits="([\d.]+)"/) || [])[1]);
    const design = odNum((chunk.match(/Design Plan [Uu]p to\s*<strong[^>]*>\$([\d,]+)/) || [])[1]);
    const planModels = odNum((chunk.match(/plan models\s*<strong[^>]*>\$([\d,]+)/) || [])[1]) ?? 0;
    if (priceMonthly === null || credits === null || design === null) continue;
    cards.push({
      tier, name: OD_TIER_NAME[tier], priceMonthly, introPrice, priceYearlyMonthly: yearly,
      creditsMonthly: credits, planModelCredits: planModels, designMonthly: design, models: [],
    });
  }
  if (!cards.length) throw new Error("OpenDesign: Tarifkarten ohne Preis/Credits");

  const rows = html.split(/<div class="dpu-row"/).slice(1);
  const models = [];
  for (const row of rows) {
    if (/dpu-head/.test(row.slice(0, 60))) continue;
    const name = (row.match(/<strong[^>]*>([^<]+)<\/strong>/) || [])[1];
    if (!name) continue;
    const vals = [...row.matchAll(/<span data-usage-value="(go|plus|pro|max)"[^>]*>([^<]*)<\/span>/g)].map((x) => ({ tier: x[1], raw: x[2].trim() }));
    if (vals.length < OD_TIERS.length * 2) continue;
    const requests7d = {}, monthlyUsd = {};
    for (const t of OD_TIERS) {
      requests7d[t] = odNum((vals.find((v) => v.tier === t && !v.raw.includes("$")) || {}).raw);
      monthlyUsd[t] = odNum((vals.find((v) => v.tier === t && v.raw.includes("$")) || {}).raw);
    }
    models.push({ model: name.trim(), requests7d, monthlyUsd });
  }
  if (models.length < 5) throw new Error(`OpenDesign: nur ${models.length} Modellzeilen erkannt`);

  for (const c of cards) {
    c.models = models
      .filter((mm) => mm.monthlyUsd[c.tier] != null && mm.monthlyUsd[c.tier] > 0)
      .map((mm) => ({ model: mm.model, usd: mm.monthlyUsd[c.tier], requests7d: mm.requests7d[c.tier] ?? null }));
  }
  return { plans: cards, modelCount: models.length, models };
}

/**
 * OpenDesign (open-design.ai/model-credits/): Fenster je Tarif.
 * Spalten: Preis | Monthly maximum | Plan model credits | ＋ | Design Plan monthly | 7-day | 5-hour.
 */
export function parseOpenDesignCredits(html) {
  const start = html.indexOf("allowance-table");
  if (start < 0) throw new Error("OpenDesign: Credit-Tabelle fehlt");
  const table = html.slice(start);
  const windows = {};
  for (const t of OD_TIERS) {
    const cell = table.match(new RegExp(`<th[^>]*>\\s*${OD_TIER_NAME[t]}\\s*</th>((?:\\s*<td[^>]*>[\\s\\S]*?</td>)+)`, "i"));
    if (!cell) continue;
    const tds = [...cell[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map((x) => x[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    const nums = tds.map(odNum);
    // Spalte 4 ist der Operand ("+") und traegt keine Zahl; danach folgen die
    // drei Design-Plan-Fenster (Monat, 7 Tage, 5 Stunden).
    windows[t] = {
      price: nums[0], monthlyMaximum: nums[1], planModelCredits: nums[2],
      designMonthly: nums[4], design7d: nums[5], design5h: nums[6],
    };
  }
  if (!Object.keys(windows).length) throw new Error("OpenDesign: keine Tarifzeilen in der Credit-Tabelle");
  return { windows };
}

export const PARSERS = {
  opendesignPricing: parseOpenDesignPricing,
  opendesignCredits: parseOpenDesignCredits,
  ocgo: parseOcgo,
  cc: parseCc,
  "glm-overview": parseGlmOverview,
  "copilot-plans": parseCopilotPlans,
  "qwen-docs": parseQwenDocs,
  "qwen-token-personal": parseQwenTokenPersonal,
  "copilot-billing": parseCopilotBilling,
  "copilot-models": parseCopilotModels,
  ollama: parseOllama,
  mimo: parseMimo,
  stepfun: parseStepfun,
  cerebras: parseCerebras,
  "kimi-pricing": parseKimiPricing,
  "kimi-code": parseKimiCode,
  "kimi-goods": parseKimiGoods,
  "freebuff-pricing": parseFreebuffPricing,
  "freebuff-faq": parseFreebuffFaq,
  "privacy-text": parsePrivacyText,
  fx: parseFx,
  "llm-stats": parseLlamaStats,
};
