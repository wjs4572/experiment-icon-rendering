/**
 * Global type augmentations for Playwright test files using @ts-check.
 * Declares custom properties attached to window by the application scripts.
 */

interface Window {
  /** i18n module instance (src/js/i18n.js) */
  i18n: {
    translations: Record<string, string>;
    getCurrentLanguage(): string;
    setLanguage(lang: string): Promise<void>;
    translate(key: string, params?: Record<string, string>): string;
    isLanguageSupported(code: string): boolean;
    getSupportedLanguages(): Array<{ code: string; name: string; native: string }>;
    formatNumber(n: number): string;
    formatDate(d: Date): string;
    formatRelativeTime(d: Date): string;
    getFallbackTranslations(): Record<string, string>;
  };

  /** System specs manager instance (src/js/system-specs.js) */
  systemSpecsManager: {
    systemInfo: {
      lastUpdated: string;
      autoDetected: {
        userAgent: string;
        platform: string;
        language: string;
        hardwareConcurrency: number;
        screen: { resolution: string; colorDepth: number; pixelRatio: number };
        gpu: string;
      };
      manual: Record<string, any>;
    };
    getDefaultSystemInfo(): any;
    loadSystemInfo(): any;
    saveSystemInfo(info: any): boolean;
    hasCompleteSystemInfo(): boolean;
    showModal(): void;
    hideModal(): void;
    detectGPU(): string;
    t(key: string, fallback: string): string;
  };

  /** Stress test manager instance (src/js/stress-test-manager.js) */
  stressTestManager: {
    isRunning: boolean;
    shouldStop: boolean;
    results: Record<string, any>;
    batchSize: number;
    completedIterations: number;
    totalIterations: number;
    systemInfo: Record<string, any>;
    iconConfigs: Array<{
      name: string;
      selector: string;
      containerSelector: string;
      hasNetworkOverhead: boolean;
      isCircular?: boolean;
    }>;
    systemSpecsManager: any;
    getTestConfig(type: string): { iterations: number; iconsPerTest: number; description: string };
    setupEventListeners(): void;
    updateMemoryDisplay(): void;
    createTestContainer(): void;
    showProgress(show: boolean): void;
    stopTest(): void;
    clearResults(): void;
    resetTestState(): void;
    exportResultsAsJSON(): void;
    parseBrowserName(): string;
  };
}
