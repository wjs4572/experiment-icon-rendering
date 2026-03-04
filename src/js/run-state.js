/**
 * run-state.js — Run State Store
 *
 * Single source of truth for active and completed test runs.
 *
 * In-memory map of active (in-progress) runs keyed by suiteRunId.
 * Completed runs are persisted to localStorage under `iconTestRunRecords`.
 * Cross-tab live progress via BroadcastChannel (ephemeral, high-frequency).
 * Cross-tab completion sync via the native `storage` event on localStorage.
 */

'use strict';

const _STORAGE_KEY       = 'iconTestRunRecords';
const _LATEST_PREFIX     = 'iconTestResults_';   // per-format latest (transition compat)
const _CHANNEL_NAME      = 'icon-test-progress';

class RunStateStore {

    constructor() {
        /** @type {Map<string, Object>} suiteRunId → { format, runId, progress, startTime } */
        this._active = new Map();

        /** @type {Map<string, Set<Function>>} format → Set of callbacks */
        this._progressListeners = new Map();

        /** @type {Map<string, Set<Function>>} format → Set of callbacks */
        this._completionListeners = new Map();

        // BroadcastChannel for cross-tab live progress (ephemeral, real-time)
        /** @type {BroadcastChannel|null} */
        this._channel = null;
        try {
            this._channel = new BroadcastChannel(_CHANNEL_NAME);
            this._channel.onmessage = (e) => this._onChannelMessage(e);
        } catch (_) {
            // BroadcastChannel not available — cross-tab progress gracefully unavailable
        }

        // Listen for cross-tab localStorage changes (completion sync)
        window.addEventListener('storage', (e) => this._onStorageEvent(e));
    }

    /* ─── Active Run Management ─────────────────────────────── */

    /**
     * Register a new run as live/in-progress.
     */
    registerRun(suiteRunId, format, runId) {
        this._active.set(suiteRunId, {
            suiteRunId,
            format,
            runId,
            startTime: new Date().toISOString(),
            progress: { percentage: 0, message: 'Starting...', completedIterations: 0, totalIterations: 0 }
        });
    }

    /**
     * Update progress snapshot for an active run.
     * Also broadcasts to other tabs via BroadcastChannel.
     */
    updateProgress(suiteRunId, progressData) {
        const run = this._active.get(suiteRunId);
        if (!run) return;
        run.progress = { ...run.progress, ...progressData };
        this._notifyProgress(run.format, run);

        // Broadcast live progress to other tabs
        this._broadcast({
            type: 'progress',
            format: run.format,
            suiteRunId: run.suiteRunId,
            runId: run.runId,
            progress: run.progress
        });
    }

    /**
     * Mark a run as completed: remove from active, persist RunRecord.
     */
    completeRun(suiteRunId, runRecord) {
        const run = this._active.get(suiteRunId);
        this._active.delete(suiteRunId);

        // Persist the RunRecord
        this.saveRecord(runRecord);

        // Also write latest-per-format for transition compatibility
        this._writeLatest(runRecord);

        // Notify completion listeners (same-tab)
        const format = runRecord.format || (run && run.format);
        if (format) {
            this._notifyCompletion(format, runRecord);
            // Broadcast completion to other tabs
            this._broadcast({ type: 'completion', format, runRecord });
        }
    }

    /**
     * Returns the live run state for a given format (if any).
     * @returns {Object|null} { suiteRunId, format, runId, progress, startTime } or null
     */
    getActiveRun(format) {
        for (const run of this._active.values()) {
            if (run.format === format) return run;
        }
        return null;
    }

    /* ─── Subscription ──────────────────────────────────────── */

    /**
     * Subscribe to progress changes for a format.
     * @param {string}   format
     * @param {Function} callback  – Receives (runState)
     * @returns {Function} Unsubscribe function
     */
    onProgressChange(format, callback) {
        if (!this._progressListeners.has(format)) {
            this._progressListeners.set(format, new Set());
        }
        this._progressListeners.get(format).add(callback);
        return () => this._progressListeners.get(format).delete(callback);
    }

    /**
     * Subscribe to completion events for a format.
     * @param {string}   format
     * @param {Function} callback  – Receives (runRecord)
     * @returns {Function} Unsubscribe function
     */
    onCompletion(format, callback) {
        if (!this._completionListeners.has(format)) {
            this._completionListeners.set(format, new Set());
        }
        this._completionListeners.get(format).add(callback);
        return () => this._completionListeners.get(format).delete(callback);
    }

    /* ─── Persisted Records (localStorage) ──────────────────── */

    /**
     * Return all persisted RunRecords.
     * @returns {Array<Object>}
     */
    getAllCompleted() {
        return this._readStore();
    }

    /**
     * Return only records where active === true.
     * @returns {Array<Object>}
     */
    getActiveRecords() {
        return this._readStore().filter(r => r.active === true);
    }

    /**
     * Persist a single RunRecord (append).
     */
    saveRecord(runRecord) {
        const records = this._readStore();
        records.push(runRecord);
        this._writeStore(records);
    }

    /**
     * Delete records by testResultId.
     * @param {string[]} testResultIds
     */
    deleteRecords(testResultIds) {
        const idSet = new Set(testResultIds);
        const records = this._readStore().filter(r => !idSet.has(r.testResultId));
        this._writeStore(records);
    }

    /**
     * Flip the `active` flag on the specified records.
     * @param {string[]} testResultIds
     * @param {boolean}  active
     */
    toggleActive(testResultIds, active) {
        const idSet = new Set(testResultIds);
        const records = this._readStore().map(r => {
            if (idSet.has(r.testResultId)) {
                return { ...r, active };
            }
            return r;
        });
        this._writeStore(records);
    }

    /**
     * Bulk import records (e.g. from file upload).
     * @param {Array<Object>} records – Already-normalized RunRecords.
     */
    importRecords(records) {
        const existing = this._readStore();
        const merged = existing.concat(records);
        this._writeStore(merged);
    }

    /* ─── Internal Helpers ──────────────────────────────────── */

    _readStore() {
        try {
            const raw = localStorage.getItem(_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('[RunStateStore] Error reading store:', e);
            return [];
        }
    }

    _writeStore(records) {
        try {
            localStorage.setItem(_STORAGE_KEY, JSON.stringify(records));
        } catch (e) {
            console.error('[RunStateStore] Error writing store:', e);
        }
    }

    /**
     * Write latest-per-format key for transition compat with existing suite pages.
     */
    _writeLatest(runRecord) {
        if (!runRecord.format) return;
        try {
            localStorage.setItem(
                `${_LATEST_PREFIX}${runRecord.format}`,
                JSON.stringify(runRecord)
            );
        } catch (e) {
            console.error('[RunStateStore] Error writing latest:', e);
        }
    }

    _notifyProgress(format, runState) {
        const listeners = this._progressListeners.get(format);
        if (listeners) {
            for (const cb of listeners) {
                try { cb(runState); } catch (e) { console.error('[RunStateStore] progress listener error:', e); }
            }
        }
    }

    _notifyCompletion(format, runRecord) {
        const listeners = this._completionListeners.get(format);
        if (listeners) {
            for (const cb of listeners) {
                try { cb(runRecord); } catch (e) { console.error('[RunStateStore] completion listener error:', e); }
            }
        }
    }

    /* ─── Cross-tab BroadcastChannel ──────────────────────── */

    /**
     * Send a message to other tabs via BroadcastChannel.
     * @param {Object} msg
     */
    _broadcast(msg) {
        if (this._channel) {
            try { this._channel.postMessage(msg); } catch (_) { /* swallow */ }
        }
    }

    /**
     * Handle incoming BroadcastChannel messages from other tabs.
     * Delivers live progress and completion events to local listeners.
     */
    _onChannelMessage(e) {
        const msg = e.data;
        if (!msg || !msg.format) return;

        if (msg.type === 'progress') {
            // Build a runState-like object for progress listeners
            this._notifyProgress(msg.format, {
                suiteRunId: msg.suiteRunId,
                format:     msg.format,
                runId:      msg.runId,
                progress:   msg.progress,
                crossTab:   true
            });
        } else if (msg.type === 'completion') {
            this._notifyCompletion(msg.format, msg.runRecord);
        }
    }

    /**
     * Handle cross-tab localStorage changes (completion sync).
     */
    _onStorageEvent(e) {
        if (e.key !== _STORAGE_KEY) return;

        // A different tab wrote new records — fire generic events.
        // BroadcastChannel handles real-time progress; this is a fallback
        // for completion events when BroadcastChannel is unavailable.
        for (const [format, listeners] of this._progressListeners) {
            for (const cb of listeners) {
                try { cb({ crossTabUpdate: true, format }); } catch (err) { /* swallow */ }
            }
        }
    }
}

// Expose a singleton
window.RunStateStore = new RunStateStore();
