# Limits der grossen Coding-Plaene: Quellenlage und Messverfahren

Stand 2026-09-23. Frage: gibt es echte, moeglichst automatisch aktualisierte
Token-Zahlen zu den Limits der gaengigen Plaene, und wenn nicht, wie kommen wir
selbst an sie?

## Ergebnis

Kein Anbieter veroeffentlicht die absolute Token-Quote. Die Quote ist ueberall
ein internes Budget; veroeffentlicht wird ein Prozentwert, ein Credit-Kontingent,
ein Nachrichtenbereich oder gar nichts. Nachgeprueft an den offiziellen Seiten:

| Anbieter | Offiziell veroeffentlicht | Fehlt |
| --- | --- | --- |
| Anthropic (Claude) | Mechanik: 5h-Fenster plus Woche, geteilt von Claude Code, claude.ai, Cowork; Max = 5x/20x Pro. Statusline liefert `rate_limits.five_hour` und `.seven_day`, jeweils nur `used_percentage` und `resets_at` (docs.claude.com/en/docs/claude-code/statusline) | Tokenzahl, Promptzahl, Stunden |
| OpenAI (Codex) | lokale Nachrichten pro 5h je Modell und Tarif als Bereiche (developers.openai.com/codex/pricing); Pro = 5x/20x Plus | Tokenzahl, Wochenhoehe |
| Cursor | vollstaendige Token-Preistabelle je Modell fuer beide Pools, Plaene Pro 20 / Pro Plus 60 / Ultra 200 (cursor.com/docs/account/pricing) | enthaltene Menge (steht nur als "Included") |
| Kiro | Credits je Tarif 50/1.000/2.000/5.000/10.000, Zusatz-Credit 0,04 $ (kiro.dev/docs/billing, 2026-08-04) | Kurs Credit zu Token |
| Devin / Windsurf | Quota ist ausdruecklich tokenbasiert, taeglich und woechentlich, Extra-Nutzung zu API-Preisen; Preise Free/Pro 20/Max 200/Teams 80+40 (docs.windsurf.com/windsurf/accounts/quota, devin.ai/pricing) | Hoehe der Quota |
| GitHub Copilot | 1 AI-Credit = 0,01 $ plus Modellpreise (github.com/features/copilot/plans) | nichts, wird schon genutzt |

## Geprueft und verworfen

- **Die Token-Tabelle 19.000 / 88.000 / 220.000 pro 5h** aus dem Tracker
  Claude-Code-Usage-Monitor (rund 8.700 Sterne) ist im Quelltext ein
  fest verdrahteter Rueckfallwert (`PLAN_LIMITS`, `confidence: local_estimate`,
  `COMMON_TOKEN_LIMITS = [19_000, 88_000, 220_000, 880_000]`) ohne dokumentierte
  Herleitung. Das Werkzeug bevorzugt inzwischen selbst die offiziellen
  Prozentwerte aus der Statusline. Die Zahlen sind damit keine gemessenen Limits
  und kommen nicht in den Katalog.
- **cctally** (github.com/omrikais/cctally) hat als einziges Projekt ein
  dokumentiertes Modell: eine gewichtete Einheit je Prozentpunkt, angepasst pro
  Konto. Im Modul steht ausdruecklich, dass es keine allgemeine Konstante gibt.
  Die Zahlen in den Testfixtures (`unitsPerPoint` 2.442.620 und 1.685.000) sind
  vom Fixture-Builder gesetzt, nicht gemessen.
- **Vergleichsportale** (rankllms, creditsplan, codingplans, kingy, truefoundry,
  claudelab, didreset) nennen Bereiche ohne Messmethode und ohne Stichprobe.
- **Reset-Tracker** (limitreset.net, agentresets.com, codex-resets.com) zaehlen
  Resets und archivieren Ankuendigungen, keine Limit-Hoehen.
- **token-monitor** (2.300 Sterne) liest die Limits zur Laufzeit aus den
  Anbieter-Endpunkten und liefert keine Tabelle mit.

## Gemessene Datensaetze (Dritte, auf GitHub veroeffentlicht)

Es gibt sie, die geteilten Messungen. Gefunden ueber die GitHub-Suche nach
Proxy-Telemetrie (`anthropic-ratelimit-unified`, `q5h_pct`) und die Bug-Threads
in anthropics/claude-code (#16157, #41930):

- **ArkNill, claude-code-hidden-problem-analysis** (119 Sterne, 2026-05-13):
  Proxy auf TLS-Ebene (`cc-relay`), **45.884 Requests, davon 37.363 mit
  Rate-Limit-Headern**, ein **Max-20x-Konto**, 1. bis 22. April 2026,
  **5,22 Mrd sichtbare Token**, davon 96,96 % Cache-Read. Kernzahl: **1 % des
  5h-Fensters kostet 1,6 bis 2,1 Mio sichtbare Token**. Die Woche 7. bis
  13. April erreichte **99 % des Wochenlimits** nach rund 1,95 Mrd sichtbaren
  Token. Dokumente: `02_RATELIMIT-HEADERS.md`, `DATASET-ARKNILL-20260422.md`,
  `CROSS-VALIDATION-20260422.md`.
- **seanGSISG** (215K Calls, Max 20x, Dez bis Apr, JSONL): per-1 % 1,62 bis
  1,72 Mio Token, unabhaengig derselbe Bereich.
- **cnighswonger, claude-code-cache-fix** (433 Sterne): 101K Calls auf **Max 5x**,
  Interceptor, `quota-analysis.mjs` testet die Gewichte (Cache-Read 0x/0,1x/1x)
  und waehlt die Hypothese mit der kleinsten Streuung ueber die Fenster. Dasselbe
  Verfahren wie unser Messwerkzeug, unabhaengig entstanden.
- **fgrosswig** (Max 5x, Gateway, Maerz bis April): 88 Mio Token an einem Tag
  bei 90 % Auslastung, 3,2 Mrd Token am 26. Maerz ohne Limit (vor der
  Gewichtsumstellung). Nur als Randnotiz brauchbar, Einzeltag.
- **Commandershadow9** (Max 5x, JSONL, Maerz bis April): 34- bis 143-fache
  Kapazitaetsreduktion nach dem Cache-Fix, keine absolute Quote.

Die drei Hauptdatensaetze konvergieren auf denselben per-1 %-Wert, obwohl
Konten, Tarife (5x und 20x), Regionen und Erfassungsmethoden verschieden sind.
Das ist die belastbarste Zahl, die es gibt, und sie ist gemessen, nicht geraten.

## Was daraus im Katalog steht

**Claude Max 20x** (200 $) ist als gemessener Plan drin (`disclosure: measured`,
Tier M): Monatsmenge 8,44 Mrd sichtbare Token, das ist die gemessene Woche
(1,95 Mrd) mal 4,33. Requests pro Monat = gemessene Token geteilt durch unser
Muster (50.962 Token pro Request, 98 % davon Cache-Read) = **165.682**, also
**828 Requests pro Dollar**. Modellzeilen mit Anthropics eigenen Listenpreisen
(Opus 5.5, Opus 5, Sonnet 5, Haiku 4.5, Fable 5.1), gelesen am 2026-09-23.

Grenzen, die dabeistehen: ein Konto, April 2026, Messung waehrend der
Cache-Regression (die Zahlen sind nach dem Fix v2.1.91, aber der Zeitraum war
von der Regression gepraegt), 97 % Cache-Read-Anteil. Deshalb steht der Plan mit
Chip "measured" in der Liste, nicht als offizielle Quote.

Fuer **Max 5x** und **Pro** gibt es keine Wochenmessung (die 5h-Fenstergroesse
ist ueber die Tarife hinweg gleich gemessen, die Wochenskalierung nicht), sie
bleiben Referenzplaene ohne Rate. Wer ein Konto hat, kann mit
`tools/measure-quota/` nachmessen und die Zahl beisteuern.


## Zweite Welle 2026-09-23: alle populären Pläne durchgearbeitet

Katalogstand danach: 72 Pläne, 24 Anbieter, 49 mit Modellzeilen (also in der
Rangliste), 17 Referenzzeilen ohne Rate.

**Integriert, weil der Anbieter die Menge selbst nennt:**

- **Kiro** (Pro 20 $/1.000 Credits, Pro+ 40 $/2.000, Pro Max 100 $/5.000,
  Power 200 $/10.000): Credits offiziell (kiro.dev/docs/billing) und
  Credit-Multiplikatoren je Modell offiziell (kiro.dev/docs/models, Auto = 1
  Credit pro Task). Damit ist Requests/Monat = Credits / Multiplikator, zum
  Beispiel 455 Requests auf Opus 5 oder 20.000 auf Qwen3 Coder Next im Pro-Tarif.
- **Amazon Q Developer**: Free-Tier mit 50 agentischen Requests pro Monat
  offiziell. Pro (19 $) nennt nur "erhöhte Limits", bleibt Referenz.
- **JetBrains AI** (Free 3, Pro 10, Ultimate 35 AI Credits pro 30 Tage): Credits
  offiziell, und laut Doku entspricht ein Credit 1 $ Modellnutzung, die
  Credit-Zahl dem Abopreis. Gerechnet gegen Anthropics Listenpreise, weil
  JetBrains keine eigenen Token-Preise veröffentlicht.
- **Gemini Code Assist** (Individual kostenlos, Standard 19 $, Enterprise 45 $ pro
  Nutzer und Monat bei Jahresvorauszahlung): Agent-Modus und Gemini CLI mit
  offiziellen 1.500 bzw. 2.000 Requests pro Nutzer und Tag, dazu 6.000 Code- und
  960 Chat-Requests pro Tag. Monat = Tagesquote × 30,44.
- **Augment Code** (Standard 20 $ mit 20 $ Nutzung, Business 100 $ mit 100 $
  Nutzung, pauschal bis 50 Sitze): Dollar-Volumen offiziell. Die Token-Rate ist
  eine Obergrenze, weil das Kontingent auch Context Engine und Compute abdeckt.
- **Cursor** (Pro 20 $, Ultra 200 $): Cursor veröffentlicht die Token-Preise aller
  Modelle und beide Pools, aber nicht die enthaltene Menge. Mehrere unabhängige
  Berichte nennen rund 20 $ für Pro (drei Quellen) und rund 400 $ für Ultra (eine
  Quelle). Diese Zeilen tragen `disclosure: reported` und sagen in der Notiz, dass
  die Zahl drittseitig ist. Pro Plus bleibt Referenz.

**Nicht integriert, mit Grund:**

- **OpenAI Codex** (Plus 20 $, Pro 100/200 $): OpenAI veröffentlicht Nachrichten-
  Bereiche pro 5-Stunden-Fenster je Modell, keine Token. Ein Codex-Task löst viele
  Modellaufrufe aus, eine Umrechnung in unser Request-Muster wäre geraten.
- **Claude Pro und Max 5x**: Für Max 20x gibt es eine gemessene Wochenmenge, für
  diese beiden Tarife nicht (die 5h-Fenstergröße ist über die Tarife hinweg gleich
  gemessen, die Wochenskalierung nicht).
- **Devin Desktop / Windsurf** (Pro 20 $, Max 200 $, Teams 80 $ + 40 $/Sitz):
  Quota laut Doku tokenbasiert mit Tages- und Wochenkontingent, Menge nicht
  veröffentlicht.
- **Factory Droid** (Pro 20 $, Plus 100 $, Max 200 $): drei rollierende Limits,
  keine Mengen veröffentlicht.
- **Trae** (Pro 20 $, Pro+ 60 $, Ultra 200 $): "Basic usage" ohne Zahl.
- **Zed Pro** (10 $): kein festes Guthaben, Nutzung zu Standardraten.
- **Volcengine Ark Coding Plan** (ByteDance, Lite/Pro, ab 9,9 ¥): Doku nennt
  5h-/Wochen-/Monatsfenster und Modell-Koeffizienten, die Mengen stehen nur im
  Konto, nicht auf der öffentlichen Seite.
- **Qoder, Replit, Warp, Cline Pass, Kilo Pass, Meta Muse Code, Fireworks
  FirePass**: keine offizielle Menge auffindbar (Preise teils nicht einmal
  offiziell bestätigt), deshalb nicht im Katalog statt mit geratenen Zahlen.


## Dritte Runde 2026-09-23: Restliste und geprüfte Sackgassen

Katalogstand: 76 Pläne, 25 Anbieter, 49 mit Modellzeilen, 21 Referenzzeilen.

**Neu als Referenz (Preis offiziell, Menge nicht veröffentlicht):**

- **Google AI Pro** (21,99 €) und **Google AI Ultra** (99,99 € bzw. 219,99 €):
  Antigravity und Gemini CLI hängen am Google-AI-Tarif, die Doku nennt nur
  "high, generous quota, refreshed every five hours" und "highest weekly limits".
  Preise aus der deutschen Ansicht von gemini.google/subscriptions, mit dem
  Wechselkurs der Seite in USD umgerechnet.
- **ClinePass** (9,99 $): "2 bis 5 mal die Nutzung" gegenüber dem API-Preis, also
  eine relative Angabe, keine absolute Quote.

**Geprüft und verworfen:**

- **OpenAI Codex**: Die Credits sind dokumentiert, aber ohne Kurs. Die FAQ nennt
  Verbrauchsraten nur für einzelne Funktionen (Sprache 1,25 Credits pro Minute,
  Bildgenerierung 3 bis 5 mal schneller), nicht für Coding-Nachrichten. Ohne
  Nachricht-zu-Token-Kurs bleibt Codex Referenz.
- **xAI / SuperGrok** (10 $/30 $/300 $): x.ai/pricing blockt den Abruf mit
  Cloudflare, Preise damit nicht selbst verifiziert, und xAI veröffentlicht laut
  Sekundärquellen keine festen Quoten. Nicht aufgenommen.
- **Qwen-Tarife ohne Modellzeilen** (5 Pläne): Die Token-Preise der Modelle sind
  veröffentlicht (help.aliyun.com/zh/model-studio/model-pricing), aber die
  Umrechnung Credits zu Token ist es nicht ("Tiered deduction coefficients by
  model (official); coefficients not published"). Ohne Koeffizient keine Rate,
  die Pläne bleiben mit roher Quote im Katalog.
- **Google AI Credits** (1.000 für Pro, 35.000 für Ultra): nur Sekundärquellen,
  die offizielle Seite nennt keine Zahl.
- **OpenHands Cloud**: keine Abo-Quote, Nutzung nach Verbrauch oder eigener
  Schlüssel.
- **Warp, Qoder, Replit, Kilo Pass, Meta Muse Code, Fireworks FirePass**:
  keine offizielle Menge auffindbar.

Damit ist die Liste der populären Coding-Pläne durchgearbeitet. Alles, was
integrierbar war, ist drin; alles andere steht mit Grund und Quelle als
Referenzzeile oder ist als Sackgasse hier dokumentiert.


## Nachtrag 2026-09-23: Codex-Messmethode und die letzte Qwen-Lücke

- **Codex lässt sich messen, ist aber nicht gemessen.** `marcus/nightshift`
  dokumentiert die Methode vollständig: die Codex-Session-Dateien enthalten
  `rate_limits` (primär 5 Stunden, sekundär 7 Tage, je mit `used_percent` und
  `window_minutes`) und `total_token_usage`. Abrechenbar sind
  `(input − cached) + output + reasoning`, und die Quote folgt aus
  `inferred_budget = lokale Token / (Prozent / 100)`. Die Beispielwerte im
  Repo (1 Mio. Token pro Woche für Claude, 500.000 für Codex) sind
  Konfigurationsvorgaben für API-Abrechnung, keine gemessenen Limits. Damit
  fehlt für Codex nur noch eine veröffentlichte Messung, das Verfahren steht.
- **codexusage.dev** ist der genaueste Codex-Tracker (Stand 8. und 18. September
  2026) und bestätigt: OpenAI veröffentlicht je Modell Nachrichtenbereiche pro
  5-Stunden-Fenster, das Wochenlimit nicht. Business Standard teilt die
  Plus-Bereiche, Business Premium hat kein 5-Stunden-Fenster.
- **Qwen Coding Plan Pro** hatte eine offizielle Request-Quote, aber keine Zeile:
  6.000 Requests pro 5 Stunden, 45.000 pro Woche, 90.000 pro Monat. Die
  Monatsmenge ist direkt eine Request-Zahl, deshalb steht der Plan jetzt mit
  90.000 Requests pro Monat und 1.800 Requests pro Dollar in der Rangliste. Die
  vier Token-Tarife bleiben ohne Rate, weil die Credit-Koeffizienten
  ("tiered deduction coefficients") nicht veröffentlicht sind; die Preise und
  Mengen (6/10/18/68 $ für 11.500/25.500/45.000/180.000 Credits) sind bestätigt.
- **MiniMax Token Plan** bleibt ohne Rate: die einzige verfügbare Angabe ist ein
  5-Stunden-Cap von 100 Prompts aus einer Dritttabelle, und die Anbieterseite ist
  eine JS-SPA ohne Parser.

Damit sind alle Pläne mit veröffentlichter Menge integriert. Die verbleibenden
fünf Zeilen ohne Rate (vier Qwen-Token-Tarife, MiniMax) haben eine
nachvollziehbare Begründung, keine geratene Zahl.


## Letzter Nachtrag 2026-09-23: Copilot Business und Enterprise

Die Docs-Plantabelle nennt für die Firmentarife erstmals Mengen: **Copilot
Business 19 $ pro Sitz und Monat mit 1.900 AI-Credits pro Nutzer**, **Copilot
Enterprise 39 $ pro Sitz und Monat mit 3.900 AI-Credits pro Nutzer**. Credits
sind wie bei den Einzeltarifen 0,01 $ wert, die Modellpreise kommen aus derselben
Copilot-Doku. Beide Tarife sind damit in der Rangliste (564 Requests pro Dollar
auf dem günstigsten Modell), die Quelle ist als eigener Feed in `sources.yml`
angebunden und wird bei jedem Lauf neu geparst. Copilot Free und Student nennen
nur "an allowance of GitHub AI Credits" ohne Zahl und bleiben draußen.

Katalogstand danach: 78 Pläne, 25 Anbieter, 52 mit Modellzeilen.

## Messverfahren (fuer eigene Messungen)

## Messverfahren (das ist der Weg zu echten Zahlen)

Weil der Anbieter den Nenner verbirgt, den Zaehler aber zeigt, laesst sich die
Quote aus zwei eigenen Groessen rechnen:

    Quote = Summe(gewichtete Token im Fenster) / (Prozent / 100)

- Zaehler: lokale Tokenlogs (Claude Code schreibt je Aufruf Eingabe,
  Cache-Schreiben, Cache-Lesen und Ausgabe mit).
- Gewichte: Preisverhaeltnisse des Modells laut offizieller Preisseite, damit die
  Zahl in unser Kostenmodell passt (Sonnet 5: 1 / 1.25 / 0.1 / 5).
- Nenner: offizieller Prozentwert je Fenster.

Werkzeug: `tools/measure-quota/` (Capture-Skript fuer die Statusline,
Auswertung `measure.py`, Selbsttest mit bekannter Grundwahrheit). Das Ergebnis
gilt fuer ein Konto und eine Modellmischung, deshalb immer Median, Bereich und
Stichprobenzahl; unter drei Fenstern gilt es als nicht gemessen.

Sobald Meldungen aus mehreren Konten vorliegen, wird daraus je Plan ein Bereich
mit Methode, Datum und Stichprobenzahl. Erst dann bekommen Claude, Codex und
Cursor eine Rate pro Dollar in der Rangliste, vorher nicht.
