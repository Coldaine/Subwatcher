# VibePlan Matrix — AI Coding Subscription Comparison & Quota Explorer

A comprehensive, production-grade comparison platform and quota calculator for AI coding plans (Cursor, Claude Code, GitHub Copilot, Windsurf, Replit, JetBrains, and 40+ providers), incorporating the complete codebase, data pipeline, and verified datasets from [`harrytyp/coding-plan-comparison`](https://github.com/harrytyp/coding-plan-comparison) and `vibeplan.cc`.

> [!IMPORTANT]
> **Revised Scope Incorporating GitHub Repository:**
> - **Direct Repo Integration**: Ingest the exact datasets (`data/latest.json` with 139 plans across 40 providers, `privacy.yml`, `overrides.yml`, `changelog.yml`), data scripts (`scripts/fetch.mjs`, `scripts/build.mjs`), and official provider sources (`sources.yml`) from `harrytyp/coding-plan-comparison`.
> - **Dual-Engine Architecture**: A high-performance modern React/TypeScript dashboard with Tailwind styling, combined with the complete mathematical engine from `app.js` (Pareto frontier, cache-aware cost per request, currency converter, i18n English/German, and interactive quota calculator).
> - **Live Sync & Local Pipeline**: Dual-mode data synchronization — live client-side sync with `https://vibeplan.cc/data/latest.json`, with the bundled 2.5MB snapshot as zero-latency local fallback, plus npm scripts for local pipeline execution.

---

## 1. Overview & Core Concept

- **What It Does**: Benchmarks 139 subscription plans across 40 AI coding providers using real token economics, provider credit formulas, and cache-aware workload patterns. Provides an interactive plan matrix, side-by-side showdown tray, budget and quota calculator, Pareto efficiency ranking, and provider privacy transparency.
- **Repository Integration**: Brings the open-source MIT-licensed `harrytyp/coding-plan-comparison` project into this workspace, pairing its comprehensive data collection pipeline with an enterprise-grade UI experience.
- **Target Audience**: Developers, engineering leaders, and teams evaluating subscriptions across Cursor, Claude Code, Copilot, Windsurf, Devin/Cognition, OpenAI, Google, AWS, and open-source coding agents.

---

## 2. User Experience & Visual Design

### Key User Views & Flows
1. **Best Value / Pareto Frontier View**:
   - Ranked plans by tokens and requests per unit paid ($1).
   - Only compares plans that do not train on user data and provide API access.
   - Proportional visual bars sharing a calibrated scale for intuitive comparison.
2. **Comprehensive Plan Explorer & Matrix**:
   - Filterable by 40+ providers, price tier (Free, $10, $20, $50, $100+), meter type (requests, dollar usage, credits pool), model family, and data tier (zero-retention, trained).
   - Expandable model breakdown rows showing: Allowance, Cost per request under standard pattern (800 input, 50k cached read, 162 output), Requests per month, and Normalized yield per $1.
   - Deep-dive plan drawer with official source links, verified dates, and 5-hour window caps.
3. **Head-to-Head Compare Tray (Showdown)**:
   - Docking tray allowing users to pin 2 to 4 plans simultaneously.
   - Side-by-side comparison modal analyzing price, billing cadence, throughput limits, model availability, privacy terms, and true token yield.
4. **Developer Workload & Quota Calculator**:
   - Customize workload pattern: daily requests, prompt tokens, cache read ratio, and completion length.
   - Real-time calculation of monthly cost, projected headroom, and recommended plans that avoid throttling.
5. **Methodology & Changelog**:
   - Complete documentation of the vibeplan formula: `(0.05 × input + 0.95 × cachedWrite) × pattern.input + cachedRead × pattern.cachedRead + output × pattern.output / 1,000,000`.
   - Live synchronization status with manual "Sync Now" button, schema version check, and provider source attribution.
   - Multi-currency support (USD, EUR, CNY) and language toggle (EN / DE).

### Visual Identity & Theme
- **Theme**: Dark obsidian developer terminal (`#090D16`, `#0F172A`) with crisp hairline borders (`#1E293B`).
- **Typography**: Clean neo-grotesque display headers (`Plus Jakarta Sans`) paired with strict tabular monospace figures (`font-mono tabular-nums`) for all numbers, tokens, and prices.
- **Anti-Slop Discipline**:
  - No static pill wrappers for metadata; clean typographic separators (`·` and `/`).
  - No fake AI scoreboards or decorative pulsing dots.
  - All interactive buttons, filters, sliders, and drawers have working handlers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Ingesting the Authentic Repository Dataset**
  - *Chosen Approach*: Copy the complete, official `data/latest.json` (139 plans, 2.5MB), `sources.yml`, and pipeline scripts from `harrytyp/coding-plan-comparison` into the project repository.
  - *Why*: Gives instant, 100% offline accuracy with authentic provider data, while still allowing live sync with `https://vibeplan.cc/data/latest.json`.
  - *Alternatives Considered*: Fetching only via network on load (can fail due to network hiccups or CORS).

- **Decision 2: Preserving the Exact vibeplan Calculation Engine**
  - *Chosen Approach*: Port and adapt the battle-tested math from `app.js` into clean, type-safe TypeScript utilities (`src/lib/vibeplan-calc.ts` and `src/lib/vibeplan-types.ts`).
  - *Why*: Ensures bit-for-bit mathematical consistency with vibeplan.cc (cache-aware cost per request, draw threshold percent, pattern unification, window cap rules).

- **Decision 3: Floating Multi-Plan Compare Dock**
  - *Chosen Approach*: Persistent bottom bar tracking selected plan IDs with quick removal and a 1-click modal for deep differential analysis.
  - *Why*: Enables seamless comparison of plans without losing filter state or scroll position.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VibePlan Matrix Dashboard                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ Pareto / Best Value  │ │  Plan Explorer Table │ │   Quota Calculator   │
│ - Ranked Value Bars  │ │ - 40+ Provider filter│ │ - Custom Workload    │
│ - Zero-retention rule│ │ - Expandable models  │ │ - Headroom ranking   │
│ - Direct comparability││ - Detail Drawer      │ │ - Multi-currency     │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Side-by-Side Compare Tray                          │
│               - 2 to 4 Plans Side-by-Side Showdown                     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 VibePlan Calculation & Sync Service                    │
│  - Cost per request formula         - Live vibeplan.cc fetch           │
│  - Normalized tokens/dollar         - Local storage sync cache         │
│  - Currency & i18n support          - Bundled fallback dataset         │
└────────────────────────────────────────────────────────────────────────┘
                  ▲                                    ▲
                  │                                    │
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│  Live vibeplan.cc API Feed      │   │  Bundled Repo Data Files         │
│  (https://vibeplan.cc/data/...) │   │  (latest.json, sources.yml, etc.)│
└─────────────────────────────────┘   └──────────────────────────────────┘
```

### Ingested Repository Files & Assets
- `src/data/latest.json`: 139 plans, official benchmark data
- `src/data/sources.yml`: Official provider doc endpoints and parsing instructions
- `src/data/privacy.yml`: Data retention and model training policies per provider
- `scripts/`: Data fetch and build pipeline utilities
- `src/lib/vibeplan-calc.ts`: Calculation engine (cost per request, tokens per dollar, window throughput)
- `src/lib/vibeplan-types.ts`: TypeScript interfaces for Plan, ModelRow, Quota, Price, Methodology

### Verification Plan
1. Ingest repo data files and assets from `/tmp/coding-plan-comparison`.
2. Build full-stack/SPA React dashboard with all views (Overview/Pareto, Plans Matrix, Head-to-Head Compare Tray, Quota Calculator, Methodology & Sources).
3. Validate with `compile_applet` and test all interactive controls (search, filters, comparisons, sliders, sync button, drawer, currency switcher).
