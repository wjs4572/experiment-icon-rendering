// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * LOCALE-INDEPENDENT STRUCTURAL TESTS
 * These tests use data-i18n attributes, hrefs, and IDs instead of visible text,
 * so they pass regardless of the active locale. They verify that the DOM structure,
 * navigation, and interactive elements remain intact.
 */

test.describe('Index Page - Locale-Independent Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('index.html');
    await page.waitForLoadState('networkidle');
  });

  test('page has a single h1 with the app title i18n key', async ({ page }) => {
    const h1 = page.locator('h1[data-i18n="app.title"]');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test('language selector is present with all supported locales', async ({ page }) => {
    const selector = page.locator('#languageSelector');
    await expect(selector).toBeVisible();

    const expectedLocales = [
      'en', 'en-us', 'en-gb', 'es', 'fr', 'de', 'ja', 'zh', 'zh-tw', 'pt', 'pt-br', 'pt-pt'
    ];
    for (const locale of expectedLocales) {
      await expect(selector.locator(`option[value="${locale}"]`)).toHaveCount(1);
    }
  });

  test('all format cards have i18n title, description, and test link', async ({ page }) => {
    const formats = ['css', 'svg', 'png', 'gif', 'jpeg', 'webp', 'avif'];
    for (const fmt of formats) {
      await expect(page.locator(`[data-i18n="format.${fmt}.title"]`)).toBeVisible();
      await expect(page.locator(`[data-i18n="format.${fmt}.description"]`)).toBeVisible();
      await expect(page.locator(`a[data-i18n="format.${fmt}.test_button"]`)).toBeVisible();
    }
  });

  test('format test links point to correct pages', async ({ page }) => {
    const formats = ['css', 'svg', 'png', 'gif', 'jpeg', 'webp', 'avif'];
    for (const fmt of formats) {
      const link = page.locator(`a[data-i18n="format.${fmt}.test_button"]`);
      await expect(link).toHaveAttribute('href', `${fmt}.html`);
    }
  });

  test('dashboard and archive cards have correct links', async ({ page }) => {
    const dashboardLink = page.locator('a[data-i18n="dashboard.view_button"]');
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', 'summary.html');

    const archiveLink = page.locator('a[data-i18n="archive.view_button"]');
    await expect(archiveLink).toBeVisible();
    await expect(archiveLink).toHaveAttribute('href', 'past-results.html');
  });

  test('methodology section is present', async ({ page }) => {
    await expect(page.locator('[data-i18n="methodology.title"]')).toBeVisible();
    await expect(page.locator('[data-i18n="methodology.description"]')).toBeVisible();
  });

  test('footer with GitHub link is present', async ({ page }) => {
    const githubLink = page.locator('footer a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
  });
});

test.describe('Summary Page - Locale-Independent Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');
  });

  test('page has title and subtitle with i18n keys', async ({ page }) => {
    await expect(page.locator('h1[data-i18n="summary.title"]')).toBeVisible();
    await expect(page.locator('[data-i18n="summary.subtitle"]')).toBeVisible();
  });

  test('header navigation has correct link targets', async ({ page }) => {
    const header = page.locator('header');
    const backLink = header.locator('a[href="index.html"]');
    const pastLink = header.locator('a[href="past-results.html"]');

    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('data-i18n', 'summary.back_to_tests');

    await expect(pastLink).toBeVisible();
    await expect(pastLink).toHaveAttribute('data-i18n', 'summary.view_past_results');
  });

  test('export controls exist with correct IDs', async ({ page }) => {
    await expect(page.locator('#exportCsv')).toBeVisible();
    await expect(page.locator('#exportJson')).toBeVisible();
    await expect(page.locator('#clearData')).toBeVisible();
  });

  test('no-data message has navigation links when visible', async ({ page }) => {
    // Default state (no localStorage) shows #noDataMessage
    const noData = page.locator('#noDataMessage');
    await expect(noData).toBeVisible();

    await expect(noData.locator('a[href="index.html"]')).toBeVisible();
    await expect(noData.locator('a[href="past-results.html"]')).toBeVisible();
  });

  test('no-data message is hidden when data is present', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('iconTestResults_css', JSON.stringify({
        css_font_square: { mean: 1.5, stdDev: 0.2, iterations: 100 }
      }));
    });
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#noDataMessage')).toBeHidden();
    await page.evaluate(() => localStorage.removeItem('iconTestResults_css'));
  });

  test('last updated display exists', async ({ page }) => {
    await expect(page.locator('#lastUpdated')).toBeVisible();
    await expect(page.locator('[data-i18n="summary.last_updated"]')).toBeVisible();
  });
});

test.describe('CSS Page - Locale-Independent Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('css.html');
    await page.waitForLoadState('domcontentloaded');
  });

  test('page has h1 with the format title i18n key', async ({ page }) => {
    const h1 = page.locator('h1[data-i18n="format.css.title"]');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test('back navigation link points to index.html', async ({ page }) => {
    const backLink = page.locator('a[href="index.html"][data-i18n="nav.back_to_suite"]');
    await expect(backLink).toBeVisible();
  });

  test('language selector is present with all supported locales', async ({ page }) => {
    const selector = page.locator('#languageSelector');
    await expect(selector).toBeVisible();
    const expectedLocales = [
      'en', 'en-us', 'en-gb', 'es', 'fr', 'de', 'ja', 'zh', 'zh-tw', 'pt', 'pt-br', 'pt-pt'
    ];
    for (const locale of expectedLocales) {
      await expect(selector.locator(`option[value="${locale}"]`)).toHaveCount(1);
    }
  });

  test('tab controls exist with correct i18n keys', async ({ page }) => {
    await expect(page.locator('#testingTab[data-i18n="css.tab.testing"]')).toBeVisible();
    await expect(page.locator('#renderingTab[data-i18n="css.tab.rendering"]')).toBeVisible();
  });

  test('icon examples section has i18n labels', async ({ page }) => {
    const iconKeys = ['css.remix_square', 'css.pure_css', 'css.minimal_css', 'css.circular_css', 'css.circular_remix'];
    for (const key of iconKeys) {
      await expect(page.locator(`[data-i18n="${key}"]`)).toBeVisible();
    }
  });

  test('performance controls section has correct IDs and i18n keys', async ({ page }) => {
    await expect(page.locator('[data-i18n="css.controls_title"]')).toBeVisible();
    await expect(page.locator('#testType')).toBeVisible();
    await expect(page.locator('#startTest[data-i18n="css.start_test"]')).toBeVisible();
    await expect(page.locator('#clearResults[data-i18n="css.clear_results"]')).toBeVisible();
  });

  test('test type dropdown has all expected options', async ({ page }) => {
    const testType = page.locator('#testType');
    const optionKeys = [
      'css.test_single', 'css.test_bulk', 'css.test_stress',
      'css.test_statistical', 'css.test_massive', 'css.test_ultra', 'css.test_extreme'
    ];
    for (const key of optionKeys) {
      await expect(testType.locator(`option[data-i18n="${key}"]`)).toHaveCount(1);
    }
  });

  test('system specs button and status elements exist', async ({ page }) => {
    await expect(page.locator('#systemInfoButton')).toBeVisible();
    await expect(page.locator('[data-i18n="css.system_specs"]')).toBeVisible();
  });

  test('progress elements exist (hidden by default)', async ({ page }) => {
    await expect(page.locator('#testProgress')).toBeHidden();
    await expect(page.locator('#stopTest')).toBeHidden();
  });
});

test.describe('Past Results Page - Locale-Independent Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('past-results.html');
    await page.waitForLoadState('networkidle');
  });

  test('page has h1 with the past results title i18n key', async ({ page }) => {
    const h1 = page.locator('h1[data-i18n="past.title"]');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test('header navigation links point to correct pages', async ({ page }) => {
    const backLink = page.locator('a[href="summary.html"]');
    await expect(backLink).toBeVisible();
    const newTestLink = page.locator('a[href="css.html"]').first();
    await expect(newTestLink).toBeVisible();
  });

  test('language selector is present with all supported locales', async ({ page }) => {
    const selector = page.locator('#languageSelector');
    await expect(selector).toBeVisible();
    const expectedLocales = [
      'en', 'en-us', 'en-gb', 'es', 'fr', 'de', 'ja', 'zh', 'zh-tw', 'pt', 'pt-br', 'pt-pt'
    ];
    for (const locale of expectedLocales) {
      await expect(selector.locator(`option[value="${locale}"]`)).toHaveCount(1);
    }
  });

  test('action buttons exist with correct IDs and i18n keys', async ({ page }) => {
    await expect(page.locator('#clearHistory[data-i18n="past.clear_history"]')).toBeVisible();
    await expect(page.locator('#exportHistory[data-i18n="past.export_history"]')).toBeVisible();
    await expect(page.locator('#importHistory[data-i18n="past.import_results"]')).toBeVisible();
    await expect(page.locator('#loadExample[data-i18n="past.load_example"]')).toBeVisible();
  });

  test('filter section has all expected controls', async ({ page }) => {
    await expect(page.locator('[data-i18n="past.filter_title"]')).toBeVisible();
    await expect(page.locator('#filterTestType')).toBeVisible();
    await expect(page.locator('#filterDate')).toBeVisible();
    await expect(page.locator('#filterSignificance')).toBeVisible();
    await expect(page.locator('#filterOriginalSource')).toBeVisible();
    await expect(page.locator('#filterInputSource')).toBeVisible();
    await expect(page.locator('#filterFileName')).toBeVisible();
    await expect(page.locator('#applyFilters[data-i18n="past.apply_filters"]')).toBeVisible();
    // clearFilters starts hidden (shown dynamically when filters are active)
    await expect(page.locator('#clearFilters[data-i18n="past.clear_filters"]')).toBeAttached();
  });

  test('summary stats section has all four stat cards', async ({ page }) => {
    await expect(page.locator('#resultsSummary')).toBeVisible();
    await expect(page.locator('[data-i18n="past.total_tests"]')).toBeVisible();
    await expect(page.locator('[data-i18n="past.significant_tests"]')).toBeVisible();
    await expect(page.locator('[data-i18n="past.total_iterations"]')).toBeVisible();
    await expect(page.locator('[data-i18n="past.total_test_time"]')).toBeVisible();
  });

  test('no-results message has link to run tests', async ({ page }) => {
    // Default state (no localStorage data) should show #noResults
    const noResults = page.locator('#noResults');
    await expect(noResults).toBeVisible();
    await expect(noResults.locator('a[href="css.html"]')).toBeVisible();
  });
});
