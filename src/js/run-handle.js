/**
 * run-handle.js — RunHandle contract
 *
 * A RunHandle is returned by `suiteRunner.runSuite()` and represents
 * a single in-progress (or completed) suite execution.
 *
 * Properties:  runId, suiteRunId, format, startTime, status
 * Methods:     getProgress(), onProgress(cb), getResult(), cancel()
 * Fields:      done  — Promise resolving { runRecord }
 */

'use strict';

/**
 * Status constants for a RunHandle.
 */
const RUN_STATUS = Object.freeze({
    PENDING:   'pending',
    RUNNING:   'running',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ERROR:     'error'
});

class RunHandle {
    /**
     * @param {Object}   opts
     * @param {string}   opts.runId
     * @param {string}   opts.suiteRunId
     * @param {string}   opts.format
     * @param {Function} opts.cancelFn   – Called by cancel() to stop the manager
     */
    constructor({ runId, suiteRunId, format, cancelFn }) {
        this.runId      = runId;
        this.suiteRunId = suiteRunId;
        this.format     = format;
        this.startTime  = new Date().toISOString();
        this.status     = RUN_STATUS.RUNNING;

        /** @type {Object|null} Latest progress snapshot */
        this._progress = { percentage: 0, message: 'Starting...', completed: 0, total: 0 };

        /** @type {Set<Function>} Progress subscribers */
        this._progressListeners = new Set();

        /** @type {Object|null} Final RunRecord after completion */
        this._result = null;

        /** @type {Function} Internal cancel trigger */
        this._cancelFn = cancelFn || (() => {});

        // The `done` promise is resolved/rejected by suite-runner via _resolve/_reject
        /** @type {Promise<{runRecord: Object}>} */
        this.done = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject  = reject;
        });
    }

    /* ─── Public API ────────────────────────────────────────── */

    /**
     * Returns the latest progress snapshot.
     * @returns {{ percentage: number, message: string, completed: number, total: number }}
     */
    getProgress() {
        return { ...this._progress };
    }

    /**
     * Subscribe to progress updates.
     * @param {Function} callback – Receives ({ percentage, message, completed, total })
     * @returns {Function} Unsubscribe function
     */
    onProgress(callback) {
        this._progressListeners.add(callback);
        return () => this._progressListeners.delete(callback);
    }

    /**
     * Returns the final RunRecord (or null if not yet complete).
     * @returns {Object|null}
     */
    getResult() {
        return this._result;
    }

    /**
     * Request cancellation of the running suite.
     */
    cancel() {
        if (this.status === RUN_STATUS.RUNNING) {
            this.status = RUN_STATUS.CANCELLED;
            this._cancelFn();
        }
    }

    /* ─── Internal (called by suite-runner) ─────────────────── */

    /**
     * Push a progress snapshot to subscribers.
     * @param {{ percentage: number, message: string, completedIterations: number, totalIterations: number }} snapshot
     */
    _updateProgress(snapshot) {
        this._progress = {
            percentage: snapshot.percentage   ?? this._progress.percentage,
            message:    snapshot.message      ?? this._progress.message,
            completed:  snapshot.completedIterations ?? snapshot.completed ?? this._progress.completed,
            total:      snapshot.totalIterations     ?? snapshot.total     ?? this._progress.total
        };
        for (const cb of this._progressListeners) {
            try { cb(this.getProgress()); } catch (e) { console.error('[RunHandle] progress listener error:', e); }
        }
    }

    /**
     * Mark handle as completed, store the result, and resolve the `done` promise.
     * @param {Object} runRecord
     */
    _complete(runRecord) {
        this._result = runRecord;
        this.status  = RUN_STATUS.COMPLETED;
        this._resolve({ runRecord });
    }

    /**
     * Mark handle as errored and reject the `done` promise.
     * @param {Error} error
     */
    _fail(error) {
        if (this.status !== RUN_STATUS.CANCELLED) {
            this.status = RUN_STATUS.ERROR;
        }
        this._reject(error);
    }
}

// Expose globally for non-module <script> consumers
window.RunHandle = Object.freeze({
    RUN_STATUS,
    RunHandle
});
