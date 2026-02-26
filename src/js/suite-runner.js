/**
 * suite-runner.js — Orchestrates a single suite execution
 *
 * Entry point:
 *   runSuite(format, testType, { runId, reporter }) → RunHandle
 *   cancelSuite(handle) → void
 *
 * Steps:
 *   1. Generate suiteRunId via RunId helper
 *   2. Use caller-supplied runId (batch) or generate one (local)
 *   3. Look up iconConfigs from IconConfigs module
 *   4. Create StressTestManager with { iconConfigs, format, reporter }
 *   5. Register run with RunStateStore
 *   6. Await manager.startStressTest()
 *   7. On completion: create RunRecord, persist via RunStateStore, resolve RunHandle
 *
 * Dependencies (window globals):
 *   RunId, RunRecord, RunStateStore, IconConfigs, StressTestManager, RunHandle, Reporters
 */

'use strict';

/**
 * Launch a suite execution for the given format and test type.
 *
 * @param {string} format   – css | svg | png | gif | jpeg | webp | avif
 * @param {string} testType – e.g. 'bulk', 'quick'
 * @param {Object} [opts]
 * @param {string} [opts.runId]    – Shared runId for batch; auto-generated if omitted
 * @param {Object} [opts.reporter] – Reporter instance; defaults to NoopReporter
 * @returns {RunHandle} A handle to track progress, await completion, or cancel
 */
function runSuite(format, testType, opts = {}) {
    const { RunHandle: RunHandleMod } = window.RunHandle;
    const RunId        = window.RunId;
    const RunRecord    = window.RunRecord;
    const RunStateStore = window.RunStateStore;
    const IconConfigs  = window.IconConfigs;

    // ── 1. IDs ──────────────────────────────────────────────────
    const suiteRunId = RunId.generateSuiteRunId();
    const runId      = opts.runId || RunId.generateRunId();

    // ── 2. Icon configs ─────────────────────────────────────────
    const iconConfigs = IconConfigs.allIconConfigs[format];
    if (!iconConfigs) {
        throw new Error(`[SuiteRunner] Unknown format "${format}". Expected one of: ${Object.keys(IconConfigs.allIconConfigs).join(', ')}`);
    }

    // ── 3. Reporter ─────────────────────────────────────────────
    const reporter = opts.reporter
        || (window.Reporters && new window.Reporters.NoopReporter())
        || { onTestStart(){}, onProgress(){}, onIterationComplete(){}, onTestComplete(){}, onError(){} };

    // ── 4. StressTestManager ────────────────────────────────────
    const manager = new window.StressTestManager({
        iconConfigs,
        format,
        reporter
    });

    // ── 5. RunHandle (with cancel wired to manager.stopTest) ────
    const handle = new RunHandleMod({
        runId,
        suiteRunId,
        format,
        cancelFn: () => manager.stopTest()
    });

    // Wire reporter progress into the handle (for onProgress subscribers)
    const origOnProgress = reporter.onProgress.bind(reporter);
    reporter.onProgress = function(percentage, message, completedIterations, totalIterations) {
        origOnProgress(percentage, message, completedIterations, totalIterations);
        handle._updateProgress({ percentage, message, completedIterations, totalIterations });
    };

    // ── 6. Register with RunStateStore ──────────────────────────
    RunStateStore.registerRun(suiteRunId, format, runId);

    // ── 7. Execute (async) and resolve handle on completion ─────
    _execute(manager, handle, {
        format,
        testType,
        runId,
        suiteRunId,
        RunRecord,
        RunStateStore
    });

    return handle;
}

/**
 * Internal async executor. Runs the stress test and resolves the handle.
 *
 * @param {Object} manager      – StressTestManager instance
 * @param {Object} handle       – RunHandle
 * @param {Object} ctx          – Contextual data for RunRecord creation
 */
async function _execute(manager, handle, ctx) {
    const startedAt = new Date().toISOString();

    try {
        await manager.startStressTest();

        // If the user cancelled mid-run, the handle is already CANCELLED
        if (handle.status === 'cancelled') {
            return;
        }

        const endedAt   = new Date().toISOString();
        const durationMs = new Date(endedAt) - new Date(startedAt);

        // ── Build RunRecord ────────────────────────────────────
        const runRecord = ctx.RunRecord.createRunRecord({
            testResultId:   window.RunId.generateTestResultId(),
            runId:          ctx.runId,
            suiteRunId:     ctx.suiteRunId,
            format:         ctx.format,
            source:         'local',
            active:         true,
            startTime:      startedAt,
            endTime:        endedAt,
            durationMs:     durationMs,
            testType:       ctx.testType,
            iterations:     manager.completedIterations,
            testDuration:   durationMs / 1000,
            results:              manager.results || {},
            statisticalAnalysis:  manager.statisticalAnalysis || {},
            performanceRanking:   manager.performanceRanking || [],
            testMetadata:         manager.testMetadata || {},
            testConfiguration:    manager.testConfiguration || {},
            systemSpecifications: manager.systemInfo || {}
        });

        // ── Persist and complete ───────────────────────────────
        ctx.RunStateStore.completeRun(ctx.suiteRunId, runRecord);
        handle._complete(runRecord);

    } catch (error) {
        handle._fail(error);
    }
}

/**
 * Cancel a running suite via its handle.
 * @param {Object} handle – RunHandle returned by runSuite()
 */
function cancelSuite(handle) {
    if (handle && typeof handle.cancel === 'function') {
        handle.cancel();
    }
}

// Expose globally for non-module <script> consumers
window.SuiteRunner = Object.freeze({
    runSuite,
    cancelSuite
});
