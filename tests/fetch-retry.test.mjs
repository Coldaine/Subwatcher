import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetry } from "../scripts/fetch.mjs";

// Regression: eine einzelne flakige Quelle hat den Tageslauf gekillt
// (2026-10-04: "glm-coding-overview: fetch failed" → ganzer Workflow rot).
// fetchWithRetry muss transiente Fehler wiederholen, dauerhafte (404/403) nicht.

const opts = { attempts: 3, delays: [1, 1], label: "test", log: () => {} };

function stubFetch(seq) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const next = seq.shift();
    if (next instanceof Error) throw next;
    return { status: next, ok: next >= 200 && next < 300, headers: new Headers() };
  };
  return calls;
}

test("Netzwerkfehler wird wiederholt, Erfolg beim dritten Versuch", async () => {
  const calls = stubFetch([new TypeError("fetch failed"), new TypeError("fetch failed"), 200]);
  const resp = await fetchWithRetry("https://example.test/x", () => ({}), opts);
  assert.equal(resp.status, 200);
  assert.equal(calls.length, 3);
});

test("HTTP 500 und 429 werden wiederholt", async () => {
  const calls = stubFetch([500, 429, 200]);
  const resp = await fetchWithRetry("https://example.test/x", () => ({}), opts);
  assert.equal(resp.status, 200);
  assert.equal(calls.length, 3);
});

test("HTTP 404 wird NICHT wiederholt", async () => {
  const calls = stubFetch([404]);
  const resp = await fetchWithRetry("https://example.test/x", () => ({}), opts);
  assert.equal(resp.status, 404);
  assert.equal(calls.length, 1);
});

test("bleibender Ausfall wirft nach allen Versuchen", async () => {
  const calls = stubFetch([new TypeError("fetch failed"), new TypeError("fetch failed"), new TypeError("fetch failed")]);
  await assert.rejects(() => fetchWithRetry("https://example.test/x", () => ({}), opts), /fetch failed/);
  assert.equal(calls.length, 3);
});

test("letzter Versuch meldet den HTTP-Status statt zu werfen", async () => {
  const calls = stubFetch([503, 503, 503]);
  const resp = await fetchWithRetry("https://example.test/x", () => ({}), opts);
  assert.equal(resp.status, 503);
  assert.equal(calls.length, 3);
});

test("jeder Versuch bekommt ein frisches Signal (Timeout gilt pro Versuch)", async () => {
  const signals = [];
  let n = 0;
  globalThis.fetch = async (url, o) => {
    signals.push(o.signal);
    n += 1;
    if (n < 3) throw new TypeError("fetch failed");
    return { status: 200, ok: true, headers: new Headers() };
  };
  await fetchWithRetry("https://example.test/x", () => ({}), opts);
  assert.equal(signals.length, 3);
  assert.equal(new Set(signals).size, 3, "kein wiederverwendetes (bereits abgebrochenes) Signal");
  for (const s of signals) assert.equal(s.aborted, false);
});
