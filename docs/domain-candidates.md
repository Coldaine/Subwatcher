# Domain-Kandidaten für Coding Plan Compare

Recherche 14.09.2026. Preise sind Porkbun-Listpreise in USD (API v3 `getPricing` / `checkDomain`, über den Porkbun-MCP-Server abgefragt); EUR umgerechnet mit 1 USD = 0.862019 EUR (exchangerate-api, Stand 12.09.2026, aus `cache/fx-rates.json`).

## Ablöse-Freiheit: wie geprüft

- `check_domain` (Porkbun MCP): `avail: yes` = Registry-Verfügbarkeitscheck, `premium: no` = kein Registry-Premiumpreis, `type: registration` = normale Registrierung.
- Unabhängige Gegenprobe über **RDAP der jeweiligen Registry** (`.de` → rdap.denic.de, `.com`/`.name` → rdap.verisign.com, `.dev`/`.page`/`.app` → pubapi.registry.google, `.fyi` → rdap.identitydigital.services): HTTP 404 = nicht registriert, also **kein Vorbesitzer und keine Ablöse**.
- Für `.eu` existiert kein nutzbarer RDAP-Endpunkt (rdap.eurid.eu löst nicht auf, .eu fehlt im IANA-Bootstrap) → dort nur der Porkbun-Check.

## Top 10

| Domain | jetzt | Renewal/Jahr | Beleg |
|---|---|---|---|
| `codingplans.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `plancompare.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `codingplancompare.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `codingplanvergleich.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `codingplancheck.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `aicodingplans.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `plansvergleich.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `planpreise.de` | 2,50 € | 3,51 € | avail=yes, premium=no, RDAP 404 frei |
| `codingplanpricing.com` | 9,55 € | 9,55 € | avail=yes, premium=no, RDAP 404 frei |
| `codingplanscompare.com` | 9,55 € | 9,55 € | avail=yes, premium=no, RDAP 404 frei |

Hinweis `.de`: Registrierungspreis ist eine First-Year-Promo (2,90 $ statt regulär 5,49 $), Renewal 4,07 $.

## Alle geprüften Namen

| Domain | avail | premium | RDAP | jetzt | Renewal |
|---|---|---|---|---|---|
| `codingplans.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplancompare.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplancheck.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplan-check.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplanvergleich.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplan-vergleich.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `plancompare.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `plansvergleich.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `planscheck.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplanmatrix.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplansmatrix.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `aicodingplans.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplans24.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `planpreise.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codepreise.de` | yes | no | 404 FREE | 2,50 € | 3,51 € |
| `codingplanvergleich.eu` | yes | no | FAIL URLError | 5,07 € | 5,07 € |
| `codingplancompare.eu` | yes | no | FAIL URLError | 5,07 € | 5,07 € |
| `planvergleich.eu` | yes | no | FAIL URLError | 5,07 € | 5,07 € |
| `codingplans.eu` | yes | no | FAIL URLError | 5,07 € | 5,07 € |
| `codingplans.name` | yes | no | 404 FREE | 6,30 € | 6,30 € |
| `codingplancompare.dev` | yes | no | 404 FREE | 7,54 € | 11,09 € |
| `codingplans.dev` | yes | no | 404 FREE | 7,54 € | 11,09 € |
| `codingplanpricing.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `codingplanspricing.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `codingplanscompare.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `comparecodingplans.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `codingplancomparison.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `codingplanmatrix.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `llmcodingplans.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `plancostcompare.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `codingplancost.com` | yes | no | 404 FREE | 9,55 € | 9,55 € |
| `codingplan.de` | no | no | 200 REGISTERED | 2,50 € | 3,51 € |
| `codingplan.fyi` | no | no | 403 ? | 4,88 € | 4,88 € |
| `codingplanprices.com` | no | no | 200 REGISTERED | 9,55 € | 9,55 € |

## Verworfene Endungen (Renewal zu teuer, Lockangebot Jahr 1)

`.top` 1,41 € → 3,99 €, `.xyz` 1,76 € → 12,25 €, `.icu`/`.cyou`/`.cfd`/`.sbs` 1,33 € → 13,76 €, `.click` 1,33 € → 9,32 €, `.website`/`.site`/`.online` 1,69 € → 18-25 €, `.dev` Renewal 11,09 €, `.net` 10,79 €, `.org` 10,21 €.

## Offen

Porkbun-Guthaben ist 0 $ (`get_balance`) → Registrierung erst nach Aufladung möglich. Danach: `register_domain` über den MCP, anschließend DNS für GitHub Pages (A/AAAA oder CNAME + `CNAME`-Datei im Repo).
