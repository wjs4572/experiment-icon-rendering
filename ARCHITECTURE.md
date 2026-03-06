# Architecture & Technology Reference

> Internal developer reference for the Icon Rendering Performance Test project.  
> Covers technology stack, module architecture, call hierarchy, and design patterns.

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [System Overview](#system-overview)
- [Module Architecture](#module-architecture)
  - [Runtime Module Map](#runtime-module-map)
  - [Module Responsibilities](#module-responsibilities)
- [Page Architecture](#page-architecture)
- [Call Hierarchy](#call-hierarchy)
  - [User-Initiated Batch Run](#user-initiated-batch-run)
  - [Progress Propagation](#progress-propagation)
  - [Cross-Tab Synchronisation](#cross-tab-synchronisation)
  - [Run Completion & Persistence](#run-completion--persistence)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Design Patterns](#design-patterns)
- [State Management](#state-management)
- [Storage Schema](#storage-schema)
- [Testing Infrastructure Architecture](#testing-infrastructure-architecture)

---

## Technology Stack

### Runtime (Browser — no build step)

| Technology | Role | Version |
|------------|------|---------|
| **Vanilla HTML/CSS/JS** | All page UI and performance measurement | — |
| **TailwindCSS** | Utility-first CSS (pre-compiled, committed) | v4 |
| **Tabulator** | Data table in Results Library (`results-library.html`) | CDN |
| **Web Performance API** | `performance.now()`, `performance.mark()` — actual measurement | Browser native |
| **BroadcastChannel API** | Real-time cross-tab progress sync | Browser native |
| **localStorage** | Persistent run records, system specs, rotation state | Browser native |
| **Screen Wake Lock API** | Prevents display sleep during long test runs | Browser native |

### Tooling (Node.js — dev/test only)

| Tool | Role | Version |
|------|------|---------|
| **Playwright** | Cross-browser regression test runner | ^1.40.0 |
| **@playwright/test** | Test framework and assertion library | ^1.40.0 |
| **http-server** | Static dev server (serves `src/` on port 3000) | ^14.1.1 |
| **@tailwindcss/cli** | Compiles `tailwind.src.css` → `tailwind.css` | ^4.2.1 |
| **Node.js** | Scripts: `scripts/clean.js`, `scripts/commit-tests.js` | LTS |

### Zero-Dependency Policy

The browser runtime intentionally has **no npm dependencies** and **no bundler**. Every `src/js/*.js` file is loaded with a plain `<script>` tag. This keeps measurement overhead minimal and allows any browser to open the files directly without a build step.

---

## System Overview

The project is two separate systems sharing a codebase:

```
┌────────────────────────────────────────────────────────┐
│  EXPERIMENTAL PERFORMANCE TESTING (Browser)            │
│                                                        │
│  User opens http://localhost:3000 in their browser     │
│  → Runs icon rendering benchmarks                      │
│  → Collects timing data with JS performance APIs       │
│  → Exports results as JSON with system specs           │
│                                                        │
│  Results are browser-specific, single-environment,     │
│  scientifically valid for that browser/hardware combo  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  REGRESSION TESTING (Node.js / Playwright)             │
│                                                        │
│  npx playwright test → starts http-server →            │
│  launches Chromium, Firefox, WebKit →                  │
│  exercises UI behaviour, checks DOM structure,         │
│  validates i18n, format pages, module APIs             │
│                                                        │
│  Purely functional — does not measure rendering perf   │
└────────────────────────────────────────────────────────┘
```

---

## Module Architecture

### Runtime Module Map

All modules are **IIFE / plain class declarations** assigned to `window.*` globals. No ES modules, no bundler. Load order matters — each page's `<script>` tags are ordered to satisfy dependencies.

```
window globals (each file exposes one entry)
│
├── window.RunId                  ← run-id.js
│     Pure ID generation utilities (no deps)
│
├── window.IconConfigs            ← icon-configs.js
│     Static config data for all 7 formats (no deps)
│
├── window.RunRecord              ← run-record.js
│     Schema factory; depends on RunId
│
├── window.RunHandle              ← run-handle.js
│     In-flight run token/handle (no external deps)
│
├── window.Reporters              ← reporters.js
│     NoopReporter / DOMReporter / StoreReporter
│
├── window.StressTestManager      ← stress-test-manager.js
│     Core measurement engine; depends on IconConfigs, Reporters
│
├── window.SuiteRunner            ← suite-runner.js
│     Facade that assembles and launches a run
│     depends on: RunId, RunRecord, RunHandle, RunStateStore,
│                 IconConfigs, StressTestManager, Reporters
│
├── window.RunStateStore          ← run-state.js
│     Singleton state store; depends on nothing at module load time.
│     Instantiated once: window.RunStateStore = new RunStateStore()
│
├── window.BatchProgressMonitor   ← batch-progress-monitor.js
│     Format-page convenience subscriber; depends on RunStateStore
│
├── window.SystemSpecsUtils       ← system-specs-utils.js
│     Pure parse/sanitise helpers; no deps
│
├── window.systemSpecsManager     ← system-specs.js
│     System specs modal + persistence; depends on i18n, SystemSpecsUtils
│
└── window.i18n                   ← i18n.js
      Translation system; no external deps
```

### Module Responsibilities

#### `run-id.js` — ID Generation

Pure utility. Generates all ID types used to correlate records across tabs and storage:

| Method | Shape | Purpose |
|--------|-------|---------|
| `generateRunId()` | `run-<timestamp>-<rand>` | One per user-initiated batch (shared across formats) |
| `generateSuiteRunId()` | `suite-<timestamp>-<rand>` | One per format within a run |
| `generateTestResultId()` | `result-<timestamp>-<rand>` | Stable key for localStorage persistence |

---

#### `icon-configs.js` — Format Configuration

Static data object. Provides `allIconConfigs[format]` — an array of icon configuration objects (id, type, label, render method) for each of the 7 formats. No logic; consumed by `StressTestManager` and `SuiteRunner`.

---

#### `run-record.js` — Data Schema

**Factory pattern.** `createRunRecord(fields)` constructs a complete, schema v2 record with all required keys defaulted. `normalizeImportedRecord(raw, fileName)` maps arbitrary imported JSON onto the same schema for Results Library imports.

Record shape summary:
```javascript
{
  schemaVersion: 2,
  testResultId, runId, suiteRunId,
  format,           // css | svg | png | gif | jpeg | webp | avif
  source,           // local | imported
  active,           // boolean — excluded from summary analysis if false
  startTime, endTime, durationMs,
  testType, iterations, testDuration,
  results,              // raw per-icon timing data
  statisticalAnalysis,  // means, CIs, rankings
  performanceRanking,   // sorted array
  testMetadata, testConfiguration,
  systemSpecifications
}
```

---

#### `run-handle.js` — Async Run Token

**Handle pattern / Promise wrapper.** `RunHandle` is returned by `runSuite()` and provides:

- `done` — Promise that resolves `{ runRecord }` on completion
- `onProgress(cb)` — subscribe to progress events; returns unsubscribe function
- `getProgress()` — poll current progress snapshot
- `cancel()` — request cancellation (calls `cancelFn` → `manager.stopTest()`)
- `status` — `RUN_STATUS` enum: `pending | running | completed | cancelled | error`

The `done` promise's `_resolve` / `_reject` are held internally and called by `suite-runner.js` when the execution ends.

---

#### `reporters.js` — Reporter Strategy

**Strategy pattern.** Three implementations of the same interface:

```javascript
interface Reporter {
  onTestStart(format, config)
  onProgress(percentage, message, completedIterations, totalIterations)
  onIterationComplete(iconType, iterationData)
  onTestComplete(results, duration, extra)
  onError(error)
}
```

| Reporter | Use case |
|----------|----------|
| `NoopReporter` | Default; all methods are no-ops. Used when no reporter is injected. |
| `DOMReporter` | Writes directly to DOM element IDs on format pages (`#progressBar`, `#progressPercent`, etc.). Holds a back-reference to `StressTestManager` to call HTML-generation methods. |
| `StoreReporter` | Publishes to `RunStateStore` for batch / cross-tab progress. |

---

#### `stress-test-manager.js` — Measurement Engine

The core of the experimental testing system. Responsibilities:

- Iterates icon configs running timed render cycles
- Accumulates timing data into `this.results`
- Computes `statisticalAnalysis` (mean, std dev, confidence intervals) and `performanceRanking`
- Calls reporter hooks at each stage
- Manages `isRunning` / `shouldStop` flags for cooperative cancellation
- Handles anti-throttling (Screen Wake Lock, silent audio node)
- Delegates system spec collection to `window.systemSpecsManager`

Key methods: `startStressTest()`, `stopTest()`, `_runIteration()`, `_computeStatistics()`, `generateResultsHTML()`

---

#### `suite-runner.js` — Orchestration Facade

**Facade pattern.** `runSuite(format, testType, opts)` is the single entry point for launching either a local or batch run. It assembles all components:

1. Generate IDs (`RunId`)
2. Look up icon configs (`IconConfigs`)
3. Create `StressTestManager` with the configured reporter
4. Create `RunHandle` with a cancel function wired to `manager.stopTest()`
5. **Intercept** reporter's `onProgress` to also call `handle._updateProgress()` and `RunStateStore.updateProgress()` — this is the central progress fan-out point
6. Register with `RunStateStore`
7. Start `_execute()` (async) → on completion create `RunRecord`, persist, resolve handle

---

#### `run-state.js` — State Store Singleton

**Singleton + Observer pattern.** One instance (`window.RunStateStore = new RunStateStore()`) is the single source of truth for all run state.

Responsibilities:

| Concern | Mechanism |
|---------|-----------|
| Active run tracking | `_active: Map<suiteRunId, runEntry>` (in-memory) |
| Completed run persistence | `localStorage['iconTestRunRecords']` (JSON array) |
| Batch visibility across tabs | `localStorage['iconTestProgressState']` (snapshot on reg/complete) |
| Real-time progress across tabs | `BroadcastChannel('icon-test-progress')` |
| Completion sync across tabs | `window.storage` event on localStorage |
| Local same-tab subscribers | `_progressListeners: Map<format, Set<fn>>` |
| Local completion subscribers | `_completionListeners: Map<format, Set<fn>>` |

Public subscription API:
- `onProgressChange(format, callback)` → returns unsubscribe fn
- `onCompletion(format, callback)` → returns unsubscribe fn

---

#### `batch-progress-monitor.js` — Format-Page Subscriber

Convenience wrapper for format pages (e.g. `css.html`) to monitor an in-progress batch for their format. Wraps `RunStateStore.onProgressChange()` and `RunStateStore.onCompletion()` into a single `start()` / `stop()` lifecycle.

---

#### `i18n.js` — Internationalisation

**Singleton.** Exposes `window.i18n` with:

- `translate(key)` — returns localised string or falls back to English
- `detectLanguage()` — checks `localStorage`, then `navigator.language`, falls back to `en`
- `setLanguage(code)` — switches locale, updates DOM, persists to localStorage
- Locale files fetched lazily from `src/locales/*.json`

---

#### `system-specs.js` / `system-specs-utils.js` — System Specifications

`SystemSpecsManager` (singleton `window.systemSpecsManager`) manages:
- Modal UI for entering hardware specs
- Auto-detection of browser-visible properties (`navigator.*`, `screen.*`)
- Persistence to `localStorage['systemSpecifications']`
- Status badge indicating completeness

`SystemSpecsUtils` (static frozen object `window.SystemSpecsUtils`) provides pure functions for parsing and sanitising Belarc Advisor output into the spec schema.

---

## Page Architecture

| Page | Purpose | Key JS modules loaded |
|------|---------|----------------------|
| `index.html` | Home + batch test runner | RunId, RunRecord, RunHandle, RunStateStore, SuiteRunner, IconConfigs, StressTestManager, Reporters, BatchProgressMonitor, i18n |
| `{format}.html` × 7 | Per-format interactive test | RunId, RunRecord, RunStateStore, SuiteRunner, StressTestManager, IconConfigs, Reporters, BatchProgressMonitor, DOMReporter, SystemSpecsManager, i18n |
| `summary.html` | Aggregate analysis + charts | RunStateStore, RunRecord, i18n |
| `results-library.html` | Browse/filter all saved runs | RunStateStore, RunRecord, Tabulator (CDN), i18n |

---

## Call Hierarchy

### User-Initiated Batch Run

```
index.html — user clicks "Start All"
│
├── generate sharedRunId via RunId.generateRunId()
│
└── for each format in [css, svg, png, gif, jpeg, webp, avif]:
    │
    └── window.SuiteRunner.runSuite(format, testType, { runId: sharedRunId })
        │
        ├── RunId.generateSuiteRunId()
        ├── IconConfigs.allIconConfigs[format]
        ├── new Reporters.NoopReporter()            ← default; DOMReporter on format pages
        ├── new StressTestManager({ iconConfigs, format, testType, reporter })
        ├── new RunHandle({ runId, suiteRunId, format, cancelFn: manager.stopTest })
        │
        ├── wrap reporter.onProgress →              ← progress fan-out intercept
        │     handle._updateProgress(data)          ← same-tab handle subscribers
        │     RunStateStore.updateProgress(id,data) ← cross-tab + local observers
        │
        ├── RunStateStore.registerRun(suiteRunId, format, runId, testType)
        │     → localStorage['iconTestProgressState'] written (batch visible to other tabs)
        │
        └── _execute(manager, handle, ctx)          ← async
              │
              └── manager.startStressTest()
                    │
                    ├── for each icon config, for each iteration:
                    │     _runIteration(config)
                    │     reporter.onIterationComplete(iconType, data)
                    │     reporter.onProgress(pct, msg, completed, total)
                    │                                ↑ intercept fires here
                    │
                    └── _computeStatistics()
                          reporter.onTestComplete(results, duration)
```

### Progress Propagation

```
reporter.onProgress()  [intercept in suite-runner.js]
│
├── original reporter.onProgress()
│     └── DOMReporter: updates #progressBar, #progressPercent, #progressText, #eta
│
├── handle._updateProgress(data)
│     └── notifies handle._progressListeners (Set<fn>)
│           └── index.html per-format progress bar in batch UI
│
└── RunStateStore.updateProgress(suiteRunId, data)
      │
      ├── _active.get(suiteRunId).progress = data
      ├── _notifyProgress(format, run)
      │     └── notifies _progressListeners.get(format) (Set<fn>)
      │           └── BatchProgressMonitor.onProgress callback on format pages
      │
      └── BroadcastChannel.postMessage({ type:'progress', suiteRunId, format, data })
            └── other tabs: RunStateStore._onChannelMessage()
                  ├── updates/creates _active entry for that tab
                  └── _notifyProgress(format, runEntry) → format page monitors in other tabs
```

### Cross-Tab Synchronisation

```
Tab A (index.html running batch)          Tab B (css.html open)
│                                         │
│ RunStateStore.registerRun()             │ BatchProgressMonitor.start()
│   → writes localStorage                 │   → RunStateStore.onProgressChange('css', cb)
│     ['iconTestProgressState']           │   → checks localStorage immediately
│                                         │     (picks up any already-running batch)
│ RunStateStore.updateProgress()          │
│   → BroadcastChannel.postMessage()  ──►│ RunStateStore._onChannelMessage()
│                                         │   → _notifyProgress('css', run)
│                                         │   → BatchProgressMonitor.options.onProgress(run)
│                                         │   → css.html updates its progress UI
│                                         │
│ RunStateStore.completeRun()             │
│   → writes localStorage                 │
│     ['iconTestRunRecords']           ──►│ window.addEventListener('storage', e)
│                                         │   → RunStateStore._onStorageEvent()
│                                         │   → _notifyCompletion('css', runRecord)
│                                         │   → BatchProgressMonitor.options.onCompletion(rec)
```

### Run Completion & Persistence

```
manager.startStressTest() resolves
│
└── suite-runner._execute():
      │
      ├── RunRecord.createRunRecord({ format, runId, suiteRunId,
      │     results, statisticalAnalysis, performanceRanking,
      │     startTime, endTime, durationMs, systemSpecifications })
      │
      ├── RunStateStore.completeRun(suiteRunId, runRecord)
      │     ├── _active.delete(suiteRunId)
      │     ├── appends to localStorage['iconTestRunRecords']
      │     ├── updates localStorage['iconTestProgressState'] (removes active entry)
      │     ├── _notifyCompletion(format, runRecord)
      │     └── BroadcastChannel.postMessage({ type:'complete', format, runRecord })
      │
      └── handle._resolve({ runRecord })
            └── handle.done Promise resolves → index.html .then() updates batch UI
```

---

## Data Flow Diagrams

### Performance Measurement Pipeline

```
IconConfigs[format]
      │
      ▼
StressTestManager.startStressTest()
      │
      ├─ for each iconConfig:
      │       ├─ create DOM element
      │       ├─ performance.now() ────► render timing
      │       ├─ requestAnimationFrame (settle)
      │       └─ performance.now() ────► total time
      │
      ├─ accumulate into this.results[iconType][]
      │
      ├─ _computeStatistics()
      │       ├─ mean, variance, stdDev per iconType
      │       ├─ 95% confidence intervals
      │       └─ performanceRanking (sorted by mean)
      │
      └─ RunRecord.createRunRecord()
              └─ localStorage['iconTestRunRecords']
                      └─ summary.html reads + analyses
                              └─ results-library.html browses
```

### i18n Data Flow

```
Browser loads page
      │
      ▼
i18n.js: window.i18n = new I18nSystem()
      │
      ├─ detectLanguage()
      │     localStorage['iconTestLanguage'] → navigator.language → 'en'
      │
      ├─ fetch(`/locales/${lang}.json`)
      │
      └─ DOMContentLoaded: applyTranslations()
              └─ querySelectorAll('[data-i18n]')
                      └─ el.textContent = translate(el.dataset.i18n)

User selects language:
      ├─ i18n.setLanguage(code)
      ├─ localStorage['iconTestLanguage'] = code
      └─ applyTranslations() ← in-place, no page reload
```

---

## Design Patterns

| Pattern | Where used | Notes |
|---------|-----------|-------|
| **Singleton** | `RunStateStore`, `systemSpecsManager`, `i18n` | Exposed on `window.*`; one instance per tab |
| **Observer / Pub-Sub** | `RunStateStore._progressListeners`, `RunStateStore._completionListeners`, `RunHandle._progressListeners` | `Map<format, Set<fn>>`; all return unsubscribe functions |
| **Strategy** | `Reporters` hierarchy (`NoopReporter`, `DOMReporter`, `StoreReporter`) | Interchangeable reporter implementations injected into `StressTestManager` |
| **Facade** | `SuiteRunner.runSuite()` | Hides the assembly of 6 collaborating objects; callers need only pass `(format, testType, opts)` |
| **Factory** | `RunRecord.createRunRecord()`, `RunId.generate*()` | Centralised object construction with validation and defaulting |
| **Handle / Token** | `RunHandle` | Opaque value returned from `runSuite()`; holds `done` Promise, progress subscription, and cancel |
| **Template Method** | `NoopReporter` base + `DOMReporter` / `StoreReporter` overrides | Subclasses override only the methods they need |
| **Decorator / Interceptor** | Progress intercept in `suite-runner._execute()` | Wraps `reporter.onProgress` to fan out to handle + state store without modifying reporter or manager |
| **Data Transfer Object (DTO)** | `RunRecord` schema | Fixed-shape value object passed between layers; `schemaVersion` guards against format drift |
| **Global Namespace / Module** | All `window.*` assignments | Replaces ES module system; each file registers one entry point on `window` |
| **Promise Handle** | `RunHandle.done` + internal `_resolve`/`_reject` | Exposes a Promise whose resolution is controlled by an external owner (suite-runner) |

---

## State Management

All mutable state falls into four layers:

| Layer | Scope | Mechanism | Contents |
|-------|-------|-----------|----------|
| **In-memory active** | Single tab | `RunStateStore._active: Map` | Live run entries with latest progress |
| **In-memory listeners** | Single tab | `_progressListeners`, `_completionListeners` | Subscriber callbacks per format |
| **Session broadcast** | All tabs (ephemeral) | `BroadcastChannel` | Real-time progress messages (not persisted) |
| **Persistent** | All tabs + refresh | `localStorage` | Completed run records, active batch marker, system specs, language, rotation state |

localStorage keys:

| Key | Owner | Content |
|-----|-------|---------|
| `iconTestRunRecords` | `RunStateStore` | Array of completed `RunRecord` objects |
| `iconTestProgressState` | `RunStateStore` | Map of active `suiteRunId → runEntry` |
| `iconTestResults_<format>` | `RunStateStore` | Latest result per format (legacy compat) |
| `systemSpecifications` | `SystemSpecsManager` | Hardware/browser spec object |
| `iconTestLanguage` | `i18n` | Selected locale code string |
| `.test-rotation.json` (file) | `scripts/commit-tests.js` | Rotation tracking for smart commit tests |

---

## Storage Schema

### RunRecord (v2)

```jsonc
{
  "schemaVersion": 2,
  "testResultId":  "result-<ts>-<rand>",  // stable storage key
  "runId":         "run-<ts>-<rand>",     // shared across formats in a batch
  "suiteRunId":    "suite-<ts>-<rand>",   // unique per format within a run

  "format":        "css",                 // css|svg|png|gif|jpeg|webp|avif
  "source":        "local",              // local|imported
  "active":        true,                 // false = excluded from analysis

  "startTime":     "2026-03-06T...",
  "endTime":       "2026-03-06T...",
  "durationMs":    12345,

  "testType":      "bulk",
  "iterations":    200,

  "results": {
    "<iconType>": [<timingMs>, ...]
  },
  "statisticalAnalysis": {
    "<iconType>": { "mean": 0.0, "stdDev": 0.0, "ci95": [0.0, 0.0] }
  },
  "performanceRanking": [
    { "iconType": "...", "averageTime": 0.0 }
  ],

  "testMetadata":         {},
  "testConfiguration":    {},
  "systemSpecifications": {
    "autoDetected": { "userAgent": "...", "screen": { ... }, ... },
    "manual":       { "processor": { ... }, "memory": { ... }, ... }
  }
}
```

---

## Testing Infrastructure Architecture

### Playwright Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `testDir` | `./tests` | All test files |
| `fullyParallel` | `true` | Tests within a file run in parallel |
| `workers` | 2 (local), 1 (CI) | Prevents resource exhaustion with WebKit |
| `retries` | 1 (local), 2 (CI) | Handles transient browser timing |
| `globalTimeout` | 45 minutes | Covers full suite across all browsers |
| `webServer` | `http-server src -p 3000` | Auto-started; reused if already running |
| `locale` | `en-US` | Pins language so text selectors are deterministic |
| `trace` | `on-first-retry` | Captures trace on first retry for debugging |

### Test File Map

| File | Tests | What it covers |
|------|-------|---------------|
| `index.test.js` | ~20 | Batch runner UI, progress bars, Clear Data |
| `summary.test.js` | ~14 | Statistical analysis, cross-format section, Best Only |
| `results-library.test.js` | ~67 | Tabulator table, import, Quick Stats sidebar, filters |
| `format-pages.test.js` | ~7×N | All 7 format pages — structure, controls, BatchProgressMonitor |
| `i18n.test.js` | ~26 | Language detection, switching, key coverage |
| `suite-runner.test.js` | ~15 | SuiteRunner API, RunHandle states, cancellation |
| `run-record.test.js` | ~12 | Schema validation, factory defaults, import normalisation |
| `run-state.test.js` | ~18 | RunStateStore CRUD, storage events, BroadcastChannel |
| `stress-test-manager.test.js` | ~20 | Manager lifecycle, stop/cancel, reporter hooks |

### Smart Commit Rotation

`scripts/commit-tests.js` implements change-aware subset selection:

1. `git diff --name-only` → changed file list
2. Map each file to its owning test suite(s) via a static path→suite table
3. Read `.test-rotation.json` → select next subset not recently run
4. `npx playwright test <files> --project=chromium` (single browser for speed)
5. Write result JSON + Markdown to `commit-reports/`
6. Update `.test-rotation.json`

This gives full coverage over ~5 commits while keeping each pre-commit run to 1–3 minutes.
