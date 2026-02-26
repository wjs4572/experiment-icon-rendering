/**
 * run-record.js — RunRecord schema factory and import normalizer
 *
 * Every persisted test result is a RunRecord (schemaVersion 2).
 * Provides:
 *   createRunRecord(fields)              – build a valid RunRecord with defaults
 *   normalizeImportedRecord(raw, fileName) – map imported JSON → RunRecord
 */

'use strict';

const SCHEMA_VERSION = 2;

const VALID_FORMATS = ['css', 'svg', 'png', 'gif', 'jpeg', 'webp', 'avif'];
const VALID_SOURCES = ['local', 'imported'];

/**
 * Create a RunRecord from provided fields, filling in defaults for missing values.
 * @param {Object} fields – Partial RunRecord data.
 * @returns {Object} A complete RunRecord.
 */
function createRunRecord(fields = {}) {
    if (fields.format && !VALID_FORMATS.includes(fields.format)) {
        throw new Error(`Invalid format: "${fields.format}". Must be one of: ${VALID_FORMATS.join(', ')}`);
    }
    if (fields.source && !VALID_SOURCES.includes(fields.source)) {
        throw new Error(`Invalid source: "${fields.source}". Must be one of: ${VALID_SOURCES.join(', ')}`);
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        testResultId:   fields.testResultId   || window.RunId.generateTestResultId(),
        runId:          fields.runId          || window.RunId.generateRunId(),
        suiteRunId:     fields.suiteRunId     || window.RunId.generateSuiteRunId(),

        format:           fields.format           || 'css',
        source:           fields.source           || 'local',
        importedFileName: fields.importedFileName || null,
        active:           fields.active !== undefined ? fields.active : true,

        startTime:  fields.startTime  || null,
        endTime:    fields.endTime    || null,
        durationMs: fields.durationMs || null,

        // Legacy compat field
        testType:     fields.testType     || null,
        iterations:   fields.iterations   || null,
        testDuration: fields.testDuration || null,

        results:              fields.results              || {},
        statisticalAnalysis:  fields.statisticalAnalysis  || {},
        performanceRanking:   fields.performanceRanking   || [],
        testMetadata:         fields.testMetadata         || {},
        testConfiguration:    fields.testConfiguration    || {},
        systemSpecifications: fields.systemSpecifications || {}
    };
}

/**
 * Normalize an externally imported JSON object into a RunRecord.
 * Sets source to "imported" and records the originating file name.
 *
 * If the imported data already has a schemaVersion === SCHEMA_VERSION it is
 * treated as a previously-exported RunRecord and only IDs/source are overridden.
 *
 * @param {Object} raw       – Raw JSON from an imported file.
 * @param {string} fileName  – Name of the uploaded file.
 * @returns {Object} A valid RunRecord.
 */
function normalizeImportedRecord(raw, fileName) {
    const record = createRunRecord({
        // Preserve original IDs if present, but always mint a new testResultId
        testResultId:   window.RunId.generateTestResultId(),
        runId:          raw.runId          || window.RunId.generateRunId(),
        suiteRunId:     raw.suiteRunId     || window.RunId.generateSuiteRunId(),

        format:           raw.format           || null,
        source:           'imported',
        importedFileName: fileName,
        active:           raw.active !== undefined ? raw.active : true,

        startTime:  raw.startTime  || raw.testStartedAt || null,
        endTime:    raw.endTime    || raw.testCompletedAt || null,
        durationMs: raw.durationMs || (raw.testDurationSeconds ? raw.testDurationSeconds * 1000 : null),

        testType:     raw.testType     || (raw.testConfiguration && raw.testConfiguration.testType) || null,
        iterations:   raw.iterations   || (raw.testConfiguration && raw.testConfiguration.iterations) || null,
        testDuration: raw.testDuration || null,

        results:              raw.results              || {},
        statisticalAnalysis:  raw.statisticalAnalysis  || {},
        performanceRanking:   raw.performanceRanking   || [],
        testMetadata:         raw.testMetadata         || {},
        testConfiguration:    raw.testConfiguration    || {},
        systemSpecifications: raw.systemSpecifications || {}
    });

    return record;
}

// Expose globally
window.RunRecord = Object.freeze({
    SCHEMA_VERSION,
    VALID_FORMATS,
    VALID_SOURCES,
    createRunRecord,
    normalizeImportedRecord
});
