# coding-plan-comparison — Projektregeln

## Ziel
Strukturierte, **dynamische** Vergleichsdatenbank für AI-Coding-Plan-Subscriptions
(Credit/Token-Pass, kein reines Token-PAYG). Reproduzierbar, aktualisierbar, keine
statischen Preise.

## Architektur (deterministisch)
```
sources.yml (feeds + docs + privacy + scores + FX)
   → scripts/fetch.mjs      HTTP-Fetch → cache/ + manifest.json (contentHash + changed)
   → scripts/parse-all.mjs  Parser → parsed/<id>.json
   → scripts/build.mjs      Plan-Katalog dynamisch + Normalisierung → public/data/latest.json
   → scripts/check.mjs      Change-Detection-Report (exit 2 = Änderung)
```

- **Nichts statisches:** Alle Daten kommen live aus offiziellen Quellen (Feeds + Docs).
- **Determinismus:** build nutzt NUR cache/ + parsed/ (nie Live-Fetch im Build).
  cache/ + parsed/ sind **nicht committed** (gitignored) — `npm run update` reproduziert sie.
- **Change-Detection:** contentHash = Hash des **geparsten** Inhalts (robust gegen HTML-Nonces).
- **Ehrlichkeit:** undisclosed bleibt undisclosed; keine erfundenen Zahlen.
  Nicht-scrapebares (GLM-Preise via Auth-API, MiniMax-SPA) → `data/overrides.yml` mit lastVerified.
- **Mengen je Modell:** Veröffentlicht ein Anbieter die Obergrenze **pro Modell** (OpenDesign:
  15 $ fuer GPT-6 Luna, 30 $ fuer GLM-5.3 Flash-X, sonst die Plan-Summe), stehen die
  `feedModels` als Objekte `{ model, usd }` im Plan; der generische feedModels-Zweig in
  `build.mjs` nimmt dann `usd` als Allowance statt der Plan-Menge. Token-Preise kommen weiter
  aus den Feeds, nie aus dem Kopf. OpenDesign wird aus zwei HTML-Quellen gebaut
  (`opendesign-pricing`, `opendesign-credits`), die Modellzeilen entstehen nur fuer Modelle,
  die auch im Feed einen Preis haben (Hunyuan H4 Preview fehlt dort und bekommt bewusst keine Zeile).
- **Preise inkl. Zuschlaege, keine separate Gebuehren-Marke.** Erhebt ein Anbieter etwas
  drauf (Command Code: Gebuehr fuer Kartenzahlung auf jedem Plan), steht in `overrides.yml`
  EIN fertiger `price`: `monthlyUsd` = `paidPrice` = Liste + Zuschlag, `advertisedPrice` =
  Liste, die Aufteilung nur in der `billingNote` (Datenlage, nicht sichtbar). Ist der
  Zuschlag gemessen (GOAT: 10,78 $ fuer den 10-$-Tarif am 2026-10-02 = 7,8 %), gilt
  derselbe gemessene Satz fuer die uebrigen Tarife desselben Anbieters, weil er nirgends
  veroeffentlicht wird (`commandcode.ai/docs/resources/payment-methods`). Erklaerung
  gehoert in die Plan-Notiz und Methodik-Schritt 7, **nie als eigene Marke an den Preis**
  (kein `feeUsd`, kein „+ Gebuehr"-Chip: Kolja will eine Zahl, in der alles drin ist).

## Normalisierung
```
Kosten pro Request = (0.05×input + 0.95×cachedWrite)×pattern.input
                   + cachedRead×pattern.cachedRead + output×pattern.output, /1M
```
- "60 für 10" ist nur $-Gegenwert; Grundcredits (Token-Preise) + Cache + Workload entscheiden.
- Anbietereigene Credit-Formeln (GLM) kommen dynamisch aus den Docs.
- **Drei Rechenwege für Credit-Pläne** (`modelsForPlan`, `providerCost`):
  1. `perModel` mit Koeffizienten und `divisor` (Default 10000): Credits = (Tokens × Koeff.)/divisor.
     GLM nutzt 10000, MiMo 1 (Credits direkt pro Token).
  2. `creditsFromUsd` + `feedModels`: Anbieter veröffentlicht "1 $ Modellnutzung = N Credits"
     (StepFun: 7M). Credits pro Request = $-Kosten aus dem Feed × N.
  3. `allowance` in Tokens mit `window: "day"` (Cerebras): Tageslimit × 30.44 = Monat.
  Alle drei Wege brauchen keine geschätzten Zahlen, nur die veröffentlichten Werte.
  4. `localModelPricing`: der Anbieter veröffentlicht die Token-Preise selbst (GitHub Copilot
     für alle Copilot-Modelle, Ollama Cloud für seine Cloud-Modelle). Allowance ist dann ein
     Dollar-Volumen, die Rate kommt aus `allowance / Kosten pro Request`.
- **Modelle ohne Feed-Preis** (nicht im ocgo/cc-Feed): Zeile entsteht trotzdem, `costPerRequest`
  bleibt null. `requestCost()` muss dafür null-sicher bleiben.
- Pattern-Unifizierung: geteilte Familien nutzen OC-Pattern für beide Provider.
- Tarif-Namen und Tier-Maps kommen aus der Quelle, nie hart kodieren: Qwen fügte einen
  Tarif ein, kimi.ai benannte seine Checkout-Titel um, beides ließ Tarife still aus dem
  Katalog fallen. Die Tests koppeln Parser-Output an den Katalog, damit das auffällt.
- Pläne ohne Preis ($0, werbefinanziert) haben keine Rate pro $: `normalizedPer1` bleibt null
  statt Infinity, sonst kippen Familien-Median und Pareto-Front. Ihre Zeilen sortieren am Ende.
- Fenster: 5h = Durchsatz (nicht ×180), Wochen ×4.33 → Monat.
- **Standard-Ausschlüsse (Website):** Tier D (preisbasiert, Kimi) und Pläne ohne API-Zugang
  (Tag `no API` / `CLI only` aus overrides.yml) sind in Tabelle, Chart und Rechner per Default
  ausgeblendet, per Schalter einblendbar. Ohne API-Zugang sind die Token-Raten nicht vergleichbar,
  deshalb steht der Ausschluss als sichtbarer Chip in der Filterzeile.
- **Zusätzlich in der Liste (`renderPlans`):** Modellzeilen mit `noTraining === false` (Modell
  trainiert auf den Daten) sind per Default ausgeblendet, Schalter `#training-toggle` /
  `#sheet-training`, Chip "training hidden (n)". `noTraining === null` (keine Aussage) bleibt
  sichtbar. Das Best-Value-Panel (`renderTop`) filtert härter und immer: nur `noTraining === true`
  und nur Pläne mit API-Zugang, unabhängig von den Schaltern.
- **ZDR ist modelgenau, nie Anbieterebene.** Chip und Filter (`data-attr="zdr"`) kommen
  ausschliesslich aus `privacy.retentionDays === true` des Feeds *dieses Plans* (0 Tage bestätigt,
  Modell trainiert nicht). Anbietersätze in `data/privacy.yml` erzeugen bewusst kein ZDR, auch nicht
  `zeroRetention: true`, "auf Anfrage" (Command Code `CMD_ZDR=1`) oder Blanket-Policies ohne
  Modelldaten. Für ZDR nie die globale `modelPrivacyByName`-Map nutzen: 46 Modelle laufen bei
  mehreren Anbietern mit unterschiedlicher Policy, das vererbt Aussagen zwischen Anbietern.
- **Fixe Overlays gehören auf Body-Ebene.** `main` trägt `view-transition-name: main-content`
  und ist damit Containing Block für `position: fixed`: Sheet und Overlay lagen darin und
  öffneten auf dem Telefon unsichtbar unter dem Fold. Command-Palette, Toast und Sheet stehen
  deshalb hinter `</main>`.

## Referenz-Plaene (grosse Anbieter ohne veroeffentlichte Quote)

Plaene wie Claude Pro/Max, ChatGPT/Codex, Cursor und Kiro haben keinen veroeffentlichten
Token-Kurs, also gibt es fuer sie keine Rate pro Dollar. Sie stehen in `data/overrides.yml`
mit `disclosure: reference`, ohne Modellzeilen (ohne Zeile keine Rate, kein Ranglistenplatz),
und werden von `renderReferencePlans()` in `public/app.js` in einem eigenen Abschnitt unter
der Plantabelle gezeigt. Preis und Quote muessen aus der offiziellen Seite stammen, das
Lesedatum steht in `lastVerified`, drittseitige Messungen gehoeren als Zitat mit Quelle und
Datum ins Notizfeld (`note`/`noteDe`). Details und Quellenlage: `docs/limits-research.md`.

## Befehle
```bash
npm run update   # fetch → parse → build
npm test         # Invarianz- + Parser-Tests
npm run check    # Change-Detection-Report
```

## Pages-Sync
Root `index.html`/`app.js`/`data/latest.json` sind byte-identische Kopien von `public/`
(Legacy-Pages serviert vom Root). `public/index.html` nutzt den `__VERSION__`-Platzhalter,
den die CI beim Sync durch den Commit-Hash ersetzt (Cache-Busting). Lokal nicht ersetzen.
Root-Mirrors committet die CI (`update.yml`), nicht von Hand. **Änderungen immer in `public/`
machen:** die Root-Kopien werden bei jedem CI-Lauf überschrieben, ein Edit dort ist nach dem
nächsten Push weg (und die Seite hat dann neues Markup ohne Logik).
Ebenso spiegelt die CI `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` und
`og-image.png` ins Root: `/favicon.ico` muss dort liegen, damit Browser es ohne Pfad finden.

## Marke und Bilder
Die Marke ist eine Pareto-Stufenkurve auf dunkler Kachel (`public/favicon.svg`), Farbe aus
den Site-Tokens (Akzent `#6ee7c7`). Vorlage fuer alles Gerasterte ist
`assets/render/`; die Rasterung macht der Browser, weil im Container kein
rsvg/ImageMagick/Pillow liegt:

```
python3 -m http.server 8180          # im Repo-Root
```
dann `assets/render/og-card.html` (1200x630, deckend), `assets/render/apple-frame.html`
(180x180, deckend) und `assets/render/icon-frame.html` (16/32/48, transparent) jeweils im
Zielformat per CDP-Screenshot aufnehmen. `public/favicon.ico` ist eine ICO-Huelle mit den
16/32/48-PNGs (`python3`-Helfer, PNG-Payloads). `assets/logo.svg`, `assets/logo-512.png`
und `assets/social-preview.png` sind die GitHub-Fassungen; das Social Preview laedt man
einmalig unter Settings > Social preview hoch (dafuer gibt es keine API).

**Vorschau:** `public/preview/index.html` spiegelt die CI nach `preview/` (erreichbar unter
`/preview/`). Sie lädt `../app.js`, `../data/latest.json` und `../fonts/` von der Hauptseite,
dupliziert also keine Assets, trägt `noindex` und eine Hinweisleiste. Quelle bleibt
`public/index.html`; die Vorschau ist eine eingefrorene Kopie für Design-Abnahmen.

- `node scripts/build-preview.mjs` erzeugt `public/preview/index.html` neu. **Nach jeder
  Änderung an `public/index.html` laufen lassen**, sonst zeigt die Vorschau altes Markup.
- Die Gestaltungsschicht ("Instrument Panel": Tokens, Typo, Layout, Tiefe, Zustände, Bewegung)
  steht **inline am Ende des `<style>`-Blocks und als `<script>` vor `</body>` in
  `public/index.html`**, damit die Einzeldatei-Architektur bleibt und der CI-Mirror nichts
  zusätzlich kopieren muss. `public/preview/preview.css` und `preview.js` waren die
  Vorschau-Fassung davon und werden nicht mehr geladen (können weg, sobald Kolja es freigibt).
- `app.js` bleibt der Renderer. Die Schicht darf app.js nicht patchen; Korrekturen an dessen
  Verhalten gehören in `public/app.js`.

## Auffindbarkeit (SEO)

Alles Automatische, damit die Seite ohne Handarbeit gefunden wird:

- `scripts/landing.mjs` erzeugt **`public/coding-plan-comparison/`** (statische
  Vergleichsseite, Zielphrase "coding plan comparison" in URL, Titel, H1 und Text, plus
  Rangliste, Formel, FAQ und JSON-LD fuer WebPage/ItemList/FAQPage). Quelle ist
  `public/data/latest.json`, also jeden Tag frisch.
- `scripts/seo.mjs` schreibt `public/sitemap.xml` (lastmod = heute, Sprachvarianten) und
  `public/feed.xml` (Atom aus dem Changelog). Beide werden von der CI ins Root gespiegelt.
- `scripts/indexnow.mjs` legt die IndexNow-Schluesseldatei an und meldet Startseite,
  Vergleichsseite und Datensatz bei Bing/Yandex an (kein Konto noetig, Google nutzt
  IndexNow nicht).
- `public/llms.txt` beschreibt Datensatz, Quellen und Lizenz fuer AI-Crawler,
  `public/404.html` faengt falsche Adressen mit Links ab (GitHub Pages serviert sie).
- Kopf der Startseite: Canonical auf `https://vibeplan.cc/`, hreflang en/de/x-default,
  `og:locale`, Font-Preload fuer die zwei Schriften ueber dem Fal, `theme-color`.
- **Domain/Cloudflare (Stand 2026-10-02):** Zone `vibeplan.cc` (Free), Zone-ID
  `fe1f0f8bf150fc972bb26a821f3a56e8`, Token `CLOUDFLARE_API_TOKEN` in `/opt/data/.env`
  (account-scoped, Zone Settings + Rules Edit). Aktiv: SSL **strict**, Always Use HTTPS,
  Mindest-TLS **1.2**, Brotli, HTTP/3, Early Hints, **Proxy an** für Apex und www
  (Origin bleibt GitHub Pages), Redirect-Regel `www to apex` (301), Cache-Regel
  `cache dataset` (latest.json 10 Minuten an der Kante). Rollback für DNS: beide Records
  `proxied=false` setzen (`python3 /opt/data/tmp/cf-apply.py` mit `RETURN_TO_DNS_ONLY=1`).
  Crawler Hints ist über diese API-Version nicht setzbar (code 1006), das erledigt
  `scripts/indexnow.mjs`. HSTS ist bewusst aus; das JS-Beacon von Cloudflare Web Analytics
  ebenfalls, weil die Seite „keine Drittanbieter-Verbindungen" verspricht: die
  serverseitigen Analytics des Proxys liefern Traffic/Referrer ohne Seitenaenderung.

## Changelog (automatisch)

Der Changelog auf der Seite kommt **aus der Git-Historie**, nicht aus Handarbeit:
`scripts/changelog-from-git.mjs` liest die Commit-Betreffzeilen, wirft Sync-, Daten-, Test-
und CI-Commits raus, entfernt das Typ-Praefix (`fix(web): ...`) und schreibt
`data/changelog.yml` (neueste zuerst, max. 100 Eintraege, je Eintrag der Kurz-SHA).
`build.mjs` reicht das als `changelog` nach latest.json, die Changelog-Ansicht verlinkt
jeden Eintrag auf seinen Commit. Die CI ruft das Skript **vor dem Build** auf
(`update.yml`, dort auch `fetch-depth: 0`, sonst fehlt die Historie) und committet die
Datei mit, deshalb bleibt die Seite ohne Zutun aktuell.

- **Nicht von Hand pflegen:** die Datei wird bei jedem Lauf neu erzeugt, Aenderungen
  waeren beim naechsten Push weg. Wer etwas Nutzerrelevantes im Changelog sehen will,
  schreibt es in die Commit-Betreffzeile.
- Sprache ist Englisch (wie die Commits); `text` und `textEn` tragen denselben Satz.
- Handgeschriebene Eintraege von vorher liegen unveraendert in
  `data/changelog-archive.yml` (nicht gebaut, reines Archiv).
- Lokal erzeugen: `node scripts/changelog-from-git.mjs` (idempotent, zweimal laufen
  ergibt dieselbe Datei).

## Filter-Bedienung (eine Stelle, zwei Ansichten)
Es gibt genau **einen** Satz Filter-Controls: den Rail-Block `#rail-filters` (Suche, Meter,
Budget, AI-Score, Attribute, Spalten, Trefferzahl). Er wandert beim Ansichtswechsel per
`showView` in den passenden Host: im Graph steht er als erster Block im `.rail` (zusammen mit
Achsen, Zielzone, Kennzahlen), in der Listenansicht in `#filters-host` ueber der Tabelle, dort
standardmaessig aufgeklappt. Der frueher doppelte Satz (Dock-Leiste + mobiles Bottom-Sheet
`#sheet-*`) ist entfernt, damit es keine Sync-Fehler mehr gibt. Aktive Filter zeigt die
Chip-Zeile `#filter-active` ueber den Views; sie blendet sich ohne aktive Filter selbst aus
(`.filter-dock.is-empty`). Der Desktop-Rail ist bei `min-width: 981px` intern scrollbar
(`max-height: calc(100vh - 96px)`), weil der aufgeklappte Filterblock hoeher ist als das Fenster.

**Mobil ist der Rail eine Schublade** (`initRailDrawer` in app.js, CSS Abschnitt 7):
`placeRail()` haengt `#rail` bei `max-width: 900px` an die **Body-Ebene** und zurueck ins
`.workbench` auf Desktop. Body-Ebene ist Pflicht, weil `main` `view-transition-name` traegt
und sonst der Containing Block fuer `position: fixed` waere (die Schublade erschiene
unsichtbar unter dem Fold). Bedienung: fester Griff `#rail-trigger` unten links (zeigt die
Zahl der aktiven Filter, damit man zum Filtern nicht scrollen muss), Schublade von links,
Schliessen per X, Tippen auf den Hintergrund `#rail-scrim`, Escape oder „Ergebnisse zeigen"
(`#rail-apply`, spiegelt die Trefferzahl und scrollt zum Chart). Geschlossen ist der Rail
`inert` und `visibility: hidden` (nicht fokussierbar), offen sperrt `body.rail-open` das
Seiten-Scrollen. In der Listenansicht ist der Griff aus (der Filterblock steht dort ueber der
Tabelle in `#filters-host`).

## Chart: Zoom und Pan
Der Scatter-Plot ist live navigierbar: Mausrad zoomt auf den Zeiger, Ziehen verschiebt
(Live-Pan), Zwei-Finger-Pinch zoomt auf Touch, `+`/`-`/`0` und die Buttons im Chart-Kopf
zoomen bzw. setzen zurück, Shift+Ziehen bleibt die Rechteck-Auswahl. Die Gesten liefert
**d3-zoom**, gebündelt als `public/vendor/d3-zoom.min.js` (IIFE, global `d3zoom`), damit
GitHub Pages ohne CDN auskommt; die CI kopiert `public/vendor/` mit ins Root (`vendor/`).

- Zustand ist `dashZoom` in Datenkoordinaten (`{x0,x1,y0,y1}`, `null` = Auto-Ausschnitt).
  Jede Geste wird über die Achsen vom Gestenbeginn umgerechnet, danach wird der interne
  d3-Transform auf Identität zurückgesetzt: sonst summieren sich Gesten auf.
- Umrechnung **immer im Plot-Rechteck** (`dashPlotBox`), nie in Canvas-Koordinaten: die
  Ränder gehören nicht zum Achsenfenster, sonst zoomt jeder Pan die Achse langsam auf.
- Log-Achsen werden im Log-Raum skaliert (`scaleWindow`), sonst verzerrt der Zoom.
- Ein Finger bleibt Seiten-Scroll (Filter erlaubt Touch erst ab zwei Fingern).
- `window.__dashState` gibt Achsen/Zoom/Punktzahl nach außen: das Chart ist Canvas und
  sonst nicht automatisiert prüfbar.
- **Hover/Pan/Zoom nutzen den leichten Pfad** (`renderDashboard(true)`): Punkte und
  Pareto-Front kommen aus `dashCache`, Rail-Zahlen, Shortlist und Notiz bleiben stehen.
  Ohne das kostete jede Mausbewegung ~100 ms (buildCombos + Fuzzy-Score für ~800 Modelle),
  die Seite ruckelte sichtbar. Filter-, Achsen-, Sprach- und Datenwechsel laufen weiter
  über den vollen Pfad. `aiScoreFor` ist per Modell/Familie gemerkt (`aiScoreMemo`),
  das Leeren passiert beim Datenladen.
- Neu bauen (nur bei d3-Update nötig):
  `npm i --no-save d3-zoom esbuild` in einem Temp-Ordner, dann
  `npx esbuild entry.js --bundle --format=iife --global-name=d3zoom --minify --outfile=public/vendor/d3-zoom.min.js`
  mit `entry.js`: `export * from "d3-zoom"; export { select, pointer } from "d3-selection";`

## Feedback (Button -> eigener Endpunkt)

Footer-Button `#open-feedback` oeffnet das Panel `#fbk-overlay` (Body-Ebene wie Palette
und Toast, weil `main` `view-transition-name` traegt). Es schickt JSON an `/api/feedback`
auf **derselben Domain**: kein Drittanbieter, kein Cookie, kein CAPTCHA, nur ein Honeypot
plus 6 Meldungen/Stunde/IP im Worker. Faellt der Endpunkt aus, bietet das Panel
Mail- und Kopier-Rueckfall auf `feedback@vibeplan.cc` an.

- **Endpunkt:** `worker/feedback-worker.js` als Worker-Route der Zone, KV `vibeplan-feedback`
  (ein Eintrag pro Meldung, IP nur als gesalzener Hash), `send_email`-Binding schickt die
  Meldung an die in Email Routing **verifizierte** Zieladresse (kostenlos fuer verifizierte
  Empfaenger). `GET /api/feedback?key=…[&since=<ms>][&limit=n]` liefert JSON.
- **Deploy:** `node scripts/deploy-feedback-worker.mjs` (Trockenlauf) bzw. `--apply`
  `[--email-routing] [--verify]`. Token braucht Workers Scripts:Edit, Workers KV
  Storage:Edit, Zone DNS:Edit, Email Routing Rules/Addresses:Edit. Der Leseschluessel
  landet als `VIBEPLAN_FEEDBACK_KEY` in `/opt/data/.env` und wird nie ausgegeben.
- **Abholen (Hermes):** `/opt/data/scripts/vibeplan-feedback.py` holt neue Meldungen
  (`--all` zeigt die letzten), Zustand in `/opt/data/data/vibeplan-feedback/`; als
  Cron-Job gedacht, der ohne neue Meldungen schweigt.
- **Tests:** `tests/feedback.test.mjs` (Handler inkl. Honeypot, Rate-Limit, Mail-Ausfall,
  Leseschluessel; dazu Markup/i18n-Verdrahtung). Markup-Aenderungen in `public/index.html`
  brauchen weiterhin `node scripts/build-preview.mjs`; die Root-Spiegelung macht die CI.

## Workflow
`.github/workflows/update.yml`: täglich 03:17 UTC — fetch → parse → build → test → commit bei
Änderung → Review-Issue wenn SPA-Preise (GLM/MiniMax) sich ändern → overrides.yml manuell pflegen.

- **Snapshots überleben den Lauf (`actions/cache`).** `cache/` bleibt aus dem Repo, wird aber
  vor dem Fetch aus dem letzten Lauf wiederhergestellt (`restore-keys: snapshots-`). Ohne das
  hatte CI keinen Ersatzstand: ein einziger Aussetzer einer Quelle riss den ganzen Tageslauf mit
  und die Seite fror ein (27./28.09. `privacy-minimax` 404, 04.10. `glm-coding-overview` fetch failed).
- **Wiederholversuche in `fetch.mjs` (`fetchWithRetry`).** 3 Versuche mit 2s/8s Backoff bei
  Netzwerkfehler, Timeout, HTTP 429 und 5xx; 404/403 werden nicht wiederholt (dauerhafte Aussage
  der Quelle). Danach: Snapshot behalten und weiterlaufen, wenn einer existiert. Fehlt der
  Snapshot, laufen erst ALLE Quellen durch, dann exit 1 mit Sammel-Liste (nichts wird still
  fallengelassen). Eine `optional: true`-Quelle (privacy-minimax) darf ganz fehlen.
- **Veraltete Quellen sind sichtbar.** Ist ein Snapshot älter als 48h (`STALE_SOURCE_HOURS`),
  steht die Quelle in `latest.json.staleSources` und in `warnings`; die Kopfzeile der Seite hängt
  dann „· n Quellen veraltet" an den Datenstand, die Quelle mit Datum steht im `title`.
- **Test:** `tests/fetch-retry.test.mjs` (Retry-Verhalten). `fetch.mjs` läuft nur bei direktem
  Start, damit ein Import in Tests nicht alle 30 Quellen fetcht.

## Gemessene Plaene (Tier M)

Wo kein Anbieter eine Quote veroeffentlicht und eine Drittmessung vorliegt, steht der
Plan mit `disclosure: measured` und `dataTier: M` im Katalog: `measured.monthlyTokens`
(gemessene sichtbare Token pro Monat), `measured.source`/`method`/`sample` als
Nachweis, `localModelPricing` mit den Listenpreisen des Anbieters. Die Modellzeilen
rechnet `modelsForPlan` ueber `directRequests = monthlyTokens / FALLBACK_PATTERN`,
damit die Rate mit den uebrigen Plaenen auf derselben Skala liegt. Chip "measured"
plus Notiz mit Quelle und Stichprobe sind Pflicht. Bisher: Claude Max 20x
(`data/overrides.yml`).

## Quoten messen statt schaetzen

Fuer Plaene ohne veroeffentlichte Quote (Claude, Codex, Cursor, Devin) fuehrt
`tools/measure-quota/` das Messverfahren: Statusline-Capture schreibt die
offiziellen Prozentwerte mit, `measure.py` rechnet daraus die Quote
(`Summe(gewichtete Token) / Prozentanteil`), `test_measure.py` prueft das gegen
eine bekannte Grundwahrheit. Ergebnisse gelten pro Konto und Modellmischung,
also nur mit Stichprobenzahl und Bereich veroeffentlichen. Quellenlage:
`docs/limits-research.md`.

## Verifikation (vor Commit/Push)
1. `npm run update` (exit 0)
2. `npm test` grün
3. `node scripts/check.mjs` — keine unerwarteten Änderungen
4. Nach Push: Workflow-Lauf beobachten bis grün

## Verwandte Repos
- `harrytyp/free-llm-tracker` — LLM-Preis-Tracker (collector/benchmark, alle 6h) — nicht duplizieren,
  ggf. Messdaten teilen.
- `harrytyp/modelselector` — Modell-Auswahl-Daten.

## Seiten aus Daten (Longtail)

`scripts/pages.mjs` erzeugt aus `public/data/latest.json`:

- `public/plans/<id>/index.html` fuer jeden Tarif mit belastbaren Zahlen (Monatspreis > 0, mindestens 3 Modelle mit Rate)
- `public/providers/<anbieter>/index.html` je Anbieter, sortiert nach Tokens pro Dollar
- `public/de/index.html` als deutsche Einstiegsseite

Regeln: das Stylesheet wird aus `public/coding-plan-comparison/index.html` uebernommen, damit es kein
zweites Design gibt. Die Hauptseite (`public/index.html`, `public/app.js`) wird von diesen Skripten
NICHT angefasst, die Default-Ansicht der App bleibt unveraendert. Reihenfolge in der CI:
build -> landing -> pages -> seo (die Sitemap sammelt die erzeugten Verzeichnisse ein). Die Root-
Spiegelung kopiert `plans/`, `providers/` und `de/` mit.

## Verlauf (data/history.jsonl)

`scripts/history.mjs` schreibt eine Zeile pro Tag (`date` + je Tarif `p` = gezahlter Monatspreis,
`t` = Median Tokens pro Dollar, `d` = Offenlegung). Quelle ist die Git-Historie: fehlende Tage
werden aus den Commits nachgetragen, die `public/data/latest.json` angefasst haben (Backfill,
max. 120 Tage), heute kommt dazu. Idempotent, ein Tag wird nie doppelt geschrieben. Die CI ruft
das Skript direkt nach dem Build auf und committet die Datei mit. Angezeigt wird der Verlauf auf
den Planseiten (`scripts/pages.mjs`, Abschnitt "History", nur echte Aenderungen, neueste zuerst).
Die App selbst bleibt unveraendert, der Verlauf liegt auf den statischen Seiten.

## Rueckfall-Staende (data/snapshots/)

Manche Quellen blocken die GitHub-Runner per IP und liefern eine Challenge-Seite statt der Daten
(Freebuff). `scripts/fetch.mjs` legt deshalb vor jedem Ueberschreiben den vorherigen Stand als
`cache/<id>.prev.<ext>` ab, und `scripts/parse-all.mjs` faellt in dieser Reihenfolge zurueck:
frischer Snapshot, `.prev` aus dem Cache, dann `data/snapshots/<id>.<ext>` aus dem Repo.
Jeder Rueckfall wird im Lauf sichtbar gewarnt. Die Repo-Staende dort sind datierte Kopien der
zuletzt verifizierten Seite (Refresh: Datei ersetzen, wenn die Quelle wieder erreichbar ist).
