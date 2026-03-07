/**
 * run-state.js — Run State Store
 *
 * Single source of truth for active and completed test runs.
 *
 * In-memory map of active (in-progress) runs keyed by suiteRunId.
 * Completed runs are persisted to localStorage under `iconTestRunRecords`.
 * Cross-tab live progress via BroadcastChannel (ephemeral, high-frequency).
 * Cross-tab completion sync via the native `storage` event on localStorage.
 * In-progress runs also persisted to `iconTestProgressState` for cross-tab batch visibility.
 */

'use strict';

const _STORAGE_KEY       = 'iconTestRunRecords';
const _PROGRESS_KEY      = 'iconTestProgressState';    // Active runs + progress for cross-tab visibility
const _LATEST_PREFIX     = 'iconTestResults_';         // per-format latest (transition compat)
const _CHANNEL_NAME      = 'icon-test-progress';

class RunStateStore {

    constructor() {
        this._tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        this._seenCompletedIds = new Set();
        try {
            for (const record of this._readStore()) {
                if (record && record.testResultId) {
                    this._seenCompletedIds.add(record.testResultId);
                }
            }
        } catch (_) {
            // ignore initialization failures
        }

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

        // Restore in-progress runs from previous session/other tabs
        this.restoreProgressFromStorage();
    }

    /* ─── Active Run Management ─────────────────────────────── */

    /**
     * Register a new run as live/in-progress.
     * Saves initial marker to localStorage so cross-tab pages can detect the running batch.
     */
    registerRun(suiteRunId, format, runId, testType) {
        console.log(`[RunStateStore] Registering run: format=${format}, suiteRunId=${suiteRunId}, runId=${runId}, testType=${testType}`);
        this._active.set(suiteRunId, {
            suiteRunId,
            format,
            runId,
            testType: testType || 'bulk',
            startTime: new Date().toISOString(),
            progress: { percentage: 0, message: 'Starting...', completedIterations: 0, totalIterations: 0 }
        });
        // Save to localStorage immediately so cross-tab pages can discover the running batch
        this._saveProgressState();
        console.log(`[RunStateStore] Active runs now:`, Array.from(this._active.values()).map(r => r.format));
    }

    /**
     * Update progress snapshot for an active run.
     * Broadcasts live updates via BroadcastChannel (no localStorage writes during run).
     * localStorage only updated on registration (to mark batch started) and completion.
     */
    updateProgress(suiteRunId, progressData) {
        const run = this._active.get(suiteRunId);
        if (!run) {
            console.warn('[RunStateStore] updateProgress called for unknown suiteRunId:', suiteRunId);
            return;
        }
        
        run.progress = { ...run.progress, ...progressData };
        console.log(`[RunStateStore] Progress updated for ${run.format}: ${progressData.percentage}% - ${progressData.message}`);
        
        // Notify local listeners immediately (for same-tab subscribers like index.html)
        this._notifyProgress(run.format, run);

        // Broadcast live progress to other tabs via BroadcastChannel
        // NOTE: We do NOT save to localStorage on every update (too expensive)
        // localStorage is for persistent data (registration marker + completed results)
        this._broadcast({
            type: 'progress',
            format: run.format,
            suiteRunId: run.suiteRunId,
            runId: run.runId,
            testType: run.testType,
            progress: run.progress
        });
    }

    /**
     * Mark a run as cancelled: remove from active, clear progress, broadcast cancellation.
     * Called when a suite is stopped by the user before completion.
     */
    cancelRun(suiteRunId) {
        const run = this._active.get(suiteRunId);
        if (!run) {
            console.warn('[RunStateStore] cancelRun called for unknown suiteRunId:', suiteRunId);
            return;
        }
        this._active.delete(suiteRunId);
        this._saveProgressState();
        const format = run.format;
        console.log(`[RunStateStore] Run cancelled: format=${format}, suiteRunId=${suiteRunId}`);
        // Notify local listeners
        this._notifyCompletion(format, { cancelled: true, suiteRunId, format });
        // Broadcast cancellation to other tabs
        this._broadcast({ type: 'cancellation', suiteRunId, format });
    }

    /**
     * Mark a run as completed: remove from active, persist RunRecord, clear progress.
     */
    completeRun(suiteRunId, runRecord) {
        const run = this._active.get(suiteRunId);
        this._active.delete(suiteRunId);

        // Clear progress state from localStorage
        this._saveProgressState();

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

    /**
     * Ask peer tabs for current active run snapshots.
     * Useful when a suite page opens mid-run and wants immediate state.
     */
    requestActiveStateFromPeers() {
        this._broadcast({
            type: 'state_request',
            senderId: this._tabId
        });
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

    /**
     * Persist current active-run markers to localStorage for cross-tab discovery.
     * Intentionally stores minimal metadata (no high-frequency progress payload).
     */
    _saveProgressState() {
        try {
            const activeRuns = Array.from(this._active.values()).map((run) => ({
                suiteRunId: run.suiteRunId,
                format: run.format,
                runId: run.runId,
                testType: run.testType,
                startTime: run.startTime,
                status: 'running'
            }));
            localStorage.setItem(_PROGRESS_KEY, JSON.stringify(activeRuns));
        } catch (e) {
            console.error('[RunStateStore] Error saving progress state:', e);
        }
    }

    /**
     * Remove a single run entry from the persisted progress state without
     * overwriting entries for other formats (avoids race between multiple
     * format-page tabs each doing orphan cleanup simultaneously).
     * @param {string} suiteRunId
     */
    _removeRunFromProgressState(suiteRunId) {
        try {
            const raw = localStorage.getItem(_PROGRESS_KEY);
            const runs = raw ? JSON.parse(raw) : [];
            const filtered = runs.filter(r => r.suiteRunId !== suiteRunId);
            localStorage.setItem(_PROGRESS_KEY, JSON.stringify(filtered));
        } catch (e) {
            console.error('[RunStateStore] Error removing run from progress state:', e);
        }
    }

    /**
     * Read progress state from localStorage (used when page loads).
     * Returns an array of { suiteRunId, format, runId, progress, startTime }.
     */
    _readProgressState() {
        try {
            const raw = localStorage.getItem(_PROGRESS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('[RunStateStore] Error reading progress state:', e);
            return [];
        }
    }

    /**
     * Restore in-progress runs from localStorage (called on page load).
     * This allows suite pages to see batch progress that's already underway.
     *
     * Entries older than MAX_STALE_MS are treated as orphaned (the originating
     * tab crashed or was refreshed mid-run) and are discarded + cleared from storage.
     */
    restoreProgressFromStorage() {
        const MAX_STALE_MS = 2 * 60 * 60 * 1000; // 2 hours — no test should run longer than this
        const now = Date.now();
        const activeRuns = this._readProgressState();
        const freshRuns = [];

        console.log(`[RunStateStore] Checking ${activeRuns.length} stored run(s) on page load`);
        for (const run of activeRuns) {
            if (!run || !run.suiteRunId || !run.format) continue;

            const age = run.startTime ? now - new Date(run.startTime).getTime() : Infinity;
            if (age > MAX_STALE_MS) {
                console.warn(`[RunStateStore] Discarding stale run for "${run.format}" (started ${Math.round(age / 60000)}m ago)`);
                continue; // skip — do not restore to _active
            }

            this._active.set(run.suiteRunId, run);
            freshRuns.push(run);
            console.log(`[RunStateStore]   ✓ Restored ${run.format}: ${run.progress?.percentage || 0}%`);
        }

        // If any entries were pruned, rewrite storage with only fresh ones
        if (freshRuns.length < activeRuns.length) {
            try {
                localStorage.setItem(_PROGRESS_KEY, JSON.stringify(
                    freshRuns.map(r => ({
                        suiteRunId: r.suiteRunId,
                        format:     r.format,
                        runId:      r.runId,
                        startTime:  r.startTime,
                        status:     'running'
                    }))
                ));
            } catch (_) { /* ignore write errors */ }
        }

        if (freshRuns.length === 0) {
            console.log(`[RunStateStore] No active runs to restore`);
        }
    }

    /**
     * Get the current progress for a specific format (if running).
     * Returns runState { suiteRunId, format, runId, progress, startTime } or null.
     */
    getProgressForFormat(format) {
        for (const run of this._active.values()) {
            if (run.format === format) {
                const pct = typeof run.progress?.percentage === 'number' ? run.progress.percentage : 'n/a';
                console.log(`[RunStateStore] getProgressForFormat(${format}) → ${pct}%`);
                return run;
            }
        }
        console.log(`[RunStateStore] getProgressForFormat(${format}) → null (no active run)`);
        return null;
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
     * Updates the local _active map to keep in-memory state in sync with other tabs.
     */
    _onChannelMessage(e) {
        const msg = e.data;
        if (!msg || !msg.type) {
            console.warn('[RunStateStore] Received malformed BroadcastChannel message:', e.data);
            return;
        }

        if (msg.type === 'state_request') {
            if (msg.senderId && msg.senderId !== this._tabId && this._active.size > 0) {
                this._broadcast({
                    type: 'state_response',
                    targetId: msg.senderId,
                    senderId: this._tabId,
                    runs: Array.from(this._active.values())
                });
            }
            return;
        }

        if (msg.type === 'state_response') {
            if (!msg.targetId || msg.targetId !== this._tabId || !Array.isArray(msg.runs)) {
                return;
            }

            for (const run of msg.runs) {
                if (!run || !run.suiteRunId || !run.format) continue;
                this._active.set(run.suiteRunId, run);
                this._notifyProgress(run.format, {
                    ...run,
                    crossTab: true,
                    snapshot: true
                });
            }
            return;
        }

        if (!msg.format) {
            console.warn('[RunStateStore] Received message without format:', e.data);
            return;
        }

        if (msg.type === 'progress') {
            console.log(`[RunStateStore] 📡 Progress message from other tab: ${msg.format} → ${msg.progress?.percentage}%`);
            // First, update our local _active map with the fresh data from the other tab
            // This ensures we're always working with current, consistent state
            if (msg.suiteRunId) {
                const existingRun = this._active.get(msg.suiteRunId);
                if (existingRun) {
                    // Update the existing run with fresh progress data and testType
                    existingRun.progress = { ...existingRun.progress, ...msg.progress };
                    if (msg.testType) existingRun.testType = msg.testType;
                } else if (!existingRun && msg.runId) {
                    // This run doesn't exist locally yet, add it
                    // (in case this tab joined mid-batch)
                    console.log(`[RunStateStore] Creating new active run from broadcast: ${msg.format}`);
                    this._active.set(msg.suiteRunId, {
                        suiteRunId: msg.suiteRunId,
                        format: msg.format,
                        runId: msg.runId,
                        testType: msg.testType,
                        progress: msg.progress,
                        startTime: new Date().toISOString()
                    });
                }
            }
            
            // Now notify listeners with the actual run state from _active
            const actualRun = this._active.get(msg.suiteRunId);
            if (actualRun) {
                this._notifyProgress(msg.format, {
                    ...actualRun,
                    crossTab: true
                });
            }
        } else if (msg.type === 'cancellation') {
            console.log(`[RunStateStore] 📡 Cancellation message from other tab: ${msg.format}`);
            if (msg.suiteRunId) {
                this._active.delete(msg.suiteRunId);
                this._saveProgressState();
            }
            if (msg.format) {
                this._notifyCompletion(msg.format, { cancelled: true, suiteRunId: msg.suiteRunId, format: msg.format });
            }
        } else if (msg.type === 'completion') {
            console.log(`[RunStateStore] 📡 Completion message from other tab: ${msg.format}`);
            // Remove from active map on completion
            if (msg.runRecord && msg.runRecord.suiteRunId) {
                this._active.delete(msg.runRecord.suiteRunId);
                // Also update localStorage to reflect completion
                this._saveProgressState();
            }
            this._notifyCompletion(msg.format, msg.runRecord);
        }
    }

    /**
     * Handle cross-tab localStorage changes (completion sync).
     */
    _onStorageEvent(e) {
        if (e.key !== _STORAGE_KEY) return;

        let newRecords = [];
        try {
            newRecords = e.newValue ? JSON.parse(e.newValue) : [];
        } catch (_) {
            newRecords = [];
        }

        for (const record of newRecords) {
            if (!record || !record.testResultId || this._seenCompletedIds.has(record.testResultId)) {
                continue;
            }

            this._seenCompletedIds.add(record.testResultId);

            if (record.suiteRunId) {
                this._active.delete(record.suiteRunId);
            }

            if (record.format) {
                this._notifyCompletion(record.format, {
                    ...record,
                    crossTab: true,
                    viaStorageEvent: true
                });
            }
        }

        // keep minimal marker storage in sync after completion detection
        this._saveProgressState();
    }
}

// Expose a singleton
window.RunStateStore = new RunStateStore();
