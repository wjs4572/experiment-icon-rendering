// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — run-record.js (src/js/run-record.js)
 * Tests RunRecord factory, normalizer, schema validation, and edge cases.
 */

const HARNESS = 'test-harness.html';

test.describe('RunRecord Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(HARNESS);
        await page.waitForFunction(() => window.__harnessReady === true);
    });

    test.describe('Global Exposure', () => {
        test('window.RunRecord is an object', async ({ page }) => {
            const type = await page.evaluate(() => typeof window.RunRecord);
            expect(type).toBe('object');
        });

        test('RunRecord is frozen (immutable)', async ({ page }) => {
            const frozen = await page.evaluate(() => Object.isFrozen(window.RunRecord));
            expect(frozen).toBe(true);
        });

        test('exposes expected API surface', async ({ page }) => {
            const keys = await page.evaluate(() => Object.keys(window.RunRecord).sort());
            expect(keys).toEqual([
                'SCHEMA_VERSION',
                'VALID_FORMATS',
                'VALID_SOURCES',
                'createRunRecord',
                'normalizeImportedRecord'
            ]);
        });

        test('SCHEMA_VERSION is 2', async ({ page }) => {
            const v = await page.evaluate(() => window.RunRecord.SCHEMA_VERSION);
            expect(v).toBe(2);
        });

        test('VALID_FORMATS contains all 7 formats', async ({ page }) => {
            const formats = await page.evaluate(() => [...window.RunRecord.VALID_FORMATS]);
            expect(formats).toEqual(['css', 'svg', 'png', 'gif', 'jpeg', 'webp', 'avif']);
        });

        test('VALID_SOURCES contains local and imported', async ({ page }) => {
            const sources = await page.evaluate(() => [...window.RunRecord.VALID_SOURCES]);
            expect(sources).toEqual(['local', 'imported']);
        });
    });

    test.describe('createRunRecord — defaults', () => {
        test('returns an object with schemaVersion 2', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.schemaVersion).toBe(2);
        });

        test('generates IDs automatically', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.testResultId).toMatch(/^tr_/);
            expect(rec.runId).toMatch(/^run_/);
            expect(rec.suiteRunId).toMatch(/^suite_/);
        });

        test('defaults format to css', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.format).toBe('css');
        });

        test('defaults source to local', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.source).toBe('local');
        });

        test('defaults active to true', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.active).toBe(true);
        });

        test('defaults importedFileName to null', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.importedFileName).toBeNull();
        });

        test('defaults time fields to null', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.startTime).toBeNull();
            expect(rec.endTime).toBeNull();
            expect(rec.durationMs).toBeNull();
        });

        test('defaults results to empty object', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.results).toEqual({});
        });

        test('defaults collections to empty', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord());
            expect(rec.statisticalAnalysis).toEqual({});
            expect(rec.performanceRanking).toEqual([]);
            expect(rec.testMetadata).toEqual({});
            expect(rec.testConfiguration).toEqual({});
            expect(rec.systemSpecifications).toEqual({});
        });
    });

    test.describe('createRunRecord — with fields', () => {
        test('accepts explicit format', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.createRunRecord({ format: 'svg' })
            );
            expect(rec.format).toBe('svg');
        });

        test('accepts explicit IDs', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.createRunRecord({
                    testResultId: 'tr_custom',
                    runId: 'run_custom',
                    suiteRunId: 'suite_custom'
                })
            );
            expect(rec.testResultId).toBe('tr_custom');
            expect(rec.runId).toBe('run_custom');
            expect(rec.suiteRunId).toBe('suite_custom');
        });

        test('accepts source "imported"', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.createRunRecord({ source: 'imported', importedFileName: 'foo.json' })
            );
            expect(rec.source).toBe('imported');
            expect(rec.importedFileName).toBe('foo.json');
        });

        test('accepts active = false', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.createRunRecord({ active: false })
            );
            expect(rec.active).toBe(false);
        });

        test('preserves results data', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.createRunRecord({ results: { icon1: { renderTime: 42 } } })
            );
            expect(rec.results.icon1.renderTime).toBe(42);
        });

        test('preserves time fields', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.createRunRecord({
                    startTime: '2026-01-01T00:00:00Z',
                    endTime: '2026-01-01T00:01:00Z',
                    durationMs: 60000
                })
            );
            expect(rec.startTime).toBe('2026-01-01T00:00:00Z');
            expect(rec.endTime).toBe('2026-01-01T00:01:00Z');
            expect(rec.durationMs).toBe(60000);
        });
    });

    test.describe('createRunRecord — validation', () => {
        test('throws on invalid format', async ({ page }) => {
            const error = await page.evaluate(() => {
                try {
                    window.RunRecord.createRunRecord({ format: 'bmp' });
                    return null;
                } catch (e) {
                    return e.message;
                }
            });
            expect(error).toContain('Invalid format');
            expect(error).toContain('bmp');
        });

        test('throws on invalid source', async ({ page }) => {
            const error = await page.evaluate(() => {
                try {
                    window.RunRecord.createRunRecord({ source: 'cloud' });
                    return null;
                } catch (e) {
                    return e.message;
                }
            });
            expect(error).toContain('Invalid source');
            expect(error).toContain('cloud');
        });

        test('does not throw when format is omitted', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord({}));
            expect(rec.format).toBe('css');
        });

        test('does not throw when source is omitted', async ({ page }) => {
            const rec = await page.evaluate(() => window.RunRecord.createRunRecord({}));
            expect(rec.source).toBe('local');
        });
    });

    test.describe('normalizeImportedRecord', () => {
        test('sets source to imported', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord({}, 'data.json')
            );
            expect(rec.source).toBe('imported');
        });

        test('records the imported file name', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord({}, 'results-2026-01-01.json')
            );
            expect(rec.importedFileName).toBe('results-2026-01-01.json');
        });

        test('generates a new testResultId (ignores raw.testResultId)', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord(
                    { testResultId: 'tr_old_id' },
                    'data.json'
                )
            );
            expect(rec.testResultId).toMatch(/^tr_/);
            expect(rec.testResultId).not.toBe('tr_old_id');
        });

        test('preserves existing runId if present', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord(
                    { runId: 'run_original' },
                    'data.json'
                )
            );
            expect(rec.runId).toBe('run_original');
        });

        test('maps testStartedAt to startTime', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord(
                    { testStartedAt: '2026-01-01T00:00:00Z' },
                    'data.json'
                )
            );
            expect(rec.startTime).toBe('2026-01-01T00:00:00Z');
        });

        test('maps testDurationSeconds to durationMs', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord(
                    { testDurationSeconds: 4.2 },
                    'data.json'
                )
            );
            expect(rec.durationMs).toBe(4200);
        });

        test('extracts testType from testConfiguration if not top-level', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord(
                    { testConfiguration: { testType: 'stress', iterations: 500 } },
                    'data.json'
                )
            );
            expect(rec.testType).toBe('stress');
            expect(rec.iterations).toBe(500);
        });

        test('produces a complete RunRecord with all required fields', async ({ page }) => {
            const rec = await page.evaluate(() =>
                window.RunRecord.normalizeImportedRecord(
                    { format: 'png', results: { icon1: {} } },
                    'test.json'
                )
            );
            expect(rec.schemaVersion).toBe(2);
            expect(rec.format).toBe('png');
            expect(rec.source).toBe('imported');
            expect(rec.importedFileName).toBe('test.json');
            expect(rec.active).toBe(true);
            expect(rec.results).toEqual({ icon1: {} });
        });
    });
});
