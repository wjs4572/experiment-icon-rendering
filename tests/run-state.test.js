// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — run-state.js (src/js/run-state.js)
 * Tests RunStateStore: active run management, persistence (localStorage),
 * subscriptions (progress/completion), toggleActive, deleteRecords, import.
 */

const HARNESS = 'test-harness.html';

test.describe('RunStateStore Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(HARNESS);
        await page.waitForFunction(() => window.__harnessReady === true);
        // Clean localStorage to isolate each test
        await page.evaluate(() => localStorage.clear());
    });

    test.describe('Global Exposure', () => {
        test('window.RunStateStore is an object (singleton)', async ({ page }) => {
            const type = await page.evaluate(() => typeof window.RunStateStore);
            expect(type).toBe('object');
        });

        test('RunStateStore has expected methods', async ({ page }) => {
            const methods = await page.evaluate(() => {
                const store = window.RunStateStore;
                return [
                    'registerRun', 'updateProgress', 'completeRun', 'getActiveRun',
                    'onProgressChange', 'onCompletion',
                    'getAllCompleted', 'getActiveRecords', 'saveRecord',
                    'deleteRecords', 'toggleActive', 'importRecords'
                ].every(m => typeof store[m] === 'function');
            });
            expect(methods).toBe(true);
        });
    });

    test.describe('Active Run Management', () => {
        test('registerRun makes a run retrievable via getActiveRun', async ({ page }) => {
            const run = await page.evaluate(() => {
                window.RunStateStore.registerRun('suite_a1', 'css', 'run_a1');
                return window.RunStateStore.getActiveRun('css');
            });
            expect(run).not.toBeNull();
            expect(run.suiteRunId).toBe('suite_a1');
            expect(run.format).toBe('css');
            expect(run.runId).toBe('run_a1');
            expect(run.progress.percentage).toBe(0);
        });

        test('getActiveRun returns null for unregistered format', async ({ page }) => {
            const run = await page.evaluate(() =>
                window.RunStateStore.getActiveRun('nonexistent')
            );
            expect(run).toBeNull();
        });

        test('updateProgress updates the progress snapshot', async ({ page }) => {
            const progress = await page.evaluate(() => {
                window.RunStateStore.registerRun('suite_p1', 'svg', 'run_p1');
                window.RunStateStore.updateProgress('suite_p1', {
                    percentage: 45,
                    message: 'Running...',
                    completedIterations: 45,
                    totalIterations: 100
                });
                const run = window.RunStateStore.getActiveRun('svg');
                return run.progress;
            });
            expect(progress.percentage).toBe(45);
            expect(progress.message).toBe('Running...');
            expect(progress.completedIterations).toBe(45);
            expect(progress.totalIterations).toBe(100);
        });

        test('updateProgress is no-op for unknown suiteRunId', async ({ page }) => {
            const ok = await page.evaluate(() => {
                window.RunStateStore.updateProgress('unknown_id', { percentage: 99 });
                return true; // should not throw
            });
            expect(ok).toBe(true);
        });

        test('completeRun removes from active set', async ({ page }) => {
            const run = await page.evaluate(() => {
                window.RunStateStore.registerRun('suite_c1', 'gif', 'run_c1');
                const record = window.RunRecord.createRunRecord({ format: 'gif', suiteRunId: 'suite_c1' });
                window.RunStateStore.completeRun('suite_c1', record);
                return window.RunStateStore.getActiveRun('gif');
            });
            expect(run).toBeNull();
        });

        test('completeRun persists the RunRecord', async ({ page }) => {
            const all = await page.evaluate(() => {
                window.RunStateStore.registerRun('suite_c2', 'png', 'run_c2');
                const record = window.RunRecord.createRunRecord({
                    format: 'png',
                    suiteRunId: 'suite_c2',
                    testResultId: 'tr_persist_test'
                });
                window.RunStateStore.completeRun('suite_c2', record);
                return window.RunStateStore.getAllCompleted();
            });
            expect(all.length).toBe(1);
            expect(all[0].testResultId).toBe('tr_persist_test');
            expect(all[0].format).toBe('png');
        });

        test('completeRun writes latest-per-format key', async ({ page }) => {
            const latest = await page.evaluate(() => {
                window.RunStateStore.registerRun('suite_l1', 'jpeg', 'run_l1');
                const record = window.RunRecord.createRunRecord({ format: 'jpeg', suiteRunId: 'suite_l1' });
                window.RunStateStore.completeRun('suite_l1', record);
                const raw = localStorage.getItem('iconTestResults_jpeg');
                return raw ? JSON.parse(raw) : null;
            });
            expect(latest).not.toBeNull();
            expect(latest.format).toBe('jpeg');
        });
    });

    test.describe('Subscriptions', () => {
        test('onProgressChange fires callback on updateProgress', async ({ page }) => {
            const received = await page.evaluate(() => {
                return new Promise(resolve => {
                    window.RunStateStore.registerRun('suite_sub1', 'webp', 'run_sub1');
                    window.RunStateStore.onProgressChange('webp', (runState) => {
                        resolve(runState.progress);
                    });
                    window.RunStateStore.updateProgress('suite_sub1', {
                        percentage: 33,
                        message: 'One third'
                    });
                });
            });
            expect(received.percentage).toBe(33);
            expect(received.message).toBe('One third');
        });

        test('onProgressChange returns an unsubscribe function', async ({ page }) => {
            const callCount = await page.evaluate(() => {
                let count = 0;
                window.RunStateStore.registerRun('suite_unsub', 'avif', 'run_unsub');
                const unsub = window.RunStateStore.onProgressChange('avif', () => { count++; });
                window.RunStateStore.updateProgress('suite_unsub', { percentage: 10 });
                unsub();
                window.RunStateStore.updateProgress('suite_unsub', { percentage: 20 });
                return count;
            });
            expect(callCount).toBe(1);
        });

        test('onCompletion fires callback on completeRun', async ({ page }) => {
            const received = await page.evaluate(() => {
                return new Promise(resolve => {
                    window.RunStateStore.onCompletion('css', (record) => {
                        resolve(record.format);
                    });
                    window.RunStateStore.registerRun('suite_comp1', 'css', 'run_comp1');
                    const record = window.RunRecord.createRunRecord({ format: 'css', suiteRunId: 'suite_comp1' });
                    window.RunStateStore.completeRun('suite_comp1', record);
                });
            });
            expect(received).toBe('css');
        });

        test('onCompletion returns an unsubscribe function', async ({ page }) => {
            const callCount = await page.evaluate(() => {
                let count = 0;
                const unsub = window.RunStateStore.onCompletion('svg', () => { count++; });
                
                window.RunStateStore.registerRun('suite_cunsub1', 'svg', 'run_cunsub1');
                const rec1 = window.RunRecord.createRunRecord({ format: 'svg', suiteRunId: 'suite_cunsub1' });
                window.RunStateStore.completeRun('suite_cunsub1', rec1);
                
                unsub();
                
                window.RunStateStore.registerRun('suite_cunsub2', 'svg', 'run_cunsub2');
                const rec2 = window.RunRecord.createRunRecord({ format: 'svg', suiteRunId: 'suite_cunsub2' });
                window.RunStateStore.completeRun('suite_cunsub2', rec2);
                
                return count;
            });
            expect(callCount).toBe(1);
        });
    });

    test.describe('Persisted Records (localStorage)', () => {
        test('getAllCompleted returns empty array when no records', async ({ page }) => {
            const records = await page.evaluate(() => window.RunStateStore.getAllCompleted());
            expect(records).toEqual([]);
        });

        test('saveRecord appends to store', async ({ page }) => {
            const count = await page.evaluate(() => {
                const r1 = window.RunRecord.createRunRecord({ format: 'css', testResultId: 'tr_s1' });
                const r2 = window.RunRecord.createRunRecord({ format: 'svg', testResultId: 'tr_s2' });
                window.RunStateStore.saveRecord(r1);
                window.RunStateStore.saveRecord(r2);
                return window.RunStateStore.getAllCompleted().length;
            });
            expect(count).toBe(2);
        });

        test('getActiveRecords returns only active=true records', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ format: 'css', testResultId: 'tr_act', active: true })
                );
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ format: 'svg', testResultId: 'tr_inact', active: false })
                );
                const active = window.RunStateStore.getActiveRecords();
                return { total: window.RunStateStore.getAllCompleted().length, active: active.length };
            });
            expect(result.total).toBe(2);
            expect(result.active).toBe(1);
        });

        test('deleteRecords removes specified records by testResultId', async ({ page }) => {
            const remaining = await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_del1' })
                );
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_del2' })
                );
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_keep' })
                );
                window.RunStateStore.deleteRecords(['tr_del1', 'tr_del2']);
                return window.RunStateStore.getAllCompleted();
            });
            expect(remaining.length).toBe(1);
            expect(remaining[0].testResultId).toBe('tr_keep');
        });

        test('toggleActive flips active flag on specified records', async ({ page }) => {
            const result = await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_tog1', active: true })
                );
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_tog2', active: true })
                );
                window.RunStateStore.toggleActive(['tr_tog1'], false);
                const all = window.RunStateStore.getAllCompleted();
                return {
                    tog1: all.find(r => r.testResultId === 'tr_tog1').active,
                    tog2: all.find(r => r.testResultId === 'tr_tog2').active
                };
            });
            expect(result.tog1).toBe(false);
            expect(result.tog2).toBe(true);
        });

        test('toggleActive can reactivate records', async ({ page }) => {
            const active = await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_react', active: false })
                );
                window.RunStateStore.toggleActive(['tr_react'], true);
                return window.RunStateStore.getAllCompleted()[0].active;
            });
            expect(active).toBe(true);
        });

        test('importRecords merges with existing records', async ({ page }) => {
            const count = await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_existing' })
                );
                const imports = [
                    window.RunRecord.createRunRecord({ testResultId: 'tr_imp1', source: 'imported' }),
                    window.RunRecord.createRunRecord({ testResultId: 'tr_imp2', source: 'imported' })
                ];
                window.RunStateStore.importRecords(imports);
                return window.RunStateStore.getAllCompleted().length;
            });
            expect(count).toBe(3);
        });
    });

    test.describe('localStorage persistence', () => {
        test('records survive page reload', async ({ page }) => {
            await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_persist', format: 'css' })
                );
            });

            // Reload the page
            await page.reload();
            await page.waitForFunction(() => window.__harnessReady === true);

            const count = await page.evaluate(() =>
                window.RunStateStore.getAllCompleted().length
            );
            expect(count).toBe(1);
        });

        test('deleted records stay deleted after reload', async ({ page }) => {
            await page.evaluate(() => {
                window.RunStateStore.saveRecord(
                    window.RunRecord.createRunRecord({ testResultId: 'tr_gone' })
                );
                window.RunStateStore.deleteRecords(['tr_gone']);
            });

            await page.reload();
            await page.waitForFunction(() => window.__harnessReady === true);

            const count = await page.evaluate(() =>
                window.RunStateStore.getAllCompleted().length
            );
            expect(count).toBe(0);
        });
    });
});
