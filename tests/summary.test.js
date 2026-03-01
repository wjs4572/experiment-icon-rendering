// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Performance Summary Dashboard (summary.html)
 * DO NOT MODIFY unless explicitly requested by user
 * These tests ensure dashboard functionality remains intact
 */

test.describe('Performance Summary Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title and header', async ({ page }) => {
    await expect(page).toHaveTitle('Performance Summary Dashboard - Icon Rendering Tests');
    await expect(page.locator('h1')).toContainText('Performance Summary Dashboard');
    await expect(page.locator('text=Comprehensive analysis and comparison')).toBeVisible();
  });

  test('header navigation links are present and functional', async ({ page }) => {
    // Header links are always visible regardless of data state
    const header = page.locator('header');
    const backToSuiteLink = header.locator('a[href="index.html"]');
    const pastResultsLink = header.locator('a[href="results-library.html"]');

    await expect(backToSuiteLink).toBeVisible();
    await expect(pastResultsLink).toBeVisible();

    // Test navigation functionality
    await backToSuiteLink.click();
    await expect(page).toHaveURL(/index\.html$/);
    await page.goBack();

    await pastResultsLink.click();
    await expect(page).toHaveURL(/results-library\.html$/);
    await page.goBack();
  });

  test('no-data message links are visible when no test data exists', async ({ page }) => {
    // With no localStorage data, #noDataMessage should be visible with its own links
    const noDataMsg = page.locator('#noDataMessage');
    await expect(noDataMsg).toBeVisible();

    const runTestsLink = noDataMsg.locator('a[href="index.html"]');
    const pastResultsLink = noDataMsg.locator('a[href="results-library.html"]');

    await expect(runTestsLink).toBeVisible();
    await expect(pastResultsLink).toBeVisible();

    // Test navigation from no-data links
    await runTestsLink.click();
    await expect(page).toHaveURL(/index\.html$/);
    await page.goBack();

    await pastResultsLink.click();
    await expect(page).toHaveURL(/results-library\.html$/);
    await page.goBack();
  });

  test('no-data message is hidden when test data exists', async ({ page }) => {
    // Inject a minimal RunRecord into the RunStateStore storage key before navigating
    await page.evaluate(() => {
      const mockRecord = {
        schemaVersion: 2,
        testResultId: 'test-result-001',
        runId: 'run-001',
        suiteRunId: 'suite-001',
        format: 'css',
        source: 'local',
        importedFileName: null,
        active: true,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 1000,
        testType: 'single',
        iterations: 100,
        testDuration: 1,
        results: { css_font_square: { mean: 1.5, stdDev: 0.2, iterations: 100 } },
        statisticalAnalysis: {},
        performanceRanking: [{ iconType: 'css_font_square', rank: 1, averageTime: 1.5, confidenceInterval: { lower: 1.3, upper: 1.7 }, standardDeviation: 0.2, sampleSize: 100 }],
        testMetadata: {},
        testConfiguration: { testType: 'single', iterations: 100 },
        systemSpecifications: {}
      };
      localStorage.setItem('iconTestRunRecords', JSON.stringify([mockRecord]));
    });
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');

    // noDataMessage should be hidden when data exists
    await expect(page.locator('#noDataMessage')).toBeHidden();

    // Header links should still be visible
    const header = page.locator('header');
    await expect(header.locator('a[href="index.html"]')).toBeVisible();
    await expect(header.locator('a[href="results-library.html"]')).toBeVisible();

    // Clean up
    await page.evaluate(() => localStorage.removeItem('iconTestRunRecords'));
  });

  test('data export controls are available', async ({ page }) => {
    // Verify export buttons exist
    await expect(page.locator('#exportCsv')).toBeVisible();
    await expect(page.locator('#exportJson')).toBeVisible();
    await expect(page.locator('#clearData')).toBeVisible();
    
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear All Data")')).toBeVisible();
  });

  test('last updated timestamp display', async ({ page }) => {
    // Verify last updated information
    await expect(page.locator('#lastUpdated')).toBeVisible();
    await expect(page.locator('text=Last updated:')).toBeVisible();
  });

  test('export buttons can be clicked without errors', async ({ page }) => {
    // Verify buttons are clickable (functionality depends on stored data)
    const exportCsv = page.locator('#exportCsv');
    const exportJson = page.locator('#exportJson');
    const clearData = page.locator('#clearData');
    
    await exportCsv.click();
    await exportJson.click();
    await clearData.click();
    
    // Should not throw JavaScript errors
  });

  test('external dependencies are loaded', async ({ page }) => {
    // Verify Chart.js script tag is loaded
    const chartScriptExists = await page.locator('script[src*="chart.js"], script[src*="Chart"]').count();
    expect(chartScriptExists).toBeGreaterThan(0);
    
    // Verify Tailwind CSS is loaded
    const container = page.locator('.container');
    await expect(container).toBeVisible();
  });

  test('responsive design elements', async ({ page }) => {
    // Verify responsive container and spacing
    await expect(page.locator('.container')).toBeVisible();
    await expect(page.locator('.mx-auto').first()).toBeVisible();
    await expect(page.locator('.px-8')).toBeVisible();
  });

  test('color-coded export buttons', async ({ page }) => {
    // Verify proper button styling
    const csvButton = page.locator('#exportCsv');
    const jsonButton = page.locator('#exportJson');
    const clearButton = page.locator('#clearData');
    
    await expect(csvButton).toHaveClass(/bg-green-600/);
    await expect(jsonButton).toHaveClass(/bg-blue-600/);
    await expect(clearButton).toHaveClass(/bg-red-600/);
  });

  test('accessibility features', async ({ page }) => {
    // Verify heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    
    // Verify buttons have proper text content
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify links have proper href attributes
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThanOrEqual(2);
  });

  test('JSON export includes RunRecord identity fields per format', async ({ page }) => {
    // Inject two mock RunRecords so cross-format comparison is exercised
    await page.evaluate(() => {
      const base = {
        schemaVersion: 2, source: 'local', importedFileName: null, active: true,
        testType: 'single', iterations: 100, testDuration: 1,
        statisticalAnalysis: {}, testMetadata: {}, testConfiguration: { testType: 'single', iterations: 100 },
        systemSpecifications: {}
      };
      const cssRecord = {
        ...base, testResultId: 'tr-css-001', runId: 'run-css-001', suiteRunId: 'suite-001', format: 'css',
        startTime: '2025-01-15T10:00:00.000Z', endTime: '2025-01-15T10:00:01.000Z', durationMs: 1000,
        results: { css_font_square: { mean: 1.5, stdDev: 0.2, iterations: 100 } },
        performanceRanking: [{ iconType: 'css_font_square', rank: 1, averageTime: 1.5, confidenceInterval: { lower: 1.3, upper: 1.7 }, standardDeviation: 0.2, sampleSize: 100 }]
      };
      const svgRecord = {
        ...base, testResultId: 'tr-svg-001', runId: 'run-svg-001', suiteRunId: 'suite-002', format: 'svg',
        startTime: '2025-01-15T10:01:00.000Z', endTime: '2025-01-15T10:01:02.000Z', durationMs: 2000,
        results: { svg_inline: { mean: 2.1, stdDev: 0.3, iterations: 100 } },
        performanceRanking: [{ iconType: 'svg_inline', rank: 1, averageTime: 2.1, confidenceInterval: { lower: 1.8, upper: 2.4 }, standardDeviation: 0.3, sampleSize: 100 }]
      };
      localStorage.setItem('iconTestRunRecords', JSON.stringify([cssRecord, svgRecord]));
    });
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');

    // Capture JSON export content by intercepting downloadFile
    const jsonContent = await page.evaluate(() => {
      return new Promise(resolve => {
        const dash = window.summaryDashboard;
        const origDownload = dash.downloadFile.bind(dash);
        dash.downloadFile = (filename, content, contentType) => {
          resolve({ filename, content: JSON.parse(content), contentType });
        };
        dash.exportJson();
        dash.downloadFile = origDownload;
      });
    });

    // Verify export envelope
    expect(jsonContent.filename).toBe('icon_performance_results.json');
    expect(jsonContent.contentType).toBe('application/json');

    // Verify RunRecord identity fields in sourceData per format
    const sourceData = jsonContent.content.sourceData;
    expect(sourceData).toHaveProperty('css');
    expect(sourceData).toHaveProperty('svg');

    for (const [format, data] of Object.entries(sourceData)) {
      expect(data).toHaveProperty('runId');
      expect(data).toHaveProperty('suiteRunId');
      expect(data).toHaveProperty('testResultId');
      expect(data).toHaveProperty('startTime');
      expect(data).toHaveProperty('endTime');
      expect(data).toHaveProperty('durationMs');
      expect(data.runId).toBeTruthy();
      expect(data.testResultId).toBeTruthy();
    }

    // Verify specific values
    expect(sourceData.css.runId).toBe('run-css-001');
    expect(sourceData.css.suiteRunId).toBe('suite-001');
    expect(sourceData.css.testResultId).toBe('tr-css-001');
    expect(sourceData.css.startTime).toBe('2025-01-15T10:00:00.000Z');
    expect(sourceData.css.endTime).toBe('2025-01-15T10:00:01.000Z');
    expect(sourceData.css.durationMs).toBe(1000);
    expect(sourceData.svg.runId).toBe('run-svg-001');
    expect(sourceData.svg.durationMs).toBe(2000);

    // Verify cross-format comparisons exist (CSS baseline vs SVG)
    expect(jsonContent.content.crossFormatComparisons).toBeDefined();
    expect(jsonContent.content.crossFormatComparisons.length).toBeGreaterThan(0);
    const svgComparison = jsonContent.content.crossFormatComparisons.find(c => c.comparedFormat === 'svg');
    expect(svgComparison).toBeDefined();
    expect(svgComparison.baselineFormat).toBe('css');
    expect(svgComparison.speedRatio).toBeGreaterThan(0);

    // Verify summaryStatistics.perFormatBest
    expect(jsonContent.content.summaryStatistics.perFormatBest).toHaveProperty('css');
    expect(jsonContent.content.summaryStatistics.perFormatBest).toHaveProperty('svg');

    await page.evaluate(() => localStorage.removeItem('iconTestRunRecords'));
  });

  test('CSV export includes RunRecord identity columns', async ({ page }) => {
    // Inject a mock RunRecord
    await page.evaluate(() => {
      const record = {
        schemaVersion: 2, testResultId: 'tr-csv-001', runId: 'run-csv-001', suiteRunId: 'suite-csv-001',
        format: 'css', source: 'local', importedFileName: null, active: true,
        startTime: '2025-06-01T12:00:00.000Z', endTime: '2025-06-01T12:00:01.500Z', durationMs: 1500,
        testType: 'single', iterations: 50, testDuration: 1.5,
        results: { css_font_square: { mean: 1.2, stdDev: 0.1, iterations: 50 } },
        statisticalAnalysis: {},
        performanceRanking: [{ iconType: 'css_font_square', rank: 1, averageTime: 1.2, confidenceInterval: { lower: 1.0, upper: 1.4 }, standardDeviation: 0.1, sampleSize: 50 }],
        testMetadata: {}, testConfiguration: { testType: 'single', iterations: 50 },
        systemSpecifications: {}
      };
      localStorage.setItem('iconTestRunRecords', JSON.stringify([record]));
    });
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');

    // Capture CSV content by intercepting downloadFile
    const csvResult = await page.evaluate(() => {
      return new Promise(resolve => {
        const dash = window.summaryDashboard;
        const origDownload = dash.downloadFile.bind(dash);
        dash.downloadFile = (filename, content, contentType) => {
          resolve({ filename, content, contentType });
        };
        dash.exportCsv();
        dash.downloadFile = origDownload;
      });
    });

    expect(csvResult.filename).toBe('icon_performance_results.csv');
    expect(csvResult.contentType).toBe('text/csv');

    const lines = csvResult.content.split('\n');
    const header = lines[0];

    // Verify header includes RunRecord identity columns
    expect(header).toContain('Run ID');
    expect(header).toContain('Suite Run ID');
    expect(header).toContain('Test Result ID');
    expect(header).toContain('Test Started');
    expect(header).toContain('Test Completed');
    expect(header).toContain('Duration (ms)');

    // Verify data row contains the injected values
    const dataRow = lines[1];
    expect(dataRow).toContain('run-csv-001');
    expect(dataRow).toContain('suite-csv-001');
    expect(dataRow).toContain('tr-csv-001');
    expect(dataRow).toContain('2025-06-01T12:00:00.000Z');
    expect(dataRow).toContain('2025-06-01T12:00:01.500Z');
    expect(dataRow).toContain('1500');

    // Verify cross-format summary section exists
    expect(csvResult.content).toContain('Cross-Format Summary');

    await page.evaluate(() => localStorage.removeItem('iconTestRunRecords'));
  });
});