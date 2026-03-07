#!/usr/bin/env node
'use strict';

/**
 * clean.js — remove generated test artefacts
 *
 * Targets:
 *   playwright-report/   Playwright HTML report
 *   test-results/        Playwright trace / failure screenshots
 *   *.txt / *.log        Loose output files dumped to the project root
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DIRS = [
    'playwright-report',
    'test-results',
];

const ROOT_FILE_PATTERNS = [
    /^test-.+\.(txt|log)$/i,      // test-out.txt, test-fix.txt, test-run-*.log …
    /^full-test-output.*\.txt$/i, // full-test-output.txt / full-test-output2.txt
    /^tail-output\.txt$/i,
    /^webkit-.+\.txt$/i,
    /^firefox-.+\.txt$/i,
    /\.log$/i,
];

function matches(name) {
    return ROOT_FILE_PATTERNS.some(rx => rx.test(name));
}

let removed = 0;

// Remove directories
for (const dir of DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
        try {
            fs.rmSync(full, { recursive: true, force: true });
            console.log(`  removed  ${dir}/`);
            removed++;
        } catch (err) {
            console.warn(`  skipped  ${dir}/  (${err.code || err.message})`);
        }
    }
}

// Remove matching root files
for (const entry of fs.readdirSync(ROOT)) {
    const full = path.join(ROOT, entry);
    if (fs.statSync(full).isFile() && matches(entry)) {
        try {
            fs.rmSync(full);
            console.log(`  removed  ${entry}`);
            removed++;
        } catch (err) {
            console.warn(`  skipped  ${entry}  (${err.code || err.message})`);
        }
    }
}

if (removed === 0) {
    console.log('  nothing to clean.');
} else {
    console.log(`\n  ${removed} item(s) removed.`);
}
