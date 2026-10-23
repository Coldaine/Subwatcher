#!/usr/bin/env node
/**
 * IndexNow: Bing, Yandex und Seznam sofort über geänderte Seiten informieren.
 *
 * IndexNow braucht kein Konto: der Schlüssel liegt als Datei unter
 * <host>/<key>.txt, die URLs werden bei jeder Datenerneuerung nachgeschoben.
 * Google nutzt IndexNow nicht (dort zählt die Sitemap), Bing ist der zweite
 * Marktanteil und reagiert damit in Minuten statt Wochen.
 *
 * Der Schluessel ist oeffentlich (er steht im Dateinamen), deshalb steht er hier
 * im Klartext. Die Datei public/<key>.txt wird von der CI ins Root gespiegelt.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HOST = "vibeplan.cc";
const SITE = `https://${HOST}`;
const KEY = "8f3c1a94d7b25e60af4183c95d7b2e10";

const urls = [
  `${SITE}/`,
  `${SITE}/coding-plan-comparison/`,
  `${SITE}/data/latest.json`,
];

// Schluesseldatei: Inhalt = Schluessel, Name = <schluessel>.txt
const keyFile = join(ROOT, "public", `${KEY}.txt`);
let current = "";
try { current = readFileSync(keyFile, "utf8").trim(); } catch { /* neu */ }
if (current !== KEY) {
  writeFileSync(keyFile, KEY + "\n");
  console.log(`IndexNow-Schluesseldatei geschrieben: public/${KEY}.txt`);
}

const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls });
if (process.argv.includes("--dry")) {
  console.log("IndexNow (dry):", body);
  process.exit(0);
}

try {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
  });
  console.log(`IndexNow: ${res.status} für ${urls.length} URLs`);
} catch (e) {
  // Netzfehler dürfen den Build nicht kippen
  console.warn("IndexNow nicht erreichbar:", e.message);
}
