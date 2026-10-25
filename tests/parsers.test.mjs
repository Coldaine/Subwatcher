import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCopilotModels, parseGlmOverview } from "../scripts/parsers.mjs";

// Fixture-Regressionen fuer die aktuelle Struktur der offiziellen Seiten.
// Kein Netzwerk: die Fixtures bilden den veroeffentlichten Aufbau nach, damit
// ein Markup-/Parser-Regress ohne Live-Fetch auffaellt. Die Produktionsdaten
// selbst prueft tests/build.test.mjs gegen die tatsaechlich geparste Quelle.

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = (name) => readFileSync(join(ROOT, "tests", "fixtures", name), "utf8");

// Dokumentierte Formel (GLM-Docs): Credits = (Tokens x Koeffizient) / 10000.
// Kontrolliertes Workload-Muster, damit die Zahlen nicht von Live-Daten abhaengen.
const PATTERN = { input: 1000, cachedRead: 55000, output: 200 };
const creditsFor = (coefficients) =>
  (PATTERN.input * coefficients.input + PATTERN.cachedRead * coefficients.cachedRead + PATTERN.output * coefficients.output) / 10000;

test("GLM current markup: coefficients survive the trailing metadata duplicate", () => {
  const parsed = parseGlmOverview(fixture("glm-overview-current.html"));

  // Die Ueberschrift steht in TOC, Abschnitt und Metadaten-Blob. Frueher gewann
  // das letzte Vorkommen (der Blob) und models blieb leer.
  assert.equal(parsed.models.length, 2, "beide veroeffentlichten Modellzeilen");
  assert.deepEqual(parsed.models, [
    { model: "GLM-5.3", input: 6.9, cachedRead: 1.7, output: 24 },
    { model: "GLM-5.3-Flash", input: 2.3, cachedRead: 0.56, output: 8 },
  ]);
  // MCP-Platzhalter ist ein Gedankenstrich, kein Bindestrich.
  assert.equal(parsed.mcpPerCall, 1.2);
  assert.equal(parsed.offPeakDiscount, 0.5);
  assert.ok(parsed.formula, "Formel aus der Quelle");
  assert.deepEqual(
    parsed.quotas.map((q) => [q.tier, q.h5, q.weekly]),
    [["lite", 2000, 10000], ["pro", 12000, 60000], ["max", 28000, 140000]],
  );

  // Numerische Verifikation der dokumentierten Formel mit kontrollierten Werten.
  const glm53 = parsed.models.find((m) => m.model === "GLM-5.3");
  const flash = parsed.models.find((m) => m.model === "GLM-5.3-Flash");
  assert.ok(Math.abs(creditsFor(glm53) - 10.52) < 1e-9, "GLM-5.3: (1000x6.9 + 55000x1.7 + 200x24)/10000");
  assert.ok(Math.abs(creditsFor(flash) - 3.47) < 1e-9, "GLM-5.3-Flash: (1000x2.3 + 55000x0.56 + 200x8)/10000");
});

test("GLM older markup with a hyphen MCP placeholder still parses", () => {
  const parsed = parseGlmOverview(fixture("glm-overview-legacy.html"));
  assert.deepEqual(parsed.models, [{ model: "GLM-5.2", input: 6.9, cachedRead: 1.7, output: 24 }]);
  assert.equal(parsed.mcpPerCall, 1.2, "alter Bindestrich-Platzhalter bleibt unterstuetzt");
  assert.equal(parsed.offPeakDiscount, 0.5);
});

test("GLM without a coefficient table reports no models instead of inventing values", () => {
  const parsed = parseGlmOverview(fixture("glm-overview-no-coefficients.html"));
  assert.deepEqual(parsed.models, [], "keine Koeffizienten in der Quelle, keine erfundenen Zeilen");
  assert.ok(parsed.formula, "die Formel selbst steht weiter in der Quelle");
  assert.equal(parsed.mcpPerCall, null);
  assert.deepEqual(parsed.quotas.map((q) => q.tier), ["pro"]);
});

test("Copilot model table: GA default tier only, cache-write fallback to input", () => {
  const parsed = parseCopilotModels(fixture("copilot-models-current.html"));
  // Der Parser folgt der veroeffentlichten Tabelle, nicht einer Modell-Allowlist:
  // ein umbenanntes oder neues Modellset darf nicht still herausfallen.
  assert.deepEqual(parsed.models, [
    { model: "GPT-9 Nova", input: 0.25, cachedRead: 0.025, cachedWrite: 0.3, output: 2, source: "copilot-models" },
    { model: "Claude Test 6", input: 1.1, cachedRead: 0.11, cachedWrite: 1.1, output: 5.5, source: "copilot-models" },
  ]);
  assert.equal(parsed.creditValueUsd, 0.01);
  assert.ok(!parsed.models.some((m) => m.model === "Preview Model"), "Preview-Zeilen zaehlen nicht");
});
