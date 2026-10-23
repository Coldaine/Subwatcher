# Integration: ChatGPT Plus / Pro (Codex) Pläne

**Status: Recherche/Blueprint — noch NICHT implementiert.** Dieses Dokument ist die
1:1-Anleitung für eine spätere Implementierungs-Session. Stand: 2026-09-03.

## Ziel

ChatGPT **Plus ($20/Monat)**, **Pro 5x ($100/Monat)**, **Pro 20x ($200/Monat)** als
vergleichbare Pläne in `public/data/latest.json` aufnehmen — mit Codex-Zugang als
Hauptwert (OpenAI hat Codex in *allen* ChatGPT-Plänen inklusive).

## Datenlage (verifiziert 2026-09-03)

OpenAI hat **am 2.4.2026** Plus/Pro/Business auf **token-basierte Credits** umgestellt
(Enterprise folgte 23.4.). Das passt zur Projekt-Methodologie (Kosten pro Request aus
Token-Preisen), aber es gibt **keine offizielle fixe monatliche Credit-Menge** —
die Limits sind als **Ranges pro 5h-Fenster** publiziert (siehe Pitfalls).

### Credit-Raten (offizieller Rate Card, credits pro 1M Tokens)

| Modell | Input | Cached Input | Output |
|---|---|---|---|
| GPT-5.6 Sol | 125 | 12.50 | 750 |
| GPT-5.6 Terra | 62.50 | 6.25 | 375 |
| GPT-5.6 Luna | 25 | 2.50 | 150 |
| GPT-5.5 | 125 | 12.50 | 750 |
| GPT-5.4 | 62.50 | 6.25 | 375 |
| GPT-5.4 mini | 18.75 | 1.875 | 113 |

Typischer Task: ~5-45 Credits (GPT-5.5, OpenAI-Angabe).

### Usage-Limits (Planungs-Ranges pro 5h, NICHT fix)

| Modell | Plus/Business | Pro 5x | Pro 20x |
|---|---|---|---|
| GPT-5.6 Sol | 15-90 | 75-450 | 300-1.800 |
| GPT-5.6 Terra | 20-110 | 100-550 | 400-2.200 |
| GPT-5.6 Luna | 50-280 | 250-1.400 | 1.000-5.600 |

Plus: "a few focused coding sessions per week". Business = Plus-Ranges.
Cloud-Tasks/Code-Review: für 5.6/5.5/5.4 als "Not available" markiert (Stand 12.7.2026).

## Offizielle Quellen (zum Fetchen)

| URL | Erreichbarkeit | Inhalt |
|---|---|---|
| `https://learn.chatgpt.com/docs/pricing` | ✅ fetchbar | Pricing + Raten + Limits (primäre Quelle) |
| `https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan` | ⚠️ teils 403 | Codex-in-ChatGPT-Plänen |
| `https://help.openai.com/en/articles/20001106-codex-rate-card` | ⚠️ teils 403 | Credit-Raten |
| `https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage` | ⚠️ teils 403 | Credits/Overflow |
| `https://openai.com/chatgpt/pricing/` | ❌ 403 für Fetcher | — |
| `https://chatgpt.com/codex/pricing/` | ❌ 403 für Fetcher | — |

**403-Workaround:** `learn.chatgpt.com` ist die einzige direkt fetchbare Primärquelle.
Für help.openai.com-Artikel: `https://r.jina.ai/<url>` Prefix probieren; sonst manuell
pflegen (`data/overrides.yml`-Muster mit `lastVerified`).

## Implementierung

1. **sources.yml:** neuen Eintrag `codex-pricing` auf `https://learn.chatgpt.com/docs/pricing`
   (typ: html) — analog zu bestehenden Pricing-Quellen.
2. **Parser (`scripts/parsers.mjs`):** `parseCodexPricing(raw)` extrahiert
   - Credit-Raten-Tabelle (Modell → input/cached/output)
   - Limit-Ranges (Plan × Modell → min/max pro 5h)
   Output: `{ plans: [...], models: [...], rates: {...}, limits: {...} }`
3. **build.mjs:** neue Plan-Definitionen `codex-plus`, `codex-pro-5x`, `codex-pro-20x`
   mit `meter: "credits"`; monatliches Budget aus Limit-Ranges **nicht** fix erfinden —
   siehe Vergleichbarkeit.
4. **Normierung:** Requests pro $10 = f(Modell-Mix). Weil kein fixes Credit-Budget
   publiziert ist, braucht es eine explizite Annahme (z.B. mittlere Range ×
   Wiederholungen pro Woche × 4,33) — **als `estimated: true` kennzeichnen** oder Plan
   als nicht-vergleichbar führen.

## Vergleichbarkeit — ehrliche Optionen

- **(A) Nicht-vergleichbar führen** (wie `undisclosed`): sauberste Lösung, solange
  OpenAI keine fixe monatliche Token/Credit-Menge publiziert. Plan erscheint mit
  Preis + Modellen, aber ohne Pareto-Punkte.
- **(B) Geschätzt vergleichbar**: Annahme "Modell-Mix = Terra-Default", mittlere
  Range → Requests/5h → Hochrechnung Monat. Muss klar als Schätzung markiert werden
  (`estimated: true`), sonst bricht die Ehrlichkeits-Regel des Projekts.
- Empfehlung: **A zuerst**; B nur nach Freigabe, da OpenAI die Ranges selbst nur als
  "planning estimates" bezeichnet.

## Modelle

GPT-5.6 Sol (deep reasoning), Terra (Default), Luna (schnell/hohes Volumen).
Legacy: GPT-5.5, 5.4, 5.4 mini — **GPT-5.4/5.4 mini werden am 31.8.2026 in Codex
entfernt** (Help-Center-Artikel). Score-Matching via LLM-Stats-IDs: `gpt-5.6-sol`,
`gpt-5.6-terra`, `gpt-5.6-luna` (bereits im Leaderboard, conservative 0-100).

## Pitfalls

- **Ranges statt Fixzahlen** — Kernproblem für deterministische Normalisierung.
- **Weekly Caps zusätzlich** zu 5h-Fenstern (separater Meter).
- **Credits kaufbar** (Plus/Pro) → "Unlimited" erst ab Missbrauchs-Guardrails.
- **ChatGPT Work + Codex teilen denselben Agentic-Pool**.
- Rate-Card-Änderungen ohne Ankündigung; **GPT-5.4-Abschaltung** am 31.8.2026.
- `chatgpt.com/codex/pricing` & `openai.com/...` → 403 (Cloudflare) — nie als
  Fetch-Quelle einplanen.
