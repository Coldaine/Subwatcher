<p align="center"><img src="assets/banner.png" width="100%" alt="vibeplan.cc: AI coding plans compared by tokens and requests per dollar paid"></p>

# coding-plan-comparison

**AI coding plans compared by tokens and requests per dollar paid.**

An independent comparison of AI coding subscription plans. It answers what one
dollar really buys in tokens and requests, using published quotas, live prices
and an open JSON dataset. Rebuilt daily from official sources, and the build
never guesses a number and never fetches at runtime.

Live site: https://vibeplan.cc/ &nbsp;·&nbsp; German: https://vibeplan.cc/de/ &nbsp;·&nbsp; Dataset: https://vibeplan.cc/data/latest.json &nbsp;·&nbsp; GitHub Pages: https://harrytyp.github.io/coding-plan-comparison/

> Nothing here is static. All data comes live from official sources (feeds + docs), is fetched, parsed and built deterministically. When a source changes (prices, billing rules, formulas), change detection catches it and the site updates.

## What you get

| Comparison | What it means |
| --- | --- |
| **Tokens and requests per dollar** | Every plan normalized to the same unit, so a "60 for $10" sticker means the same thing at every provider. |
| **Published vs undisclosed** | If a provider does not publish an amount, the row says so. Undisclosed stays undisclosed, no number is invented. |
| **Provider-owned formulas** | Credit formulas are scraped from the official docs (GLM: `(in x 6.9 + cached x 1.7 + out x 24)/10000`), never reverse-engineered. |
| **Windows as caps** | 5h windows are throughput limits, never multiplied into monthly volumes. |
| **Fair model patterns** | Shared model families use the most precise per-model pattern for both providers, so a cheap generic pattern cannot rig the result. |
| **AI scores** | From the LLM Stats leaderboard (zeroeval.com), alias-resolved with provenance. |
| **Privacy flags** | Which models train on your data, which are zero-retention. |
| **Live everything** | Change detection on parsed content. When prices or billing rules move, the site updates itself. |

## How to read the table

- **Per $10 paid everywhere:** `normalizedPer10 = requestsPerMonth x 10 / paidPrice`. That is a rate, not a purchasable multiple. Subscriptions are one per account and are never stacked.
- **Derived vs published:** tokens per month is `requestsPerMonth x tokens-per-request` from the workload pattern, not an independently published quota. The field keeps its `rawTokensPerMonth` name for API compatibility; `derivedTokensPerMonth` is the honestly named alias.
- **Data tiers:** A = official quota from feed or docs, B = official total as anchor, C = derived, D = price-based estimate (hidden by default in the UI, toggle to show), M = measured from a third-party sample. Tier-D rows carry a `~` marker.
- **Aliases:** a resolved model alias or an estimate shows with `~`. Every alias carries `aliasOf` provenance, and family means are computed from original leaderboard keys only.
- **undisclosed stays undisclosed.** Such plans get `modelStats: null` instead of an invented rate, so a vague plan never wins the ranking by accident.
- **Numbers change daily.** Link to the site rather than copying a figure out of it.

## Run it locally

```bash
npm run update   # fetch -> parse -> build
npm test         # invariance tests
npm run check    # change-detection report
```

## How it works: fetch, parse, build

```
sources.yml           -> which endpoints, which parser
      |
      v
scripts/fetch.mjs     -> HTTP fetch of all sources -> cache/<id>.<ext> + cache/manifest.json
      |                  (sha256 + contentHash + fetchedAt + changed flag)
      v
scripts/parse-all.mjs -> parsers (HTML to structured, JSON to normalized) -> parsed/<id>.json
      |
      v
scripts/build.mjs     -> plan catalog from parsed/* + data/overrides.yml
      |                  -> normalization (token prices + cache + workload) -> public/data/latest.json
      v
scripts/check.mjs     -> diff report: which sources changed (exit 2 = changed)
```

**Determinism:** `build.mjs` uses only `cache/` snapshots + `parsed/`, never live fetches. Same snapshots give the same `latest.json`. Snapshots are gitignored and reproduced via `npm run update`.

**Change detection:** every source gets a `contentHash` (hash of the *parsed* content, robust against HTML nonces and cache busters). `check.mjs` shows what really changed (prices, formulas, billing rules), not volatile HTML details.

**One shared YAML parser:** `scripts/yaml.mjs` is the only YAML implementation. `build.mjs`, `fetch.mjs` and `parse-all.mjs` all import it, zero runtime dependencies.

## Sources

Defined in `sources.yml`: machine-readable price feeds (OpenCode Go, Command Code, Kimi goods API, LLM Stats leaderboard, FX rates) plus official docs (GLM, Qwen, Kimi, MiniMax, MiMo, Freebuff) plus provider privacy pages.

Anything not scrapeable (GLM prices behind an auth API, MiniMax JS-SPA) lives in `data/overrides.yml` with `lastVerified`. A scheduled agent rechecks those sources and updates the file on change. `data/privacy.yml` holds manually verified data policies per provider.

## Normalization (what makes plans comparable)

```
cost per request = (0.05 x input + 0.95 x cachedWrite) x pattern.input
                 + cachedRead x pattern.cachedRead + output x pattern.output, /1M
```

- **"60 for 10" is only layer 1.** Base credits (token prices) + cache behavior + workload profile decide what you actually get.
- **Provider-owned credit formulas** (GLM: `(in x 6.9 + cached x 1.7 + out x 24)/10000`) are scraped from the official docs, never invented.
- **Pattern unification:** shared model families use the most precise per-model pattern for both providers, so a cheap generic pattern cannot rig the comparison.
- **All normalized metrics are per $10 paid** (`normalizedPer10 = requestsPerMonth x 10 / paidPrice`). Column headers say "$10" everywhere.
- **Token/month figures are derived** (`requestsPerMonth x tokens-per-request` from the workload pattern), not independently published quotas. The field keeps its `rawTokensPerMonth` name for API compatibility; `derivedTokensPerMonth` is the honestly named alias and `methodology.derivedMetrics` says so in the JSON.
- **Windows are caps, not volumes:** 5h caps are throughput limits (never multiplied into monthly numbers); weekly credits scale x4.33 to monthly.
- **Ad-funded plans (Freebuff):** the published allowance is a daily Freebucks quota by region (US 100/day, see the plan's `billingNote`); the monthly USD volume the site used to name is gone, so the $0 plan carries no model rows and `normalizedPer1: null` instead of an Infinity rate (no invented per-dollar value for free usage).
- **Data tiers:** see *How to read the table* above for the legend (A/B/C/D/M).
- **undisclosed stays undisclosed.** No invented numbers; undisclosed plans get `modelStats: null`.
- **AI scores** come from the LLM Stats leaderboard (zeroeval.com) only, matched to feed models with fuzzy matching. Name variants (e.g. Contributor editions) resolve to their version's leaderboard entry, never to a generic base model. Every resolved alias carries `aliasOf` provenance and shows with `~`; family means are computed from original leaderboard keys only, never from aliases.

## CI / updates

`.github/workflows/update.yml`, daily 03:17 UTC:

1. `fetch` all sources (snapshots + change detection)
2. `parse` + `build` + tests
3. commit on change
4. review issue when SPA sources changed prices, then `overrides.yml` is updated manually

## Layout

```
sources.yml            source definitions (endpoints + parsers)
data/overrides.yml     only non-scrapeable data (SPA/auth) + lastVerified
data/privacy.yml       manually verified provider data policies
data/ai-scores.json    AI score cache/reference
cache/                 raw snapshots + manifest.json (gitignored, reproducible)
parsed/                structured parser output (gitignored)
scripts/               fetch / parse-all / build / check / yaml / parsers
public/                website (index.html, app.js, data/latest.json)
index.html, app.js     synced copies of public/ for legacy GitHub Pages
preview/               synced copy of public/preview/ (design preview at /preview/)
tests/                 invariance + parser tests
schema.json            schema notes for the JSON output
```

Root `index.html`/`app.js`/`data/latest.json` are byte-identical copies of `public/` (legacy Pages serves from root). `public/index.html` uses the `__VERSION__` placeholder, which CI replaces with the commit hash on sync (cache busting). The root mirrors are committed by CI (`update.yml`), not by hand. The same run mirrors `public/preview/index.html` to `preview/`, which is the frozen design-preview build served at `/preview/` (it loads `../app.js`, `../data/latest.json` and `../fonts/` from the main page, so no assets are duplicated).

## Brand and assets

The mark is the Pareto step curve on a dark tile (`assets/logo.svg`). Everything
rasterized is templated in `assets/render/`; the browser does the rasterizing,
because no rsvg, ImageMagick or Pillow is available in the container.

| File | What it is |
| --- | --- |
| `assets/banner.png` | README banner: the wordmark in ANSI Shadow box-drawing letterforms |
| `assets/wordmark.png` | The same wordmark without the `.CC`, for small sizes |
| `assets/banner.svg`, `assets/wordmark.svg` | Vector twins, same geometry, scalable |
| `assets/logo.svg`, `assets/logo-512.png` | The mark, vector and raster |
| `assets/social-preview.png` | GitHub social preview, uploaded by hand under Settings |
| `assets/render/make-banner.py` | Generates all four wordmark files, PNG and SVG, pure stdlib |

The banner generator is the one rasterized asset that does not need a browser: it
draws the glyph rectangles itself and writes the PNG with zlib. Colours, ramp,
rim, keyline and extrusion are constants at the top of the file. `--flat` drops
the lighting, `--fetch "ANY TEXT"` renders another string.

## Contributing

Missing provider, wrong number, or a source we should track: open an issue at
https://github.com/harrytyp/coding-plan-comparison/issues

Scrapeable data goes into `sources.yml` plus a parser. Anything that needs a human
(auth APIs, JS-SPAs, undisclosed plans) goes into `data/overrides.yml` with a
`lastVerified` date. Nothing is hand-edited into the build output.

## License

MIT (code). Data: official sources only; provider brands belong to their owners.
