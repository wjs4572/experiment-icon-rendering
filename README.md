# Icon Rendering Performance Test

An academic research tool for comparing icon rendering performance across formats (CSS, SVG, PNG, GIF, JPEG, WebP, AVIF) and implementation methods. The project uses a plain-HTML/CSS/JS interface for in-browser performance measurement, with a Playwright regression test suite to guard against functional regressions during development.

---

## Table of Contents

- [Icon Rendering Performance Test](#icon-rendering-performance-test)
  - [Table of Contents](#table-of-contents)
  - [About This Project](#about-this-project)
  - [Quick Start](#quick-start)
  - [Commands Reference](#commands-reference)
  - [Development Server](#development-server)
  - [CSS Build](#css-build)
  - [Testing — Full Suite](#testing--full-suite)
  - [Testing — Quick \& Commit](#testing--quick--commit)
    - [Quick](#quick)
    - [Smart Commit Testing](#smart-commit-testing)
  - [Testing — Browser-Specific](#testing--browser-specific)
  - [Testing — Format-Specific](#testing--format-specific)
  - [Testing — Interactive \& Debug](#testing--interactive--debug)
  - [Utilities](#utilities)
  - [Build Pipeline](#build-pipeline)
    - [Step 1 — (One-time) Install](#step-1--one-time-install)
    - [Step 2 — (When needed) Rebuild CSS](#step-2--when-needed-rebuild-css)
    - [Step 3 — Start the Dev Server](#step-3--start-the-dev-server)
    - [Step 4 — Make Changes \& Validate](#step-4--make-changes--validate)
    - [Step 5 — Full Suite Verification](#step-5--full-suite-verification)
    - [Step 6 — Commit](#step-6--commit)
    - [Step 7 — Clean Up Artifacts](#step-7--clean-up-artifacts)
  - [Testing Architecture](#testing-architecture)
    - [Experimental Performance Testing](#experimental-performance-testing)
    - [Regression Testing (Playwright)](#regression-testing-playwright)
      - [Test Organization](#test-organization)
      - [Smart Commit Rotation](#smart-commit-rotation)
  - [Internationalization (i18n)](#internationalization-i18n)
  - [Browser-Specific Notes](#browser-specific-notes)
    - [WebKit on Windows](#webkit-on-windows)
    - [Port 3000 Already in Use](#port-3000-already-in-use)
    - [Common Failures](#common-failures)
  - [Project Structure](#project-structure)
  - [Licensing](#licensing)
  - [Contributing](#contributing)
    - [Adding a New Icon Format](#adding-a-new-icon-format)
    - [General Workflow](#general-workflow)
    - [Guidelines](#guidelines)

---

## About This Project

The goal is to measure and compare rendering performance across icon formats:

| Format | Category | Notes |
| -------- | ---------- | ------- |
| **CSS** | CSS | Icons defined purely with CSS (gradients, shapes) |
| **SVG** | Vector | Source of truth for all generated image formats |
| **PNG** | Raster | Portable Network Graphics |
| **GIF** | Raster | Graphics Interchange Format |
| **JPEG** | Raster | Joint Photographic Experts Group |
| **WebP** | Raster | Modern compressed raster |
| **AVIF** | Raster | AV1 Image File Format (modern) |

**Implementation philosophy:**

- **Plain HTML, CSS, and JavaScript** for the icon interface — no frameworks, no build overhead
- **Node.js tooling** (Playwright, http-server, Tailwind CLI) for testing and CSS generation
- **Focused on raw performance** — experimental results are collected in-browser with JS `performance` APIs
- **Comprehensive Playwright regression tests** for functional reliability across Chromium, Firefox, and WebKit

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/wjs4572/experiment-icon-rendering.git
cd experiment-icon-rendering

# 2. Install Node dependencies and Playwright browsers
npm install
npm run test:install

# 3. Start the development server
npm run serve
# → http://localhost:3000

# 4. Run the regression tests
npm test
```

---

## Commands Reference

The table below lists every npm script. Click a **Category** link to jump to the detailed section for that group.

| Command | Category | Description |
| --------- | ---------- | ------------- |
| `npm run serve` | [Development Server](#development-server) | Serve `src/` on port 3000 with CORS |
| `npm run build:css` | [CSS Build](#css-build) | Compile Tailwind CSS once |
| `npm run watch:css` | [CSS Build](#css-build) | Compile Tailwind CSS and watch for changes |
| `npm test` | [Testing — Full Suite](#testing--full-suite) | All tests, HTML + line reporter |
| `npm run test:full` | [Testing — Full Suite](#testing--full-suite) | Alias for `npm test` |
| `npm run test:report` | [Testing — Full Suite](#testing--full-suite) | Open the last HTML report |
| `npm run test:install` | [Testing — Full Suite](#testing--full-suite) | Install Playwright browsers |
| `npm run test:quick` | [Testing — Quick & Commit](#testing--quick--commit) | Core tests only (fast) |
| `npm run test:commit` | [Testing — Quick & Commit](#testing--quick--commit) | Smart rotation — tests changed areas |
| `npm run test:commit:dry` | [Testing — Quick & Commit](#testing--quick--commit) | Show what commit tests would run (dry run) |
| `npm run test:rotation` | [Testing — Quick & Commit](#testing--quick--commit) | Force full rotation through all subsets |
| `npm run test:status` | [Testing — Quick & Commit](#testing--quick--commit) | Show rotation coverage across recent commits |
| `npm run test:browser:chrome` | [Testing — Browser-Specific](#testing--browser-specific) | Chromium only |
| `npm run test:browser:firefox` | [Testing — Browser-Specific](#testing--browser-specific) | Firefox only |
| `npm run test:browser:webkit` | [Testing — Browser-Specific](#testing--browser-specific) | WebKit (Safari engine) only |
| `npm run test:format:json` | [Testing — Format-Specific](#testing--format-specific) | JSON / GeoJSON format tests |
| `npm run test:format:css` | [Testing — Format-Specific](#testing--format-specific) | CSS / JS format tests |
| `npm run test:format:images` | [Testing — Format-Specific](#testing--format-specific) | PNG / JPG / GIF raster tests |
| `npm run test:format:vector` | [Testing — Format-Specific](#testing--format-specific) | SVG / AVIF / WebP vector & modern tests |
| `npm run test:headed` | [Testing — Interactive & Debug](#testing--interactive--debug) | Run tests with visible browser windows |
| `npm run test:ui` | [Testing — Interactive & Debug](#testing--interactive--debug) | Open Playwright interactive test UI |
| `npm run clean` | [Utilities](#utilities) | Remove test artifacts and output files |

---

## Development Server

```bash
npm run serve
```

Launches `npx http-server src -p 3000 --cors`. The `src/` directory is served statically at `http://localhost:3000`.

**Details:**

- **Port**: 3000
- **CORS**: Enabled (required for fetch calls between pages)
- **Auto-start**: Playwright automatically starts this server before running tests (configured in `playwright.config.js`), so you only need to run it manually during interactive development

**Changing the port:**
Update both the `serve` script in `package.json` and the `baseURL` in `playwright.config.js`.

---

## CSS Build

Tailwind CSS source lives in `src/css/tailwind.src.css`. The compiled output (`src/css/tailwind.css`) is committed to the repo — you only need to rebuild when you change the source.

```bash
# Build once
npm run build:css

# Build and watch for changes during active development
npm run watch:css
```

The CLI used is `@tailwindcss/cli` (v4). Both commands run:

```bash
npx @tailwindcss/cli -i ./src/css/tailwind.src.css -o ./src/css/tailwind.css [--watch]
```

---

## Testing — Full Suite

```bash
npm test
# or
npm run test:full
```

Runs all Playwright regression tests across Chromium, Firefox, and WebKit with HTML + line reporters.

**What happens:**

1. Playwright auto-starts the HTTP server (port 3000) if it isn't running
2. All test files in `tests/` are executed in parallel (2 workers)
3. Failed tests are retried once
4. Results are written to `playwright-report/index.html`

**After a failure, view the report:**

```bash
npm run test:report
```

**Install browsers** (first time or after updating Playwright):

```bash
npm run test:install
# → npx playwright install
```

---

## Testing — Quick & Commit

These commands run smaller, targeted subsets of the regression suite for faster feedback during development.

### Quick

```bash
npm run test:quick
```

Runs `tests/index.test.js` and `tests/summary.test.js` — the core navigation and interface tests. Useful for a fast sanity check after minor changes.

### Smart Commit Testing

```bash
npm run test:commit
```

The recommended pre-commit check. `scripts/commit-tests.js` inspects your working tree, maps changed files to relevant test suites, and runs those tests plus one rotating subset for broader coverage.

- **Typical scope**: 54–162 tests
- **Duration**: 1–3 minutes
- **Reports**: Written to `commit-reports/latest-commit-results.json` and `commit-reports/latest-commit-summary.md`

```bash
# See what would run without executing
npm run test:commit:dry

# Force a full rotation pass (all subsets run sequentially)
npm run test:rotation

# Show which subsets have been covered across recent commits
npm run test:status
```

**Pre-commit hook:**

`scripts/pre-commit` is a git hook that runs `npm run test:commit` automatically when you run `git commit`. If tests fail the commit is blocked. Bypass with:

```bash
git commit --no-verify   # use with caution
```

---

## Testing — Browser-Specific

Run the full test suite against a single browser engine:

```bash
npm run test:browser:chrome    # Chromium
npm run test:browser:firefox   # Firefox
npm run test:browser:webkit    # WebKit (Safari engine)
```

Each command passes `--project=<engine>` to Playwright. Useful for isolating browser-specific failures.

> **WebKit on Windows** requires specific stability flags to prevent crashes — see [Browser-Specific Notes](#browser-specific-notes).

---

## Testing — Format-Specific

Run tests scoped to a particular icon format category:

```bash
npm run test:format:json      # tests/json.test.js + tests/geojson.test.js
npm run test:format:css       # tests/css.test.js + tests/js.test.js
npm run test:format:images    # tests/png.test.js + tests/jpg.test.js + tests/gif.test.js
npm run test:format:vector    # tests/svg.test.js + tests/avif.test.js + tests/webp.test.js
```

Use these when you have changed a specific format page or its supporting code and want targeted feedback before running the full suite.

---

## Testing — Interactive & Debug

```bash
# Show browser windows during test execution (useful for debugging failures)
npm run test:headed

# Open Playwright's graphical test runner
npm run test:ui
```

`test:ui` launches the Playwright UI mode — a browser-based interface that lets you run individual tests, inspect steps, view traces, and replay failures interactively.

---

## Utilities

```bash
npm run clean
```

Runs `scripts/clean.js`, which removes generated/output files that should not be committed:

| What gets removed | Pattern |
| ------------------- | --------- |
| `playwright-report/` directory | (entire folder) |
| `test-results/` directory | (entire folder) |
| Root-level test output files | `test-*.txt`, `test-*.log` |
| Full test output files | `full-test-output*.txt` |
| Tail output files | `tail-output*.txt` |
| Browser-specific output files | `webkit-*.txt`, `firefox-*.txt` |
| Any `.log` files in project root | `*.log` |

Files that are locked by a running process (EBUSY) are skipped with a warning — close open editor tabs or processes holding those files and re-run.

---

## Build Pipeline

The standard development workflow from scratch to committed change:

### Step 1 — (One-time) Install

```bash
npm install
npm run test:install
```

### Step 2 — (When needed) Rebuild CSS

If you have changed `src/css/tailwind.src.css`:

```bash
npm run build:css
```

Or keep a watcher running alongside your editor:

```bash
npm run watch:css
```

### Step 3 — Start the Dev Server

For interactive development in the browser:

```bash
npm run serve
# → http://localhost:3000
```

Playwright starts this automatically during test runs, so this step is only required for manual browser work.

### Step 4 — Make Changes & Validate

Run the fast change-aware tests while iterating:

```bash
npm run test:commit
```

Repeat until green.

### Step 5 — Full Suite Verification

Before merging or pushing, run the entire regression suite:

```bash
npm test
```

All browsers, all tests. Check `playwright-report/` on failure.

### Step 6 — Commit

```bash
git add -A
git commit -m "feat: description of change"
# Pre-commit hook runs test:commit automatically
```

Bypass the hook (only if tests were already verified):

```bash
git commit --no-verify
```

### Step 7 — Clean Up Artifacts

```bash
npm run clean
```

---

## Testing Architecture

The project uses **two distinct systems** for two different purposes.

### Experimental Performance Testing

| Property | Detail |
| ---------- | -------- |
| **Purpose** | Measure and compare actual icon rendering times across formats |
| **Technology** | JS `performance` APIs in the browser |
| **Entry point** | `http://localhost:3000` |
| **Data collected** | Load times, memory usage, rendering metrics |
| **Storage** | JSON export files with timestamped measurements + system specs |
| **Browsers** | Single browser at a time (results are browser-specific) |

Performance data is collected interactively through the browser interface. Results include a `systemSpecifications` section capturing:

- Auto-detected browser info (user agent, platform, hardware concurrency, screen details)
- Manual system specs (CPU, memory, GPU, storage, network)
- Metadata (tool used, timestamp, completeness)

Use **Belarc Advisor** (free, [belarc.com](https://www.belarc.com/free_download.html)) to collect comprehensive hardware specs for reproducibility documentation.

> **Important**: Experimental results are browser-specific. Relative comparisons between formats are consistent across similar systems, but absolute values differ by hardware and browser engine.

### Regression Testing (Playwright)

| Property | Detail |
| ---------- | -------- |
| **Purpose** | Prevent functional regressions during development |
| **Technology** | Playwright v1.40.0 |
| **Browsers** | Chromium, Firefox, WebKit |
| **Total tests** | ~1497 across all suites |
| **Parallelism** | 2 workers |
| **Retries** | 1 retry per failed test |
| **Reports** | HTML (`playwright-report/`) + JSON (`commit-reports/`) |

#### Test Organization

| Subset | Tests | Coverage |
| -------- | ------- | ---------- |
| Core Functionality | ~54 | Navigation, index, summary pages |
| Data Formats | ~87 | JSON, GeoJSON processing |
| Raster Images | ~81 | PNG, JPG, GIF, WebP |
| Vector / Modern | ~81 | SVG, AVIF, ICO |
| Cross-Browser | ~90 | Multi-browser compatibility |

#### Smart Commit Rotation

`npm run test:commit` maintains a `.test-rotation.json` state file to track which subsets have run recently, ensuring full coverage over time without running all ~1497 tests on every commit.

---

## Internationalization (i18n)

All pages support 12 locale variants with automatic browser language detection.

**Supported locales:**

| Code | Language |
| ------ | ---------- |
| `en`, `en-us`, `en-gb` | English |
| `es` | Spanish (Español) |
| `fr` | French (Français) |
| `de` | German (Deutsch) |
| `ja` | Japanese (日本語) |
| `zh`, `zh-tw` | Chinese (中文) |
| `pt`, `pt-br`, `pt-pt` | Portuguese (Português) |

**Features:**

- Automatic detection from `navigator.language`
- Persistent selection across pages and sessions (localStorage)
- Real-time switching without page reload
- WCAG-compliant language selector in the top-right corner of every page
- Falls back to English for any missing key

**File structure:**

```bash
src/
├── locales/
│   ├── en.json          # English (default, fully verified)
│   ├── es.json          # Spanish
│   ├── fr.json          # French
│   ├── de.json          # German
│   ├── ja.json          # Japanese
│   ├── zh.json          # Chinese (Simplified)
│   ├── zh-tw.json       # Chinese (Traditional)
│   ├── pt.json          # Portuguese
│   ├── pt-br.json       # Portuguese (Brazil)
│   ├── pt-pt.json       # Portuguese (Portugal)
│   └── verification.json  # Key tracking & verification status
└── js/
    └── i18n.js          # Internationalization system
```

---

## Browser-Specific Notes

### WebKit on Windows

WebKit requires additional launch flags to prevent process crashes during parallel test execution. These are configured in `playwright.config.js`:

```javascript
launchOptions: {
  args: [
    '--disable-accelerated-compositing',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-dev-shm-usage',
    '--no-startup-window',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--disable-plugins',
    '--no-sandbox',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--single-process',
    '--disable-background-media-suspend'
  ],
  handleSIGTERM: false,
  handleSIGINT: false
}
```

**Impact on test results:** WebKit tests use software rendering only (`--disable-gpu`). Performance measurements from WebKit reflect this configured environment, not default Safari behavior.

### Port 3000 Already in Use

```powershell
# Windows — find the process using port 3000
netstat -no | findstr :3000
```

Or update both the `serve` script in `package.json` and `baseURL` in `playwright.config.js` to use a different port.

### Common Failures

| Symptom | Likely Cause | Fix |
| --------- | ------------- | ----- |
| Tests pass locally, fail in CI | Server not running at port 3000 | Verify `webServer` config in `playwright.config.js` |
| WebKit crash (exit code 3221225477) | Missing stability flags | Check `launchOptions` in `playwright.config.js` |
| EBUSY on `npm run clean` | Output file open in editor or process | Close the file/tab and re-run |

---

## Project Structure

```text
format_rendering/
├── src/                          # Icon rendering interface (served at localhost:3000)
│   ├── index.html               # Main entry point — run tests, batch progress
│   ├── summary.html             # Aggregate results, statistical analysis
│   ├── results-library.html     # Browse, filter, manage all run records
│   ├── {format}.html           # Per-format test pages (css, svg, png, gif, jpeg, webp, avif)
│   ├── css/
│   │   ├── tailwind.src.css    # Tailwind source (edit this)
│   │   └── tailwind.css        # Compiled output (committed, regenerated by build:css)
│   ├── js/
│   │   ├── i18n.js             # Internationalization system
│   │   └── run-state.js        # Cross-tab run state via BroadcastChannel + localStorage
│   ├── locales/                # Translation JSON files (12 locale variants)
│   └── data/
│       ├── index.json          # Manifest of available data files for Results Library loader
│       └── *.json              # Example / sample performance datasets
├── tests/                       # Playwright regression test suites
│   ├── index.test.js           # Core navigation tests
│   ├── summary.test.js         # Summary page tests
│   ├── results-library.test.js # Results Library tests
│   ├── format-pages.test.js    # All 7 format page tests
│   ├── i18n.test.js            # Internationalization tests
│   ├── suite-runner.test.js    # SuiteRunner module tests
│   ├── run-record.test.js      # RunRecord module tests
│   ├── run-state.test.js       # RunState module tests
│   └── stress-test-manager.test.js
├── scripts/
│   ├── commit-tests.js         # Smart commit rotation logic
│   ├── clean.js                # Artifact cleanup
│   └── pre-commit              # Git pre-commit hook
├── commit-reports/             # Auto-generated commit test reports
│   ├── latest-commit-results.json
│   └── latest-commit-summary.md
├── playwright.config.js         # Playwright configuration
├── package.json                 # Scripts and dependencies
└── .gitignore
```

---

## Licensing

This project uses dual licensing:

| Asset type | License |
| ------------ | --------- |
| Software code (HTML, CSS, JS) | [BSD-3-Clause](LICENSE-BSD3) |
| Data, results & documentation | [CC BY 4.0](LICENSE-CC-BY-4.0) |

Research data and performance measurements shared under CC BY 4.0 require attribution.

---

## Contributing

### Adding a New Icon Format

1. Create `src/{format}.html` following the existing format page pattern
2. Add the format to `src/index.html` batch runner and `src/summary.html` comparisons
3. Add corresponding `tests/{format}.test.js` Playwright tests
4. Update `src/data/index.json` if adding sample data files

### General Workflow

1. Make changes
2. `npm run test:commit` — validate affected tests pass
3. `npm run build:css` — if you changed `tailwind.src.css`
4. `npm test` — full validation before merging
5. `git add -A && git commit -m "type: description"`

### Guidelines

- Match existing test patterns in `tests/` for consistency
- Include both positive and negative test cases
- All user-visible strings must have i18n keys in all 12 locale files
- Add new keys to `src/locales/verification.json` and mark non-English as unverified
- Include `commit-reports/` output in your commits (it is tracked)
- Document experimental performance findings with system specifications

---

*Licensed BSD-3-Clause (code) / CC BY 4.0 (data & docs). See LICENSE files for details.*
