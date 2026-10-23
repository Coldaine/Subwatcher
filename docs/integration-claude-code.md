# Integration: Claude Code Pläne (Anthropic)

**Status: Recherche/Blueprint — noch NICHT implementiert.** 1:1-Anleitung für eine
spätere Implementierungs-Session. Stand: 2026-09-03.

## Ziel

Claude **Pro ($20/Monat, $200/Jahr)**, **Max 5x ($100/Monat)**, **Max 20x ($200/Monat)**
aufnehmen — Claude Code ist in Pro/Max/Team inklusive.

## Datenlage (verifiziert 2026-09-03 von claude.com/pricing)

### Plan-Preise

| Plan | Monatlich | Jährlich |
|---|---|---|
| Pro | $20 | $200 (= $17/Monat) |
| Max 5x | $100 | — |
| Max 20x | $200 | — |
| Team | $25/Seat (annual $20) | — |

### API-Token-Preise (offiziell, $/MTok) — für die Request-Kosten-Formel

| Modell | Input | Output | Cache Read | Cache Write |
|---|---|---|---|---|
| Fable 5.1 | $10 | $50 | $0.25 | $12.50 |
| Opus 5 | $5 | $25 | $0.50 | $6.25 |
| Sonnet 5 | $2 | $10 | $0.20 | $2.50 |
| Haiku 4.5 | $1 | $5 | $0.10 | $1.25 |

### Usage-Modell (Kernproblem!)

Claude Code/Pro/Max nutzen **compute-basierte Limits**, keine fixen Token-/Credit-Mengen:
- **Rolling 5h-Fenster:** Pro ≈ **45 Messages** ("often more depending on capacity",
  Anthropic-eigene Angabe — keine harte Zahl).
- **Weekly Caps** zusätzlich (separater Meter, Reset-Zeit nur in Settings sichtbar).
- **claude.ai-Chat + Claude Code teilen sich denselben Pool.**
- 5h-Limits wurden am **6.5.2026 verdoppelt**, Peak-Hour-Throttling entfernt;
  ab **14.9.2026** permanent +25% auf Weekly Limits (nach temporären +50%).
- **Fable 5.1:** auf Pro **NICHT inklusive** (nur PAYG-Credits seit 1.9.2026);
  auf Max bis **50% der Weekly Limits** inklusive.

## Offizielle Quellen

| URL | Erreichbarkeit | Inhalt |
|---|---|---|
| `https://claude.com/pricing` | ✅ fetchbar | Preise + API-Token-Preise (eine Seite!) |
| `https://claude.com/product/claude-code` | ✅ fetchbar | Pro/Max-Zuordnung |
| `https://support.anthropic.com/.../usage-limit...` | ⚠️ teils | Limit-Details |
| `https://claude.ai/pricing` | ❌ 403 | — |

`claude.com/pricing` (nicht claude.ai!) enthält **Plan-Preise UND die komplette
API-Token-Preisliste** — eine einzige Fetch-Quelle reicht für die Normalisierung.

## Implementierung

1. **sources.yml:** `claude-pricing` → `https://claude.com/pricing` (typ: html).
2. **Parser `parseClaudePricing(raw)`:** extrahiert Plans (Preise) + Models
   (Token-Preise aus dem "Latest models"-Block, inkl. Cache-Raten).
3. **build.mjs:** Plan-Definitionen `claude-pro`, `claude-max-5x`, `claude-max-20x`,
   Modelle Fable 5.1 / Opus 5 / Sonnet 5 / Haiku 4.5 mit echten API-Preisen.
   Pattern-Normalisierung wie bei anderen Plänen (input/cachedRead/cachedWrite/output).

## Vergleichbarkeit — ehrliche Optionen

Das Projekt normalisiert auf **Requests pro $10 aus Token-Kosten**. Claude-Code-Pläne
publizieren **kein Token-/Credit-Budget** — nur compute-basierte 5h-/Weekly-Limits:

- **(A) Nicht-vergleichbar führen:** Preis + Modell-Zugang + Limits dokumentieren,
  aber keinen Pareto-Punkt rechnen (Muster `undisclosed`, hier: `meter: "sessions"`).
  Ehrlichste Variante — "~45 msgs/5h" ist keine belastbare Token-Menge.
- **(B) Geschätzt vergleichbar:** Annahme mittlerer Message-Länge/Kontext →
  Tokens/5h → Monat hochrechnen. Widerspricht der "keine erfundenen Zahlen"-Regel,
  nur mit expliziter `estimated: true`-Kennzeichnung vertretbar.
- **(C) Später:** Anthropic auf ein publiziertes Token/Credit-Modell umstellen —
  bisher nicht vorhanden.

Empfehlung: **A**, plus Modell-Preise trotzdem für Transparenz anzeigen
(was kostet ein Request auf diesem Plan bei API-Preisen — als Info, nicht als Vergleich).

## Pitfalls

- **Fable 5.1 ≠ inklusive auf Pro** (nur PAYG-Credits) — nicht als Pro-Modell listen.
- Max 5x vs 20x unterscheiden sich nur im Multiplikator der Limits, nicht im Modell-Set.
- Modell-Sets ändern sich (Fable-Launches Juni/Sep 2026) → Parser anfällig.
- Compute-basiert heißt: lange Kontexte fressen Limits ~10x schneller.
- Team/Enterprise: andere Meter (pro Seat), erstmal außen vor lassen.
- Limit-Zahlen nur als Richtwerte — Anthropic ändert sie still (50%-Boosts etc.).
