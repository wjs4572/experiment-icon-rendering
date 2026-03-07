// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — SuiteRunner + RunHandle (src/js/suite-runner.js, src/js/run-handle.js)
 * Phase 9 / Todo 20: run lifecycle, RunHandle contract, cancel
 */

test.describe('SuiteRunner Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('css.html');
    await page.waitForLoadState('domcontentloaded');
    // Allow sufficient time for all scripts to execute on slower browsers (WebKit)
    await page.waitForFunction(() => window.SuiteRunner && window.RunHandle, { timeout: 15000 });
  });

  /* ─── Global Exposure ──────────────────────────────────── */

  test('window.SuiteRunner is a frozen object', async ({ page }) => {
    const frozen = await page.evaluate(() => Object.isFrozen(window.SuiteRunner));
    expect(frozen).toBe(true);
  });

  test('SuiteRunner exposes runSuite and cancelSuite', async ({ page }) => {
    const keys = await page.evaluate(() => Object.keys(window.SuiteRunner).sort());
    expect(keys).toEqual(['cancelSuite', 'runSuite']);
  });

  test('runSuite and cancelSuite are functions', async ({ page }) => {
    const types = await page.evaluate(() => ({
      runSuite: typeof window.SuiteRunner.runSuite,
      cancelSuite: typeof window.SuiteRunner.cancelSuite
    }));
    expect(types.runSuite).toBe('function');
    expect(types.cancelSuite).toBe('function');
  });

  /* ─── RunHandle Contract ───────────────────────────────── */

  test.describe('RunHandle Contract', () => {
    test('RunHandle can be constructed with required properties', async ({ page }) => {
      const props = await page.evaluate(() => {
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({ runId: 'r1', suiteRunId: 's1', format: 'css' });
        return {
          runId: h.runId,
          suiteRunId: h.suiteRunId,
          format: h.format,
          hasStartTime: typeof h.startTime === 'string',
          hasDone: h.done instanceof Promise
        };
      });
      expect(props.runId).toBe('r1');
      expect(props.suiteRunId).toBe('s1');
      expect(props.format).toBe('css');
      expect(props.hasStartTime).toBe(true);
      expect(props.hasDone).toBe(true);
    });

    test('RunHandle initial status is running', async ({ page }) => {
      const status = await page.evaluate(() => {
        const { RunHandle } = window.RunHandle;
        return new RunHandle({ runId: 'r', suiteRunId: 's', format: 'css' }).status;
      });
      expect(status).toBe('running');
    });

    test('RUN_STATUS constants are frozen', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { RUN_STATUS } = window.RunHandle;
        return {
          frozen: Object.isFrozen(RUN_STATUS),
          pending: RUN_STATUS.PENDING,
          running: RUN_STATUS.RUNNING,
          completed: RUN_STATUS.COMPLETED,
          cancelled: RUN_STATUS.CANCELLED,
          error: RUN_STATUS.ERROR
        };
      });
      expect(result.frozen).toBe(true);
      expect(result.pending).toBe('pending');
      expect(result.running).toBe('running');
      expect(result.completed).toBe('completed');
      expect(result.cancelled).toBe('cancelled');
      expect(result.error).toBe('error');
    });

    test('getProgress returns initial snapshot', async ({ page }) => {
      const progress = await page.evaluate(() => {
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({ runId: 'r', suiteRunId: 's', format: 'css' });
        return h.getProgress();
      });
      expect(progress.percentage).toBe(0);
      expect(progress.message).toBe('Starting...');
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
    });

    test('onProgress subscribes and fires on _updateProgress', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({ runId: 'r', suiteRunId: 's', format: 'css' });
        let captured = null;
        h.onProgress((p) => { captured = p; });
        h._updateProgress({ percentage: 50, message: 'halfway', completedIterations: 25, totalIterations: 50 });
        return { captured, current: h.getProgress() };
      });
      expect(result.captured.percentage).toBe(50);
      expect(result.captured.message).toBe('halfway');
      expect(result.captured.completed).toBe(25);
      expect(result.captured.total).toBe(50);
      expect(result.current.percentage).toBe(50);
    });

    test('onProgress returns an unsubscribe function', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({ runId: 'r', suiteRunId: 's', format: 'css' });
        let callCount = 0;
        const unsub = h.onProgress(() => { callCount++; });
        h._updateProgress({ percentage: 10 });
        unsub();
        h._updateProgress({ percentage: 20 });
        return callCount;
      });
      expect(result).toBe(1);
    });

    test('cancel changes status to cancelled', async ({ page }) => {
      const result = await page.evaluate(() => {
        let cancelCalled = false;
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({
          runId: 'r', suiteRunId: 's', format: 'css',
          cancelFn: () => { cancelCalled = true; }
        });
        h.cancel();
        return { status: h.status, cancelCalled };
      });
      expect(result.status).toBe('cancelled');
      expect(result.cancelCalled).toBe(true);
    });

    test('cancel is a no-op after first call', async ({ page }) => {
      const callCount = await page.evaluate(() => {
        let count = 0;
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({
          runId: 'r', suiteRunId: 's', format: 'css',
          cancelFn: () => { count++; }
        });
        h.cancel();
        h.cancel();
        return count;
      });
      expect(callCount).toBe(1);
    });

    test('_complete resolves done promise with runRecord', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({ runId: 'r', suiteRunId: 's', format: 'css' });
        const mockRecord = { testResultId: 'tr_1', format: 'css' };
        h._complete(mockRecord);
        const outcome = await h.done;
        return {
          status: h.status,
          getResult: h.getResult(),
          doneValue: outcome
        };
      });
      expect(result.status).toBe('completed');
      expect(result.getResult.testResultId).toBe('tr_1');
      expect(result.doneValue.runRecord.testResultId).toBe('tr_1');
    });

    test('_fail rejects done promise', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { RunHandle } = window.RunHandle;
        const h = new RunHandle({ runId: 'r', suiteRunId: 's', format: 'css' });
        h._fail(new Error('test error'));
        try {
          await h.done;
          return { status: h.status, rejected: false };
        } catch (e) {
          return { status: h.status, rejected: true, message: e.message };
        }
      });
      expect(result.status).toBe('error');
      expect(result.rejected).toBe(true);
      expect(result.message).toBe('test error');
    });
  });

  /* ─── runSuite Lifecycle ───────────────────────────────── */

  test.describe('runSuite', () => {
    test('throws for unknown format', async ({ page }) => {
      const threw = await page.evaluate(() => {
        try {
          window.SuiteRunner.runSuite('nonexistent', 'bulk');
          return false;
        } catch (e) {
          return e.message.includes('Unknown format');
        }
      });
      expect(threw).toBe(true);
    });

    test('returns a RunHandle with correct format and IDs', async ({ page }) => {
      // Start a suite and immediately cancel to avoid running a full test
      const result = await page.evaluate(() => {
        const handle = window.SuiteRunner.runSuite('css', 'bulk');
        const props = {
          format: handle.format,
          status: handle.status,
          hasRunId: typeof handle.runId === 'string' && handle.runId.startsWith('run_'),
          hasSuiteRunId: typeof handle.suiteRunId === 'string' && handle.suiteRunId.startsWith('suite_'),
          hasStartTime: typeof handle.startTime === 'string',
          hasDone: handle.done instanceof Promise
        };
        handle.cancel();
        return props;
      });
      expect(result.format).toBe('css');
      expect(result.status).toBe('running');
      expect(result.hasRunId).toBe(true);
      expect(result.hasSuiteRunId).toBe(true);
      expect(result.hasStartTime).toBe(true);
      expect(result.hasDone).toBe(true);
    });

    test('uses caller-supplied runId when provided', async ({ page }) => {
      const runId = await page.evaluate(() => {
        const handle = window.SuiteRunner.runSuite('css', 'bulk', { runId: 'run_custom_123' });
        const id = handle.runId;
        handle.cancel();
        return id;
      });
      expect(runId).toBe('run_custom_123');
    });

    test('auto-generates runId when not provided', async ({ page }) => {
      const runId = await page.evaluate(() => {
        const handle = window.SuiteRunner.runSuite('css', 'bulk');
        const id = handle.runId;
        handle.cancel();
        return id;
      });
      expect(runId).toMatch(/^run_/);
    });

    test('registers run with RunStateStore', async ({ page }) => {
      const activeRun = await page.evaluate(() => {
        const handle = window.SuiteRunner.runSuite('css', 'bulk');
        const run = window.RunStateStore.getActiveRun('css');
        handle.cancel();
        return run;
      });
      expect(activeRun).not.toBeNull();
      expect(activeRun.format).toBe('css');
    });
  });

  /* ─── cancelSuite ──────────────────────────────────────── */

  test.describe('cancelSuite', () => {
    test('cancels a running handle', async ({ page }) => {
      const status = await page.evaluate(() => {
        const handle = window.SuiteRunner.runSuite('css', 'bulk');
        window.SuiteRunner.cancelSuite(handle);
        return handle.status;
      });
      expect(status).toBe('cancelled');
    });

    test('is safe to call with null', async ({ page }) => {
      const threw = await page.evaluate(() => {
        try {
          window.SuiteRunner.cancelSuite(null);
          return false;
        } catch {
          return true;
        }
      });
      expect(threw).toBe(false);
    });
  });
});
