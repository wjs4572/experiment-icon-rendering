/**
 * reporters.js — Reporter interface, DOMReporter, and StoreReporter
 *
 * Reporter contract (all methods optional — NoopReporter is the default):
 *   onTestStart(format, config)
 *   onProgress(percentage, message, completedIterations, totalIterations)
 *   onIterationComplete(iconType, iterationData)
 *   onTestComplete(results, duration)
 *   onError(error)
 *
 * DOMReporter  – Writes to existing DOM element IDs on suite pages.
 * StoreReporter – Publishes to RunStateStore for batch / cross-tab use.
 */

'use strict';

/* ─── NoopReporter (default) ───────────────────────────────────── */

class NoopReporter {
    onTestStart()          {}
    onProgress()           {}
    onIterationComplete()  {}
    onTestComplete()       {}
    onError()              {}
}

/* ─── DOMReporter ──────────────────────────────────────────────── */

/**
 * Writes progress and results directly to DOM elements on suite pages.
 * Accepts an optional `manager` reference so it can call the existing
 * HTML-generation methods that live on StressTestManager.
 *
 * @param {Object} options
 * @param {StressTestManager} [options.manager]  – Reference for HTML generators.
 */
class DOMReporter extends NoopReporter {
    constructor(options = {}) {
        super();
        this.manager = options.manager || null;
    }

    /** Bind manager after construction (useful when manager creates the reporter). */
    setManager(manager) {
        this.manager = manager;
    }

    onTestStart(format, config) {
        const testProgress = document.getElementById('testProgress');
        if (testProgress) testProgress.classList.remove('hidden');
    }

    /**
     * @param {number} percentage  0-100
     * @param {string} message     Human-readable status line
     * @param {number} completedIterations
     * @param {number} totalIterations
     */
    onProgress(percentage, message, completedIterations, totalIterations) {
        const pct = document.getElementById('progressPercent');
        if (pct) pct.textContent = `${Math.round(percentage)}%`;

        const text = document.getElementById('progressText');
        if (text) text.textContent = message;

        const bar = document.getElementById('progressBar');
        if (bar) bar.style.width = `${Math.min(100, percentage)}%`;

        const iter = document.getElementById('currentIteration');
        if (iter) iter.textContent = (completedIterations || 0).toLocaleString();

        const startTime = this.manager && this.manager.startTime;
        if (startTime) {
            const elapsed = (performance.now() - startTime) / 1000;
            const elapsedEl = document.getElementById('elapsedTime');
            if (elapsedEl) elapsedEl.textContent = `${elapsed.toFixed(1)}s`;
            if (percentage > 5) {
                const etaEl = document.getElementById('eta');
                if (etaEl) {
                    const totalEstimated = (elapsed / percentage) * 100;
                    const remaining = totalEstimated - elapsed;
                    etaEl.textContent = remaining > 0 ? `${remaining.toFixed(0)}s` : 'Almost done';
                }
            }
        }
    }

    onIterationComplete(iconType, iterationData) {
        // Future: could update a live iteration counter in the DOM
    }

    /**
     * Called when the test finishes.
     * The manager has already rendered the results HTML by the time this fires,
     * so we only need to toggle progress/results visibility.
     *
     * @param {Object}  results   – Aggregated results map
     * @param {number}  duration  – Total duration in seconds
     * @param {Object}  [extra]   – Additional context (startedAt, sortedResults, etc.)
     */
    onTestComplete(results, duration, extra = {}) {
        // Hide progress section now that results are shown
        const testProgress = document.getElementById('testProgress');
        if (testProgress) testProgress.classList.add('hidden');
    }

    onError(error) {
        console.error('[DOMReporter]', error);
        const text = document.getElementById('progressText');
        if (text) {
            text.textContent = `Error: ${error.message || error}`;
            text.classList.add('text-red-500');
        }
    }
}

/* ─── StoreReporter ────────────────────────────────────────────── */

/**
 * Publishes progress and completion events to RunStateStore.
 * No DOM interaction — used by the batch runner on index.html.
 *
 * @param {Object} options
 * @param {string} options.suiteRunId  – ID of the current suite execution
 * @param {Function} [options.onProgressCallback] – Optional extra callback for progress snapshots
 */
class StoreReporter extends NoopReporter {
    constructor(options = {}) {
        super();
        this.suiteRunId = options.suiteRunId || null;
        this._onProgressCallback = options.onProgressCallback || null;
    }

    onTestStart(format, config) {
        // Registration with RunStateStore was done by suite-runner before test starts
    }

    onProgress(percentage, message, completedIterations, totalIterations) {
        const snapshot = { percentage, message, completedIterations, totalIterations };

        // Publish to RunStateStore (if available)
        if (window.RunStateStore) {
            window.RunStateStore.updateProgress(this.suiteRunId, snapshot);
        }

        // Additional callback for the batch runner UI
        if (this._onProgressCallback) {
            this._onProgressCallback(snapshot);
        }
    }

    onIterationComplete(iconType, iterationData) {
        // Could publish fine-grained data; not needed for batch progress
    }

    onTestComplete(results, duration, extra = {}) {
        // Completion is handled by suite-runner which calls RunStateStore.completeRun()
        // This is intentionally a no-op here to avoid double-write.
    }

    onError(error) {
        console.error('[StoreReporter]', error);
        if (window.RunStateStore) {
            window.RunStateStore.updateProgress(this.suiteRunId, {
                percentage: -1,
                message: `Error: ${error.message || error}`,
                completedIterations: 0,
                totalIterations: 0,
                error: true
            });
        }
    }
}

// Expose globally
window.Reporters = Object.freeze({
    NoopReporter,
    DOMReporter,
    StoreReporter
});
