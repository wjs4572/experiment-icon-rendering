/**
 * batch-progress-monitor.js — Batch Progress Monitor for Suite Pages
 *
 * Allows suite pages (css.html, svg.html, etc.) to monitor and display batch progress
 * when tests for their format are running as part of a batch from index.html.
 *
 * Usage in a suite page:
 *   const monitor = new BatchProgressMonitor('css', {
 *       onProgress: (runState) => { ... update UI ... }
 *   });
 *   monitor.start();  // Subscribe to updates
 */

'use strict';

class BatchProgressMonitor {
    /**
     * @param {string} format - The format to monitor (e.g., 'css', 'svg', 'png')
     * @param {Object} options - Configuration options
     * @param {Function} [options.onProgress] - Callback when progress updates
     * @param {Function} [options.onCompletion] - Callback when batch run completes
     * @param {Function} [options.onCancel] - Callback if batch is cancelled
     */
    constructor(format, options = {}) {
        this.format = format;
        this.options = options;
        this._unsubscribeProgress = null;
        this._unsubscribeCompletion = null;

        // Ensure RunStateStore is available
        if (!window.RunStateStore) {
            console.error('[BatchProgressMonitor] RunStateStore not available');
            return;
        }
    }

    /**
     * Start monitoring for batch progress on this format.
     * Immediately triggers onProgress if a batch is already running.
     */
    start() {
        const store = window.RunStateStore;

        // Check for active run immediately
        const activeRun = store.getProgressForFormat(this.format);
        if (activeRun && this.options.onProgress) {
            this.options.onProgress(activeRun);
        }

        // Subscribe to future progress updates
        this._unsubscribeProgress = store.onProgressChange(this.format, (runState) => {
            if (this.options.onProgress) {
                this.options.onProgress(runState);
            }
        });

        // Subscribe to completion events
        this._unsubscribeCompletion = store.onCompletion(this.format, (runRecord) => {
            if (this.options.onCompletion) {
                this.options.onCompletion(runRecord);
            }
        });
    }

    /**
     * Stop monitoring for batch progress.
     */
    stop() {
        if (this._unsubscribeProgress) {
            this._unsubscribeProgress();
            this._unsubscribeProgress = null;
        }
        if (this._unsubscribeCompletion) {
            this._unsubscribeCompletion();
            this._unsubscribeCompletion = null;
        }
    }

    /**
     * Check if a batch is currently running for this format.
     * @returns {boolean}
     */
    isRunning() {
        const store = window.RunStateStore;
        return store && store.getProgressForFormat(this.format) !== null;
    }

    /**
     * Get the current progress for this format.
     * @returns {Object|null}
     */
    getProgress() {
        const store = window.RunStateStore;
        return store ? store.getProgressForFormat(this.format) : null;
    }
}

// Expose as global
window.BatchProgressMonitor = BatchProgressMonitor;
