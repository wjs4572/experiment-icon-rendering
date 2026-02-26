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

  /** Test harness ready flag (src/test-harness.html) */
  __harnessReady: boolean;

  /** RunId module (src/js/run-id.js) */
  RunId: Readonly<{
    generateRunId(): string;
    generateSuiteRunId(): string;
    generateTestResultId(): string;
  }>;

  /** RunRecord module (src/js/run-record.js) */
  RunRecord: Readonly<{
    SCHEMA_VERSION: number;
    VALID_FORMATS: readonly string[];
    VALID_SOURCES: readonly string[];
    createRunRecord(fields?: Record<string, any>): Record<string, any>;
    normalizeImportedRecord(raw: Record<string, any>, fileName?: string): Record<string, any>;
  }>;

  /** RunStateStore singleton (src/js/run-state.js) */
  RunStateStore: {
    registerRun(suiteRunId: string, format: string, runId: string): void;
    updateProgress(suiteRunId: string, progressData: Record<string, any>): void;
    completeRun(suiteRunId: string, runRecord: Record<string, any>): void;
    getActiveRun(format: string): Record<string, any> | null;
    getActiveRecords(): Record<string, any>[];
    onProgressChange(format: string, callback: (runState: any) => void): () => void;
    onCompletion(format: string, callback: (runRecord: any) => void): () => void;
    getAllCompleted(): Record<string, any>[];
    saveRecord(runRecord: Record<string, any>): void;
    deleteRecords(testResultIds: string[]): void;
    toggleActive(testResultIds: string[], active: boolean): void;
    importRecords(records: Record<string, any>[]): void;
  };

  /** Reporters module (src/js/reporters.js) */
  Reporters: Readonly<{
    NoopReporter: new () => {
      onTestStart(format?: any, config?: any): void;
      onProgress(percentage?: any, message?: any, completedIterations?: any, totalIterations?: any): void;
      onIterationComplete(iconType?: any, iterationData?: any): void;
      onTestComplete(results?: any, duration?: any, extra?: any): void;
      onError(error?: any): void;
    };
    DOMReporter: new (options?: { manager?: any }) => {
      manager: any;
      setManager(manager: any): void;
      onTestStart(format?: any, config?: any): void;
      onProgress(percentage?: any, message?: any, completedIterations?: any, totalIterations?: any): void;
      onIterationComplete(iconType?: any, iterationData?: any): void;
      onTestComplete(results?: any, duration?: any, extra?: any): void;
      onError(error?: any): void;
    };
    StoreReporter: new (options?: { suiteRunId?: string; onProgressCallback?: (snapshot: any) => void }) => {
      suiteRunId: string | null;
      onTestStart(format?: any, config?: any): void;
      onProgress(percentage?: any, message?: any, completedIterations?: any, totalIterations?: any): void;
      onIterationComplete(iconType?: any, iterationData?: any): void;
      onTestComplete(results?: any, duration?: any, extra?: any): void;
      onError(error?: any): void;
    };
  }>;

  /** IconConfigs module (src/js/icon-configs.js) */
  IconConfigs: Readonly<{
    cssIconConfigs: Array<Record<string, any>>;
    svgIconConfigs: Array<Record<string, any>>;
    pngIconConfigs: Array<Record<string, any>>;
    gifIconConfigs: Array<Record<string, any>>;
    jpegIconConfigs: Array<Record<string, any>>;
    webpIconConfigs: Array<Record<string, any>>;
    avifIconConfigs: Array<Record<string, any>>;
    allIconConfigs: Record<string, Array<Record<string, any>>>;
  }>;

  /** StressTestManager class (src/js/stress-test-manager.js) */
  StressTestManager: new (options?: {
    iconConfigs?: Array<Record<string, any>>;
    format?: string;
    reporter?: any;
  }) => {
    isRunning: boolean;
    shouldStop: boolean;
    results: Record<string, any>;
    completedIterations: number;
    totalIterations: number;
    systemInfo: Record<string, any>;
    statisticalAnalysis: Record<string, any>;
    performanceRanking: any[];
    testMetadata: Record<string, any>;
    testConfiguration: Record<string, any>;
    format: string;
    reporter: any;
    iconConfigs: Array<Record<string, any>>;
    startStressTest(): Promise<void>;
    stopTest(): void;
    getTestConfig(type: string): { iterations: number; iconsPerTest: number; description: string };
  };

  /** RunHandle module (src/js/run-handle.js) */
  RunHandle: Readonly<{
    RUN_STATUS: Readonly<{
      PENDING: 'pending';
      RUNNING: 'running';
      COMPLETED: 'completed';
      CANCELLED: 'cancelled';
      ERROR: 'error';
    }>;
    RunHandle: new (opts: {
      runId: string;
      suiteRunId: string;
      format: string;
      cancelFn?: () => void;
    }) => {
      runId: string;
      suiteRunId: string;
      format: string;
      startTime: string;
      status: string;
      done: Promise<{ runRecord: Record<string, any> }>;
      getProgress(): { percentage: number; message: string; completed: number; total: number };
      onProgress(callback: (progress: { percentage: number; message: string; completed: number; total: number }) => void): () => void;
      getResult(): Record<string, any> | null;
      cancel(): void;
      _updateProgress(snapshot: Record<string, any>): void;
      _complete(runRecord: Record<string, any>): void;
      _fail(error: Error): void;
    };
  }>;

  /** SuiteRunner module (src/js/suite-runner.js) */
  SuiteRunner: Readonly<{
    runSuite(
      format: string,
      testType: string,
      opts?: { runId?: string; reporter?: any }
    ): InstanceType<Window['RunHandle']['RunHandle']>;
    cancelSuite(handle: any): void;
  }>;
}
