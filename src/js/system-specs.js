/**
 * System Specifications Module
 * Shared across all test pages for reproducible results.
 * Provides auto-detection, manual entry modal, and Belarc Advisor import.
 */
class SystemSpecsManager {
    constructor() {
        this.systemInfo = this.loadSystemInfo();
        this.modalInitialized = false;
    }

    // ─── i18n helper ─────────────────────────────────────────────
    t(key, fallback) {
        if (window.i18n && typeof window.i18n.translate === 'function') {
            const val = window.i18n.translate(key);
            if (val && val !== key) return val;
        }
        return fallback || key;
    }

    // ─── Persistence ─────────────────────────────────────────────
    loadSystemInfo() {
        try {
            const stored = localStorage.getItem('systemSpecifications');
            return stored ? JSON.parse(stored) : this.getDefaultSystemInfo();
        } catch (error) {
            console.warn('Failed to load system info:', error);
            return this.getDefaultSystemInfo();
        }
    }

    saveSystemInfo(systemInfo) {
        try {
            systemInfo.lastUpdated = new Date().toISOString();
            this.systemInfo = systemInfo;
            localStorage.setItem('systemSpecifications', JSON.stringify(systemInfo));
            console.log('System information saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save system info:', error);
            return false;
        }
    }

    // ─── Auto-detection ──────────────────────────────────────────
    getDefaultSystemInfo() {
        return {
            lastUpdated: new Date().toISOString(),
            autoDetected: this.detectClientInfo(),
            manual: {
                systemConfiguration: { model: '', operatingSystem: '', bootMode: '' },
                processor: { cpu: '', architecture: '', cores: '', cache: '', generation: '' },
                memory: { totalRAM: '', configuration: '', speed: '' },
                graphics: { integrated: '', discrete: '', driverVersion: '' },
                storage: { systemDrive: '', additionalDrives: '', performance: '' },
                network: { connection: '', router: '', speed: '' },
                reportGeneratedBy: ''
            }
        };
    }

    detectClientInfo() {
        const info = {
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
                resolution: `${screen.width}\u00d7${screen.height}`,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio
            },
            gpu: this.detectGPU(),
            touchSupport: navigator.maxTouchPoints > 0,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            languages: navigator.languages ? navigator.languages.join(', ') : navigator.language
        };
        return info;
    }

    detectGPU() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'unknown';
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) return 'WebGL supported (details unavailable)';
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Clean up context
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
            return `${vendor} — ${renderer}`;
        } catch {
            return 'unknown';
        }
    }

    hasCompleteSystemInfo() {
        const manual = this.systemInfo.manual;
        if (!manual) return false;
        // Treat specs as provided when any manual field has been filled in
        const sections = [
            manual.systemConfiguration,
            manual.processor,
            manual.memory,
            manual.graphics,
            manual.storage,
            manual.network
        ];
        for (const section of sections) {
            if (section && typeof section === 'object') {
                for (const val of Object.values(section)) {
                    if (val && typeof val === 'string' && val.trim()) return true;
                }
            }
        }
        return !!(manual.reportGeneratedBy && manual.reportGeneratedBy.trim());
    }

    // ─── Modal creation ──────────────────────────────────────────
    initializeModal() {
        if (this.modalInitialized) return;
        if (document.getElementById('systemInfoModal')) return;

        const modal = document.createElement('div');
        modal.id = 'systemInfoModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'systemInfoModalTitle');
        modal.innerHTML = this.buildModalHTML();
        document.body.appendChild(modal);
        this.setupModalEvents();
        this.modalInitialized = true;
    }

    buildModalHTML() {
        return `
            <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 id="systemInfoModalTitle" class="text-xl font-bold text-gray-800">
                        ${this.t('sysspec.modal_title', 'System Information for Reproducible Results')}
                    </h2>
                    <button id="closeSystemModal" class="text-gray-500 hover:text-gray-700 text-2xl" aria-label="${this.t('sysspec.close', 'Close')}">&times;</button>
                </div>

                <!-- Belarc Advisor recommendation -->
                <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 class="font-semibold text-blue-800 mb-2">📋 ${this.t('sysspec.belarc_title', 'Recommended: Use Belarc Advisor')}</h3>
                    <p class="text-sm text-blue-700 mb-3">
                        ${this.t('sysspec.belarc_desc', 'For comprehensive system information, we recommend using <strong>Belarc Advisor</strong> (free tool) to generate a detailed system report. This ensures accurate hardware specifications for scientific reproducibility.')}
                    </p>
                    <div class="text-xs text-blue-600 mb-3">
                        <p><strong>${this.t('sysspec.belarc_steps_title', 'Steps:')}</strong></p>
                        <ol class="list-decimal list-inside ml-2 space-y-1">
                            <li>${this.t('sysspec.belarc_step1', 'Download Belarc Advisor from belarc.com/free_download.html')}</li>
                            <li>${this.t('sysspec.belarc_step2', 'Run the tool to generate your system report')}</li>
                            <li>${this.t('sysspec.belarc_step3', 'Save the report as an HTML file (File → Save As)')}</li>
                            <li>${this.t('sysspec.belarc_step4', 'Click "Import Belarc Report" below to auto-fill fields')}</li>
                        </ol>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button id="importBelarcBtn" class="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center">
                            <span class="mr-1">📥</span> ${this.t('sysspec.import_belarc', 'Import Belarc Report')}
                        </button>
                        <input type="file" id="belarcFileInput" accept=".html,.htm" class="hidden" aria-label="${this.t('sysspec.import_belarc', 'Import Belarc Report')}" />
                        <a href="https://www.belarc.com/free_download.html" target="_blank" rel="noopener noreferrer"
                           class="px-3 py-1.5 border border-blue-300 text-blue-700 rounded text-sm hover:bg-blue-100 flex items-center">
                            <span class="mr-1">🔗</span> ${this.t('sysspec.download_belarc', 'Download Belarc Advisor')}
                        </a>
                    </div>
                </div>

                <!-- Import status message -->
                <div id="belarcImportStatus" class="hidden mb-4 p-3 rounded text-sm"></div>

                <!-- Manual entry fields -->
                <div class="grid md:grid-cols-2 gap-4 mb-6">
                    <!-- System Configuration -->
                    <div class="space-y-3">
                        <h3 class="font-semibold text-gray-800">${this.t('sysspec.section_system', 'System Configuration')}</h3>
                        <div>
                            <label for="systemModel" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_model', 'System Model')}</label>
                            <input type="text" id="systemModel"
                                   placeholder="${this.t('sysspec.ph_model', 'e.g., MSI GE72 6QF Rev 1.0 Gaming Laptop')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="operatingSystem" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_os', 'Operating System')}</label>
                            <input type="text" id="operatingSystem"
                                   placeholder="${this.t('sysspec.ph_os', 'e.g., Windows 10 Home x64 Version 2009 (Build 19045.6937)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="bootMode" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_boot', 'Boot Mode')}</label>
                            <input type="text" id="bootMode"
                                   placeholder="${this.t('sysspec.ph_boot', 'e.g., UEFI with Secure Boot enabled')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>

                    <!-- Processor -->
                    <div class="space-y-3">
                        <h3 class="font-semibold text-gray-800">${this.t('sysspec.section_processor', 'Processor')}</h3>
                        <div>
                            <label for="cpu" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_cpu', 'CPU')}</label>
                            <input type="text" id="cpu"
                                   placeholder="${this.t('sysspec.ph_cpu', 'e.g., Intel Core i7-6700HQ @ 2.60 GHz')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="architecture" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_arch', 'Architecture')}</label>
                            <input type="text" id="architecture"
                                   placeholder="${this.t('sysspec.ph_arch', 'e.g., 64-bit, 4 physical cores, 8 logical processors')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="cache" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_cache', 'Cache')}</label>
                            <input type="text" id="cache"
                                   placeholder="${this.t('sysspec.ph_cache', 'e.g., 256KB L1, 1MB L2, 6MB L3')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="generation" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_gen', 'Generation')}</label>
                            <input type="text" id="generation"
                                   placeholder="${this.t('sysspec.ph_gen', 'e.g., 6th Gen Intel Core (Skylake, 14nm)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>

                    <!-- Memory -->
                    <div class="space-y-3">
                        <h3 class="font-semibold text-gray-800">${this.t('sysspec.section_memory', 'Memory System')}</h3>
                        <div>
                            <label for="totalRAM" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_ram', 'Total RAM')}</label>
                            <input type="text" id="totalRAM"
                                   placeholder="${this.t('sysspec.ph_ram', 'e.g., 16GB DDR4 (2x 8GB modules)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="memoryConfig" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_mem_config', 'Configuration')}</label>
                            <input type="text" id="memoryConfig"
                                   placeholder="${this.t('sysspec.ph_mem_config', 'e.g., Dual-channel, ChannelA-DIMM0 (8GB), ChannelB-DIMM0 (8GB)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="memorySpeed" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_mem_speed', 'Speed')}</label>
                            <input type="text" id="memorySpeed"
                                   placeholder="${this.t('sysspec.ph_mem_speed', 'e.g., Standard DDR4 specifications')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>

                    <!-- Graphics -->
                    <div class="space-y-3">
                        <h3 class="font-semibold text-gray-800">${this.t('sysspec.section_graphics', 'Graphics Hardware')}</h3>
                        <div>
                            <label for="integratedGPU" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_igpu', 'Integrated GPU')}</label>
                            <input type="text" id="integratedGPU"
                                   placeholder="${this.t('sysspec.ph_igpu', 'e.g., Intel HD Graphics 530 (shares system memory)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="discreteGPU" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_dgpu', 'Discrete GPU')}</label>
                            <input type="text" id="discreteGPU"
                                   placeholder="${this.t('sysspec.ph_dgpu', 'e.g., NVIDIA GeForce GTX 970M (dedicated GPU)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="driverVersion" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_driver', 'Driver Version')}</label>
                            <input type="text" id="driverVersion"
                                   placeholder="${this.t('sysspec.ph_driver', 'e.g., NVIDIA Driver 472.12, Intel Graphics Driver 27.20.100.9466')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>

                    <!-- Storage -->
                    <div class="space-y-3">
                        <h3 class="font-semibold text-gray-800">${this.t('sysspec.section_storage', 'Storage Subsystem')}</h3>
                        <div>
                            <label for="systemDrive" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_sys_drive', 'System Drive')}</label>
                            <input type="text" id="systemDrive"
                                   placeholder="${this.t('sysspec.ph_sys_drive', 'e.g., 128GB Toshiba THNSNJ128G8NY SSD (Boot drive C:)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="additionalDrives" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_add_drives', 'Additional Drives')}</label>
                            <input type="text" id="additionalDrives"
                                   placeholder="${this.t('sysspec.ph_add_drives', 'e.g., 1TB HGST HTS721010A9E630 HDD (Storage drives D:, F:)')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="performanceNotes" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_perf_notes', 'Performance Notes')}</label>
                            <input type="text" id="performanceNotes"
                                   placeholder="${this.t('sysspec.ph_perf_notes', 'e.g., SSD system drive ensures consistent load times')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>

                    <!-- Network -->
                    <div class="space-y-3">
                        <h3 class="font-semibold text-gray-800">${this.t('sysspec.section_network', 'Network Environment')}</h3>
                        <div>
                            <label for="networkConnection" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_net_conn', 'Connection')}</label>
                            <input type="text" id="networkConnection"
                                   placeholder="${this.t('sysspec.ph_net_conn', 'e.g., Intel Dual Band Wireless-AC 3165 @ 72 Mbps')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="router" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_router', 'Router')}</label>
                            <input type="text" id="router"
                                   placeholder="${this.t('sysspec.ph_router', 'e.g., Cisco CGM4140COM at 10.0.0.1')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label for="networkSpeed" class="block text-xs text-gray-600 mb-1">${this.t('sysspec.label_net_speed', 'Speed')}</label>
                            <input type="text" id="networkSpeed"
                                   placeholder="${this.t('sysspec.ph_net_speed', 'e.g., 72 Mbps download, 10 Mbps upload')}"
                                   class="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>
                </div>

                <!-- Report Generated By -->
                <div class="mb-4">
                    <label for="reportTool" class="font-semibold text-gray-800 mb-2 block">${this.t('sysspec.label_report_by', 'Report Generated By')}</label>
                    <select id="reportTool" class="w-full p-2 border rounded text-sm">
                        <option value="">${this.t('sysspec.opt_select_tool', 'Select system information tool used...')}</option>
                        <option value="Belarc Advisor">${this.t('sysspec.opt_belarc', 'Belarc Advisor (Recommended)')}</option>
                        <option value="Windows System Information (msinfo32)">${this.t('sysspec.opt_msinfo', 'Windows System Information (msinfo32)')}</option>
                        <option value="Device Manager">${this.t('sysspec.opt_devmgr', 'Windows Device Manager')}</option>
                        <option value="PowerShell Commands">${this.t('sysspec.opt_powershell', 'PowerShell Hardware Commands')}</option>
                        <option value="macOS System Information">${this.t('sysspec.opt_macos', 'macOS System Information')}</option>
                        <option value="Linux lshw/lscpu">${this.t('sysspec.opt_linux', 'Linux lshw/lscpu/dmidecode')}</option>
                        <option value="Manual Entry">${this.t('sysspec.opt_manual', 'Manual Entry')}</option>
                        <option value="Other">${this.t('sysspec.opt_other', 'Other Tool')}</option>
                    </select>
                </div>

                <!-- Auto-detected information -->
                <div class="mb-6 p-3 bg-gray-50 border rounded">
                    <h4 class="font-semibold text-gray-700 mb-2">${this.t('sysspec.auto_detected_title', 'Auto-Detected Information (Read-Only)')}</h4>
                    <div class="text-xs text-gray-600 space-y-1">
                        <div><strong>${this.t('sysspec.auto_browser', 'Browser:')}</strong> <span id="detectedUserAgent"></span></div>
                        <div><strong>${this.t('sysspec.auto_platform', 'Platform:')}</strong> <span id="detectedPlatform"></span></div>
                        <div><strong>${this.t('sysspec.auto_cores', 'CPU Cores (Logical):')}</strong> <span id="detectedCores"></span></div>
                        <div><strong>${this.t('sysspec.auto_memory', 'Device Memory:')}</strong> <span id="detectedMemory"></span></div>
                        <div><strong>${this.t('sysspec.auto_screen', 'Screen Resolution:')}</strong> <span id="detectedScreen"></span></div>
                        <div><strong>${this.t('sysspec.auto_gpu', 'GPU (WebGL):')}</strong> <span id="detectedGPU"></span></div>
                        <div><strong>${this.t('sysspec.auto_timezone', 'Timezone:')}</strong> <span id="detectedTimezone"></span></div>
                        <div><strong>${this.t('sysspec.auto_touch', 'Touch Support:')}</strong> <span id="detectedTouch"></span></div>
                    </div>
                </div>

                <!-- Action buttons -->
                <div class="flex flex-wrap justify-end gap-3">
                    <button id="clearSystemInfo" class="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                        ${this.t('sysspec.btn_clear', 'Clear All Fields')}
                    </button>
                    <button id="saveSystemInfo" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        ${this.t('sysspec.btn_save', 'Save System Information')}
                    </button>
                </div>
            </div>
        `;
    }

    // ─── Modal events ────────────────────────────────────────────
    setupModalEvents() {
        const modal = document.getElementById('systemInfoModal');
        const closeBtn = document.getElementById('closeSystemModal');
        const saveBtn = document.getElementById('saveSystemInfo');
        const clearBtn = document.getElementById('clearSystemInfo');
        const importBtn = document.getElementById('importBelarcBtn');
        const fileInput = document.getElementById('belarcFileInput');

        closeBtn.addEventListener('click', () => this.hideModal());
        saveBtn.addEventListener('click', () => this.saveFromModal());
        clearBtn.addEventListener('click', () => this.clearModal());

        // Belarc import
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleBelarcImport(e));

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.hideModal();
            }
        });
    }

    showModal() {
        this.initializeModal();
        const modal = document.getElementById('systemInfoModal');

        // Auto-detected values
        const auto = this.systemInfo.autoDetected || this.detectClientInfo();
        document.getElementById('detectedUserAgent').textContent =
            (auto.userAgent || navigator.userAgent).substring(0, 120) + '…';
        document.getElementById('detectedPlatform').textContent =
            auto.platform || navigator.platform;
        document.getElementById('detectedCores').textContent =
            auto.hardwareConcurrency || navigator.hardwareConcurrency || this.t('sysspec.unknown', 'Unknown');
        document.getElementById('detectedMemory').textContent =
            auto.deviceMemory || (navigator.deviceMemory ? `${navigator.deviceMemory}GB` : this.t('sysspec.unknown', 'Unknown'));
        document.getElementById('detectedScreen').textContent =
            `${screen.width}\u00d7${screen.height} (${window.devicePixelRatio}x DPI)`;
        document.getElementById('detectedGPU').textContent =
            auto.gpu || this.detectGPU();
        document.getElementById('detectedTimezone').textContent =
            auto.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        document.getElementById('detectedTouch').textContent =
            navigator.maxTouchPoints > 0
                ? this.t('sysspec.yes', 'Yes') + ` (${navigator.maxTouchPoints} ${this.t('sysspec.touch_points', 'touch points')})`
                : this.t('sysspec.no', 'No');

        // Populate saved manual fields
        if (this.systemInfo.manual) {
            const m = this.systemInfo.manual;
            document.getElementById('systemModel').value = m.systemConfiguration?.model || '';
            document.getElementById('operatingSystem').value = m.systemConfiguration?.operatingSystem || '';
            document.getElementById('bootMode').value = m.systemConfiguration?.bootMode || '';
            document.getElementById('cpu').value = m.processor?.cpu || '';
            document.getElementById('architecture').value = m.processor?.architecture || '';
            document.getElementById('cache').value = m.processor?.cache || '';
            document.getElementById('generation').value = m.processor?.generation || '';
            document.getElementById('totalRAM').value = m.memory?.totalRAM || '';
            document.getElementById('memoryConfig').value = m.memory?.configuration || '';
            document.getElementById('memorySpeed').value = m.memory?.speed || '';
            document.getElementById('integratedGPU').value = m.graphics?.integrated || '';
            document.getElementById('discreteGPU').value = m.graphics?.discrete || '';
            document.getElementById('driverVersion').value = m.graphics?.driverVersion || '';
            document.getElementById('systemDrive').value = m.storage?.systemDrive || '';
            document.getElementById('additionalDrives').value = m.storage?.additionalDrives || '';
            document.getElementById('performanceNotes').value = m.storage?.performance || '';
            document.getElementById('networkConnection').value = m.network?.connection || '';
            document.getElementById('router').value = m.network?.router || '';
            document.getElementById('networkSpeed').value = m.network?.speed || '';
            document.getElementById('reportTool').value = m.reportGeneratedBy || '';
        }

        modal.classList.remove('hidden');
    }

    hideModal() {
        const modal = document.getElementById('systemInfoModal');
        if (modal) modal.classList.add('hidden');
    }

    clearModal() {
        const msg = this.t('sysspec.confirm_clear', 'Clear all system information fields? This will reset to default values.');
        if (confirm(msg)) {
            const inputs = document.querySelectorAll('#systemInfoModal input[type="text"], #systemInfoModal select');
            inputs.forEach(input => { input.value = ''; });
        }
    }

    saveFromModal() {
        const systemInfo = this.getDefaultSystemInfo();
        systemInfo.manual = {
            systemConfiguration: {
                model: document.getElementById('systemModel').value,
                operatingSystem: document.getElementById('operatingSystem').value,
                bootMode: document.getElementById('bootMode').value
            },
            processor: {
                cpu: document.getElementById('cpu').value,
                architecture: document.getElementById('architecture').value,
                cores: document.getElementById('architecture').value,
                cache: document.getElementById('cache').value,
                generation: document.getElementById('generation').value
            },
            memory: {
                totalRAM: document.getElementById('totalRAM').value,
                configuration: document.getElementById('memoryConfig').value,
                speed: document.getElementById('memorySpeed').value
            },
            graphics: {
                integrated: document.getElementById('integratedGPU').value,
                discrete: document.getElementById('discreteGPU').value,
                driverVersion: document.getElementById('driverVersion').value
            },
            storage: {
                systemDrive: document.getElementById('systemDrive').value,
                additionalDrives: document.getElementById('additionalDrives').value,
                performance: document.getElementById('performanceNotes').value
            },
            network: {
                connection: document.getElementById('networkConnection').value,
                router: document.getElementById('router').value,
                speed: document.getElementById('networkSpeed').value
            },
            reportGeneratedBy: document.getElementById('reportTool').value
        };

        if (this.saveSystemInfo(systemInfo)) {
            alert(this.t('sysspec.save_success', 'System information saved successfully! This will be included in your test result exports.'));
            this.hideModal();
            this.updateStatusDisplay();
        } else {
            alert(this.t('sysspec.save_error', 'Failed to save system information. Please try again.'));
        }
    }

    // ─── Status display (used by host pages) ──────────────────────
    updateStatusDisplay() {
        const statusEl = document.getElementById('systemInfoStatus');
        if (!statusEl) return;
        const hasData = this.hasCompleteSystemInfo();
        if (hasData) {
            statusEl.classList.add('hidden');
            statusEl.innerHTML = '';
        } else {
            statusEl.classList.remove('hidden');
            const addText = this.t('sysspec.add_specs', 'Add system specs');
            statusEl.innerHTML = `⚠️ <a href="#" onclick="window.systemSpecsManager.showModal()" class="text-blue-600 hover:underline">${addText}</a>`;
        }
    }

    // ─── Belarc Advisor Import ───────────────────────────────────
    handleBelarcImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const statusDiv = document.getElementById('belarcImportStatus');

        // Validate file type
        if (!file.name.match(/\.(html?|htm)$/i)) {
            this.showImportStatus('error',
                this.t('sysspec.import_invalid', 'Please select an HTML file exported from Belarc Advisor.'));
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = this.parseBelarcHTML(e.target.result);
                if (parsed) {
                    this.populateFromBelarc(parsed);
                    this.showImportStatus('success',
                        this.t('sysspec.import_success', 'Belarc report imported successfully! Review the fields and click Save.'));
                } else {
                    this.showImportStatus('warning',
                        this.t('sysspec.import_partial', 'Could not extract all fields. Some data may have been imported — please review and complete manually.'));
                }
            } catch (err) {
                console.error('Belarc import error:', err);
                this.showImportStatus('error',
                    this.t('sysspec.import_error', 'Failed to parse the Belarc report. Please check the file format.'));
            }
        };
        reader.onerror = () => {
            this.showImportStatus('error',
                this.t('sysspec.import_read_error', 'Failed to read the file.'));
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    showImportStatus(type, message) {
        const statusDiv = document.getElementById('belarcImportStatus');
        if (!statusDiv) return;
        const colors = {
            success: 'bg-green-50 border-green-200 text-green-800',
            warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
            error: 'bg-red-50 border-red-200 text-red-800'
        };
        statusDiv.className = `mb-4 p-3 rounded text-sm border ${colors[type] || colors.error}`;
        statusDiv.textContent = message;
        statusDiv.classList.remove('hidden');
        setTimeout(() => statusDiv.classList.add('hidden'), 8000);
    }

    /**
     * Parse a Belarc Advisor HTML report.
     * Uses DOM-based section extraction via <caption> elements
     * for reliable field mapping instead of regex on flattened text.
     */
    parseBelarcHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;
        if (!body) return null;

        const result = {
            model: '',
            operatingSystem: '',
            bootMode: '',
            cpu: '',
            architecture: '',
            cache: '',
            totalRAM: '',
            memoryConfig: '',
            memorySpeed: '',
            integratedGPU: '',
            discreteGPU: '',
            driverVersion: '',
            systemDrive: '',
            additionalDrives: '',
            networkConnection: '',
            router: '',
            networkSpeed: ''
        };

        let fieldsFound = 0;

        /**
         * Extract text content from a Belarc table section identified by its caption.
         * Converts <br> and </tr> to newlines and strips all other tags.
         */
        const getSectionText = (captionPattern) => {
            for (const cap of doc.querySelectorAll('caption')) {
                if (!captionPattern.test((cap.textContent || '').trim())) continue;
                const table = cap.closest('table');
                if (!table) continue;
                const td = table.querySelector('td');
                if (!td) continue;
                return td.innerHTML
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/tr\s*>/gi, '\n')
                    .replace(/<\/td\s*>/gi, ' ')
                    .replace(/<\/th\s*>/gi, ' ')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&#39;/g, "'")
                    .replace(/[ \t]+/g, ' ')
                    .replace(/\n /g, '\n')
                    .replace(/ \n/g, '\n')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
            }
            return '';
        };

        // --- System Model ---
        const modelText = getSectionText(/^System Model/i);
        if (modelText) {
            const firstLine = modelText.split('\n')[0].trim();
            if (firstLine) { result.model = firstLine; fieldsFound++; }
        }

        // --- Operating System ---
        const osText = getSectionText(/^Operating System$/i);
        if (osText) {
            const firstLine = osText.split('\n')[0].trim();
            if (firstLine) { result.operatingSystem = firstLine; fieldsFound++; }
            const bootMatch = osText.match(/Boot Mode[:\s]*(.+)/i);
            if (bootMatch) { result.bootMode = bootMatch[1].trim(); fieldsFound++; }
        }

        // --- Processor (scoped to its section, avoiding "CpuJan2026" security-update false match) ---
        const procText = getSectionText(/^Processor/i);
        if (procText) {
            const lines = procText.split('\n').map(l => l.trim()).filter(Boolean);
            // First line is the CPU name (e.g. "2.60 gigahertz Intel Core i7-6700HQ")
            if (lines[0]) { result.cpu = lines[0]; fieldsFound++; }

            // Cache: only lines containing "cache"
            const cacheLines = lines.filter(l => /cache/i.test(l));
            if (cacheLines.length > 0) {
                result.cache = cacheLines.join('; ');
                fieldsFound++;
            }

            // Architecture from processor section
            const bits = procText.match(/(\d+)-bit/);
            const cores = procText.match(/Multi-core\s*\((\d+)\s*total\)/i);
            const threads = procText.match(/Hyper-threaded\s*\((\d+)\s*total\)/i);
            if (bits || cores || threads) {
                const parts = [];
                if (bits) parts.push(`${bits[1]}-bit`);
                if (cores) parts.push(`${cores[1]} cores`);
                if (threads) parts.push(`${threads[1]} threads`);
                result.architecture = parts.join(', ');
                fieldsFound++;
            }
        }

        // --- Memory Modules ---
        const memText = getSectionText(/^Memory Modules/i);
        if (memText) {
            // Total RAM: "16268 Megabytes Usable Installed Memory"
            const totalMatch = memText.match(/(\d[\d,]*)\s*Megabytes?\s+(?:Usable\s+)?(?:Installed\s+)?Memory/i);
            if (totalMatch) {
                const mb = parseInt(totalMatch[1].replace(/,/g, ''), 10);
                const gb = Math.round(mb / 1024);
                // Count populated slots and their sizes
                const slotHasRegex = /Slot\s+'[^']*'\s+has\s+(\d+)\s*MB/gi;
                const slotSizes = [];
                let slotMatch;
                while ((slotMatch = slotHasRegex.exec(memText)) !== null) {
                    slotSizes.push(Math.round(parseInt(slotMatch[1], 10) / 1024));
                }
                const emptyCount = (memText.match(/Slot\s+'[^']*'\s+is\s+Empty/gi) || []).length;
                const totalSlots = slotSizes.length + emptyCount;
                let ramStr = `${gb}GB`;
                if (slotSizes.length > 0) {
                    ramStr += ` (${slotSizes.map(s => s + 'GB').join(' + ')}, ${slotSizes.length}/${totalSlots} slots)`;
                }
                result.totalRAM = ramStr;
                fieldsFound++;
            }

            // Memory configuration - all slot lines
            const slotLines = memText.split('\n')
                .map(l => l.trim())
                .filter(l => /^Slot\s/i.test(l));
            if (slotLines.length > 0) {
                result.memoryConfig = slotLines.join('; ');
                fieldsFound++;
            }
        }

        // --- Display/Graphics (only [Display adapter] lines, not monitors) ---
        const displayText = getSectionText(/^Display$/i);
        if (displayText) {
            const lines = displayText.split('\n').map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                if (!/\[Display adapter\]/i.test(line)) continue;
                if (/Intel|Apple/i.test(line) && !result.integratedGPU) {
                    result.integratedGPU = line; fieldsFound++;
                } else if (/NVIDIA|AMD|Radeon/i.test(line) && !result.discreteGPU) {
                    result.discreteGPU = line; fieldsFound++;
                }
            }
            if (!result.integratedGPU && !result.discreteGPU) {
                const firstAdapter = lines.find(l => /\[Display adapter\]/i.test(l));
                if (firstAdapter) { result.integratedGPU = firstAdapter; fieldsFound++; }
            }
        }

        // driverVersion: Belarc does not report GPU driver versions in its summary.
        // (The "Advisor Version" header is NOT a driver version — leave empty for manual entry.)

        // --- Drives ---
        const drivesText = getSectionText(/^Drives$/i);
        if (drivesText) {
            result.systemDrive = drivesText;
            fieldsFound++;
        }

        // --- Local Drive Volumes (additional drive info) ---
        const volumesText = getSectionText(/^Local Drive Volumes$/i);
        if (volumesText) {
            const volumeLines = volumesText.split('\n')
                .map(l => l.trim())
                .filter(l => /^[a-z]:/i.test(l));
            if (volumeLines.length > 0) {
                result.additionalDrives = volumeLines.join('; ');
                fieldsFound++;
            }
        }

        // --- Communications / Network ---
        const netText = getSectionText(/^Communications$/i);
        if (netText) {
            const lines = netText.split('\n').map(l => l.trim());
            let primaryAdapter = '';
            let gateway = '';
            let speed = '';
            let inPrimarySection = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // The "primary" label marks the main active adapter
                if (/primary/i.test(line) && !primaryAdapter) {
                    inPrimarySection = true;
                    // Walk backwards to find the adapter name (line with ↑)
                    for (let j = i - 1; j >= 0; j--) {
                        if (/^[\u2191]/.test(lines[j])) {
                            primaryAdapter = lines[j].replace(/^[\u2191]\s*/, '').trim();
                            break;
                        }
                    }
                }
                if (inPrimarySection) {
                    if (!gateway) {
                        const gw = line.match(/Gateway[:\s]*(\d+\.\d+\.\d+\.\d+)/i);
                        if (gw) gateway = gw[1];
                    }
                    if (!speed) {
                        const sp = line.match(/Connection\s*Speed[:\s]*([\d.]+\s*[GMgm]bps)/i);
                        if (sp) { speed = sp[1]; inPrimarySection = false; }
                    }
                }
            }

            // Fallback: first active adapter (↑)
            if (!primaryAdapter) {
                const m = netText.match(/[\u2191]\s*([^\n]+)/);
                if (m) primaryAdapter = m[1].trim();
            }
            if (!gateway) {
                const m = netText.match(/Gateway[:\s]*(\d+\.\d+\.\d+\.\d+)/i);
                if (m) gateway = m[1];
            }

            if (primaryAdapter) { result.networkConnection = primaryAdapter; fieldsFound++; }
            if (gateway) { result.router = gateway; fieldsFound++; }
            if (speed) { result.networkSpeed = speed; fieldsFound++; }
        }

        // --- Router fallback from Network Map section ---
        if (!result.router) {
            const mapText = getSectionText(/^Network Map/i);
            if (mapText) {
                const m = mapText.match(/(\d+\.\d+\.\d+\.\d+)[^\n]*Router/i);
                if (m) { result.router = m[1].trim(); fieldsFound++; }
            }
        }

        // --- Fallback: use full-text regex if DOM section parsing missed key fields ---
        if (!result.model || !result.cpu || !result.operatingSystem) {
            const text = body.textContent || '';
            if (!result.model) {
                const m = text.match(/System Model[\s\S]*?([A-Z][^\n\r]{5,})/i);
                if (m) { result.model = m[1].trim(); fieldsFound++; }
            }
            if (!result.cpu) {
                const m = text.match(/(\d+(?:\.\d+)?\s*gigahertz\s+[^\n\r]+)/i);
                if (m) { result.cpu = m[1].trim(); fieldsFound++; }
            }
            if (!result.operatingSystem) {
                const m = text.match(/((?:Windows|macOS|Linux)[^\n\r]+)/i);
                if (m) { result.operatingSystem = m[1].trim(); fieldsFound++; }
            }
        }

        return fieldsFound > 0 ? result : null;
    }

    populateFromBelarc(data) {
        const fieldMap = {
            model: 'systemModel',
            operatingSystem: 'operatingSystem',
            bootMode: 'bootMode',
            cpu: 'cpu',
            architecture: 'architecture',
            cache: 'cache',
            totalRAM: 'totalRAM',
            memoryConfig: 'memoryConfig',
            memorySpeed: 'memorySpeed',
            integratedGPU: 'integratedGPU',
            discreteGPU: 'discreteGPU',
            driverVersion: 'driverVersion',
            systemDrive: 'systemDrive',
            additionalDrives: 'additionalDrives',
            networkConnection: 'networkConnection',
            router: 'router',
            networkSpeed: 'networkSpeed'
        };

        for (const [key, inputId] of Object.entries(fieldMap)) {
            if (data[key]) {
                const el = document.getElementById(inputId);
                if (el) el.value = data[key];
            }
        }

        // Auto-select Belarc Advisor in the tool dropdown
        const reportTool = document.getElementById('reportTool');
        if (reportTool) reportTool.value = 'Belarc Advisor';
    }

    // ─── Re-render modal on language change ──────────────────────
    refreshModal() {
        const modal = document.getElementById('systemInfoModal');
        if (!modal) return;
        // Save current values before destroying
        const savedValues = {};
        const inputs = modal.querySelectorAll('input[type="text"], select');
        inputs.forEach(el => { if (el.id) savedValues[el.id] = el.value; });

        const wasVisible = !modal.classList.contains('hidden');
        modal.remove();
        this.modalInitialized = false;
        this.initializeModal();

        // Restore values
        for (const [id, val] of Object.entries(savedValues)) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
        if (wasVisible) {
            document.getElementById('systemInfoModal').classList.remove('hidden');
        }
    }
}

// Global singleton
window.systemSpecsManager = new SystemSpecsManager();

// Re-render modal when language changes
document.addEventListener('languageChanged', () => {
    if (window.systemSpecsManager) {
        window.systemSpecsManager.refreshModal();
        window.systemSpecsManager.updateStatusDisplay();
    }
});

// Re-render modal when i18n finishes initial async load
// (modal may have been built before translations were available)
document.addEventListener('i18nReady', () => {
    if (window.systemSpecsManager && window.systemSpecsManager.modalInitialized) {
        window.systemSpecsManager.refreshModal();
        window.systemSpecsManager.updateStatusDisplay();
    }
});
