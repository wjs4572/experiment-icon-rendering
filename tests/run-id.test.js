// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — run-id.js (src/js/run-id.js)
 * Tests ID generation: format, uniqueness, and prefix scoping.
 */

const HARNESS = 'test-harness.html';

test.describe('RunId Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(HARNESS);
        await page.waitForFunction(() => window.__harnessReady === true);
    });

    test.describe('Global Exposure', () => {
        test('window.RunId is an object', async ({ page }) => {
            const type = await page.evaluate(() => typeof window.RunId);
            expect(type).toBe('object');
        });

        test('RunId is frozen (immutable)', async ({ page }) => {
            const frozen = await page.evaluate(() => Object.isFrozen(window.RunId));
            expect(frozen).toBe(true);
        });

        test('RunId exposes exactly three functions', async ({ page }) => {
            const keys = await page.evaluate(() => Object.keys(window.RunId).sort());
            expect(keys).toEqual(['generateRunId', 'generateSuiteRunId', 'generateTestResultId']);
        });
    });

    test.describe('generateRunId', () => {
        test('returns a string starting with "run_"', async ({ page }) => {
            const id = await page.evaluate(() => window.RunId.generateRunId());
            expect(id).toMatch(/^run_/);
        });

        test('follows prefix_timestamp_random format', async ({ page }) => {
            const id = await page.evaluate(() => window.RunId.generateRunId());
            const parts = id.split('_');
            expect(parts.length).toBe(3);
            expect(parts[0]).toBe('run');
            expect(parts[1].length).toBeGreaterThan(0);
            expect(parts[2].length).toBeGreaterThan(0);
        });

        test('generates unique IDs on consecutive calls', async ({ page }) => {
            const ids = await page.evaluate(() => {
                const set = new Set();
                for (let i = 0; i < 100; i++) {
                    set.add(window.RunId.generateRunId());
                }
                return set.size;
            });
            expect(ids).toBe(100);
        });
    });

    test.describe('generateSuiteRunId', () => {
        test('returns a string starting with "suite_"', async ({ page }) => {
            const id = await page.evaluate(() => window.RunId.generateSuiteRunId());
            expect(id).toMatch(/^suite_/);
        });

        test('follows prefix_timestamp_random format', async ({ page }) => {
            const id = await page.evaluate(() => window.RunId.generateSuiteRunId());
            const parts = id.split('_');
            expect(parts.length).toBe(3);
            expect(parts[0]).toBe('suite');
        });

        test('generates unique IDs on consecutive calls', async ({ page }) => {
            const ids = await page.evaluate(() => {
                const set = new Set();
                for (let i = 0; i < 100; i++) {
                    set.add(window.RunId.generateSuiteRunId());
                }
                return set.size;
            });
            expect(ids).toBe(100);
        });
    });

    test.describe('generateTestResultId', () => {
        test('returns a string starting with "tr_"', async ({ page }) => {
            const id = await page.evaluate(() => window.RunId.generateTestResultId());
            expect(id).toMatch(/^tr_/);
        });

        test('follows prefix_timestamp_random format', async ({ page }) => {
            const id = await page.evaluate(() => window.RunId.generateTestResultId());
            const parts = id.split('_');
            expect(parts.length).toBe(3);
            expect(parts[0]).toBe('tr');
        });

        test('generates unique IDs on consecutive calls', async ({ page }) => {
            const ids = await page.evaluate(() => {
                const set = new Set();
                for (let i = 0; i < 100; i++) {
                    set.add(window.RunId.generateTestResultId());
                }
                return set.size;
            });
            expect(ids).toBe(100);
        });
    });

    test.describe('Cross-prefix uniqueness', () => {
        test('IDs from different generators do not collide', async ({ page }) => {
            const ids = await page.evaluate(() => {
                const all = [];
                for (let i = 0; i < 50; i++) {
                    all.push(window.RunId.generateRunId());
                    all.push(window.RunId.generateSuiteRunId());
                    all.push(window.RunId.generateTestResultId());
                }
                return { total: all.length, unique: new Set(all).size };
            });
            expect(ids.unique).toBe(ids.total);
        });
    });
});
