/**
 * run-id.js — Unique ID generation for test runs
 *
 * Three scopes:
 *   runId         – shared across all suites in a single batch (or unique per local run)
 *   suiteRunId    – unique per suite execution within a run
 *   testResultId  – unique per stored RunRecord
 *
 * Format: <prefix>_<timestamp-base36>_<random-suffix>
 * No external dependencies.
 */

'use strict';

function _id(prefix) {
    const ts  = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${ts}_${rnd}`;
}

function generateRunId() {
    return _id('run');
}

function generateSuiteRunId() {
    return _id('suite');
}

function generateTestResultId() {
    return _id('tr');
}

// Expose globally for non-module <script> consumers
window.RunId = Object.freeze({
    generateRunId,
    generateSuiteRunId,
    generateTestResultId
});
