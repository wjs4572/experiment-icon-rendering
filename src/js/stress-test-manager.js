class StressTestManager {
    constructor() {
        this.isRunning = false;
        this.shouldStop = false;
        this.currentTest = null;
        this.results = {};
        this.startTime = 0;
        this.totalIterations = 0;
        this.completedIterations = 0;
        this.batchSize = 50;
        this.activeIntervals = []; // Track all running intervals for cleanup
        this.wakeLock = null; // Screen wake lock for uninterrupted testing
        this.antiThrottleAudio = null; // Silent audio to prevent throttling
        
        // System information storage
        this.systemInfo = this.loadSystemInfo();
        
        this.iconConfigs = [
            {
                name: 'Remix Icon (Square)',
                selector: '.ri-code-s-slash-line',
                containerSelector: '.ri-code-s-slash-line',
                hasNetworkOverhead: true
            },
            {
                name: 'Pure CSS Icon',
                selector: '.code-slash-icon',
                containerSelector: '.code-slash-icon',
                hasNetworkOverhead: false
            },
            {
                name: 'Minimal CSS Icon',
                selector: '.simple-icon',
                containerSelector: '.simple-icon',
                hasNetworkOverhead: false
            },
            {
                name: 'Circular CSS Icon',
                selector: '.circular-icon',
                containerSelector: '.circular-icon',
                hasNetworkOverhead: false
            },
            {
                name: 'Circular Remix Icon',
                selector: '.ri-code-s-slash-line',
                containerSelector: '.ri-code-s-slash-line',
                hasNetworkOverhead: true,
                isCircular: true
            }
        ];
        
        this.setupEventListeners();
        this.updateMemoryDisplay();
        this.createTestContainer();
        
        // Delegate system specs to shared module
        if (window.systemSpecsManager) {
            this.systemInfo = window.systemSpecsManager.systemInfo;
            window.systemSpecsManager.initializeModal();
        }
    }

    // System Information Management — thin wrappers around shared module
    loadSystemInfo() {
        if (window.systemSpecsManager) return window.systemSpecsManager.loadSystemInfo();
        try {
            const stored = localStorage.getItem('systemSpecifications');
            return stored ? JSON.parse(stored) : this.getDefaultSystemInfo();
        } catch (error) {
            console.warn('Failed to load system info:', error);
            return this.getDefaultSystemInfo();
        }
    }

    getDefaultSystemInfo() {
        // Auto-detect what we can from browser APIs
        return {
            lastUpdated: new Date().toISOString(),
            autoDetected: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'unknown',
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt
                } : null,
                screen: {
                    resolution: `${screen.width}×${screen.height}`,
                    colorDepth: screen.colorDepth,
                    pixelRatio: window.devicePixelRatio
                }
            },
            manual: {
                systemConfiguration: {
                    model: '',
                    operatingSystem: '',
                    bootMode: ''
                },
                processor: {
                    cpu: '',
                    architecture: '',
                    cores: '',
                    cache: '',
                    generation: ''
                },
                memory: {
                    totalRAM: '',
                    configuration: '',
                    speed: ''
                },
                graphics: {
                    integrated: '',
                    discrete: '',
                    driverVersion: ''
                },
                storage: {
                    systemDrive: '',
                    additionalDrives: '',
                    performance: ''
                },
                network: {
                    connection: '',
                    router: '',
                    speed: ''
                },
                reportGeneratedBy: ''
            }
        };
    }

    saveSystemInfo(systemInfo) {
        if (window.systemSpecsManager) return window.systemSpecsManager.saveSystemInfo(systemInfo);
        try {
            systemInfo.lastUpdated = new Date().toISOString();
            this.systemInfo = systemInfo;
            localStorage.setItem('systemSpecifications', JSON.stringify(systemInfo));
            return true;
        } catch (error) {
            console.error('Failed to save system info:', error);
            return false;
        }
    }

    // Delegate modal operations to shared SystemSpecsManager
    showSystemInfoModal() {
        if (window.systemSpecsManager) window.systemSpecsManager.showModal();
    }

    hideSystemInfoModal() {
        if (window.systemSpecsManager) window.systemSpecsManager.hideModal();
    }

    updateSystemInfoDisplay() {
        if (window.systemSpecsManager) window.systemSpecsManager.updateStatusDisplay();
    }

    hasCompleteSystemInfo() {
        if (window.systemSpecsManager) return window.systemSpecsManager.hasCompleteSystemInfo();
        const manual = this.systemInfo.manual;
        if (!manual) return false;
        return !!(manual.systemConfiguration.model &&
               manual.processor.cpu &&
               manual.memory.totalRAM &&
               manual.reportGeneratedBy);
    }

    getTestConfig(testType) {
        const configs = {
            single: { iterations: 2000, iconsPerTest: 1, description: 'Single icon repeated' },
            bulk: { iterations: 50, iconsPerTest: 100, description: '100 icons per test' },
            stress: { iterations: 200, iconsPerTest: 500, description: '500 icons per test' },
            statistical: { iterations: 200, iconsPerTest: 100, description: 'High-power statistical analysis' },
            massive: { iterations: 1000, iconsPerTest: 100, description: 'Maximum statistical power' },
            ultra: { iterations: 10000, iconsPerTest: 100, description: 'Ultra-high statistical power' },
            extreme: { iterations: 20000, iconsPerTest: 100, description: 'Extreme statistical confidence' }
        };
        return configs[testType] || configs.bulk;
    }

    createTestContainer() {
        // Create dynamic test container for bulk icon generation
        let testContainer = document.getElementById('bulkTestContainer');
        if (!testContainer) {
            testContainer = document.createElement('div');
            testContainer.id = 'bulkTestContainer';
            testContainer.style.cssText = `
                width: 100%; 
                height: auto;
                min-height: 300px;
                overflow: auto;
                background: white;
                border-radius: 4px;
                padding: 16px;
                display: block;
                border: 1px solid #e5e5e5;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;
            
            // Append to the rendering tab container
            const renderingTabContainer = document.getElementById('renderingTabContainer');
            if (renderingTabContainer) {
                renderingTabContainer.innerHTML = '';
                renderingTabContainer.appendChild(testContainer);
                testContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Ready to show live icon rendering. Start a test to see icons!</div>';
            } else {
                // Fallback to body if tab container not found
                document.body.appendChild(testContainer);
                testContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Rendering container initialized</div>';
            }
        }
    }

    setupEventListeners() {
        document.getElementById('startTest').addEventListener('click', () => this.startStressTest());
        document.getElementById('stopTest').addEventListener('click', () => this.stopTest());
        document.getElementById('clearResults').addEventListener('click', () => this.clearResults());
        
        // System info button event listener
        const systemInfoBtn = document.getElementById('systemInfoButton');
        if (systemInfoBtn) {
            systemInfoBtn.addEventListener('click', () => this.showSystemInfoModal());
        }
        
        // Only update memory display when not testing to avoid performance interference
        setInterval(() => {
            if (!this.isRunning) {
                this.updateMemoryDisplay();
            }
        }, 5000);
        
        // Update system info display on page load
        setTimeout(() => this.updateSystemInfoDisplay(), 100);
    }

    updateMemoryDisplay() {
        if (performance.memory && document.getElementById('memoryUsage')) {
            const memoryMB = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
            document.getElementById('memoryUsage').textContent = `${memoryMB} MB`;
        }
    }

    async startStressTest() {
        if (this.isRunning) return;
        
        // Complete reset of all state - critical for academic accuracy
        this.resetTestState();
        
        // Academic research anti-throttling measures
        await this.enableResearchMode();
        
        this.isRunning = true;
        this.shouldStop = false;
        this.startTime = performance.now();
        this.results = {};
        this.completedIterations = 0;
        
        // Get test parameters
        const testType = document.getElementById('testType').value;
        const testConfig = this.getTestConfig(testType);
        
        this.totalIterations = testConfig.iterations * this.iconConfigs.length;
        this.iconsPerTest = testConfig.iconsPerTest;
        // Academic research approach - no method selection, always maximum accuracy
        // this.useBatching = false; // Always use straight-through measurement
        this.useBatching = false;
        this.batchSize = this.useBatching ? 10 : testConfig.iterations; // Smaller batches for bulk tests
        
        // Update UI
        this.showProgress(true);
        this.updateProgress('Preparing test environment...', 0);
        
        // Initialize rendering tab for live viewing
        const testContainer = document.getElementById('bulkTestContainer');
        if (testContainer) {
            testContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">🔄 Initializing stress test infrastructure...</div>';
            testContainer.style.display = 'block';
        }
        
        try {
            // Log test parameters for user awareness
            console.log(`Starting stress test: ${testConfig.iterations} iterations × ${this.iconConfigs.length} icon types = ${this.totalIterations} total iterations`);
            this.updateProgress(`Test Configuration: ${this.totalIterations.toLocaleString()} total iterations`, 1);
            
            // Run test for each icon configuration
            for (let configIndex = 0; configIndex < this.iconConfigs.length; configIndex++) {
                const config = this.iconConfigs[configIndex];
                if (this.shouldStop) break;
                
                this.updateProgress(`Starting ${config.name} (${configIndex + 1}/${this.iconConfigs.length})...`, 
                                  (configIndex / this.iconConfigs.length) * 100);
                
                await this.testIconConfiguration(config, testConfig);
            }
            
            if (!this.shouldStop) {
                await this.displayAggregatedResults();
            }
        } catch (error) {
            console.error('Stress test error:', error);
            this.displayError(error.message);
        } finally {
            this.isRunning = false;
            this.showProgress(false);
            // Disable research mode protections
            await this.disableResearchMode();
        }
    }

    async testIconConfiguration(config, testConfig) {
        this.updateProgress(`Testing ${config.name}...`, this.completedIterations / this.totalIterations * 100);
        
        // Update rendering tab with current test info
        const testContainer = document.getElementById('bulkTestContainer');
        if (testContainer) {
            testContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; border-bottom: 1px solid #e5e5e5; margin-bottom: 16px;">
                    <h3 style="margin: 0; color: #333; font-size: 18px;">🧪 Testing: ${config.name}</h3>
                    <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">${testConfig.description} • ${testConfig.iterations} iterations • ${testConfig.iconsPerTest} icons per test</p>
                    <p style="margin: 4px 0 0 0; color: #888; font-size: 12px;">Displaying up to ${testConfig.iconsPerTest} icons below</p>
                </div>
                <div id="iconDisplay" style="
                    display: grid; 
                    grid-template-columns: repeat(20, 1fr); 
                    gap: 2px;
                    max-height: 70vh;
                    overflow-y: auto;
                    border: 1px solid #f0f0f0;
                    border-radius: 4px;
                    padding: 8px;
                ">
                    <div style="text-align: center; color: #666; grid-column: 1/-1; padding: 20px;">Icons will appear here during testing...</div>
                </div>
            `;
        }
        
        const measurements = {
            renderTimes: [],
            memoryUsage: [],
            elementMetrics: null,
            networkMetrics: null,
            bulkMetrics: []
        };

        // Measure network overhead for font-based icons (once)
        if (config.hasNetworkOverhead && !measurements.networkMetrics) {
            measurements.networkMetrics = await this.measureNetworkOverhead();
        }

        // Academic research mode - always run straight through for maximum accuracy
        // UI updates happen in background without affecting timing
        this.updateProgress(`${config.name}: Starting ${testConfig.iterations.toLocaleString()} iterations...`, 
                          this.completedIterations / this.totalIterations * 100);
        
        // Start background progress updates (non-blocking)
        const progressInterval = this.startProgressMonitoring(config, testConfig);
        
        try {
            // Run performance test without interruptions for accuracy
            await this.processBatch(config, 0, testConfig.iterations, measurements, testConfig);
            this.completedIterations += testConfig.iterations;
        } finally {
            // Stop background monitoring
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        }

        // Store aggregated results
        this.results[config.name] = this.calculateStatistics(measurements, testConfig);
    }

    async processBatch(config, startIndex, endIndex, measurements, testConfig) {
        // Get reference element for cloning
        let referenceElement;
        if (config.isCircular) {
            referenceElement = document.querySelectorAll('.ri-code-s-slash-line')[1]; // Circular instance
        } else {
            referenceElement = document.querySelector(config.selector);
        }
        
        if (!referenceElement) {
            throw new Error(`Element not found: ${config.selector}`);
        }

        // Measure element metrics once per configuration
        if (!measurements.elementMetrics) {
            measurements.elementMetrics = this.measureElementMetrics(referenceElement);
        }

        const testContainer = document.getElementById('bulkTestContainer');

        // Run iterations - each iteration tests bulk icon rendering
        for (let i = startIndex; i < endIndex; i++) {
            const startMemory = this.getMemoryUsage();
            
            // Generate and measure bulk icon rendering
            const bulkRenderTime = await this.measureBulkRender(config, referenceElement, testContainer, testConfig.iconsPerTest);
            measurements.renderTimes.push(bulkRenderTime.totalTime);
            measurements.bulkMetrics.push({
                totalTime: bulkRenderTime.totalTime,
                generationTime: bulkRenderTime.generationTime,
                layoutTime: bulkRenderTime.layoutTime,
                iconsRendered: testConfig.iconsPerTest
            });
            
            // Measure memory usage
            const endMemory = this.getMemoryUsage();
            measurements.memoryUsage.push({
                used: endMemory.used - startMemory.used,
                total: endMemory.total
            });
            
            // Clean up for next iteration (but leave last batch visible)
            if (i < endIndex - 1) {
                const iconDisplay = document.getElementById('iconDisplay');
                if (iconDisplay) {
                    iconDisplay.innerHTML = '';
                } else {
                    testContainer.innerHTML = '';
                }
            } else {
                // Keep final batch visible for user to see
                console.log(`Final batch visible: ${testConfig.iconsPerTest} icons`);
            }
        }
    }

    async measureBulkRender(config, referenceElement, testContainer, iconCount) {
        return new Promise((resolve) => {
            const totalStart = performance.now();
            
            // Phase 1: Generate icons
            const generationStart = performance.now();
            this.generateBulkIcons(config, referenceElement, testContainer, iconCount);
            const generationEnd = performance.now();
            
            // Phase 2: Force layout and render
            requestAnimationFrame(() => {
                const layoutStart = performance.now();
                
                // Force complete layout calculation while keeping visible
                testContainer.style.display = 'block';
                testContainer.offsetHeight; // Force reflow
                // Keep container visible during testing
                
                const layoutEnd = performance.now();
                const totalEnd = performance.now();
                
                resolve({
                    totalTime: totalEnd - totalStart,
                    generationTime: generationEnd - generationStart,
                    layoutTime: layoutEnd - layoutStart
                });
            });
        });
    }

    generateBulkIcons(config, referenceElement, testContainer, iconCount) {
        // Find the iconDisplay container or use the main container as fallback
        const iconDisplay = document.getElementById('iconDisplay') || testContainer;
        const fragment = document.createDocumentFragment();
        
        // Clear previous icons if using iconDisplay
        if (iconDisplay.id === 'iconDisplay') {
            iconDisplay.innerHTML = '';
        }
        
        // Add counter showing how many icons are being rendered
        if (iconDisplay.id === 'iconDisplay') {
            const counter = document.createElement('div');
            counter.style.cssText = `
                grid-column: 1/-1;
                text-align: center;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 4px;
                font-size: 12px;
                color: #666;
                margin-bottom: 8px;
            `;
            counter.textContent = `Rendering ${iconCount} icons...`;
            iconDisplay.appendChild(counter);
        }
        
        for (let i = 0; i < iconCount; i++) {
            let iconElement;
            
            if (config.hasNetworkOverhead) {
                // Font-based icon (Remix Icons)
                iconElement = document.createElement('div');
                iconElement.className = 'w-12 h-12 bg-blue-500 rounded flex items-center justify-center m-1 inline-flex';
                const icon = document.createElement('i');
                icon.className = 'ri-code-s-slash-line text-white text-sm';
                iconElement.appendChild(icon);
                
                if (config.isCircular) {
                    iconElement.className = iconElement.className.replace('rounded', 'rounded-full');
                }
            } else {
                // CSS-based icon
                iconElement = document.createElement('div');
                iconElement.className = 'w-12 h-12 bg-blue-500 rounded flex items-center justify-center m-1 inline-flex';
                const iconContent = document.createElement('div');
                iconContent.className = config.selector.substring(1); // Remove the dot
                
                // For minimal/simple CSS icons, let CSS pseudo-elements handle the content
                if (config.name.includes('Minimal') || config.name.includes('Simple')) {
                    // Don't set textContent - let CSS ::after pseudo-element work
                } else if (config.name.includes('Circular') && !config.name.includes('Pure CSS')) {
                    // Circular CSS variant, also uses pseudo-elements
                } else {
                    // Other CSS icons that might need manual content
                    iconContent.textContent = '';
                }
                
                iconElement.appendChild(iconContent);
                
                if (config.name.includes('Circular')) {
                    iconElement.className = iconElement.className.replace('rounded', 'rounded-full');
                }
                
                // Add special structure for Pure CSS icons
                if (config.name.includes('Pure CSS')) {
                    const slashSpan = document.createElement('span');
                    slashSpan.className = 'slash';
                    slashSpan.textContent = '/';
                    iconContent.innerHTML = '';
                    iconContent.appendChild(slashSpan);
                }
            }
            
            fragment.appendChild(iconElement);
        }
        
        // Append icons to the iconDisplay container (or fallback to testContainer)
        iconDisplay.appendChild(fragment);
    }

    measureElementMetrics(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height,
            childNodes: element.childNodes ? element.childNodes.length : 0,
            cssRules: computedStyle.length,
            computedStyles: {
                fontSize: computedStyle.fontSize,
                fontFamily: computedStyle.fontFamily,
                color: computedStyle.color
            }
        };
    }

    async measureNetworkOverhead() {
        const startTime = performance.now();
        const networkRequests = [];
        
        if ('PerformanceObserver' in window) {
            const entries = performance.getEntriesByType('resource');
            entries.forEach(entry => {
                if (entry.name.includes('remixicon') || entry.name.includes('remix')) {
                    networkRequests.push({
                        url: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize || entry.decodedBodySize || 0,
                        startTime: entry.startTime
                    });
                }
            });
        }

        return {
            fontLoadTime: performance.now() - startTime,
            networkRequests: networkRequests,
            totalFontSize: networkRequests.reduce((sum, req) => sum + req.size, 0),
            fontStatus: document.fonts ? document.fonts.status : 'unknown'
        };
    }

    calculateStatistics(measurements, testConfig) {
        const stats = {
            renderTime: this.calculateArrayStats(measurements.renderTimes),
            memoryUsage: {
                used: this.calculateArrayStats(measurements.memoryUsage.map(m => m.used)),
                total: measurements.memoryUsage.length > 0 ? measurements.memoryUsage[measurements.memoryUsage.length - 1].total : 0
            },
            elementMetrics: measurements.elementMetrics,
            networkMetrics: measurements.networkMetrics,
            sampleSize: measurements.renderTimes.length,
            testConfig: testConfig,
            bulkMetrics: measurements.bulkMetrics.length > 0 ? {
                avgIconsPerTest: testConfig.iconsPerTest,
                avgTimePerIcon: this.calculateArrayStats(measurements.bulkMetrics.map(m => m.totalTime / m.iconsRendered)),
                generationTime: this.calculateArrayStats(measurements.bulkMetrics.map(m => m.generationTime)),
                layoutTime: this.calculateArrayStats(measurements.bulkMetrics.map(m => m.layoutTime))
            } : null
        };
        
        return stats;
    }

    calculateArrayStats(values) {
        if (values.length === 0) return { min: 0, max: 0, average: 0, stdDev: 0, median: 0, confidenceInterval: {lower: 0, upper: 0}, standardError: 0 };
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const average = sum / values.length;
        const n = values.length;
        
        const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        const standardError = stdDev / Math.sqrt(n);
        
        // 95% Confidence Interval (t-distribution, df = n-1)
        const tCritical = this.getTCritical(n - 1, 0.05); // 95% confidence
        const marginOfError = tCritical * standardError;
        
        const median = sorted.length % 2 === 0 
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            average: average,
            stdDev: stdDev,
            median: median,
            standardError: standardError,
            confidenceInterval: {
                lower: average - marginOfError,
                upper: average + marginOfError
            },
            sampleSize: n
        };
    }

    // Get t-critical value for confidence intervals
    getTCritical(df, alpha) {
        // Simplified t-table for 95% confidence (alpha = 0.05)
        const tTable = {
            1: 12.706, 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042, 
            40: 2.021, 50: 2.009, 60: 2.000, 100: 1.984, 500: 1.965, 
            1000: 1.962, Infinity: 1.960
        };
        
        // Find closest match
        const keys = Object.keys(tTable).map(k => k === 'Infinity' ? Infinity : parseInt(k));
        for (let i = 0; i < keys.length; i++) {
            if (df <= keys[i]) {
                return tTable[keys[i]];
            }
        }
        return 1.960; // Default to z-score for large samples
    }

    // Calculate statistical power for detecting differences
    calculateStatisticalPower(group1Stats, group2Stats) {
        const pooledStdDev = Math.sqrt(
            ((group1Stats.sampleSize - 1) * Math.pow(group1Stats.stdDev, 2) + 
             (group2Stats.sampleSize - 1) * Math.pow(group2Stats.stdDev, 2)) /
            (group1Stats.sampleSize + group2Stats.sampleSize - 2)
        );
        
        const effectSize = Math.abs(group1Stats.average - group2Stats.average) / pooledStdDev;
        const harmonicMean = 2 * group1Stats.sampleSize * group2Stats.sampleSize / 
                           (group1Stats.sampleSize + group2Stats.sampleSize);
        
        // Simplified power calculation (approximate)
        const delta = effectSize * Math.sqrt(harmonicMean / 2);
        const power = this.normalCDF(delta - 1.96) + (1 - this.normalCDF(delta + 1.96));
        
        return Math.max(0, Math.min(0.999, power));
    }

    // Calculate p-value using Welch's t-test (unequal variances)
    calculatePValue(group1Stats, group2Stats) {
        const n1 = group1Stats.sampleSize;
        const n2 = group2Stats.sampleSize;
        const mean1 = group1Stats.average;
        const mean2 = group2Stats.average;
        const var1 = Math.pow(group1Stats.stdDev, 2);
        const var2 = Math.pow(group2Stats.stdDev, 2);
        
        // Welch's t-test
        const tStat = (mean1 - mean2) / Math.sqrt(var1/n1 + var2/n2);
        
        // Degrees of freedom (Welch-Satterthwaite equation)
        const df = Math.pow(var1/n1 + var2/n2, 2) / 
                  (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
        
        // Two-tailed p-value (approximate)
        const pValue = 2 * (1 - this.tCDF(Math.abs(tStat), df));
        
        return Math.max(0.001, Math.min(0.999, pValue));
    }

    // Approximate normal CDF
    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    // Approximate error function
    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    // Approximate t-distribution CDF
    tCDF(t, df) {
        if (df >= 100) {
            return this.normalCDF(t); // Use normal approximation for large df
        }
        
        // Simplified approximation
        const x = t / Math.sqrt(df);
        return 0.5 + 0.5 * this.erf(x / Math.sqrt(2));
    }

    async displayAggregatedResults() {
        const resultsDiv = document.getElementById('results');
        const testDuration = (performance.now() - this.startTime) / 1000;
        
        let html = `
            <div class="bg-green-50 border border-green-200 p-3 rounded mb-4">
                <h3 class="font-semibold text-green-800">Stress Test Complete!</h3>
                <div class="text-sm text-green-700 mt-1">
                    Total Duration: ${testDuration.toFixed(1)}s | 
                    Total Iterations: ${this.completedIterations.toLocaleString()} | 
                    Average Speed: ${(this.completedIterations / testDuration).toFixed(1)} iterations/sec
                </div>
                <div class="text-xs text-green-600 mt-2 p-2 bg-green-100 rounded">
                    <strong>🌐 Browser-Specific Results:</strong> These results are specific to your current browser environment. 
                    Export data includes full browser identification for reproducibility.
                </div>
            </div>
        `;

        // Add Export Buttons Section
        html += '<div class="bg-blue-50 border border-blue-200 p-4 rounded mb-4">';
        html += '<h3 class="font-semibold text-blue-800 mb-3">Export Test Results</h3>';
        html += '<div class="flex flex-wrap gap-2 mb-2">';
        html += '<button onclick="window.stressTestManager.exportResultsAsJSON()" ';
        html += 'class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">';
        html += '📄 Export JSON (with system specs)</button>';
        html += '</div>';
        html += '<div class="text-xs text-blue-600">';
        html += '✓ Exported results include browser identification and system specifications for scientific reproducibility';
        html += '</div>';
        html += '</div>';

        // Performance comparison table
        html += '<div class="bg-white rounded border overflow-hidden mb-4">';
        html += '<h3 class="font-semibold p-3 bg-gray-50 border-b">Performance Statistics & Statistical Analysis</h3>';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-xs">';
        html += '<thead><tr class="bg-gray-50 border-b">';
        html += '<th class="p-2 text-left">Icon Type</th>';
        html += '<th class="p-2 text-center">Bulk Render Time ± 95% CI (ms)</th>';
        html += '<th class="p-2 text-center">Icons Per Test</th>';
        html += '<th class="p-2 text-center">Time Per Icon (ms)</th>';
        html += '<th class="p-2 text-center">Sample Size</th>';
        html += '</tr></thead><tbody>';

        // Sort results by average render time
        const sortedResults = Object.entries(this.results).sort((a, b) => 
            a[1].renderTime.average - b[1].renderTime.average
        );

        for (const [iconType, data] of sortedResults) {
            const isRemixIcon = iconType.includes('Font') || iconType.includes('Remix');
            const rowClass = isRemixIcon ? 'bg-blue-25' : '';
            const ci = data.renderTime.confidenceInterval;
            const timePerIcon = data.bulkMetrics ? data.bulkMetrics.avgTimePerIcon.average : 0;
            const iconsPerTest = data.testConfig ? data.testConfig.iconsPerTest : 1;
            
            html += `<tr class="${rowClass} border-b">`;
            html += `<td class="p-2 font-medium">${iconType}</td>`;
            html += `<td class="p-2 text-center">${data.renderTime.average.toFixed(3)} ± [${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]</td>`;
            html += `<td class="p-2 text-center">${iconsPerTest}</td>`;
            html += `<td class="p-2 text-center">${timePerIcon.toFixed(4)}</td>`;
            html += `<td class="p-2 text-center">${data.sampleSize.toLocaleString()}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table></div></div>';

        // Statistical Analysis Table
        html += this.generateStatisticalAnalysisTable(sortedResults);

        // Detailed analysis
        html += this.generateDetailedAnalysis(sortedResults, testDuration);
        
        resultsDiv.innerHTML = html;
        
        // Save results to localStorage
        this.saveResultsToStorage(sortedResults, testDuration);
    }

    saveResultsToStorage(sortedResults, testDuration) {
        try {
            // Prepare statistical analysis data
            const statisticsData = {};
            if (sortedResults.length >= 2) {
                const baseline = sortedResults[0];
                const baselineStats = baseline[1].renderTime;
                
                for (let i = 1; i < sortedResults.length; i++) {
                    const comparison = sortedResults[i];
                    const comparisonStats = comparison[1].renderTime;
                    
                    const pValue = this.calculatePValue(baselineStats, comparisonStats);
                    const power = this.calculateStatisticalPower(baselineStats, comparisonStats);
                    const effectSize = Math.abs(baselineStats.average - comparisonStats.average) / 
                                     Math.sqrt((Math.pow(baselineStats.stdDev, 2) + Math.pow(comparisonStats.stdDev, 2)) / 2);
                    
                    statisticsData[`${comparison[0]} vs ${baseline[0]}`] = {
                        pValue,
                        power,
                        effectSize,
                        isSignificant: pValue < 0.05,
                        significanceLevel: pValue < 0.001 ? 'highly' : pValue < 0.01 ? 'very' : 'significant'
                    };
                }
            }

            const testResults = {
                testDate: new Date().toISOString(),
                testType: 'css',
                iterations: this.completedIterations,
                testDuration: testDuration,
                results: Object.fromEntries(sortedResults),
                statisticalAnalysis: statisticsData,
                performanceRanking: sortedResults.map(([iconType, data], index) => ({
                    rank: index + 1,
                    iconType,
                    averageTime: data.renderTime.average,
                    confidenceInterval: data.renderTime.confidenceInterval,
                    standardDeviation: data.renderTime.stdDev,
                    sampleSize: data.sampleSize
                })),
                testMetadata: {
                    ...this.getBrowserInfo(), // Enhanced browser information
                    testingEnvironment: 'In-Browser (Single Browser)',
                    browserSpecific: true,
                    timestamp: performance.now(),
                    iterationsPerSecond: this.completedIterations / testDuration,
                    testingNote: 'Results are specific to this browser environment and are not comparable across different browsers without additional multi-browser testing'
                },
                // Add test configuration for reproducibility
                testConfiguration: this.getCurrentTestConfig(),
                // Include comprehensive system specifications for scientific reproducibility
                systemSpecifications: {
                    ...this.systemInfo,
                    reportIncluded: this.hasCompleteSystemInfo(),
                    dataCollectionGuidance: {
                        recommendedTool: "Belarc Advisor (free from belarc.com)",
                        alternativeTools: [
                            "Windows System Information (msinfo32)",
                            "macOS System Information",
                            "Linux: lshw, lscpu, dmidecode commands"
                        ],
                        importanceNote: "System specifications are critical for reproducible performance measurements and scientific comparison of results across different hardware configurations."
                    }
                }
            };

            localStorage.setItem('iconTestResults_css', JSON.stringify(testResults));
            console.log('CSS test results saved to localStorage');
            
            // Also save to past results history for archival
            this.saveToPastResults(testResults);
            
        } catch (error) {
            console.error('Failed to save results to localStorage:', error);
        }
    }

    getCurrentTestConfig() {
        const testTypeElement = document.getElementById('testType');
        const testMethodElement = document.getElementById('testMethod');
        
        const testType = testTypeElement ? testTypeElement.value : 'unknown';
        const testMethod = testMethodElement ? testMethodElement.value : 'straight';
        const testConfig = this.getTestConfig(testType);
        
        return {
            testType: testType,
            testMethod: testMethod,
            iterations: testConfig.iterations,
            iconsPerTest: testConfig.iconsPerTest,
            description: testConfig.description,
            batchSize: this.batchSize,
            useBatching: this.useBatching
        };
    }

    saveToPastResults(testResults) {
        try {
            // Get existing past results
            const existingResults = localStorage.getItem('iconTestHistory');
            const pastResults = existingResults ? JSON.parse(existingResults) : [];
            
            // Create comprehensive history entry
            const historyEntry = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                testDate: testResults.testDate,
                
                // Test Configuration
                testConfiguration: {
                    testType: testResults.testConfiguration?.testType || 'unknown',
                    testTypeDescription: this.getTestTypeDescription(testResults.testConfiguration?.testType),
                    iterations: testResults.iterations,
                    testDuration: testResults.testDuration,
                    iterationsPerSecond: testResults.testMetadata?.iterationsPerSecond || (testResults.iterations / testResults.testDuration),
                    method: testResults.testConfiguration?.testMethod || 'straight',
                    iconsPerTest: testResults.testConfiguration?.iconsPerTest || 100,
                    batchSize: testResults.testConfiguration?.batchSize || 50
                },

                // System Environment
                systemInfo: {
                    userAgent: testResults.testMetadata?.userAgent || navigator.userAgent,
                    timestamp: testResults.testMetadata?.timestamp || performance.now(),
                    screenResolution: `${screen.width}x${screen.height}`,
                    colorDepth: screen.colorDepth,
                    platform: navigator.platform,
                    memory: performance.memory ? {
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        usedJSHeapSize: performance.memory.usedJSHeapSize
                    } : null
                },

                // Complete Results
                results: testResults.results,
                statisticalAnalysis: testResults.statisticalAnalysis || {},
                performanceRanking: testResults.performanceRanking || [],
                
                // Summary Statistics
                summary: {
                    fastestIconType: this.getFastestIcon(testResults.performanceRanking),
                    slowestIconType: this.getSlowestIcon(testResults.performanceRanking),
                    significantDifferences: this.getSignificantCount(testResults.statisticalAnalysis),
                    averageRenderTime: this.getAverageRenderTime(testResults.results),
                    performanceSpread: this.getPerformanceSpread(testResults.performanceRanking)
                },

                // Source tracking for provenance
                sourceInfo: {
                    originalSource: this.detectOriginalSource(),
                    fileName: 'Current Data',
                    importedAt: null
                }
            };

            // Add to beginning of array
            pastResults.unshift(historyEntry);
            
            // Keep only last 50 results to prevent localStorage overflow
            if (pastResults.length > 50) {
                pastResults.splice(50);
            }
            
            localStorage.setItem('iconTestHistory', JSON.stringify(pastResults));
            localStorage.setItem('lastSavedResultId', historyEntry.timestamp);
            console.log('Test result saved to past results history');
            
        } catch (error) {
            console.error('Failed to save to past results:', error);
        }
    }

    getTestTypeDescription(testType) {
        const descriptions = {
            'css': 'CSS Test (legacy)',
            'single': 'Single Icon Test (2,000 iterations)',
            'bulk': 'Bulk Icon Test (100 icons × 50 iterations)', 
            'stress': 'Stress Test (500 icons × 200 iterations)',
            'statistical': 'Statistical Power Test (100 icons × 200 iterations)',
            'massive': 'Maximum Power Test (100 icons × 1,000 iterations)',
            'ultra': 'Ultra Power Test (100 icons × 5,000 iterations)',
            'extreme': 'Extreme Power Test (100 icons × 10,000 iterations)'
        };
        return descriptions[testType] || 'Unknown Test Type';
    }

    detectOriginalSource() {
        // Determine which test page we are on based on the current URL
        const path = window.location.pathname;
        const fileName = path.split('/').pop() || 'unknown';
        return fileName;
    }

    getFastestIcon(ranking) {
        return ranking && ranking.length > 0 ? ranking[0].iconType : 'Unknown';
    }

    getSlowestIcon(ranking) {
        return ranking && ranking.length > 0 ? ranking[ranking.length - 1].iconType : 'Unknown';
    }

    getSignificantCount(analysis) {
        if (!analysis) return 0;
        return Object.values(analysis).filter(stat => stat.isSignificant).length;
    }

    getAverageRenderTime(results) {
        if (!results) return 0;
        const times = Object.values(results).map(r => r.renderTime?.average || 0);
        return times.reduce((a, b) => a + b, 0) / times.length;
    }

    getPerformanceSpread(ranking) {
        if (!ranking || ranking.length < 2) return 0;
        const fastest = ranking[0].averageTime;
        const slowest = ranking[ranking.length - 1].averageTime;
        return ((slowest - fastest) / fastest * 100);
    }

    generateStatisticalSummary(sortedResults) {
        if (sortedResults.length < 2) return null;
        
        const fastest = sortedResults[0][1].renderTime;
        const slowest = sortedResults[sortedResults.length - 1][1].renderTime;
        
        return {
            fastestMethod: sortedResults[0][0],
            slowestMethod: sortedResults[sortedResults.length - 1][0],
            speedDifference: slowest.average / fastest.average,
            pValue: this.calculatePValue(fastest, slowest),
            statisticalPower: this.calculateStatisticalPower(fastest, slowest),
            confidenceIntervalsOverlap: !(fastest.confidenceInterval.upper < slowest.confidenceInterval.lower)
        };
    }

    generateStatisticalAnalysisTable(sortedResults) {
        if (sortedResults.length < 2) return '';
        
        let html = '<div class="bg-white rounded border overflow-hidden mb-4">';
        html += '<h3 class="font-semibold p-3 bg-gray-50 border-b">Statistical Significance Analysis</h3>';
        html += '<div class="overflow-x-auto">';
        html += '<table class="w-full text-xs">';
        html += '<thead><tr class="bg-gray-50 border-b">';
        html += '<th class="p-2 text-left">Comparison</th>';
        html += '<th class="p-2 text-center">P-Value</th>';
        html += '<th class="p-2 text-center">Significance</th>';
        html += '<th class="p-2 text-center">Statistical Power</th>';
        html += '<th class="p-2 text-center">Effect Size</th>';
        html += '<th class="p-2 text-center">Confidence</th>';
        html += '</tr></thead><tbody>';

        // Compare each method against the fastest (baseline)
        const baseline = sortedResults[0];
        const baselineStats = baseline[1].renderTime;
        
        for (let i = 1; i < sortedResults.length; i++) {
            const comparison = sortedResults[i];
            const comparisonStats = comparison[1].renderTime;
            
            const pValue = this.calculatePValue(baselineStats, comparisonStats);
            const power = this.calculateStatisticalPower(baselineStats, comparisonStats);
            const effectSize = Math.abs(baselineStats.average - comparisonStats.average) / 
                             Math.sqrt((Math.pow(baselineStats.stdDev, 2) + Math.pow(comparisonStats.stdDev, 2)) / 2);
            
            const isSignificant = pValue < 0.05;
            const significanceText = isSignificant ? 
                (pValue < 0.001 ? 'Highly Significant***' : pValue < 0.01 ? 'Very Significant**' : 'Significant*') : 
                'Not Significant';
            const significanceColor = isSignificant ? 'text-green-600' : 'text-red-600';
            
            const powerText = power > 0.8 ? 'High' : power > 0.5 ? 'Medium' : 'Low';
            const powerColor = power > 0.8 ? 'text-green-600' : power > 0.5 ? 'text-yellow-600' : 'text-red-600';
            
            const effectSizeText = effectSize > 0.8 ? 'Large' : effectSize > 0.5 ? 'Medium' : 'Small';
            
            html += `<tr class="border-b">`;
            html += `<td class="p-2 font-medium">${comparison[0]} vs ${baseline[0]}</td>`;
            html += `<td class="p-2 text-center">${pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}</td>`;
            html += `<td class="p-2 text-center ${significanceColor}">${significanceText}</td>`;
            html += `<td class="p-2 text-center ${powerColor}">${powerText} (${power.toFixed(2)})</td>`;
            html += `<td class="p-2 text-center">${effectSizeText} (${effectSize.toFixed(2)})</td>`;
            html += `<td class="p-2 text-center">${!isSignificant ? 'Low' : power > 0.8 ? 'High' : 'Medium'}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table></div>';
        
        // Statistical interpretation
        html += '<div class="p-3 bg-gray-50 text-xs">';
        html += '<div class="mb-2"><strong>Statistical Interpretation:</strong></div>';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">';
        html += '<div>• <strong>P-Value < 0.05:</strong> Statistically significant difference</div>';
        html += '<div>• <strong>Power > 0.8:</strong> High confidence in detecting real differences</div>';
        html += '<div>• <strong>Effect Size > 0.5:</strong> Meaningful practical difference</div>';
        html += '<div>• <strong>95% CI:</strong> True average lies within this range 95% of the time</div>';
        html += '</div></div>';
        
        html += '</div>';
        return html;
    }

    generateDetailedAnalysis(sortedResults, testDuration) {
        let html = '<div class="space-y-4">';
        
        // Performance ranking
        html += '<div class="bg-white p-4 rounded border">';
        html += '<h4 class="font-semibold mb-3">Performance Ranking</h4>';
        
        sortedResults.forEach(([iconType, data], index) => {
            const rank = index + 1;
            const rankColor = rank === 1 ? 'text-green-600' : rank === sortedResults.length ? 'text-red-600' : 'text-gray-600';
            html += `<div class="flex justify-between items-center py-1">`;
            html += `<span class="${rankColor} font-medium">#${rank} ${iconType}</span>`;
            html += `<span class="text-sm">${data.renderTime.average.toFixed(3)}ms avg</span>`;
            html += '</div>';
        });
        html += '</div>';

        // Network overhead analysis
        const fontIcon = sortedResults.find(([name]) => name.includes('Font') || name.includes('Remix'));
        if (fontIcon && fontIcon[1].networkMetrics) {
            const networkData = fontIcon[1].networkMetrics;
            html += '<div class="bg-yellow-50 border border-yellow-200 p-4 rounded">';
            html += '<h4 class="font-semibold text-yellow-800 mb-3">Network Overhead (Font-based Icons)</h4>';
            html += '<div class="grid grid-cols-2 gap-4 text-sm">';
            html += `<div><strong>Font Load Time:</strong> ${networkData.fontLoadTime.toFixed(2)}ms</div>`;
            html += `<div><strong>Font File Size:</strong> ${this.formatMemory(networkData.totalFontSize)}</div>`;
            html += `<div><strong>Network Requests:</strong> ${networkData.networkRequests.length}</div>`;
            html += `<div><strong>Font Status:</strong> ${networkData.fontStatus}</div>`;
            html += '</div></div>';
        }

        // Speed comparison with statistical confidence
        if (sortedResults.length > 1) {
            const fastest = sortedResults[0][1].renderTime;
            const slowest = sortedResults[sortedResults.length - 1][1].renderTime;
            const speedDiff = (slowest.average / fastest.average).toFixed(1);
            const pValue = this.calculatePValue(fastest, slowest);
            const power = this.calculateStatisticalPower(fastest, slowest);
            
            html += '<div class="bg-blue-50 border border-blue-200 p-4 rounded">';
            html += '<h4 class="font-semibold text-blue-800 mb-3">Statistical Performance Analysis</h4>';
            html += '<div class="grid grid-cols-2 gap-4 text-sm">';
            html += `<div><strong>Speed Difference:</strong> ${speedDiff}x faster</div>`;
            html += `<div><strong>Statistical Significance:</strong> p = ${pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}</div>`;
            html += `<div><strong>Statistical Power:</strong> ${power.toFixed(2)} (${power > 0.8 ? 'High' : power > 0.5 ? 'Medium' : 'Low'})</div>`;
            html += `<div><strong>Total Test Time:</strong> ${testDuration.toFixed(1)}s</div>`;
            html += `<div><strong>Fastest Method:</strong> ${sortedResults[0][0]}</div>`;
            html += `<div><strong>Slowest Method:</strong> ${sortedResults[sortedResults.length - 1][0]}</div>`;
            
            // Add confidence interval comparison
            const fastestCI = fastest.confidenceInterval;
            const slowestCI = slowest.confidenceInterval;
            html += `<div class="col-span-2 border-t pt-2 mt-2">`;
            html += `<div><strong>95% Confidence Intervals:</strong></div>`;
            html += `<div class="ml-2">Fastest: ${fastestCI.lower.toFixed(3)} - ${fastestCI.upper.toFixed(3)} ms</div>`;
            html += `<div class="ml-2">Slowest: ${slowestCI.lower.toFixed(3)} - ${slowestCI.upper.toFixed(3)} ms</div>`;
            html += `<div class="ml-2 mt-1 ${fastestCI.upper < slowestCI.lower ? 'text-green-600' : 'text-orange-600'}">`;
            html += `Confidence intervals ${fastestCI.upper < slowestCI.lower ? 'do not overlap' : 'overlap'} `;
            html += `(${fastestCI.upper < slowestCI.lower ? 'strong evidence of difference' : 'some uncertainty in ranking'})</div>`;
            html += `</div>`;
            
            html += '</div></div>';
        }

        html += '</div>';
        return html;
    }

    formatMemory(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return { used: 0, total: 0, limit: 0 };
    }

    updateProgress(message, percentage) {
        // Minimal updates during testing to avoid performance interference
        if (document.getElementById('currentIcon')) {
            document.getElementById('currentIcon').textContent = message;
        }
        if (document.getElementById('progressText')) {
            document.getElementById('progressText').textContent = `${percentage.toFixed(0)}%`;
        }
        if (document.getElementById('progressBar')) {
            document.getElementById('progressBar').style.width = `${percentage}%`;
        }
        if (document.getElementById('currentIteration')) {
            document.getElementById('currentIteration').textContent = this.completedIterations.toLocaleString();
        }
        
        // Only update time-based info occasionally to reduce overhead
        if (this.completedIterations % 100 === 0 || percentage >= 99) {
            if (document.getElementById('elapsedTime')) {
                const elapsed = (performance.now() - this.startTime) / 1000;
                document.getElementById('elapsedTime').textContent = `${elapsed.toFixed(1)}s`;
            }
            if (document.getElementById('eta') && percentage > 5) {
                const elapsed = (performance.now() - this.startTime) / 1000;
                const totalEstimated = (elapsed / percentage) * 100;
                const remaining = totalEstimated - elapsed;
                document.getElementById('eta').textContent = remaining > 0 ? `${remaining.toFixed(0)}s` : 'Almost done';
            }
        }
    }

    showProgress(show) {
        const progressDiv = document.getElementById('testProgress');
        const startBtn = document.getElementById('startTest');
        const stopBtn = document.getElementById('stopTest');
        
        if (show) {
            progressDiv.classList.remove('hidden');
            startBtn.disabled = true;
            startBtn.textContent = 'Testing...';
            startBtn.classList.add('opacity-50', 'cursor-not-allowed');
            stopBtn.classList.remove('hidden');
        } else {
            progressDiv.classList.add('hidden');
            startBtn.disabled = false;
            startBtn.textContent = 'Start Stress Test';
            startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            stopBtn.classList.add('hidden');
        }
    }

    stopTest() {
        this.shouldStop = true;
        this.isRunning = false;
        this.clearActiveIntervals();
        this.showProgress(false);
        
        // Ensure research mode is disabled on stop
        this.disableResearchMode();
        
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Test stopped by user.</div>';
    }

    async enableResearchMode() {
        console.log('🔬 Enabling Academic Research Mode - Anti-throttling measures');
        
        try {
            // 1. Request Screen Wake Lock (prevents system sleep)
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('✅ Screen wake lock acquired');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('⚠️ Screen wake lock was released');
                });
            }
        } catch (err) {
            console.warn('⚠️ Could not acquire wake lock:', err);
        }
        
        try {
            // 2. Silent audio context (prevents browser throttling)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.antiThrottleAudio = new AudioContext();
                const oscillator = this.antiThrottleAudio.createOscillator();
                const gainNode = this.antiThrottleAudio.createGain();
                
                // Silent audio at 0 volume
                gainNode.gain.setValueAtTime(0, this.antiThrottleAudio.currentTime);
                oscillator.connect(gainNode);
                gainNode.connect(this.antiThrottleAudio.destination);
                oscillator.frequency.setValueAtTime(440, this.antiThrottleAudio.currentTime);
                oscillator.start();
                
                console.log('✅ Anti-throttling audio context active');
            }
        } catch (err) {
            console.warn('⚠️ Could not create anti-throttle audio:', err);
        }
        
        // 3. Page Visibility monitoring
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // 4. Focus/blur monitoring
        window.addEventListener('focus', this.handleFocus.bind(this));
        window.addEventListener('blur', this.handleBlur.bind(this));
        
        console.log('🎯 Research mode enabled - Tab prioritized for accurate measurement');
    }
    
    async disableResearchMode() {
        console.log('🔬 Disabling Research Mode');
        
        try {
            // Release wake lock
            if (this.wakeLock) {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('✅ Screen wake lock released');
            }
        } catch (err) {
            console.warn('⚠️ Error releasing wake lock:', err);
        }
        
        try {
            // Stop anti-throttle audio
            if (this.antiThrottleAudio) {
                await this.antiThrottleAudio.close();
                this.antiThrottleAudio = null;
                console.log('✅ Anti-throttling audio stopped');
            }
        } catch (err) {
            console.warn('⚠️ Error stopping anti-throttle audio:', err);
        }
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.removeEventListener('focus', this.handleFocus.bind(this));
        window.removeEventListener('blur', this.handleBlur.bind(this));
    }
    
    handleVisibilityChange() {
        if (this.isRunning) {
            console.log(`📊 Tab visibility: ${document.hidden ? 'HIDDEN' : 'VISIBLE'} - Test: ${this.isRunning ? 'RUNNING' : 'STOPPED'}`);
            if (document.hidden) {
                console.warn('⚠️ WARNING: Tab hidden during test - May affect measurement accuracy!');
            }
        }
    }
    
    handleFocus() {
        if (this.isRunning) {
            console.log('🎯 Window focused - Optimal for testing');
        }
    }
    
    handleBlur() {
        if (this.isRunning) {
            console.warn('⚠️ WARNING: Window lost focus during test - May affect performance!');
        }
    }

    resetTestState() {
        // Critical: Clear all running intervals to prevent state corruption
        this.clearActiveIntervals();
        
        // Reset all internal state
        this.isRunning = false;
        this.shouldStop = false;
        this.results = {};
        this.completedIterations = 0;
        this.totalIterations = 0;
        this.startTime = 0;
        
        // Reset UI state
        this.showProgress(false);
        
        // Clear any existing test container content
        const testContainer = document.getElementById('bulkTestContainer');
        if (testContainer) {
            testContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Ready for new test</div>';
        }
    }
    
    clearActiveIntervals() {
        // Clear all tracked intervals to prevent interference
        this.activeIntervals.forEach(interval => clearInterval(interval));
        this.activeIntervals = [];
    }

    clearResults() {
        this.resetTestState();
        document.getElementById('results').innerHTML = '<div class="text-gray-500">No tests run yet. Click "Start Stress Test" to begin performance analysis.</div>';
    }

    displayError(message) {
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: ${message}</div>`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    startProgressMonitoring(config, testConfig) {
        // Non-blocking progress monitoring that estimates completion
        const startTime = performance.now();
        const targetIterations = testConfig.iterations;
        
        const interval = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const estimatedTotal = targetIterations * 16.3; // Rough estimate based on typical icon render time
            const estimatedProgress = Math.min(95, (elapsed / estimatedTotal) * 100);
            
            const progressText = `${config.name}: ~${Math.round((estimatedProgress/100) * targetIterations).toLocaleString()}/${targetIterations.toLocaleString()} estimated`;
            this.updateProgress(progressText, (this.completedIterations / this.totalIterations * 100) + (estimatedProgress * testConfig.iterations / this.totalIterations / 100));
            
            // Update memory display during long tests
            if (this.isRunning) {
                this.updateMemoryDisplay();
            }
        }, 2000); // Update every 2 seconds without blocking performance measurement
        
        // Track interval for cleanup
        this.activeIntervals.push(interval);
        
        return interval;
    }

    // Export functionality for test results
    exportResultsAsJSON() {
        try {
            const results = localStorage.getItem('iconTestResults_css');
            if (!results) {
                alert('No test results found. Please run a test first.');
                return;
            }
            
            const testData = JSON.parse(results);
            
            // Create enhanced export data with prominent browser information
            const browserInfo = this.getBrowserInfo();
            const exportData = {
                exportInfo: {
                    exportDate: new Date().toISOString(),
                    exportType: 'Icon Performance Test Results',
                    testingEnvironment: 'In-Browser Testing (Single Browser)',
                    browserSpecificWarning: 'These results are specific to the browser environment in which they were generated'
                },
                browserInformation: {
                    primaryBrowser: browserInfo.browserName,
                    fullUserAgent: browserInfo.userAgent,
                    platform: browserInfo.platform,
                    language: browserInfo.language,
                    hardwareConcurrency: browserInfo.hardwareConcurrency,
                    userAgentExplanation: browserInfo.userAgentNote || 'Browser identification parsed from userAgent string'
                },
                testResults: testData,
                reproducibilityNote: 'For cross-browser comparisons, run equivalent tests in each target browser environment'
            };
        
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `icon-performance-results-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Test results exported successfully');
        } catch (error) {
            console.error('Failed to export results:', error);
            alert('Failed to export results. Please try again.');
        }
    }
}

// Initialize the stress test manager when DOM is ready

document.addEventListener('DOMContentLoaded', function() {
    stressTestManager = new StressTestManager();
});