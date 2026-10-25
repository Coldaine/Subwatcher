import { createHash } from "node:crypto";

// Stabiler Fingerabdruck fuer Quellen ohne Parser (JS-SPAs, Privacy-Seiten).
// Der rohe HTML-Hash ist unbrauchbar: Nonces, Integrity-Attribute und
// Cache-Buster wechseln ohne inhaltliche Aenderung. Der Fingerabdruck wirft
// genau diese volatilen Teile weg, behaelt aber Text und Asset-Pfade, damit
// ein Deployment mit neuen Preisen/Chunks als Aenderung sichtbar wird.
const VOLATILE_ATTRIBUTES = /\s(?:nonce|integrity|crossorigin|referrerpolicy|fetchpriority)\s*=\s*("[^"]*"|'[^']*')/gi;
const CACHE_BUSTER = /([?&](?:v|t|ts|ver|version|cachebust|_)=)[^&"'\s>]+/gi;

export function normalizeHtmlForFingerprint(html) {
  return String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(VOLATILE_ATTRIBUTES, "")
    .replace(CACHE_BUSTER, "$1")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprintHtml(html) {
  return createHash("sha256")
    .update(normalizeHtmlForFingerprint(html))
    .digest("hex");
}
