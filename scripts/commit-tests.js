#!/usr/bin/env node
/**
 * Change-Aware Commit Testing with Rotation Coverage
 *
 * Two complementary strategies ensure both fast feedback and full coverage:
 *
 *   1. REGRESSION (default) — detects staged/unstaged changes and runs only the
 *      test files mapped to those source files.  Fast (<3 min typical).
 *
 *   2. ROTATION — ensures every test file is exercised within a rolling window
 *      of N commits.  Each run picks the "coldest" files (longest since last
 *      execution) and appends them to the regression set.  Tracked in
 *      scripts/.test-rotation.json.
 *
 * Usage:
 *   node scripts/commit-tests.js              # regression + rotation top-up
 *   node scripts/commit-tests.js --all        # run entire suite
 *   node scripts/commit-tests.js --dry        # show which tests would run
 *   node scripts/commit-tests.js --regression # regression only, no rotation
 *   node scripts/commit-tests.js --rotation   # rotation only, no regression
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Source → Test mapping ────────────────────────────────────────────
// Each key is a minimatch-style prefix (matched with startsWith).
// Values are arrays of test files that cover that source area.
const SOURCE_TO_TESTS = {
  // HTML pages
  'src/index.html':        ['tests/index.test.js'],
  'src/summary.html':      ['tests/summary.test.js'],
  'src/css.html':          ['tests/css.test.js', 'tests/stress-test-manager.test.js'],
  'src/past-results.html': ['tests/past-results.test.js'],
  'src/svg.html':          ['tests/format-pages.test.js'],
  'src/png.html':          ['tests/format-pages.test.js'],
  'src/gif.html':          ['tests/format-pages.test.js'],
  'src/jpeg.html':         ['tests/format-pages.test.js'],
  'src/webp.html':         ['tests/format-pages.test.js'],
  'src/avif.html':         ['tests/format-pages.test.js'],

  // JS modules
  'src/js/i18n.js':                ['tests/i18n.test.js', 'tests/i18n-selectors.test.js', 'tests/i18n-locale.test.js'],
  'src/js/system-specs.js':        ['tests/system-specs.test.js'],
  'src/js/stress-test-manager.js': ['tests/stress-test-manager.test.js', 'tests/css.test.js'],

  // Locale files → i18n tests
  'src/locales/': ['tests/i18n.test.js', 'tests/i18n-selectors.test.js', 'tests/i18n-locale.test.js'],

  // Test infrastructure changes → run everything
  'playwright.config':     ['__ALL__'],
  'tests/global.d.ts':     ['__ALL__'],
  'jsconfig.json':         ['__ALL__'],
  'package.json':          ['__ALL__'],
};

// Smoke tests when nothing specific matches (quick sanity check)
const SMOKE_TESTS = ['tests/index.test.js', 'tests/summary.test.js'];

// Complete inventory of all test files (rotation draws from this)
const ALL_TEST_FILES = [
  'tests/index.test.js',
  'tests/summary.test.js',
  'tests/css.test.js',
  'tests/format-pages.test.js',
  'tests/past-results.test.js',
  'tests/i18n.test.js',
  'tests/i18n-selectors.test.js',
  'tests/i18n-locale.test.js',
  'tests/system-specs.test.js',
  'tests/stress-test-manager.test.js',
];

// How many "cold" test files to add per commit via rotation
const ROTATION_BATCH_SIZE = 2;

// Path to the rotation state file
const ROTATION_FILE = path.join(__dirname, '.test-rotation.json');

// ── Helpers ──────────────────────────────────────────────────────────

/** Get list of staged + unstaged changed files relative to repo root */
function getChangedFiles() {
  try {
    // Staged files
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' }).trim();
    // Unstaged tracked files
    const unstaged = execSync('git diff --name-only', { encoding: 'utf8' }).trim();
    const all = `${staged}\n${unstaged}`.split('\n').filter(Boolean);
    return [...new Set(all)]; // deduplicate
  } catch {
    console.warn('⚠️  Could not detect changed files (not a git repo?). Running smoke tests.');
    return [];
  }
}

/** Map a list of changed source paths to the minimal set of test files */
function resolveTests(changedFiles) {
  const testSet = new Set();

  for (const file of changedFiles) {
    // Normalize to forward slashes
    const normalized = file.replace(/\\/g, '/');

    // If a test file itself was changed, include it directly
    if (normalized.startsWith('tests/') && normalized.endsWith('.test.js')) {
      testSet.add(normalized);
      continue;
    }

    // Walk the mapping
    let matched = false;
    for (const [prefix, tests] of Object.entries(SOURCE_TO_TESTS)) {
      if (normalized.startsWith(prefix)) {
        matched = true;
        for (const t of tests) {
          if (t === '__ALL__') return null; // sentinel: run everything
          testSet.add(t);
        }
      }
    }

    // Unrecognized source file — no extra tests needed
    if (!matched) {
      console.log(`   ℹ️  No test mapping for: ${normalized}`);
    }
  }

  return testSet.size > 0 ? [...testSet] : null;
}

/** Run Playwright with the given test file list (null = all) */
function runPlaywright(testFiles) {
  let command = 'npx playwright test';
  if (testFiles) {
    command += ' ' + testFiles.join(' ');
  }
  command += ' --reporter=line';

  const cwd = path.join(__dirname, '..');
  console.log(`\n💻  ${command}\n`);

  try {
    execSync(command, { cwd, stdio: 'inherit', timeout: 10 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

// ── Rotation tracking ────────────────────────────────────────────────

/** Load rotation state from disk */
function loadRotation() {
  try {
    if (fs.existsSync(ROTATION_FILE)) {
      return JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8'));
    }
  } catch { /* fresh start */ }

  // Default: every file has epoch-0 so all are equally "cold"
  const lastRun = {};
  for (const f of ALL_TEST_FILES) lastRun[f] = 0;
  return { lastRun, commitCount: 0 };
}

/** Persist rotation state */
function saveRotation(state) {
  fs.writeFileSync(ROTATION_FILE, JSON.stringify(state, null, 2) + '\n');
}

/**
 * Pick the N coldest test files that are NOT already in the regression set.
 * "Cold" = longest time since last execution (earliest timestamp).
 */
function pickRotationTests(alreadySelected, count) {
  const state = loadRotation();
  const candidates = ALL_TEST_FILES
    .filter(f => !alreadySelected.includes(f))
    .sort((a, b) => (state.lastRun[a] || 0) - (state.lastRun[b] || 0));

  return candidates.slice(0, count);
}

/** Record that these test files were just executed successfully */
function recordRotation(testFiles) {
  const state = loadRotation();
  const now = Date.now();
  for (const f of testFiles) {
    state.lastRun[f] = now;
  }
  state.commitCount = (state.commitCount || 0) + 1;
  state.lastCommit = new Date().toISOString();
  saveRotation(state);
}

/** Show rotation coverage report */
function showRotationStatus() {
  const state = loadRotation();
  const now = Date.now();
  console.log('\n📊 Rotation coverage:');
  const entries = ALL_TEST_FILES.map(f => {
    const last = state.lastRun[f] || 0;
    const ago = last ? `${Math.round((now - last) / 60000)}m ago` : 'never';
    return { file: f, ago, timestamp: last };
  }).sort((a, b) => a.timestamp - b.timestamp);

  for (const e of entries) {
    const icon = e.timestamp === 0 ? '🔴' : (now - e.timestamp < 3600000 ? '🟢' : '🟡');
    console.log(`   ${icon} ${e.file.padEnd(40)} ${e.ago}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const runAll = args.includes('--all');
  const regressionOnly = args.includes('--regression');
  const rotationOnly = args.includes('--rotation');
  const showStatus = args.includes('--status');

  console.log('🎯 Change-Aware Commit Testing with Rotation Coverage\n');

  // --status: just show rotation state
  if (showStatus) {
    showRotationStatus();
    process.exit(0);
  }

  // --all: run entire suite and record all as exercised
  if (runAll) {
    console.log('📦 Running full test suite (--all flag)\n');
    if (dryRun) { console.log('   [dry run] Would run: ALL tests'); process.exit(0); }
    const passed = runPlaywright(null);
    if (passed) recordRotation(ALL_TEST_FILES);
    process.exit(passed ? 0 : 1);
  }

  // ── Phase 1: Regression tests (change-aware) ───────────────────
  let regressionTests = [];

  if (!rotationOnly) {
    const changed = getChangedFiles();
    if (changed.length === 0) {
      console.log('📭 No changed files detected.');
    } else {
      console.log(`📂 Changed files (${changed.length}):`);
      changed.forEach(f => console.log(`   • ${f}`));

      const resolved = resolveTests(changed);

      // Infrastructure change → run everything
      if (resolved === null && changed.some(f => {
        const n = f.replace(/\\/g, '/');
        return Object.entries(SOURCE_TO_TESTS).some(([p, t]) => n.startsWith(p) && t.includes('__ALL__'));
      })) {
        console.log('\n⚙️  Infrastructure change detected → running full suite');
        if (dryRun) { console.log('   [dry run] Would run: ALL tests'); process.exit(0); }
        const passed = runPlaywright(null);
        if (passed) recordRotation(ALL_TEST_FILES);
        process.exit(passed ? 0 : 1);
      }

      regressionTests = resolved || [];
    }
  }

  // ── Phase 2: Rotation top-up ───────────────────────────────────
  let rotationTests = [];

  if (!regressionOnly) {
    rotationTests = pickRotationTests(regressionTests, ROTATION_BATCH_SIZE);
    if (rotationTests.length > 0) {
      console.log(`\n🔄 Rotation top-up (${rotationTests.length} coldest file${rotationTests.length > 1 ? 's' : ''}):`);
      rotationTests.forEach(t => console.log(`   • ${t}`));
    }
  }

  // ── Combine and run ────────────────────────────────────────────
  const combined = [...new Set([...regressionTests, ...rotationTests])];
  const finalTests = combined.length > 0 ? combined : SMOKE_TESTS;

  const regrLabel = regressionTests.length > 0 ? `${regressionTests.length} regression` : '';
  const rotLabel = rotationTests.length > 0 ? `${rotationTests.length} rotation` : '';
  const smokeLabel = combined.length === 0 ? 'smoke' : '';
  const label = [regrLabel, rotLabel, smokeLabel].filter(Boolean).join(' + ');

  console.log(`\n🧪 Tests to run — ${label} (${finalTests.length} file${finalTests.length > 1 ? 's' : ''}):`);
  finalTests.forEach(t => console.log(`   • ${t}`));

  if (dryRun) {
    showRotationStatus();
    process.exit(0);
  }

  const passed = runPlaywright(finalTests);

  if (passed) {
    recordRotation(finalTests);
    console.log(`\n✅ Commit tests passed! (${finalTests.length} test file(s) — ${label})`);
    showRotationStatus();
    process.exit(0);
  } else {
    console.log(`\n❌ Commit tests failed.`);
    console.log('🔍 Fix failures before committing, or run "npm test" for full diagnostics.');
    process.exit(1);
  }
}

main();