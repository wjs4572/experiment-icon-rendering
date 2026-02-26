// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — reporters.js (src/js/reporters.js)
 * Tests NoopReporter (no-op contract), DOMReporter (DOM writes),
 * and StoreReporter (RunStateStore integration).
 */

const HARNESS = 'test-harness.html';

test.describe('Reporters Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(HARNESS);
        await page.waitForFunction(() => window.__harnessReady === true);
    });

    test.describe('Global Exposure', () => {
        test('window.Reporters is an object', async ({ page }) => {
            const type = await page.evaluate(() => typeof window.Reporters);
            expect(type).toBe('object');
        });

        test('Reporters is frozen (immutable)', async ({ page }) => {
            const frozen = await page.evaluate(() => Object.isFrozen(window.Reporters));
            expect(frozen).toBe(true);
        });

        test('exposes NoopReporter, DOMReporter, StoreReporter', async ({ page }) => {
            const keys = await page.evaluate(() => Object.keys(window.Reporters).sort());
            expect(keys).toEqual(['DOMReporter', 'NoopReporter', 'StoreReporter']);
        });
    });

    test.describe('NoopReporter', () => {
        test('can be instantiated', async ({ page }) => {
            const ok = await page.evaluate(() => {
                const r = new window.Reporters.NoopReporter();
                return r !== null && typeof r === 'object';
            });
            expect(ok).toBe(true);
        });

        test('all methods are callable and return undefined', async ({ page }) => {
            const results = await page.evaluate(() => {
                const r = new window.Reporters.NoopReporter();
                return {
                    onTestStart:         r.onTestStart('css', {}) === undefined,
                    onProgress:          r.onProgress(50, 'half', 25, 50) === undefined,
                    onIterationComplete: r.onIterationComplete('icon1', {}) === undefined,
                    onTestComplete:      r.onTestComplete({}, 4.2) === undefined,
                    onError:             r.onError(new Error('test')) === undefined
                };
            });
            expect(results.onTestStart).toBe(true);
            expect(results.onProgress).toBe(true);
            expect(results.onIterationComplete).toBe(true);
            expect(results.onTestComplete).toBe(true);
            expect(results.onError).toBe(true);
        });
    });

    test.describe('DOMReporter', () => {
        test('can be instantiated without options', async ({ page }) => {
            const ok = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                return r.manager === null;
            });
            expect(ok).toBe(true);
        });

        test('setManager stores manager reference', async ({ page }) => {
            const ok = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                const fakeManager = { name: 'fake' };
                r.setManager(fakeManager);
                return r.manager.name;
            });
            expect(ok).toBe('fake');
        });

        test('onTestStart removes hidden class from progressSection', async ({ page }) => {
            const hidden = await page.evaluate(() => {
                const section = document.getElementById('progressSection');
                section.classList.add('hidden');
                const r = new window.Reporters.DOMReporter();
                r.onTestStart('css', {});
                return section.classList.contains('hidden');
            });
            expect(hidden).toBe(false);
        });

        test('onProgress updates progressBar width', async ({ page }) => {
            const width = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                r.onProgress(75, 'Testing...', 75, 100);
                return document.getElementById('progressBar').style.width;
            });
            expect(width).toBe('75%');
        });

        test('onProgress clamps bar width to 100%', async ({ page }) => {
            const width = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                r.onProgress(110, 'Overflow', 110, 100);
                return document.getElementById('progressBar').style.width;
            });
            expect(width).toBe('100%');
        });

        test('onProgress updates progressPercent text', async ({ page }) => {
            const text = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                r.onProgress(42.7, 'msg', 42, 100);
                return document.getElementById('progressPercent').textContent;
            });
            expect(text).toBe('43%');
        });

        test('onProgress updates progressText with message', async ({ page }) => {
            const text = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                r.onProgress(50, 'Half done', 50, 100);
                return document.getElementById('progressText').textContent;
            });
            expect(text).toBe('Half done');
        });

        test('onTestComplete adds hidden class to progressSection', async ({ page }) => {
            const hidden = await page.evaluate(() => {
                const section = document.getElementById('progressSection');
                section.classList.remove('hidden');
                const r = new window.Reporters.DOMReporter();
                r.onTestComplete({}, 4.2, {});
                return section.classList.contains('hidden');
            });
            expect(hidden).toBe(true);
        });

        test('onError writes error message to progressText', async ({ page }) => {
            const text = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                r.onError(new Error('Something broke'));
                return document.getElementById('progressText').textContent;
            });
            expect(text).toContain('Something broke');
        });

        test('onError adds red text class', async ({ page }) => {
            const hasClass = await page.evaluate(() => {
                const r = new window.Reporters.DOMReporter();
                r.onError(new Error('fail'));
                return document.getElementById('progressText').classList.contains('text-red-500');
            });
            expect(hasClass).toBe(true);
        });

        test('gracefully handles missing DOM elements', async ({ page }) => {
            const ok = await page.evaluate(() => {
                // Remove all progress elements
                ['progressSection', 'progressBar', 'progressText', 'progressPercent'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                const r = new window.Reporters.DOMReporter();
                // These should not throw
                r.onTestStart('css', {});
                r.onProgress(50, 'msg', 50, 100);
                r.onTestComplete({}, 1);
                r.onError(new Error('test'));
                return true;
            });
            expect(ok).toBe(true);
        });
    });

    test.describe('StoreReporter', () => {
        test('can be instantiated with suiteRunId', async ({ page }) => {
            const id = await page.evaluate(() => {
                const r = new window.Reporters.StoreReporter({ suiteRunId: 'suite_test123' });
                return r.suiteRunId;
            });
            expect(id).toBe('suite_test123');
        });

        test('defaults suiteRunId to null', async ({ page }) => {
            const id = await page.evaluate(() => {
                const r = new window.Reporters.StoreReporter();
                return r.suiteRunId;
            });
            expect(id).toBeNull();
        });

        test('onProgress publishes to RunStateStore', async ({ page }) => {
            const progress = await page.evaluate(() => {
                const suiteRunId = 'suite_test_progress';
                // Register a run first
                window.RunStateStore.registerRun(suiteRunId, 'css', 'run_test');
                
                const r = new window.Reporters.StoreReporter({ suiteRunId });
                r.onProgress(60, 'Progress msg', 30, 50);
                
                const run = window.RunStateStore.getActiveRun('css');
                return run ? run.progress : null;
            });
            expect(progress).not.toBeNull();
            expect(progress.percentage).toBe(60);
            expect(progress.message).toBe('Progress msg');
            expect(progress.completedIterations).toBe(30);
            expect(progress.totalIterations).toBe(50);
        });

        test('onProgress calls optional callback', async ({ page }) => {
            const called = await page.evaluate(() => {
                let captured = null;
                const r = new window.Reporters.StoreReporter({
                    suiteRunId: 'suite_cb',
                    onProgressCallback: (snapshot) => { captured = snapshot; }
                });
                // Register run so RunStateStore doesn't skip it
                window.RunStateStore.registerRun('suite_cb', 'svg', 'run_cb');
                r.onProgress(80, 'Almost', 80, 100);
                return captured;
            });
            expect(called).not.toBeNull();
            expect(called.percentage).toBe(80);
            expect(called.message).toBe('Almost');
        });

        test('onError publishes error state to RunStateStore', async ({ page }) => {
            const progress = await page.evaluate(() => {
                const suiteRunId = 'suite_err';
                window.RunStateStore.registerRun(suiteRunId, 'png', 'run_err');
                
                const r = new window.Reporters.StoreReporter({ suiteRunId });
                r.onError(new Error('Boom'));
                
                const run = window.RunStateStore.getActiveRun('png');
                return run ? run.progress : null;
            });
            expect(progress).not.toBeNull();
            expect(progress.percentage).toBe(-1);
            expect(progress.message).toContain('Boom');
            expect(progress.error).toBe(true);
        });

        test('onTestComplete is intentionally a no-op', async ({ page }) => {
            const ok = await page.evaluate(() => {
                const r = new window.Reporters.StoreReporter({ suiteRunId: 'suite_noop' });
                r.onTestComplete({ icon1: {} }, 5.0, {});
                return true; // just verify no error
            });
            expect(ok).toBe(true);
        });
    });
});
