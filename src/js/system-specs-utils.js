/**
 * system-specs-utils.js
 *
 * Pure-function helpers for parsing and sanitising Belarc / auto-detected
 * system specification data stored in RunRecord.systemSpecifications.
 *
 * Exposed as the frozen global  window.SystemSpecsUtils  so any page can use
 * them without duplication (results-library.html, summary.html, etc.).
 *
 * All functions are stateless and have no DOM or network side-effects.
 */

'use strict';

const SystemSpecsUtils = Object.freeze({

    /* ── Browser ───────────────────────────────────────────────────────── */

    /** Derive friendly browser name from a user-agent string. */
    parseBrowserName(ua) {
        if (!ua) return 'Unknown';
        if (ua.includes('Edg/') || ua.includes('Edge/')) return 'Edge';
        if (ua.includes('Firefox'))  return 'Firefox';
        if (ua.includes('Chrome'))   return 'Chrome';
        if (ua.includes('Safari'))   return 'Safari';
        return 'Unknown';
    },

    /* ── GPU ───────────────────────────────────────────────────────────── */

    /**
     * Extract a clean GPU model name from a WebGL ANGLE renderer string.
     * e.g. "Google Inc. (Intel) — ANGLE (Intel, Intel(R) HD Graphics 530 (0x0000191B)...)"
     *   →  "Intel HD Graphics 530"
     */
    extractAutoGPU(gpuStr) {
        if (!gpuStr) return '';
        const m = gpuStr.match(/ANGLE\s*\([^,]+,\s*(.*?)\s*\(0x[0-9a-f]/i);
        if (m) return m[1].replace(/\(R\)/gi, '').trim();
        return gpuStr.split(/\s*[—(]/)[0].trim();
    },

    /**
     * Extract display-adapter names from a Belarc graphics block, stripping
     * monitor entries, serial numbers, and (R) trade-mark tokens.
     * Returns a ", "-separated string.
     */
    extractGPUNames(raw) {
        if (!raw) return '';
        const results = [];
        const re = /([^\[\]]+)\[Display adapter\]/g;
        let m;
        while ((m = re.exec(raw)) !== null) {
            const name = m[1].replace(/\(R\)/gi, '').trim();
            if (name && !results.includes(name)) results.push(name);
        }
        return results.join(' / ');
    },

    /* ── OS ────────────────────────────────────────────────────────────── */

    /**
     * Extract OS name + architecture from verbose Belarc text, stripping
     * build numbers, install dates, and locale details.
     */
    extractOSName(raw) {
        if (!raw) return '';
        let m = raw.match(/(Windows\s+\d+(?:\s+\w+)*?)\s*\(([^)]+)\)/i);
        if (m) {
            const arch = m[2].includes('64') ? 'x64' : m[2].includes('32') ? 'x32' : m[2].trim();
            return m[1].trim() + ' ' + arch;
        }
        m = raw.match(/(Windows\s+\d+[^(\n]*)/i);
        if (m) return m[1].trim();
        m = raw.match(/(macOS\s+[\w.]+)/i);
        if (m) return m[1].trim();
        return raw.split(/\n|Version|Build|Install/)[0].trim();
    },

    /** Generalise boot mode string to "UEFI Secure Boot", "UEFI", "Legacy BIOS", or "". */
    simplifyBootMode(raw) {
        if (!raw) return '';
        if (/UEFI/i.test(raw) && /Secure Boot/i.test(raw)) return 'UEFI Secure Boot';
        if (/UEFI/i.test(raw)) return 'UEFI';
        if (/Legacy|BIOS/i.test(raw)) return 'Legacy BIOS';
        return '';
    },

    /* ── System model ──────────────────────────────────────────────────── */

    /** Extract system make/model, stripping serial numbers and revision tags. */
    extractSystemModel(raw) {
        if (!raw) return '';
        const stop = raw.search(/REV:|Rev\s*:|System Serial|Asset Tag|Chassis|Serial Number/i);
        let model = (stop > 0 ? raw.substring(0, stop) : raw).trim();
        model = model.replace(/Micro-Star International Co\.?,?\s*Ltd\.?\s*/i, 'MSI ').trim();
        return model;
    },

    /* ── CPU ───────────────────────────────────────────────────────────── */

    /**
     * Extract logical core count from a Belarc cache line, falling back to
     * navigator.hardwareConcurrency.
     */
    extractCoreCount(cacheStr, hardwareConcurrency) {
        let m = (cacheStr || '').match(/Hyper-threaded\s*\((\d+)\s*total\)/i);
        if (m) return m[1];
        m = (cacheStr || '').match(/Multi-core\s*\((\d+)\s*total\)/i);
        if (m) return m[1];
        return (hardwareConcurrency && hardwareConcurrency !== 'unknown')
            ? String(hardwareConcurrency) : '';
    },

    /** Reduce a Belarc cache string to a compact "L1/L2/L3 present" label. */
    simplifyCacheInfo(raw) {
        if (!raw) return '';
        const tiers = [];
        if (/L1\b|primary/i.test(raw))   tiers.push('L1');
        if (/L2\b|secondary/i.test(raw)) tiers.push('L2');
        if (/L3\b|tertiary/i.test(raw))  tiers.push('L3');
        return tiers.length ? tiers.join('/') + ' present' : '';
    },

    /* ── Memory ────────────────────────────────────────────────────────── */

    /**
     * Sum memory slot sizes from a Belarc configuration string, returning
     * a rounded "XX GB" value.
     */
    extractRAMTotal(confStr) {
        if (!confStr) return '';
        let total = 0;
        const re = /has\s+(\d+)\s*MB/gi;
        let m;
        while ((m = re.exec(confStr)) !== null) total += parseInt(m[1]);
        if (total > 0) return (total / 1024) + ' GB';
        m = confStr.match(/(\d+)\s*GB/i);
        return m ? m[1] + ' GB' : '';
    },

    /* ── Storage ───────────────────────────────────────────────────────── */

    /**
     * Classify drives as SSD/HDD with rounded capacity from a Belarc
     * storage block, stripping model names and serial numbers.
     */
    extractStorageSummary(raw) {
        if (!raw) return '';
        const results = [];
        const parts = raw.split('[Hard drive]');
        for (let i = 1; i < parts.length; i++) {
            const before = parts[i - 1];
            const after  = parts[i];
            const modelM = before.match(/(\S+)\s*$/);
            const model  = modelM ? modelM[1] : '';
            const capM   = after.match(/\(([0-9.]+)\s*GB\)/);
            if (!capM) continue;
            const gb      = parseFloat(capM[1]);
            const rounded = gb > 900 ? Math.round(gb / 1000) + ' TB' : Math.round(gb) + ' GB';
            const isSSD   = /THNSNJ|SSDSA|SSDSC|SSDPE|MZNLN|NVMe|M\.2|SSD/i.test(model);
            results.push((isSSD ? 'SSD' : 'HDD') + ' (' + rounded + ')');
        }
        return results.join(', ');
    },

    /* ── Full-record sanitisation (used by results-library export) ─────── */

    /**
     * Return a deep-cloned copy of a RunRecord with PII removed and verbose
     * Belarc strings replaced by the concise extracted values.
     */
    sanitizeRecord(record) {
        const r = JSON.parse(JSON.stringify(record));
        if (r.testMetadata) {
            ['userAgent','platform','language','languages','timezone',
             'cookiesEnabled','doNotTrack','touchSupport','connection',
             'testingNote','timestamp','userAgentNote','browserSpecific',
             'testingEnvironment'].forEach(k => { delete r.testMetadata[k]; });
        }
        r.systemSpecifications = SystemSpecsUtils.sanitizeSystemSpecs(
            r.systemSpecifications || {}
        );
        return r;
    },

    sanitizeSystemSpecs(sys) {
        const auto = sys.autoDetected || {};
        const man  = sys.manual || {};
        const proc = man.processor || {};
        const mem  = man.memory || {};
        const gfx  = man.graphics || {};
        const stor = man.storage || {};
        const conf = man.systemConfiguration || {};

        return {
            lastUpdated: sys.lastUpdated,
            autoDetected: {
                browserName:         SystemSpecsUtils.parseBrowserName(auto.userAgent || ''),
                hardwareConcurrency: auto.hardwareConcurrency,
                screen:              auto.screen,
                gpu:                 SystemSpecsUtils.extractAutoGPU(auto.gpu || '')
            },
            manual: {
                systemConfiguration: {
                    model:           SystemSpecsUtils.extractSystemModel(conf.model || ''),
                    operatingSystem: SystemSpecsUtils.extractOSName(conf.operatingSystem || ''),
                    bootMode:        SystemSpecsUtils.simplifyBootMode(
                                         conf.bootMode || conf.operatingSystem || '')
                },
                processor: {
                    architecture: (proc.architecture || '').replace(/,.*/, '').trim(),
                    cores:        SystemSpecsUtils.extractCoreCount(
                                      proc.cache || '', auto.hardwareConcurrency),
                    cache:        SystemSpecsUtils.simplifyCacheInfo(proc.cache || ''),
                    generation:   proc.generation || ''
                },
                memory: {
                    totalRAM: mem.totalRAM
                              || SystemSpecsUtils.extractRAMTotal(mem.configuration || ''),
                    speed:    mem.speed || ''
                },
                graphics: {
                    integrated: SystemSpecsUtils.extractGPUNames(gfx.integrated || '')
                                || SystemSpecsUtils.extractAutoGPU(auto.gpu || ''),
                    discrete:   SystemSpecsUtils.extractGPUNames(gfx.discrete || '')
                },
                storage: {
                    systemDrive: SystemSpecsUtils.extractStorageSummary(stor.systemDrive || '')
                }
            }
        };
    }
});

window.SystemSpecsUtils = SystemSpecsUtils;
