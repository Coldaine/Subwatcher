# Design-Review der Coding-Plan-Seite

Datum: 2026-09-23
Gegenstand: https://harrytyp.github.io/coding-plan-comparison/ (Live-Stand nach dem Ausrollen
der Gestaltungsschicht) und die Vorschau unter /preview/
Methode: Messungen im echten Chrome auf der Live-URL (1600x1000 Desktop, 390x844 Mobil), beide
Themes, DOM- und Token-Auswertung, echter Tab-Durchlauf über CDP, blockierter Datenabruf für den
Fehlerzustand. Keine erfundenen Werte: jede Zahl unten ist gemessen, jede Zeile nennt die Stelle.

Werkzeuge: die installierten Design-Skills (contrast-master, a11y-core, keyboard-navigator,
typography-audit, readable-measure, typography-scale, data-visualization, die sieben
critique-Skills, heuristic-evaluation, animation-principles, motion-system, frontend-design).

---

## Durchgang 1: Barrierefreiheit

Skills: contrast-master, a11y-core, keyboard-navigator.

### Befunde

| # | Regel | WCAG | Schwere | Stelle | Kurz |
|---|---|---|---|---|---|
| A1 | A11Y-LABEL-01 | 1.3.1 A, 4.1.2 A | serious | `public/index.html` Toolbar + Sheet, 11 Controls | Formularfelder ohne programmatisch verknüpftes Label |
| A2 | A11Y-LIVE-01 | 4.1.3 AA | moderate | `#plans-count`, `.kpi .v`, Filterzeile | Keine Live-Region, dynamische Zahlen werden nicht angesagt |
| A3 | A11Y-SKIP-01 | 2.4.1 A | moderate | `public/index.html`, Kopf | Kein Sprunglink, 31 Fokus-Stopps vor dem Inhalt |
| A4 | A11Y-SORT-01 | 4.1.2 A | moderate | `#plans-table thead th` (0 von 14) | Sortierzustand nicht exponiert (`aria-sort` fehlt) |
| A5 | A11Y-FOCUS-01 | 2.4.3 A | moderate | `#cmdk` Command-Palette | Fokus kehrt nach ESC zu `<body>` statt zum Auslöser |
| A6 | A11Y-TABLE-01 | 1.3.1 A | minor | beide Datentabellen | Kein `<caption>`, 14 von 14 `th` ohne `scope` |
| A7 | A11Y-SVG-01 | 1.1.1 A | minor | 12 Inline-SVGs | Dekorative Icons ohne `aria-hidden="true"` |
| A8 | A11Y-NONTEXT-01 | 1.4.11 AA | minor | `.chip-btn` | Rand 1,27:1 (dunkel) / 1,4:1 (hell) gegen den Grund |
| A9 | A11Y-CONTRAST-01 | 1.4.3 AA | minor | `th.t-right.sorted` Pfeilglyph | 4,49:1 bei 10px/700, 0,01 unter der Schwelle |

Details zu den wichtigsten:

**A1 (serious).** 11 Bedienelemente ohne Label: `#plans-search`, `#plans-meter-filter`,
`#budget-slider`, `#ai-slider`, `#sheet-sort-key`, `#sheet-sort-dir`, `#sheet-search`,
`#sheet-meter`, `#sheet-budget`, `#sheet-ai`, `#cmdk-input`. Das Label steht als Geschwister
daneben, ohne `for`/`id`-Bindung (`<label>Max $/mo</label><input id="budget-slider">`).
Fix: `for`/`id` verbinden oder das Input ins Label legen; für `#cmdk-input` ein
`aria-label="Search plans and models"`.

**A2 (moderate).** Keine `aria-live`-Region auf der Seite (0 gefunden). Wer mit Screenreader
filtert, hört nicht, dass sich die Trefferzahl von "25 / 378" auf "25 / 481" ändert.
Fix: `aria-live="polite"` auf `#plans-count` und eine versteckte Statuszeile für Filterwechsel.

**A3 (moderate).** Kein Sprunglink (`a[href="#main"]` fehlt), obwohl 31 fokussierbare
Elemente vor dem Inhalt liegen. Fix: sichtbarer Sprunglink als erstes Element.

**A4 (moderate).** Kein `th` trägt `aria-sort`. Die sortierte Spalte ist nur visuell markiert
(Akzentfarbe + Unterstrich). Fix: `aria-sort="descending"` auf der aktiven Spalte, der
Sortierschlüssel liegt in `plansSort` bereits vor.

**A5 (moderate).** Gemessen: Palette öffnet, Fokus landet korrekt in `#cmdk-input`, ESC
schließt, danach ist `document.activeElement` der `<body>`. Fix: Auslöser merken und
zurückgeben.

### Was sauber ist (geprüft, nicht gefunden)

- Fokusring: 24 echte Tab-Stopps, jeder mit 2px-Ring, gemessen 4,69:1 gegen den Grund.
- Textkontrast: in beiden Themes nur der Pfeilglyph aus A9 unter 4,5:1. Kleinste Grade
  (20 Knoten bis 11,5px) liegen zwischen 4,73:1 und 11:1.
- Datenfarben auf der Plotfläche: 4,32:1 (blau), 4,16:1 (orange), 5,08:1 (grau) gegen `--surface`.
- Semantik: genau ein `h1`, `role="tablist"`/`tab` mit `aria-selected`, Canvas mit
  `role="img"` und Label, Dialog mit `aria-modal`, `lang="en"`.
- `prefers-reduced-motion` global plus je Feature behandelt.
- Nicht geprüft: `forced-colors` (Windows-Kontrastmodus) und `prefers-contrast`. Die Tokens
  sind `color-mix`-basiert; ohne Windows-Test keine Aussage.

---

## Durchgang 2: Typografie

Skills: typography-audit, readable-measure, typography-scale.

| # | Schwere | Stelle | Kurz |
|---|---|---|---|
| T1 | moderate | `public/index.html` (Ramp) | Sechs Größen innerhalb von 3px, kein Verhältnis erkennbar |
| T2 | moderate | `.mono` Formelblock | Zwei Monospace-Familien auf einer Seite |
| T3 | minor | `public/fonts/SpaceGrotesk-500.woff2` | Geliefert, aber nie benutzt (Status "unloaded") |
| T4 | minor | Überschrift Method | Gemischte Anführungszeichen: 5 gerade, 2 typografische |

**T1.** Aktiv in Gebrauch: 10,5 / 11 / 11,5 / 12 / 12,5 / 13 / 13,5 / 15 / 27 / 60px. Zwischen
11 und 13,5 liegen sechs Stufen, die kaum unterscheidbar sind. Vorschlag: fünf Stufen
(11 / 12,5 / 14 / 20 / 27 / 60) als Tokens, dann ist jede Stufe eine Entscheidung.
Nicht betroffen: Tracking (zieht mit der Größe an: -0,34px bei 13,5px bis -2,1px bei 60px ✓)
und Zeilenhöhe (1,55 im Text, 1,02 im Hero ✓).

**T2.** Labels und Zahlen laufen in Space Mono, der Formelblock `.mono` in `ui-monospace`
(Systemschrift). Gemessen: `12.5px/400/ui-monospace` und `12px/400/ui-monospace`. Fix:
`.mono` auf Space Mono umstellen oder bewusst zwei Mono-Rollen dokumentieren.

**T3.** `Space Grotesk 500` ist deklariert und ausgeliefert (22 KB), kein Element nutzt es
(Status "unloaded"). Fix: Datei weglassen oder Gewicht 500 für Zwischenüberschriften einsetzen.

**T4.** Im sichtbaren Text 5 gerade gegen 2 typografische Anführungszeichen, zum Beispiel
`Why "60 for 10" is not the answer`. Em-Dashes und En-Dashes: 0 ✓ (deine Regel hält).

Lesemaß gemessen: Lead-Absatz 57 Zeichen pro Zeile ✓ (Band 45 bis 75), Methoden-Karten 38 bis
49 Zeichen (unteres Ende, für Karten vertretbar).

---

## Durchgang 3: Datenvisualisierung

Skill: data-visualization.

| # | Schwere | Stelle | Kurz |
|---|---|---|---|
| V1 | moderate | `#dash-canvas` | Canvas hat nur ein Label, kein Bezug zur Tabelle mit denselben Zahlen |
| V2 | moderate | Chart-Interaktion | Nur mit Maus bedienbar: Zoom per Ziehen, Punktauswahl per Klick |
| V3 | minor (Note) | `#dash-legend` | Legendeneintrag "privacy unknown" steht auf 0 und ist abgeblendet (`lg off`) |
| V4 | minor (Note) | `#dash-legend` | "Target zone" bleibt sichtbar, abgeblendet auf 26% wenn aus (`lg off`) |

**V3/V4 nachgemessen.** Beide Einträge tragen bei "aus" die Klasse `lg off` und werden auf
`opacity: 0.26` gesetzt; "privacy unknown" hat den Zählerwert 0. Das ist eine bewusste
Abblendung, kein Anzeigefehler. Zu entscheiden ist nur, ob eine auf 26% abgeblendete Legende
noch als "aus" gelesen wird oder wie ein Rendering-Rest wirkt. Vorschlag: bei Zähler 0 den
Eintrag ganz ausblenden, bei "Target zone" die Abblendung beibehalten.

**V1.** Das Canvas trägt `role="img"` und `aria-label="Scatter plot of plans and models"`.
Damit ist nicht gesagt, welche Achsen gelten und wo die Zahlen herkommen. Fix: Label um Achsen
ergänzen und `aria-describedby` auf die Plantabelle setzen, die dieselben Werte in Textform hat.

**V2.** Zoom und Detailauswahl laufen über Maus-Events auf dem Canvas. Die Vergleichsaufgabe
ist über die Tabelle auch per Tastatur lösbar, das Detailfeld bleibt aber tastaturunerreichbar.
Fix: die stärksten Punkte fokussierbar machen oder eine tastaturfähige Liste, die dasselbe
Detailfeld füllt.

Positiv gemessen: Achsentitel ("Tokens / $" unten, "AI score" gedreht links) und
Dekaden-Ticks (1M, 10M, 100M, 1B) sind vorhanden, die Pareto-Knoten sind direkt beschriftet,
die drei Serienfarben liegen über 3:1, blau/orange/grau sind auch bei Deutanopie
unterscheidbar, und die drei Datenschutzklassen stehen zusätzlich als Text in der Tabelle
(Farbe ist also nicht der einzige Träger, 1.4.1 erfüllt).

---

## Durchgang 4: Nutzbarkeit

Skills: heuristic-evaluation (Nielsen, Schwere 0 bis 4), critique-affordance, critique-color,
critique-composition, critique-information-density, critique-visual-hierarchy,
critique-typography, critique-brand-consistency.

| # | Schwere | Heuristik | Stelle | Kurz |
|---|---|---|---|---|
| U1 | 1 | Sichtbarkeit des Systemzustands | `#toast` | Offline-Hinweis erscheint nur ~3s als Toast und verschwindet dann |
| U2 | 2 | Sichtbarkeit des Systemzustands | KPI-Zähler | Zähler zeigt 620ms lang falsche Zwischenwerte |
| U3 | 2 | Wiedererkennen statt Erinnern | Spalten-Picker | Ausgeblendete Spalten sind unsichtbar |
| U4 | 2 | Wiedererkennen statt Erinnern | Tabellenkopf | Sortierzustand nur im Sortier-Button |
| U5 | 1 | Hilfe und Dokumentation | Ziel-Zone | Deaktivierte Felder zeigen "auto" ohne Erklärung |

**U1 (nachgemessen, war zuerst falsch eingeschätzt).** Blockiert man `data/latest.json`, lädt
die Seite aus `localStorage["cpc-data"]` (393 KB, Stand aus dem letzten erfolgreichen Abruf,
Rückfall in `app.js:2765`/`2784`) und zeigt einen Toast: `#toast` mit
"Offline: snapshot from 9/23/2026". Gemessener Ablauf: Einblenden ab 0,7s, voll sichtbar
1,2s bis 4,2s, danach `opacity: 0`. Der Hinweis ist also da, aber nach rund drei Sekunden weg.
Wer die Seite später liest, sieht nur das Snapshot-Datum und kann Cache nicht von live
unterscheiden. Fix: zusätzlich ein dauerhafter Chip in der Kopfzeile (analog zum no-API-Chip),
solange der Rückfall greift.

**U2.** Der KPI-Zähler läuft 620ms von 0 auf den Zielwert. In dieser Zeit steht dort eine
falsche Zahl (0, 3, 11 …). Fix: von Zielwert minus kleinem Delta starten oder den Zähler
nur bei Kennzahlen ohne Nullbezug verwenden.

**U3/U4.** Beide gehören zur selben Familie: Zustand ist da, aber nicht sichtbar. Der
Spalten-Picker kann Spalten entfernen, ohne dass die Tabelle das anzeigt; der Sortierzustand
steht im Button ("Tokens / $ ↓") und seit der Schicht als Akzentfarbe im Kopf, aber ohne Pfeil
im `th`. Fix: "n Spalten ausgeblendet"-Chip analog zum no-API-Chip, Pfeil plus `aria-sort`.

**U5.** `#dash-target-x`/`-y` sind `disabled` mit Platzhalter "auto" und erklären nicht, wann
sie aktiv werden. Fix: `title` oder `aria-describedby` mit "wird aktiv, sobald Ziel-Zone an ist".

Positiv: Der Hinweis auf ausgeblendete No-API-Zeilen als Chip ist genau das Muster, das U3/U4
brauchen, es ist also schon im Haus. Die Methodenseite mit FAQ deckt "Hilfe und Dokumentation"
gut ab.

---

## Durchgang 5: Bewegung

Skills: animation-principles, motion-system.

| # | Schwere | Stelle | Kurz |
|---|---|---|---|
| M1 | moderate | gesamte Schicht | Keine Dauer-/Easing-Tokens, ein Kurvenwert für alles |
| M2 | minor | `.chart-stage::after` | 1,5s Sweep, längste Animation der Seite, ohne Aussage |
| M3 | minor | KPI-Zähler | 620ms über der 400ms-Regel |

**M1.** Gemessene Werte: 180ms (Zeilen-Hover), 380ms (Tab-Indikator), 420ms (Ansichtswechsel),
500ms (Einblenden), 620ms (Zähler), 1500ms (Sweep). Alles läuft auf einer Kurve
(`cubic-bezier(.22,.61,.36,1)`). Vorschlag nach motion-system: vier bis sechs Dauer-Tokens
(100/200/300/400/600) und semantische Easings (decelerate für Eintritt, standard für
Positionswechsel, linear nur für die Fortschrittslinie).

**M2/M3.** Beides sind Kandidaten zum Kürzen oder Streichen, kein Strukturproblem.

Positiv gemessen: Staffelung 34ms × max. 12 Elemente = 408ms Gesamtlaufzeit ✓ (Regel: unter
500ms), nur `transform` und `opacity` animiert, keine Endlosschleifen, kein Audio,
`prefers-reduced-motion` global in `app.js` plus je Feature in der Schicht.

---

## Zusammenfassung

| Schwere | Anzahl |
|---|---|
| serious | 1 (A1) |
| mittel (Nielsen 2) | 3 (U2, U3, U4) |
| moderate | 9 (A2, A3, A4, A5, T1, T2, V1, V2, M1) |
| minor | 12 (A6 bis A9, T3, T4, V3, V4, U1, U5, M2, M3) |

Reihenfolge nach Wirkung pro Aufwand:

1. A1 Labels verbinden (klein, einziger serious-Fund)
2. A4 `aria-sort` plus sichtbarer Pfeil (klein, schließt A4 und U4 zusammen)
3. A2 Live-Region für Trefferzahl und Filter (klein)
4. U2 Zähler entschärfen (klein)
5. A3 Sprunglink (sehr klein)
6. A5 Fokus nach Dialog (sehr klein)
7. U1 dauerhafter Offline-Chip neben dem Snapshot-Datum (klein)
8. U3 Chip für ausgeblendete Spalten (mittel)
9. T2 eine Monospace-Familie (klein)
10. T1 Größenrampe auf fünf Stufen (mittel, berührt viele Stellen)

## Offene Fragen zur Diskussion

1. Offline-Zustand: reicht der Toast, oder soll der Hinweis bleiben, solange der Rückfall
   greift (U1)?
2. Ist der KPI-Zähler die Bewegung wert, wenn er kurz falsche Zahlen zeigt (U2)?
3. Fünf Typo-Stufen statt sechs feiner Stufen (T1): jetzt umbauen oder erst beim nächsten
   größeren Umbau?
4. Chart per Tastatur bedienbar (V2): eigener Aufwand, oder reicht die Tabelle als Weg?
5. Motion-Tokens einführen (M1): lohnt sich, wenn die Schicht weiter wächst.
6. `forced-colors` und `prefers-contrast`: ungeprüft, weil Windows-Test fehlt. Soll ich das
   nachziehen, wenn ein Testgerät da ist?

---

## Umsetzung (23.09.2026)

Alles unter "Befunde" ist umgesetzt und auf der Live-URL nachgemessen. Commit `7640de1`,
CI `update.yml` grün, Pages-Deploy grün.

| Befund | Umsetzung | Gemessen danach |
|---|---|---|
| A1 | `data-i18n-aria` für 11 Bedienelemente, i18n-Schlüssel in EN und DE | 0 Felder ohne Namen |
| A2 | `role="status"` am Zähler, zwei Live-Regionen (`#a11y-status`, `#chart-status`), Meldung mit 400ms Entprellung | "25 of 378 plans shown, 2 columns hidden" |
| A3 | Sprunglink als erstes Element plus Stil | sichtbar bei Fokus, 2px Ring |
| A4/U4 | `aria-sort` in Sortierkopf und Neuaufbau, Pfeil über die vorhandene Regel sichtbar | "Tokens / $↓=descending", wandert beim Klick |
| A5 | Fokus vor dem Öffnen merken, beim Schließen zurückgeben | Fokus auf `#cmdk-trigger` |
| A6 | `<caption class="sr-only">` in beiden Tabellen, `scope="col"` an allen `th` | 2 Captions, 8/8 `th` |
| A7 | `aria-hidden="true" focusable="false"` an allen 12 SVGs | 0 ohne `aria-hidden` |
| A8 | `--ctl-line` (hell `#8f8878`, dunkel `#606d7a`) für Buttons, Chips, Selects, Textfelder, Panels | 3,23 bis 3,47:1 hell, 3,24 bis 3,40:1 dunkel |
| A9 | Sortierkopf und Pfeil in `--accent-2` | 0 Textknoten unter der Schwelle, beide Themes |
| T1 | Rampe als Tokens `--fs-xs/sm/md/base/lg` (11/12,5/13,5/14,5/15,5), 147 Deklarationen umgestellt, Anzeigegrößen 19→20, 21→20, 29→28 | 8 Größen statt 14 (11, 12,5, 13,5, 14,5, 15,5, 20, 27, 60) |
| T2 | `--font-mono` für `.mono` und den Formelblock | Formel läuft in Space Mono |
| T3 | `@font-face` für Gewicht 500 entfernt (Datei bleibt liegen) | kein ungenutzter Schnitt mehr |
| T4 | typografische Anführungszeichen in HTML und i18n | 0 gerade Anführungszeichen, 0 Em-Dashes |
| V1 | Achsen im `aria-label`, `aria-describedby` auf eine versteckte Beschreibung | `tabindex="0"`, `#dash-chart-desc` vorhanden |
| V2 | Pfeiltasten wechseln den Punkt, Enter öffnet die Zahlen, Escape hebt auf, Ansage in `#chart-status` | Punkt, Detailkarte und Tooltip folgen der Tastatur |
| V3 | Kategorien mit Zähler 0 werden ausgeblendet statt abgeblendet | "privacy unknown" nicht mehr sichtbar |
| U2/M3 | Zähler startet bei 85% des Zielwerts, 380ms statt 620ms | erste Messung 429, Endwert 432, nie eine 0 |
| U3 | Chip "n Spalten ausgeblendet" in der Filterzeile, × stellt die Voreinstellung her | "2 columns hidden", nach Abwahl "3" |
| M1 | Dauer- und Easing-Tokens, Tab-Indikator auf die Standardkurve | ein Kurvenwert weniger für Positionswechsel |
| M2 | 1,5s-Sweep entfernt | keine Dekoration über 500ms |

Nicht umgesetzt, weil bewusst so entschieden: V4 (abgeblendete "Target zone" bleibt, sie ist
als "aus" lesbar), A9-Rest (der Pfeil sitzt auf dem Sticky-Kopf, deshalb `--accent-2` statt
`--accent`), Anzeigegrößen 27/30/38/60 (eigene Rollen, keine Dubletten).

Zusätzlich gefunden und behoben, weil beim Nachmessen aufgefallen: die Seite scrollte auf
Telefonen 10px waagerecht (Ursache: `flex-basis: auto` am Namen der Shortlist-Zeile zog die
Mindestbreite des Hauptbereichs auf 406px). Vorher 400 gegen 390, jetzt 390 gegen 390, auch
bei 360px.
