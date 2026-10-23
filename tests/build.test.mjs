import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Basis-Tests gegen den Generator-Output (latest.json) + Parser-Logik.
// Die eigentliche Generator-Logik ist in build.mjs; hier testen wir die invarianten
// Ergebnisse, die reproduzierbar sein müssen.

test("latest.json existiert und hat Schema", async () => {
  const raw = await readFile(join(ROOT, "public/data/latest.json"), "utf8");
  const d = JSON.parse(raw);
  assert.equal(d.schemaVersion, 2);
  assert.equal(d.targetMonthlyPrice, 1);
  assert.ok(Array.isArray(d.plans));
  // Dynamisch: nur Pläne mit echten Quellen (keine statischen Erfindungen)
  assert.ok(d.plans.length >= 15, "sollte ≥15 Pläne aus Quellen haben");
  assert.ok(d.methodology?.costPerRequest, "Methodik muss Kostenformel dokumentieren");
  // Jeder Plan muss eine Quelle haben
  for (const p of d.plans) {
    assert.ok(p.sourceIds?.length, `${p.id}: muss sourceIds haben`);
    assert.ok(p.verifiedAt, `${p.id}: muss verifiedAt haben`);
  }
});

test("opencode-go ist vergleichbar (Feed-Modelle)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const oc = d.plans.find((p) => p.id === "opencode-go");
  assert.ok(oc, "opencode-go muss existieren");
  assert.ok(oc.modelCount >= 30, "opencode-go sollte ≥30 Modelle aus Feed haben");
  assert.ok(oc.modelStats.mean > 0);
  // Pro-Geld-Normalisierung: requests pro $1 = requests / paid (paid=10)
  const row = oc.modelRows[0];
  assert.ok(Math.abs(row.normalizedPer1 - row.requestsPerMonth / 10) < 0.001,
    "bei paid=10 ist normalizedPer1 = requestsPerMonth / 10");
});

test("command-code-goat ist vergleichbar und pro-$ normalisiert", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const goat = d.plans.find((p) => p.id === "command-code-goat");
  assert.ok(goat, "command-code-goat muss existieren");
  // Gemessener Kartenbetrag (10,78 $ fuer den 10-$-Tarif am 2026-10-02) steht in
  // overrides.yml und ist die Basis der Rate, nicht der Listenpreis.
  // Ein Preis inkl. Gebuehr: der angezeigte Preis ist die gemessene Abbuchung
  // (10,78 $ fuer den 10-$-Tarif am 2026-10-02), es gibt keine separate Gebuehren-Marke.
  assert.equal(goat.price.monthlyUsd, 10.78, "angezeigter Preis = 10,78 $ (inkl. Kartengebuehr)");
  assert.equal(goat.price.paidPrice, 10.78, "bezahlter Preis = gemessene Abbuchung 10,78 $");
  assert.equal(goat.price.advertised, 10, "Listenpreis bleibt als Referenz in der Datenlage");
  assert.equal(goat.feeUsd, undefined, "keine separate Gebuehren-Zahl mehr im Plan");
  assert.ok(goat.modelCount >= 50, "GOAT sollte ≥50 Modelle haben");
  // Normalisierung: requests / 10.78 < requests
  const row = goat.modelRows[0];
  assert.ok(row.normalizedPer1 < row.requestsPerMonth,
    "bei paid=10.78 ist normalizedPer1 < requestsPerMonth");
  assert.ok(Math.abs(row.normalizedPer1 - row.requestsPerMonth / 10.78) < 0.01,
    "Normalisierung = requests / paidPrice");
});

test("GLM nutzt Anbieter-Credit-Formel (beide Modelle, offiziell)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const pro = d.plans.find((p) => p.id === "glm-pro");
  assert.ok(pro, "glm-pro muss existieren");
  // Nach Fenster-Korrektur: nur Wochen-Rows (5h-Caps raus)
  assert.ok(pro.modelRows.length >= 2, "GLM-5.3 + GLM-5.3-Flash (Wochen-Basis)");
  const glm53 = pro.modelRows.find((r) => r.model === "GLM-5.3");
  const flash = pro.modelRows.find((r) => r.model === "GLM-5.3-Flash");
  assert.ok(glm53 && flash, "beide GLM-Modelle müssen present sein");
  // Formel GLM-5.3: (in×6.9 + cached×1.7 + out×24)/10000, Pattern aus Feed (GLM-5.3: 1000/55000/200)
  const expected53 = (1000 * 6.9 + 55000 * 1.7 + 200 * 24) / 10000;
  assert.ok(Math.abs(glm53.creditsPerRequest - expected53) < 0.001,
    `GLM-5.3: (in×6.9 + cached×1.7 + out×24)/10000 = ${expected53}`);
  // Formel GLM-5.3-Flash: (in×2.3 + cached×0.56 + out×8)/10000
  const expectedFlash = (1000 * 2.3 + 55000 * 0.56 + 200 * 8) / 10000;
  assert.ok(Math.abs(flash.creditsPerRequest - expectedFlash) < 0.001,
    `GLM-5.3-Flash: (in×2.3 + cached×0.56 + out×8)/10000 = ${expectedFlash}`);
  // Wochen-Fenster: weekly×4.33→monthly
  assert.equal(glm53.window, "week");
  assert.ok(Math.abs(glm53.requestsPerMonth - glm53.requestsRawInWindow * 4.33) < 1,
    "weekly → ×4.33 monthly");
});

test("Preisdiskrepanzen aufgelöst: offizielle Preise (GLM CNY, Kimi USD, Qwen USD)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const glmPro = d.plans.find((p) => p.id === "glm-pro");
  // CNY 538 ≈ $75 (offiziell); nicht mehr Scouty $72 oder coding-plans $30
  assert.ok(Math.abs(glmPro.price.paidPrice - 75) < 2, "GLM Pro paid ≈ $75 (CNY 538)");
  assert.ok(glmPro.price.monthlyUsd > 70, "GLM Pro nicht mehr $30 (coding-plans falsch)");
  const kimiMod = d.plans.find((p) => p.id === "kimi-moderato");
  // Kimi.ai hat USD-Preise (primär): $19/Monat (kimi.com CNY ¥99 ist sekundär)
  assert.ok(Math.abs(kimiMod.price.paidPrice - 19) < 1, "Kimi Moderato ≈ $19 (kimi.ai USD, nicht ¥99→$13.9)");
  const qwenStd = d.plans.find((p) => p.id === "qwen-token-personal-standard");
  assert.equal(qwenStd.price.paidPrice, 18, "Qwen Standard limited-time $18");
  assert.equal(qwenStd.price.advertised, 25, "Qwen Standard Original $25");
});

test("Draw-Schwelle: relative Differenz < 10% = draw", async () => {
  // Die Draw-Logik ist in build.mjs (DRAW_THRESHOLD_PERCENT=10).
  // Wir testen die Logik indirekt: pairwise winner ist nie 'draw' bei großen Abständen.
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  for (const pw of d.pairwiseComparisons) {
    if (pw.advantagePercent >= 10) {
      assert.notEqual(pw.winner, "draw", "≥10% Abstand darf kein draw sein");
    }
  }
});

test("Pattern-Unifizierung: geteilte Familien nutzen dasselbe Pattern (ai-10-usd-Fairness)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const oc = d.plans.find((p) => p.id === "opencode-go");
  const goat = d.plans.find((p) => p.id === "command-code-goat");
  // Kein Modellname hart kodieren: die Feeds benennen Versionen um
  // (DeepSeek V4 Flash -> V4.1 Flash) und rissen damit den Tageslauf mit,
  // obwohl sich am Pattern nichts geaendert hatte. Geprueft wird die Regel,
  // nicht das Beispiel: jede Familie, die in beiden Plaenen steht, muss
  // dasselbe Pattern nutzen.
  const ocRows = new Map(oc.modelRows.map((r) => [r.family, r]));
  const ccRows = new Map(goat.modelRows.map((r) => [r.family, r]));
  const shared = [...ocRows.keys()].filter((f) => ccRows.has(f));
  assert.ok(shared.length > 0, "mindestens eine geteilte Modellfamilie erwartet");
  for (const family of shared) {
    assert.deepEqual(ccRows.get(family).patternUsed, ocRows.get(family).patternUsed,
      `geteilte Familie "${family}" muss identisches Pattern nutzen (OC-Pattern als kanonisch)`);
  }
});

test("Dynamik: Daten kommen aus geparsten Quellen (nicht statisch)", async () => {
  // parsed/ muss die strukturierten Quellen enthalten
  const { readdir } = await import("node:fs/promises");
  const parsedDir = join(ROOT, "parsed");
  const files = (await readdir(parsedDir)).filter((f) => f.endsWith(".json"));
  assert.ok(files.includes("ocgo-pricing.json"), "ocgo-pricing muss geparst sein");
  assert.ok(files.includes("glm-coding-overview.json"), "GLM-Docs müssen geparst sein");
  assert.ok(files.includes("kimi-membership-pricing.json"), "Kimi-Pricing muss geparst sein");

  // GLM-Parser: Quoten + Formel + beide Modelle
  const glm = JSON.parse(await readFile(join(parsedDir, "glm-coding-overview.json"), "utf8"));
  assert.equal(glm.quotas.length, 3, "GLM Lite/Pro/Max Quoten");
  assert.ok(glm.models.some((m) => m.model === "GLM-5.3" && m.input === 6.9), "GLM-5.3 Koeffizienten");
  assert.ok(glm.models.some((m) => m.model === "GLM-5.3-Flash" && m.input === 2.3), "GLM-5.3-Flash Koeffizienten");
  assert.equal(glm.offPeakDiscount, 0.5, "Off-Peak 50%");

  // Qwen-Parser: Limited-Time-Preise
  const qwen = JSON.parse(await readFile(join(parsedDir, "qwen-token-personal.json"), "utf8"));
  const std = qwen.plans.find((p) => p.name === "Standard");
  assert.equal(std.limitedPrice, 18, "Qwen Standard $18");
  assert.equal(std.originalPrice, 25, "Qwen Standard Original $25");

  // Kimi-Parser: CNY-Preise. Seit 12.10.2026 heissen die China-Tarife Go/Plus/Pro/Max,
  // Andante/Moderato/Allegretto/Allegro sind laut Quelle nur noch Legacy fuer Bestandskunden.
  const kimi = JSON.parse(await readFile(join(parsedDir, "kimi-membership-pricing.json"), "utf8"));
  const plus = kimi.plans.find((p) => p.name === "Plus");
  assert.ok(plus, "Kimi Plus muss geparst sein (neuer Tarifname)");
  assert.equal(plus.priceCny, 99, "Kimi Plus ¥99 (Anker fuer den internationalen $19-Tarif)");
  assert.equal(plus.priceCnyYear, 948, "Jahrespreis aus derselben Tabellenzeile");
  assert.equal(plus.priceCnyYearlyMonthly, 79, "Monatsaequivalent bei Jahreszahlung");
  for (const name of ["Go", "Pro", "Max"]) {
    assert.ok(kimi.plans.some((p) => p.name === name), `Kimi ${name} im Parser`);
  }
});

test("undisclosed Pläne haben keine erfundenen Zahlen", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  for (const p of d.plans) {
    if (p.disclosure === "undisclosed") {
      assert.equal(p.modelStats, null, `${p.id}: undisclosed darf keine erfundene Modellstatistik haben`);
    }
  }
});

// --- Regressionen für Metric-Audit 2026-09-10 (13B Tokens/$-Bericht) ---

// Einheit: Die Spalte ist pro-$ normalisiert (TARGET_PRICE=1), NICHT pro $10.
// Für jede Row muss gelten: normalizedPer1 = requestsPerMonth / paidPrice.
test("Unit-Invariante: normalizedPer1 = requestsPerMonth / paidPrice", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const target = d.targetMonthlyPrice; // = 1
  let checked = 0;
  for (const p of d.plans) {
    // Gleiche paid-Logik wie build.mjs: CNY → monthlyUsd, sonst bezahlter (Checkout-)Preis
    const paid = p.price.currency === "CNY" && p.price.monthlyUsd
      ? p.price.monthlyUsd
      : (p.price.paidPrice ?? p.price.monthlyUsd);
    if (!paid || paid <= 0) continue;
    for (const r of p.modelRows ?? []) {
      assert.ok(r.requestsPerMonth > 0, `${p.name}/${r.model}: requestsPerMonth > 0`);
      const expectedN = (r.requestsPerMonth * target) / paid;
      assert.ok(
        Math.abs(r.normalizedPer1 - expectedN) < Math.max(0.01, expectedN * 1e-6),
        `${p.name}/${r.model}: normalizedPer1=${r.normalizedPer1} ≠ requestsPerMonth(${r.requestsPerMonth})×${target}/${paid}=${expectedN}`
      );
      checked++;
    }
  }
  assert.ok(checked > 100, `sollte >100 Rows prüfen, war ${checked}`);
});

// Kimi war 33×–168× überzeichnet: allowance war BEREITS Request-Anzahl, wurde aber noch
// einmal durch $/Request geteilt. Nach Fix: requestsPerMonth = offizieller CNY-Listenpreis / ¥0.03.
test("Kimi: keine Doppeldivision (requests = CNY-Listenpreis / ¥0.03)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const moderato = d.plans.find((p) => p.id === "kimi-moderato");
  assert.ok(moderato, "kimi-moderato vorhanden");
  // Offizieller CNY 99 (Moderato), ¥0.03/Request → 3300 Requests/Monat, NICHT Hunderttausende
  const expected = 99 / 0.03;
  for (const r of moderato.modelRows ?? []) {
    assert.ok(
      Math.abs(r.requestsPerMonth - expected) < expected * 0.001,
      `Kimi Moderato/${r.model}: ${r.requestsPerMonth} ≈ ${expected} (war vor Fix 33–168× zu hoch)`
    );
  }
  // Kein Kimi-Wert darf mehr im Millionen-Bereich liegen (Doppeldivision wäre sofort sichtbar)
  for (const p of d.plans) {
    if (!p.id.startsWith("kimi-")) continue;
    for (const r of p.modelRows ?? []) {
      assert.ok(r.requestsPerMonth < 1_000_000,
        `${p.name}/${r.model}: requestsPerMonth ${r.requestsPerMonth} unter 1M`);
    }
  }
});

 // rawTokensPerMonth ist abgeleitet (requests × tokens), kein unabhängiger Anker.
// Invarianz-Check hält die Kette konsistent; keine unabhängigen Annahmen.
test("Meta-Konsistenz: rawTokensPerMonth = requestsPerMonth × Tokens/Request", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  for (const p of d.plans) {
    for (const r of p.modelRows ?? []) {
      const pat = r.patternUsed || {};
      const perReq = pat.input + pat.cachedRead + pat.output;
      if (r.rawTokensPerMonth == null || !(perReq > 0)) continue;
      const expect = r.requestsPerMonth * perReq;
      assert.ok(Math.abs(r.rawTokensPerMonth - expect) < Math.max(1, expect * 1e-9),
        `${p.name}/${r.model}: rawTokensPerMonth inkonsistent`);
    }
  }
});

// --- Regressionen für Score-Alias-Provenance 2026-09-11 (Muse Spark 1.2/1.3) ---
// Bug: "Muse Spark 1.3 Contributor" und "1.2 Contributor" hatten beide 41.72,
// weil der Prefix-Match den generischen muse-spark-Key griff, bevor die
// contributor-Normalisierung (→ muse-spark-1-3) geprüft wurde. Fix-Philosophie:
// exakte Normalisierungen schlagen Prefix-Treffer, Aliase tragen Provenance.

test("Muse Spark Contributor löst auf Versions-Basis auf (nicht generisch)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const scores = d.aiScores.scores;
  const c13 = scores["muse-spark-1-3-contributor"];
  const c12 = scores["muse-spark-1-2-contributor"];
  assert.ok(c13 && c12, "beide Contributor-Aliase vorhanden");
  assert.equal(c13.aliasOf, "muse-spark-1-3", "1.3 Contributor → muse-spark-1-3");
  assert.equal(c12.aliasOf, "muse-spark-1-2", "1.2 Contributor → muse-spark-1-2");
  assert.notEqual(c13.intelligence, c12.intelligence, "verschiedene Versionen, verschiedene Scores");
  assert.equal(c13.intelligence, scores["muse-spark-1-3"].intelligence, "1.3 = 54.41");
  assert.equal(c12.intelligence, scores["muse-spark-1-2"].intelligence, "1.2 = 39.54");
  assert.equal(c13.fallback, true, "Alias als Schätzung geflaggt");
});

test("Score-Alias-Provenance: jeder Alias zeigt auf einen Leaderboard-Key", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const board = JSON.parse(await readFile(join(ROOT, "parsed/llm-stats-indexes.json"), "utf8"));
  const boardKeys = new Set(Object.keys(board.scores ?? {}));
  for (const [key, entry] of Object.entries(d.aiScores.scores)) {
    if (boardKeys.has(key)) continue; // originaler Leaderboard-Key, kein Alias
    assert.equal(entry.fallback, true, `${key}: Alias muss fallback=true tragen`);
    assert.ok(entry.aliasOf, `${key}: Alias muss aliasOf tragen`);
    assert.ok(boardKeys.has(entry.aliasOf),
      `${key}: aliasOf=${entry.aliasOf} muss ein originaler Leaderboard-Key sein (kein Ketten-Alias)`);
  }
});

test("Normalisierung schlägt Prefix: gestrippter Slug mit Treffer gewinnt", async () => {
  // Generelle Form des Muse-Bugs: wenn der Alias-Slug ohne Varianten-Suffix
  // (contributor/preview/fast/latest/exp/highspeed) direkt ein Leaderboard-Key
  // ist, muss aliasOf genau dieser Key sein, nie ein kürzerer Prefix-Key.
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const board = JSON.parse(await readFile(join(ROOT, "parsed/llm-stats-indexes.json"), "utf8"));
  const boardKeys = new Set(Object.keys(board.scores ?? {}));
  for (const [key, entry] of Object.entries(d.aiScores.scores)) {
    if (boardKeys.has(key)) continue;
    const stripped = key.replace(/-(contributor|preview|highspeed|fast|latest|exp)$/, "");
    if (stripped !== key && boardKeys.has(stripped)) {
      assert.equal(entry.aliasOf, stripped,
        `${key}: aliasOf muss ${stripped} sein, nicht ${entry.aliasOf}`);
    }
  }
});

test("Versions-Invariante: verschiedene Versionen teilen nie dasselbe Alias-Ziel", async () => {
  // Zwei Aliase mit unterschiedlichem Versions-Stamm (1-2 vs 1-3) dürfen nicht
  // auf denselben Leaderboard-Key zeigen, das war das sichtbare Symptom.
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const board = JSON.parse(await readFile(join(ROOT, "parsed/llm-stats-indexes.json"), "utf8"));
  const boardKeys = new Set(Object.keys(board.scores ?? {}));
  const stem = (slug) => (slug.match(/(\d+-\d+)/) ?? [])[1] ?? null;
  const aliases = Object.entries(d.aiScores.scores).filter(([k]) => !boardKeys.has(k));
  for (let i = 0; i < aliases.length; i++) {
    for (let j = i + 1; j < aliases.length; j++) {
      const [ka, ea] = aliases[i], [kb, eb] = aliases[j];
      const sa = stem(ka), sb = stem(kb);
      if (sa && sb && sa !== sb) {
        assert.notEqual(ea.aliasOf, eb.aliasOf,
          `${ka} (${sa}) und ${kb} (${sb}) teilen aliasOf=${ea.aliasOf}`);
      }
    }
  }
});

// --- Regression 2026-09-21: stiller Tarif-Verlust bei Quellen-Umbenennung ---
// Qwen fügte einen "Essential"-Tarif ein, Kimi benannte die kimi.ai-Checkout-Titel
// in Plus/Pro/Max/Ultra um. Beide Male fiel ein Tarif still aus dem Katalog
// (hart kodierte Namenslisten). Dieser Test koppelt Parser-Output an den Katalog.
test("Kein Tarif fällt still weg: jeder geparste Tarif steht im Katalog", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const byId = new Map(d.plans.map((p) => [p.id, p]));

  // Qwen Token Personal: Preis + 7d-Quota müssen 1:1 aus den Docs kommen
  const qwen = JSON.parse(await readFile(join(ROOT, "parsed/qwen-token-personal.json"), "utf8"));
  const qwenSlug = { Lite: "lite", Essential: "essential", Standard: "standard", Pro: "pro" };
  for (const p of qwen.plans) {
    const id = `qwen-token-personal-${qwenSlug[p.name]}`;
    const plan = byId.get(id);
    assert.ok(plan, `Qwen-Tarif "${p.name}" fehlt im Katalog (${id})`);
    assert.equal(plan.price.paidPrice, p.limitedPrice, `${p.name}: Limited-Preis`);
    assert.equal(plan.price.advertised, p.originalPrice, `${p.name}: Original-Preis`);
    assert.equal(plan.quotas[0].amount, p.quota7d, `${p.name}: 7d-Quota`);
  }

  // Kimi: die internationalen kimi.ai-USD-Preise müssen im Katalog stehen.
  // Greift das Tier-Mapping nicht, fällt der Build auf die CNY-Liste zurück
  // (¥99/¥199/¥699) und dieser Vergleich schlägt fehl.
  const goods = JSON.parse(await readFile(join(ROOT, "parsed/kimi-goods.json"), "utf8"));
  const goodsMonthly = goods.plans.filter((g) => g.billingCycle === "month").map((g) => g.priceUsd).sort((a, b) => a - b);
  const kimiPaid = d.plans.filter((p) => p.id.startsWith("kimi-")).map((p) => p.price.paidPrice).sort((a, b) => a - b);
  assert.deepEqual(kimiPaid, goodsMonthly, "Kimi: jeder kimi.ai-Monatspreis muss im Katalog stehen");
});


// --- GitHub Copilot + Ollama Cloud (Dollar-Credits, Preise aus der Anbieter-Doku) ---
test("GitHub Copilot: AI-Credit-Kontingent und Modellpreise aus der Doku, Rate nachgerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const billing = JSON.parse(await readFile(join(ROOT, "parsed/copilot-billing.json"), "utf8"));
  const models = JSON.parse(await readFile(join(ROOT, "parsed/copilot-models.json"), "utf8"));
  assert.equal(billing.creditValueUsd, 0.01, "1 AI-Credit = 0,01 $");
  assert.ok(models.models.length > 20, "Modellpreise aus der Copilot-Doku");
  const byId = new Map(d.plans.map((p) => [p.id, p]));
  for (const p of billing.plans) {
    const id = `copilot-${p.name.toLowerCase().replace("+", "-plus")}`;
    const plan = byId.get(id);
    assert.ok(plan, `Copilot-Tarif "${p.name}" fehlt im Katalog`);
    assert.equal(plan.price.monthlyUsd, p.priceUsd, `${p.name}: Monatspreis`);
    assert.equal(plan.quotas[0].amount, +(p.totalCredits * 0.01).toFixed(2), `${p.name}: Credit-Volumen in Dollar`);
  }
  // Anker: Copilot Pro hat 15 $ Volumen, die Rate folgt Volumen / Kosten pro Request.
  const pro = byId.get("copilot-pro");
  const row = pro.modelRows.find((r) => /GPT-5\.4$/.test(r.model));
  assert.ok(row, "GPT-5.4-Zeile vorhanden");
  assert.ok(Math.abs(row.requestsPerMonth - 15 / row.costPerRequest) < 1, "Requests = Volumen / Kosten pro Request");
  assert.ok(Math.abs(row.normalizedPer1 - row.requestsPerMonth / 10) < 0.01, "Rate pro $ = Requests / Preis");
});

test("Ollama Cloud: Tarife und eigene Modellpreise, Rate nachgerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const src = JSON.parse(await readFile(join(ROOT, "parsed/ollama-pricing.json"), "utf8"));
  assert.ok(src.plans.length >= 3, "Pro, Max und Team aus der Tarifkarte");
  assert.ok(src.models.length >= 10, "Modellpreise von der Ollama-Preisseite");
  const byId = new Map(d.plans.map((p) => [p.id, p]));
  for (const p of src.plans) {
    const plan = byId.get(`ollama-${p.name.toLowerCase()}`);
    assert.ok(plan, `Ollama-Tarif "${p.name}" fehlt im Katalog`);
    assert.equal(plan.quotas[0].amount, p.creditsUsd, `${p.name}: Credit-Volumen`);
    const r = plan.modelRows[0];
    assert.ok(r, `${p.name}: Modellzeile`);
    assert.ok(Math.abs(r.requestsPerMonth - p.creditsUsd / r.costPerRequest) < 1, `${p.name}: Requests = Volumen / Kosten pro Request`);
  }
});

// --- Neue Anbieter 2026-09-23: MiMo, StepFun, Cerebras ---
// Aufnahme nur, solange der Anbieter die Zahlen selbst veroeffentlicht: Credits pro
// Monat bzw. Token pro Tag. Die Tests koppeln die geparsten Tarife an den Katalog und
// rechnen die Rate unabhaengig nach (haendisch, aus den Quelldaten).
test("MiMo Token Plan: Tarife und Credits pro Modell aus den Docs, Rate nachgerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const src = JSON.parse(await readFile(join(ROOT, "parsed/mimo-token-plan.json"), "utf8"));
  assert.ok(src.plans.length >= 4, "vier Tarife aus den Docs");
  assert.ok(src.models.length >= 2, "Credits pro Token je Modell aus den Docs");
  const byId = new Map(d.plans.map((p) => [p.id, p]));
  for (const p of src.plans) {
    const plan = byId.get(`mimo-${p.name.toLowerCase()}`);
    assert.ok(plan, `MiMo-Tarif "${p.name}" fehlt im Katalog`);
    assert.equal(plan.price.monthlyUsd, p.monthlyUsd, `${p.name}: Monatspreis`);
    assert.equal(plan.quotas[0].amount, p.monthlyCredits, `${p.name}: Monats-Credits`);
  }
  // Anker: Lite hat 4,1 Mrd Credits, mimo-v2.6-pro kostet 300 Credits pro Cache-Miss-Token.
  const lite = byId.get("mimo-lite");
  const row = lite.modelRows.find((r) => /V2\.6 Pro/.test(r.model));
  assert.ok(row, "v2.6-pro-Zeile vorhanden");
  const pat = row.patternUsed;
  const expected = pat.input * 300 + pat.cachedRead * 2.5 + pat.output * 600;
  assert.equal(row.creditsPerRequest, expected, "Credits pro Request aus der Verbrauchstabelle");
  assert.ok(Math.abs(row.requestsPerMonth - lite.quotas[0].amount / expected) < 1, "Requests = Credits / Credits pro Request");
});

test("StepFun: Credits an den offiziellen Kurs gekoppelt (1 $ Nutzung ~ 7M Credits)", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const src = JSON.parse(await readFile(join(ROOT, "parsed/stepfun-step-plan.json"), "utf8"));
  assert.equal(src.creditsPerUsd, 7e6, "Kurs aus den Docs");
  const byId = new Map(d.plans.map((p) => [p.id, p]));
  for (const p of src.plans) {
    const plan = byId.get(`stepfun-${p.name.toLowerCase().replace(/\s+/g, "-")}`);
    assert.ok(plan, `Step-Tarif "${p.name}" fehlt im Katalog`);
    assert.equal(plan.quotas[0].amount, p.monthlyCredits, `${p.name}: Monats-Credits`);
    for (const r of plan.modelRows) {
      assert.ok(Math.abs(r.creditsPerRequest - r.costPerRequest * src.creditsPerUsd) < 1,
        `${p.name}/${r.model}: Credits pro Request = $-Kosten x Kurs`);
    }
  }
});

// --- Gemessene Quote (Dritte) 2026-09-23: Claude Max 20x ---
// Kein Anbieter veroeffentlicht die Token-Zahl. Die Menge kommt aus einer
// Drittmessung (Proxy-Header + Tokenlogs, gegen zwei weitere Datensaetze
// kreuzvalidiert). Requests = gemessene Token / unser Muster, damit die Zeile
// mit den uebrigen Plaenen auf derselben Skala vergleichbar bleibt.
test("Claude Max 20x: gemessene Monatsmenge, Rate aus dem Muster nachgerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const plan = d.plans.find((p) => p.id === "claude-max-20x");
  assert.ok(plan, "claude-max-20x fehlt");
  assert.equal(plan.disclosure, "measured");
  assert.equal(plan.dataTier, "M");
  assert.equal(plan.tag, "measured");
  assert.ok(plan.notes.includes("ArkNill"), "Quelle muss in der Notiz stehen");
  assert.ok(plan.dataTierNote.includes("37,363"), "Stichprobe muss dokumentiert sein");
  const quota = plan.quotas.find((q) => q.window === "month");
  assert.ok(quota.amount > 0, "Monatsmenge fehlt");
  const tokensPerRequest = 800 + 50_000 + 162; // FALLBACK_PATTERN
  const expected = Math.round(quota.amount / tokensPerRequest);
  assert.equal(plan.modelCount, 5, "fuenf Modellzeilen (Opus 5.5/5, Sonnet 5, Haiku 4.5, Fable 5.1)");
  for (const row of plan.modelRows) {
    assert.equal(row.requestsPerMonth, expected, `${row.model}: Requests = gemessene Token / Muster`);
    assert.ok(row.costPerRequest > 0, `${row.model}: Kosten pro Request aus Anthropics Listenpreis`);
    assert.ok(Math.abs(row.normalizedPer1 - expected / plan.price.monthlyUsd) < 0.5, `${row.model}: Rate pro Dollar`);
  }
});

// --- Zweite Welle 2026-09-23: offizielle Credits, Requests und Dollar-Volumina ---
test("Kiro: Requests pro Monat = Credits des Tarifs / offizieller Multiplikator", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const plan = d.plans.find((p) => p.id === "kiro-pro");
  assert.ok(plan, "kiro-pro fehlt");
  assert.equal(plan.disclosure, "disclosed");
  assert.equal(plan.quotas[0].amount, 1000, "1.000 Credits pro Monat laut kiro.dev/docs/billing");
  const byModel = new Map(plan.modelRows.map((r) => [r.model, r]));
  // Multiplikatoren laut kiro.dev/docs/models (Auto = 1 Credit pro Task)
  assert.equal(Math.round(byModel.get("Claude Opus 5").requestsPerMonth), Math.round(1000 / 2.2));
  assert.equal(Math.round(byModel.get("Claude Sonnet 5").requestsPerMonth), Math.round(1000 / 1.3));
  assert.equal(Math.round(byModel.get("Auto (Kiro router)").requestsPerMonth), 1000);
  assert.equal(Math.round(byModel.get("Qwen3 Coder Next").requestsPerMonth), 20000);
});

test("Amazon Q Developer: 50 agentische Requests im Free-Tier", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const plan = d.plans.find((p) => p.id === "amazon-q-free");
  assert.ok(plan, "amazon-q-free fehlt");
  assert.equal(plan.quotas[0].amount, 50);
  assert.equal(plan.modelRows.length, 1);
  assert.equal(plan.modelRows[0].requestsPerMonth, 50);
  // Pro: die AWS-Service-Quota-Doku nennt 1.000 agentische Requests pro Nutzer und Monat.
  const pro = d.plans.find((p) => p.id === "amazon-q-pro");
  assert.ok(pro, "amazon-q-pro fehlt");
  assert.equal(pro.quotas[0].amount, 1000);
  assert.equal(pro.modelRows.length, 1);
  assert.equal(pro.modelRows[0].requestsPerMonth, 1000);
});

test("JetBrains AI: 1 AI Credit = 1 USD Modellnutzung", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const expected = { "jetbrains-ai-free": 3, "jetbrains-ai-pro": 10, "jetbrains-ai-ultimate": 35 };
  for (const [id, credits] of Object.entries(expected)) {
    const plan = d.plans.find((p) => p.id === id);
    assert.ok(plan, `${id} fehlt`);
    assert.equal(plan.meter, "dollar_usage");
    assert.equal(plan.quotas[0].amount, credits, `${id}: Credits pro 30 Tage`);
    const row = plan.modelRows[0];
    assert.ok(row, `${id}: Modellzeile`);
    assert.ok(Math.abs(row.requestsPerMonth - credits / row.costPerRequest) < 1, `${id}: Requests = Credits / Kosten pro Request`);
  }
});

test("Gemini Code Assist: offizielle Tagesquote wird auf den Monat gerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const cases = { "gemini-code-assist-standard": 1500, "gemini-code-assist-enterprise": 2000 };
  for (const [id, perDay] of Object.entries(cases)) {
    const plan = d.plans.find((p) => p.id === id);
    assert.ok(plan, `${id} fehlt`);
    assert.equal(plan.meter, "requests");
    assert.equal(plan.quotas[0].amount, perDay, `${id}: Requests pro Tag`);
    assert.equal(plan.modelRows[0].requestsPerMonth, Math.round(perDay * 30.44), `${id}: Monat = Tag x 30,44`);
  }
});

test("Augment und Cursor: Dollar-Volumen, Cursor als berichtet gekennzeichnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const augment = d.plans.find((p) => p.id === "augment-standard");
  assert.equal(augment.quotas[0].amount, 20, "Augment Standard: 20 $ Nutzung");
  assert.equal(augment.meter, "dollar_usage");
  assert.ok(augment.modelRows.length >= 3);
  for (const id of ["cursor-pro", "cursor-ultra"]) {
    const plan = d.plans.find((p) => p.id === id);
    assert.ok(plan, `${id} fehlt`);
    assert.equal(plan.disclosure, "reported", `${id}: drittseitige Menge muss als berichtet gekennzeichnet sein`);
    assert.ok(plan.notes.includes("not publish") || plan.notes.includes("does not publish"), `${id}: Hinweis auf fehlende Anbieterangabe`);
    assert.ok(plan.modelRows.length >= 10, `${id}: Modellpreise aus der Cursor-Doku`);
  }
});

// Qwen Coding Plan Pro: die offizielle Monatsquote ist bereits eine Request-Zahl.
test("Qwen Coding Plan Pro: offizielle Request-Quote als Rate", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const src = JSON.parse(await readFile(join(ROOT, "parsed/qwen-coding-plan.json"), "utf8"));
  const plan = d.plans.find((p) => p.id === "qwen-coding-pro");
  assert.ok(plan, "qwen-coding-pro fehlt");
  assert.equal(plan.modelRows.length, 1, "genau eine Zeile mit der offiziellen Quote");
  assert.equal(plan.modelRows[0].requestsPerMonth, src.plans[0].quotaMonth, "Requests/Monat = offizielle Monatsquote");
  assert.equal(plan.modelRows[0].normalizedPer1, src.plans[0].quotaMonth / plan.price.monthlyUsd, "Rate pro Dollar");
  // Die Token-Tarife bleiben ohne Rate: Koeffizienten sind nicht veroeffentlicht.
  for (const id of ["qwen-token-personal-lite", "qwen-token-personal-pro"]) {
    const p2 = d.plans.find((p) => p.id === id);
    assert.ok(p2, `${id} fehlt`);
    assert.equal((p2.modelRows ?? []).length, 0, `${id}: ohne veroeffentlichte Koeffizienten keine Rate`);
  }
});

// GitHub Copilot Business/Enterprise: Preis pro Sitz, Credits pro Nutzer (Docs-Tabelle).
test("Copilot Business und Enterprise: Credits pro Nutzer, Rate nachgerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const src = JSON.parse(await readFile(join(ROOT, "parsed/copilot-plans.json"), "utf8"));
  assert.equal(src.plans.length, 2, "Business und Enterprise aus der Docs-Tabelle");
  for (const p of src.plans) {
    const plan = d.plans.find((x) => x.id === `copilot-${p.name.toLowerCase()}`);
    assert.ok(plan, `copilot-${p.name.toLowerCase()} fehlt`);
    assert.equal(plan.price.monthlyUsd, p.priceUsd, `${p.name}: Preis pro Sitz`);
    // Credits x 0,01 $ = Nutzungsvolumen in Dollar
    assert.equal(plan.quotas[0].amount, +(p.creditsPerUser * 0.01).toFixed(2), `${p.name}: Dollar-Volumen`);
    assert.ok(plan.modelRows.length >= 30, `${p.name}: Modellpreise aus der Copilot-Doku`);
    const row = plan.modelRows[0];
    assert.ok(Math.abs(row.requestsPerMonth - plan.quotas[0].amount / row.costPerRequest) < 1, `${p.name}: Requests = Volumen / Kosten pro Request`);
  }
});

test("Cerebras Code: Tageslimit in Tokens wird auf den Monat gerechnet", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const src = JSON.parse(await readFile(join(ROOT, "parsed/cerebras-code.json"), "utf8"));
  const byId = new Map(d.plans.map((p) => [p.id, p]));
  for (const p of src.plans) {
    const plan = byId.get(`cerebras-code-${p.name.toLowerCase()}`);
    assert.ok(plan, `Cerebras-Tarif "${p.name}" fehlt im Katalog`);
    assert.equal(plan.quotas[0].amount, p.tokensPerDay, `${p.name}: Token pro Tag aus der Quelle`);
    assert.equal(plan.quotas[0].window, "day", `${p.name}: Tagesfenster`);
    const r = plan.modelRows[0];
    assert.ok(r, `${p.name}: Modellzeile`);
    const tokensPerMonth = r.requestsPerMonth * (r.patternUsed.input + r.patternUsed.cachedRead + r.patternUsed.output);
    assert.ok(Math.abs(tokensPerMonth - p.tokensPerDay * 30.44) / (p.tokensPerDay * 30.44) < 0.01,
      `${p.name}: Monats-Tokens = Tageslimit x 30,44`);
  }
});

// --- Freebuff 2026-09-28: Gratis-Tarif ohne veroeffentlichtes Dollar-Volumen ---
// Die Quelle nennt den Gratis-Tarif nur noch als "100 Freebucks every day" je Region
// (freebuff.com/plans sagt nur "Sign in to see your account's allowance"); das frueher
// publizierte "$31 of usage a month" ist weg. Ohne Volumen gibt es keine Rate und keine
// Modell-Zeilen (ehrlich null statt erfundener Zahlen). Die Modell-Liste der bezahlten
// Tarife kommt aus der FAQ der Quelle, nicht aus einer hart kodierten Liste.
test("Freebuff: Tarife, Freebucks-Tagesquote, keine Rate ohne veroeffentlichtes Volumen", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const fb = JSON.parse(await readFile(join(ROOT, "parsed/freebuff-pricing.json"), "utf8"));
  const faq = JSON.parse(await readFile(join(ROOT, "parsed/freebuff-faq.json"), "utf8"));
  const plans = d.plans.filter((p) => p.provider === "freebuff");
  assert.equal(plans.length, fb.plans.length + 1, "Gratis-Tarif plus bezahlte Tarife");

  const free = plans.find((p) => p.id === "freebuff-free");
  assert.ok(free, "Gratis-Tarif vorhanden");
  assert.equal(free.price.paidPrice, 0, "Gratis-Tarif kostet $0");
  // Das Dollar-Volumen ist nicht mehr publiziert (freeTierMonthlyUsd: null) ...
  assert.equal(fb.freeTierMonthlyUsd, null, "Quelle nennt kein Monats-Volumen mehr");
  assert.ok(!free.quotas.some((q) => q.unit === "usd"), "kein erfundenes Dollar-Volumen");
  // ... publiziert ist die Freebucks-Tagesquote (US; andere Regionen stehen in der Notiz).
  const usDay = faq.freebucksPerDay.find((b) => b.regions === "US");
  assert.equal(free.quotas[0].amount, usDay.perDay, "Freebucks/Tag des Gratis-Tarifs aus der Quelle");
  assert.equal(free.quotas[0].window, "day", "Tagesfenster");
  assert.equal((free.modelRows ?? []).length, 0, "ohne Dollar-Volumen keine Modell-Zeilen");
  assert.ok(!d.modelComparisons.some((m) => m.planId === "freebuff-free"),
    "Gratis-Tarif darf nicht in die Familien-Mediane laufen");

  // Jede Modell-Zeile muss im publizierten Katalog stehen (Provenance-Kopplung):
  // eine Umbenennung in der Quelle faellt damit auf, statt still Zeilen zu verlieren.
  const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "").replace(/([a-z])v(?=\d)/g, "$1");
  const catalog = new Set((faq.models ?? []).map(key));
  assert.ok(catalog.size >= 8, "Modell-Katalog der FAQ ist geparst");
  for (const p of fb.plans) {
    const plan = plans.find((x) => x.id === `freebuff-${p.name.toLowerCase()}`);
    assert.ok(plan, `${p.name} im Katalog`);
    assert.equal(plan.price.paidPrice, p.monthlyUsd, `${p.name}: Preis aus der Quelle`);
    assert.equal(plan.quotas[0].amount, p.maxSpendUsd, `${p.name}: Dollar-Volumen aus der Quelle`);
    assert.ok(plan.modelRows.length > 0, `${p.name}: Modell-Zeilen`);
    for (const r of plan.modelRows) {
      assert.ok(catalog.has(key(r.model)), `${p.name}/${r.model}: Modell steht im Quell-Katalog`);
      const expected = r.requestsPerMonth / p.monthlyUsd;
      assert.ok(Math.abs(r.normalizedPer1 - expected) < Math.max(1e-6, expected * 1e-6),
        `${p.name}/${r.model}: Rate pro $`);
    }
    // Kein API-Zugang ist ein Attribut, nicht nur Prosa: der Filter "no API" muss greifen
    assert.equal(plan.tag, "no API", `${p.name}: Tag no API`);
    assert.ok(/terms-of-service/.test(plan.notes ?? ""), `${p.name}: Note nennt die Quelle`);
  }

  for (const p of d.plans) {
    for (const r of p.modelRows ?? []) {
      if (r.normalizedPer1 === null) continue;
      assert.ok(Number.isFinite(r.normalizedPer1), `${p.id}/${r.model}: endliche Rate`);
    }
  }
  for (const m of d.modelComparisons ?? []) {
    assert.ok(Number.isFinite(m.normalizedPer1Median), `${m.planId}/${m.family}: endlicher Median`);
  }
});

test("OpenDesign Go: Credits, Fenster und Modell-Caps kommen 1:1 aus der Quelle", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const od = JSON.parse(await readFile(join(ROOT, "parsed/opendesign-pricing.json"), "utf8"));
  const cr = JSON.parse(await readFile(join(ROOT, "parsed/opendesign-credits.json"), "utf8"));
  const src = od.plans.find((p) => p.tier === "go");
  const plan = d.plans.find((p) => p.id === "opendesign-go");
  assert.ok(src, "Quelle muss den Go-Tarif liefern");
  assert.ok(plan, "opendesign-go muss im Katalog stehen");
  assert.equal(plan.price.advertised, src.priceMonthly, "Listenpreis aus der Tarifkarte");
  assert.equal(plan.price.altPrice, src.priceYearlyMonthly, "Jahrespreis pro Monat");
  assert.equal(plan.meter, "dollar_usage");
  assert.equal(plan.quotas.find((q) => q.window === "month").amount, src.creditsMonthly, "Monats-Credits");
  assert.equal(plan.quotas.find((q) => q.window === "week").amount, cr.windows.go.design7d, "7-Tage-Fenster");
  assert.equal(plan.quotas.find((q) => q.window === "5h").amount, cr.windows.go.design5h, "5-Stunden-Fenster");
  assert.ok(plan.modelRows.length >= 8, `erwartet >=8 Modellzeilen, hat ${plan.modelRows.length}`);
  // Keine Zeile darf ueber dem Monatsmaximum liegen ...
  for (const r of plan.modelRows) {
    assert.ok(r.allowance <= src.creditsMonthly, `${r.model}: Obergrenze ueber dem Monatsmaximum`);
  }
  // ... und die veroeffentlichten Einzel-Obergrenzen (Luna 15 $, Flash-X 30 $) muessen ankommen.
  assert.ok(plan.modelRows.some((r) => r.allowance === 15), "Einzel-Obergrenze 15 $ fehlt");
  assert.ok(plan.modelRows.some((r) => r.allowance === 30), "Einzel-Obergrenze 30 $ fehlt");
});

test("CSS: keine zerschnittenen Regeln (Klebe-Bug nach Text-Aufraeumen)", async () => {
  const html = await readFile(join(ROOT, "public/index.html"), "utf8");
  const css = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length, "CSS-Klammern unbalanciert");
  assert.equal((css.match(/,\s*{/g) || []).length, 0, "Selektorliste endet mit einem Komma");
  // Die Mono-Utility-Regel muss ihre eigene Deklaration behalten. Fehlt ihr die
  // schliessende Klammer, frisst sie die naechste Regel (Fortschrittsbalken:
  // position: fixed, height: 2px) und die linke Spalte kollabiert.
  const mono = (css.match(/[^{}]*\.rail-title[^{}]*\{[^{}]*\}/g) || []).find((r) => /\.chart-foot/.test(r));
  assert.ok(mono, "Mono-Regel mit .rail-title und .chart-foot fehlt");
  assert.match(mono, /font-family:\s*var\(--pv-mono\)/, "Mono-Regel hat die falsche Deklaration");
  assert.doesNotMatch(mono, /position:\s*fixed/, "Mono-Regel hat eine fremde Deklaration gefressen");
  // Kein Layout-Element darf als Fortschrittsbalken enden.
  for (const sel of [".rail-title", ".chart-foot", ".app-meta", ".panel-head p"]) {
    const re = new RegExp(`[^{}]*${sel.replace(/[.]/g, "\\.")}[^{}]*\\{[^{}]*position:\\s*fixed[^{}]*\\}`, "g");
    assert.equal([...css.matchAll(re)].length, 0, `${sel} darf nicht position: fixed sein`);
  }
});

// --- Changelog: kommt aus der Git-Historie, nicht aus Handarbeit -------------
test("Changelog wird aus den Commits erzeugt und ist sauber", async () => {
  const d = JSON.parse(await readFile(join(ROOT, "public/data/latest.json"), "utf8"));
  const entries = d.changelog?.entries ?? [];
  assert.ok(entries.length >= 10, `Changelog sollte gefuellt sein, hat ${entries.length}`);
  for (const e of entries) {
    assert.ok(e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date), `Datum fehlt/kaputt: ${JSON.stringify(e)}`);
    assert.ok(e.text || e.textEn, `Text fehlt: ${JSON.stringify(e)}`);
    if (e.commit) assert.match(String(e.commit), /^[0-9a-f]{7,40}$/, `commit muss ein SHA sein: ${e.commit}`);
  }
  const dates = entries.map((e) => e.date);
  assert.deepEqual(dates, [...dates].sort().reverse(), "neueste zuerst");
  // Internes Rauschen (Sync-/Daten-/Test-Commits) darf nicht auftauchen
  // Nur die Praefix-Rauschtypen: ein Betreff wie "feat: merge LLM Stats ..." ist
  // eine echte Aenderung, deshalb hier nicht auf das Wort "merge" pruefen.
  const rausch = entries.filter((e) => /^(chore\((web|data|ci)\)|test[(:])/.test(e.text || ""));
  assert.equal(rausch.length, 0, `Rausch-Commits im Changelog: ${rausch.slice(0, 3).map((e) => e.text).join(" | ")}`);
});

test("Plan-/Anbieterseiten und deutsche Seite: Kanonisch, Sprache, Sitemap", async () => {
  const dirs = ["plans", "providers"];
  const { readdirSync } = await import("node:fs");
  const sitemap = await readFile(join(ROOT, "public/sitemap.xml"), "utf8");
  for (const dir of dirs) {
    const base = join(ROOT, "public", dir);
    const entries = readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith("."));
    assert.ok(entries.length > 0, `${dir} sollte Seiten enthalten`);
    for (const e of entries) {
      const html = await readFile(join(base, e.name, "index.html"), "utf8");
      const canonical = `https://vibeplan.cc/${dir}/${e.name}/`;
      assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `canonical fehlt: ${canonical}`);
      assert.ok(html.includes("<h1>"), `h1 fehlt: ${canonical}`);
      assert.ok(!html.includes("\u2014"), `Em-Dash gefunden: ${canonical}`);
      assert.ok(sitemap.includes(canonical), `nicht in der Sitemap: ${canonical}`);
    }
  }
  const de = await readFile(join(ROOT, "public/de/index.html"), "utf8");
  assert.ok(de.includes('<html lang="de">'), "deutsche Seite ohne lang=de");
  assert.ok(de.includes('hreflang="en"'), "hreflang auf die englische Fassung fehlt");
  assert.ok(sitemap.includes("https://vibeplan.cc/de/"), "deutsche Seite fehlt in der Sitemap");
});

test("Leerer Parse ueberschreibt keinen vorhandenen Stand (Quellen-Schutz)", async () => {
  const { isEmptyParse } = await import("../scripts/parse-all.mjs");
  // JS-Huelle ohne Daten: Listen leer -> gilt als leer
  assert.equal(isEmptyParse({ plans: [], models: [] }), true, "leere Listen sind leer");
  assert.equal(isEmptyParse({ freeTierMonthlyUsd: null, plans: [] }), true, "auch mit null-Feldern");
  // Vorhandener Inhalt darf nie als leer gelten
  assert.equal(isEmptyParse({ plans: [{ name: "Starter" }] }), false, "gefuellte Liste ist Inhalt");
  // Reiner Metadaten-Parser (keine Listen, aber Felder) bleibt Inhalt
  assert.equal(isEmptyParse({ quotaRefresh: "7d", rollover: false }), false, "Felder zaehlen als Inhalt");
  assert.equal(isEmptyParse({}), true, "leeres Objekt ist leer");
});

test("Verlauf (data/history.jsonl): aufsteigende Tage, keine Doppelten, Planseite zeigt ihn", async () => {
  const raw = await readFile(join(ROOT, "data/history.jsonl"), "utf8");
  const rows = raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(rows.length > 1, "Verlauf muss mehr als einen Tag haben");
  const dates = rows.map((r) => r.date);
  assert.deepEqual(dates, [...dates].sort(), "Tage aufsteigend sortiert");
  assert.equal(new Set(dates).size, dates.length, "kein Tag doppelt");
  for (const r of rows) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.date), `Datum kaputt: ${r.date}`);
    assert.ok(Object.keys(r.plans).length > 0, `keine Tarife am ${r.date}`);
    for (const [id, v] of Object.entries(r.plans)) {
      assert.ok(v.p === null || Number.isFinite(v.p), `${id} Preis am ${r.date}`);
      assert.ok(v.t === null || Number.isFinite(v.t), `${id} Rate am ${r.date}`);
    }
  }
  const html = await readFile(join(ROOT, "public/plans/opencode-go/index.html"), "utf8");
  assert.ok(html.includes("<h2>History</h2>"), "Planseite zeigt den Verlauf");
  assert.ok(/\d{4}-\d{2}-\d{2}/.test(html.slice(html.indexOf("<h2>History</h2>"))), "Verlauf mit Datum");
});
