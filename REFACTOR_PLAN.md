# Refactor Plan — Icon Rendering Performance Test Suite

**Created**: 2026-02-25
**Status**: Approved for implementation

---

## Design Decisions (Locked)

| Decision | Choice |
| --- | --- |
| Backward compat for old stored data | Not required. Additive fields for new runs only. Simplified read paths. |
| Icon configs | Extracted to shared module `src/js/icon-configs.js`. Suite pages and batch import the same configs. |
| Batch execution | No iframes. StressTestManager gets injected Reporter interface. `DOMReporter` for suite pages, `StoreReporter` for batch/cross-tab. Existing index.html batch progress UI preserved exactly. |
| Results Library table | Tabulator (CDN). No custom table implementation. |
| Run schema | All runs (local, batch, imported) normalize to a single `RunRecord` schema. `source` field (`local` \| `imported`). `importedFileName` field for imports. |

---

## RunRecord Schema

```js
{
  schemaVersion: 2,
  testResultId: "<unique-id>",        // unique per stored record
  runId: "<shared-across-batch>",     // same for all suites in one batch; unique per local run
  suiteRunId: "<unique-per-suite>",   // unique per suite execution within a run
  format: "css",                      // css | svg | png | gif | jpeg | webp | avif
  source: "local",                    // "local" | "imported"
  importedFileName: null,             // string if source === "imported", else null
  active: true,                       // controls visibility in Summary Dashboard

  startTime: "<ISO-8601>",           // wall-clock when test began
  endTime: "<ISO-8601>",             // wall-clock when test completed
  durationMs: 4200,                   // endTime - startTime in ms

  // --- All existing fields preserved below ---
  testType: "bulk",
  iterations: 250,
  testDuration: 4.2,                  // seconds (kept for display compat)
  results: { /* per-icon-type stats: renderTime, memoryUsage, bulkMetrics, etc. */ },
  statisticalAnalysis: { /* pairwise comparisons */ },
  performanceRanking: [ /* sorted icon entries */ ],
  testMetadata: { /* browser info, iterationsPerSecond, etc. */ },
  testConfiguration: { /* testType, testMethod, iterations, iconsPerTest, etc. */ },
  systemSpecifications: { /* auto-detected + user-provided specs */ }
}
```

---

## Todo List

### Phase 1: Foundation Modules (no UI changes)

#### Todo 1 — ID Helper Module

- **New file**: `src/js/run-id.js` (~30 lines)
- Three functions: `generateRunId()`, `generateSuiteRunId()`, `generateTestResultId()`
- Timestamp + random suffix based (no external deps)
- Exported for use by suite runner, batch runner, and import logic

#### Todo 2 — RunRecord Schema & Normalizer

- **New file**: `src/js/run-record.js` (~60 lines)
- `createRunRecord(fields)` — factory that fills defaults, validates shape
- `normalizeImportedRecord(raw, fileName)` — takes imported JSON, maps to RunRecord, sets `source: "imported"`, sets `importedFileName`
- Defines `SCHEMA_VERSION = 2`

#### Todo 3 — Reporter Interface

- **New file**: `src/js/reporters.js` (~120 lines)
- Abstract contract:
  - `onTestStart(format, config)`
  - `onProgress(percentage, message, completedIterations, totalIterations)`
  - `onIterationComplete(iconType, iterationData)`
  - `onTestComplete(results, duration)`
  - `onError(error)`
- **DOMReporter** class (implements Reporter):
  - Writes to existing DOM element IDs (`#progressBar`, `#progressText`, `#results`, `#memoryUsage`, etc.)
  - Calls existing HTML-generating methods on StressTestManager for results display
  - Used by suite pages — behavior identical to current
- **StoreReporter** class (implements Reporter):
  - Publishes progress and results to Run State Store
  - No DOM interaction
  - Used by batch runner on index.html

#### Todo 4 — Run State Store

- **New file**: `src/js/run-state.js` (~150 lines)
- In-memory map of active runs keyed by `suiteRunId`
- Methods:
  - `registerRun(suiteRunId, format, runId)` — marks a run as live
  - `updateProgress(suiteRunId, progressData)` — updates in-memory state
  - `completeRun(suiteRunId, runRecord)` — moves to completed, persists to localStorage
  - `getActiveRun(format)` — returns live run state for a format (if any)
  - `onProgressChange(format, callback)` — subscribe to progress for a format
  - `getAllCompleted()` — returns all persisted RunRecords
  - `saveRecord(runRecord)` — persist a single RunRecord
  - `deleteRecords(testResultIds)` — remove records
  - `toggleActive(testResultIds, active)` — flip active flag
  - `getActiveRecords()` — returns all records where `active === true`
  - `importRecords(records)` — bulk insert
- **Storage key**: `iconTestRunRecords` (single JSON array, replaces `iconTestHistory`)
- **Also writes** `iconTestResults_${format}` for latest-per-format (preserves existing suite page read path during transition)
- Cross-tab sync via `storage` event on localStorage (no BroadcastChannel needed; storage events fire cross-tab natively)

#### Todo 5 — Icon Configs Module

- **New file**: `src/js/icon-configs.js` (~200 lines)
- Exports config objects per format:
  - `cssIconConfigs` — 5 configs (Remix Square, Pure CSS, Minimal, Circular CSS, Circular Remix)
  - `svgIconConfigs` — 3 configs (inline-svg, external-svg, optimized-svg) including `svgMarkup` and `src` paths
  - `pngIconConfigs` — 3 configs (standard, 2x, compressed)
  - `gifIconConfigs` — 3 configs (standard, optimized, dithered)
  - `jpegIconConfigs` — 3 configs (q90, q60, q20)
  - `webpIconConfigs` — 3 configs (lossy, lossless, optimized)
  - `avifIconConfigs` — 3 configs (standard, lossless, compressed)
  - `allIconConfigs` — map keyed by format string
- **Requires extracting** inline config definitions from all 7 suite HTML files
- SVG configs include inline `svgMarkup` strings — these move verbatim

---

### Phase 2: Refactor StressTestManager

#### Todo 6 — Inject Reporter into StressTestManager

- **Modify**: `src/js/stress-test-manager.js`
- Constructor accepts `options.reporter` (Reporter instance)
- If no reporter provided, default to a no-op reporter (silent)
- Replace all direct DOM writes with `this.reporter.onProgress(...)`, `this.reporter.onTestComplete(...)`, etc.
- Specifically:
  - `updateProgress()` → `this.reporter.onProgress()`
  - `displayAggregatedResults()` → `this.reporter.onTestComplete()` (DOMReporter calls the existing HTML-generation methods)
  - `updateMemoryDisplay()` → routed through reporter
  - `showProgress()` → routed through reporter
- Remove `setupEventListeners()` — button bindings move to suite pages
- Remove `createTestContainer()` — DOM setup moves to DOMReporter or suite page
- Remove `detectPageFormat()` — format comes from caller
- Remove `loadSavedResults()` — Run State Store handles this
- Remove `?autorun` handling — suite runner handles this
- Remove `postMessage` calls — StoreReporter handles cross-context
- Remove auto-init block at bottom of file
- Keep all: test execution loops, statistical calculation, timing measurement, `calculateStatistics()`, `processBatch()`, `generateBulkIcons()`, `measureNetworkOverhead()`, all math/stats methods
- Accept `format` and `iconConfigs` in constructor options (from icon-configs module)

#### Todo 7 — DOMReporter Implementation Detail

- Lives in `src/js/reporters.js` (from Todo 3)
- `onProgress(pct, msg)` → writes to `#progressBar`, `#progressText`, `#progressPercent` (existing IDs)
- `onTestComplete(results, sortedResults, duration, startedAt)` → calls HTML-generation methods that currently live in StressTestManager (`generateStatisticalAnalysisTable`, `generateDetailedAnalysis`), writes to `#results`
- **These HTML-generation methods should remain on StressTestManager** and DOMReporter calls them via a reference to the manager instance
- This keeps the rendering logic co-located with the stats logic

---

### Phase 3: Suite Runner Wrapper

#### Todo 8 — Suite Runner Module

- **New file**: `src/js/suite-runner.js` (~120 lines)
- `runSuite(format, testType, { runId, reporter })` → returns `RunHandle`
- Steps:
  1. Generate `suiteRunId` via ID helper
  2. Use `runId` from caller (batch passes shared; suite page generates its own)
  3. Look up `iconConfigs` from icon-configs module
  4. Create `StressTestManager` instance with `{ iconConfigs, format, reporter }`
  5. Register run with Run State Store
  6. Call `manager.startStressTest()` (awaitable)
  7. On completion: create RunRecord, save via Run State Store, resolve RunHandle
- `cancelSuite(handle)` → calls `manager.stopTest()`

#### Todo 9 — Run Handle

- **New file**: `src/js/run-handle.js` (~80 lines)
- Properties: `runId`, `suiteRunId`, `format`, `startTime`, `status`
- Methods:
  - `getProgress()` → returns `{ percentage, message, completed, total }`
  - `onProgress(callback)` → subscribe
  - `done` → Promise resolving `{ runRecord }`
  - `getResult()` → returns RunRecord after done
  - `cancel()` → triggers stop

---

### Phase 4: Wire Suite Pages

#### Todo 10 — Update Suite Pages

- **Modify**: `css.html`, `svg.html`, `png.html`, `gif.html`, `jpeg.html`, `webp.html`, `avif.html` (7 files)
- Remove inline `iconConfigs` definitions → import from `icon-configs.js`
- Remove `window.__stressTestManagerInit` flag pattern
- Remove direct `new StressTestManager()` calls
- New page-level script:
  1. Import `DOMReporter`, `suiteRunner`, `runStateStore`, format configs
  2. On "Start Test" button click: `runSuite(format, testType, { reporter: new DOMReporter() })`
  3. On page load: check `runStateStore.getActiveRun(format)` — if active, attach DOMReporter to live progress; if completed, render saved results
  4. Subscribe to `runStateStore.onProgressChange(format)` for cross-tab updates (batch running on another tab)
- **No `?autorun` handling on suite pages** — batch runs suites directly via suite-runner, not by loading pages
- Tab switching logic (testing/rendering tabs) stays as-is
- ~40 lines changed per page

#### Todo 11 — Handle ?autorun Removal

- Remove `?autorun` URL parameter handling from `stress-test-manager.js` `setupEventListeners()`
- Batch runner no longer loads suite pages — it calls `runSuite()` directly
- Cross-tab visibility comes from Run State Store, not from the page being loaded

---

### Phase 5: Batch Runner (No Iframes)

#### Todo 12 — Rewrite Index.html Batch Runner (Keep Existing UI)

- **Modify**: `src/index.html`
- **Remove**: iframe element, all iframe-related code, `postMessage` listeners
- **Preserve exactly**: progress bars, ETA, elapsed timer, pills, status text, controls, and cards — no visual or behavioral changes to the batch progress UI
- **Execution model**:
  1. Import `suiteRunner`, `StoreReporter`, `runIdHelper`
  2. On "Run Selected": generate one `runId`
  3. For each selected suite (sequentially):
     - `const handle = runSuite(format, testType, { runId })`
     - Subscribe to `handle.onProgress(snapshot)` and drive the **existing** progress bars, ETA, and elapsed timer directly from the progress snapshot — no new estimation logic, the snapshot is the single source of truth
     - Update pill to "running"
     - `await handle.done`
     - Update pill to "done"
  4. On finish: update status text
  5. Stop button: `handle.cancel()` stops the current suite
- **Progress origin**: all progress and completion events originate from the suite runner via `StoreReporter` → `RunStateStore`, not iframe messaging
- **Cross-tab requirement**: if a suite is running via batch, opening that suite's page in another tab must attach to the active run via `RunStateStore` and show identical progress/results as if the user had initiated the run locally on that page
- **UI**: no visual changes — checkboxes, test type dropdown, start/stop buttons, progress bars, ETA, elapsed timer, suite pills all stay as-is
- Cards section stays unchanged

---

### Phase 6: Results Library

#### Todo 13 — Results Library Page

- **Rename**: `src/past-results.html` → `src/results-library.html`
- **Major rewrite** using Tabulator (CDN: `https://cdn.jsdelivr.net/npm/tabulator-tables/dist/js/tabulator.min.js` + CSS)
- Page structure:
  - Header with nav (back to index, link to summary)
  - Import button (file input) with "Make all imported active" checkbox
  - Tabulator table
  - Details panel below table (shown on row click)
  - Bulk action bar (Export Selected, Delete Selected, Toggle Active, Clear All)

#### Todo 14 — Tabulator Table Configuration

- Columns:
  - `active` — checkbox (editable, triggers `toggleActive` in Run State Store)
  - `format` — text, uppercase, filterable
  - `testType` — from `testConfiguration.testType`, filterable
  - `startTime` — datetime, sortable
  - `durationMs` — formatted as seconds, sortable
  - `iterations` — numeric, sortable
  - `source` — "local" | "imported", filterable
  - `importedFileName` — text (shown if imported), filterable
  - `runId` — text, first 8 chars, copyable
  - `fastestIcon` — derived from `performanceRanking[0].iconType`
- Pagination: 25 rows per page
- Row selection: checkbox column, "Select All" header checkbox (selects all matching current filter, not just current page)
- Row click → populate details panel

#### Todo 15 — Details Panel

- Displays on row click:
  - Full run metadata (runId, suiteRunId, testResultId, format, source, importedFileName)
  - Test configuration details
  - System/browser info
  - Performance ranking table (icon type, avg time, CI, std dev)
  - Statistical analysis summary
- Export single run button
- Toggle active button
- Delete button

#### Todo 16 — Bulk Operations

- **Export Selected**: gather selected RunRecords, wrap in export envelope, download JSON
- **Delete Selected**: remove from Run State Store, refresh table
- **Toggle Active**: flip `active` on selected records, refresh table
- **Clear All History**: confirm dialog, wipe `iconTestRunRecords` from localStorage, refresh
- **Import**: file input accepts `.json`, calls `normalizeImportedRecord()` per record, sets `source: "imported"`, sets `importedFileName` to uploaded file's name, saves via Run State Store, refreshes table. Option checkbox: "Set all imported as active"

---

### Phase 7: Summary Dashboard

#### Todo 17 — Wire Active Runs into Summary

- **Modify**: `src/summary.html` — `loadResults()` method
- Change data source: `runStateStore.getActiveRecords()` instead of reading raw localStorage keys
- Group by format, pick latest per format (or aggregate — keep current behavior)
- All charts, tables, statistical analysis driven by active-only records

#### Todo 18 — Update Summary Exports

- JSON export: include `runId`, `suiteRunId`, `startTime`, `endTime`, `durationMs`, `testResultId` per format
- Keep cross-format comparison logic (fastest per format, memory comparison vs CSS baseline)
- CSV export: add columns for new fields

---

### Phase 8: Navigation & i18n

#### Todo 19 — Update Navigation Links

- All pages: "Past Results" → "Results Library"
- Update `href` from `past-results.html` to `results-library.html`
- Files to update: `index.html`, `summary.html`, `css.html`, `svg.html`, `png.html`, `gif.html`, `jpeg.html`, `webp.html`, `avif.html`
- Update locale files in `src/locales/*.json` — rename relevant keys

---

### Phase 9: Tests

#### Todo 20 — New Module Tests

- `tests/run-id.test.js` — uniqueness, format
- `tests/run-state.test.js` — register, update, complete, persist, retrieve, delete, toggle active, import
- `tests/suite-runner.test.js` — run lifecycle, RunHandle contract, cancel
- `tests/reporters.test.js` — DOMReporter writes to DOM, StoreReporter publishes to store

#### Todo 21 — Updated Page Tests

- `tests/results-library.test.js` — replaces `past-results.test.js`: table renders, pagination, sort, filter, active toggle, details panel, bulk ops, import/export
- Update `tests/index.test.js` — batch runner without iframe, nav link update
- Update `tests/summary.test.js` — active-only filtering
- Update `tests/stress-test-manager.test.js` — reporter injection, no DOM coupling, no auto-init
- Update `tests/css.test.js` and `tests/format-pages.test.js` — new init pattern

#### Todo 22 — Remove Old Test Artifacts

- Delete `tests/past-results.test.js` (replaced by `results-library.test.js`)

---

### Phase 10: Verification Checklist

- [ ] Suite run started on suite page produces full results with all RunRecord fields
- [ ] Batch run on index.html runs all suites sequentially, no iframe, pills update correctly
- [ ] During batch, opening suite page in another tab shows live progress via Run State Store
- [ ] Batch-produced results appear on suite page without rerunning
- [ ] Results Library: Tabulator table loads, paginated, sortable, filterable
- [ ] Results Library: active checkbox toggles and persists
- [ ] Results Library: row click shows details panel
- [ ] Results Library: bulk select (all filtered), export, delete, toggle active work
- [ ] Results Library: import reads JSON, normalizes to RunRecord, saves importedFileName, appears in table
- [ ] Summary dashboard shows only active runs
- [ ] Export JSON includes all RunRecord fields
- [ ] Import → export round-trip preserves all fields
- [ ] No existing result fields missing from new runs
- [ ] All Playwright tests pass across 3 browsers

---

## New Files Summary

| File | Purpose | Est. Lines |
| --- | --- | --- |
| `src/js/run-id.js` | ID generation | ~30 |
| `src/js/run-record.js` | RunRecord factory & normalizer | ~60 |
| `src/js/reporters.js` | Reporter interface, DOMReporter, StoreReporter | ~120 |
| `src/js/run-state.js` | Shared run state store (memory + localStorage) | ~150 |
| `src/js/icon-configs.js` | Extracted icon configurations for all 7 formats | ~200 |
| `src/js/suite-runner.js` | Suite runner wrapper, returns RunHandle | ~120 |
| `src/js/run-handle.js` | RunHandle contract (progress, done, cancel) | ~80 |
| `src/results-library.html` | New Results Library page (replaces past-results.html) | ~500 |

## Modified Files Summary

| File | Change Scope |
| --- | --- |
| `src/js/stress-test-manager.js` | Major: inject reporter, remove DOM coupling, remove auto-init, accept format/configs |
| `src/index.html` | Major: rewrite batch runner (remove iframe + postMessage, use suite-runner + StoreReporter, preserve existing batch progress UI exactly) |
| `src/summary.html` | Medium: load from Run State Store active records, update exports |
| `src/css.html` | Medium: use icon-configs + suite-runner + DOMReporter |
| `src/svg.html` | Medium: same pattern |
| `src/png.html` | Medium: same pattern |
| `src/gif.html` | Medium: same pattern |
| `src/jpeg.html` | Medium: same pattern |
| `src/webp.html` | Medium: same pattern |
| `src/avif.html` | Medium: same pattern |
| `src/locales/*.json` | Minor: rename "Past Results" → "Results Library" keys |

## CDN Dependencies Added

| Library | URL | Purpose |
| --- | --- | --- |
| Tabulator | `https://cdn.jsdelivr.net/npm/tabulator-tables/dist/js/tabulator.min.js` | Results Library table |
| Tabulator CSS | `https://cdn.jsdelivr.net/npm/tabulator-tables/dist/css/tabulator.min.css` | Results Library table styles |

## Estimated Total

- **New code**: ~1,260 lines across 8 new files
- **Modified code**: ~800 lines across 12+ files
- **Tests**: ~400 lines new/updated
- **Total**: ~2,400 lines
