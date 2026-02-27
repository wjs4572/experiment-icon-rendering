// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS — Results Library (results-library.html)
 * Phase 6: Tabulator-based table, details panel, bulk operations, import.
 */

test.describe('Results Library Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('results-library.html');
    await page.waitForLoadState('domcontentloaded');
    // Clear localStorage so each test starts clean
    await page.evaluate(() => localStorage.clear());
  });

  /* ─── Page Structure ─────────────────────────────────────── */

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Results Library - Icon Performance Testing');
  });

  test('displays heading and subtitle with i18n keys', async ({ page }) => {
    await expect(page.locator('h1[data-i18n="library.title"]')).toBeVisible();
    await expect(page.locator('[data-i18n="library.subtitle"]')).toBeVisible();
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

  test('navigation links point to correct pages', async ({ page }) => {
    const dashboardLink = page.locator('a[href="index.html"]');
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('data-i18n', 'library.nav_dashboard');

    const summaryLink = page.locator('a[href="summary.html"]');
    await expect(summaryLink).toBeVisible();
    await expect(summaryLink).toHaveAttribute('data-i18n', 'library.nav_summary');
  });

  test('navigation to dashboard works', async ({ page }) => {
    await page.locator('a[href="index.html"]').click();
    await expect(page).toHaveURL(/index\.html$/);
  });

  test('navigation to summary works', async ({ page }) => {
    await page.locator('a[href="summary.html"]').click();
    await expect(page).toHaveURL(/summary\.html$/);
  });

  test('cache prevention headers are present', async ({ page }) => {
    await expect(page.locator('meta[http-equiv="Cache-Control"]')).toBeAttached();
    await expect(page.locator('meta[http-equiv="Pragma"]')).toBeAttached();
    await expect(page.locator('meta[http-equiv="Expires"]')).toBeAttached();
  });

  /* ─── Import Section ─────────────────────────────────────── */

  test('import button and checkbox are present', async ({ page }) => {
    const importBtn = page.locator('#importBtn');
    await expect(importBtn).toBeVisible();
    await expect(importBtn).toHaveAttribute('data-i18n', 'library.import_btn');

    const checkbox = page.locator('#importActiveCheckbox');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked(); // default: checked
  });

  test('hidden file input exists for import', async ({ page }) => {
    const fileInput = page.locator('#importFileInput');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute('accept', '.json');
  });

  /* ─── Bulk Action Bar ────────────────────────────────────── */

  test('bulk action buttons are present', async ({ page }) => {
    await expect(page.locator('#exportSelectedBtn')).toBeVisible();
    await expect(page.locator('#deleteSelectedBtn')).toBeVisible();
    await expect(page.locator('#toggleActiveBtn')).toBeVisible();
    await expect(page.locator('#clearAllBtn')).toBeVisible();
    await expect(page.locator('#selectionCount')).toBeVisible();
  });

  test('bulk action buttons have correct i18n keys', async ({ page }) => {
    await expect(page.locator('#exportSelectedBtn')).toHaveAttribute('data-i18n', 'library.export_selected');
    await expect(page.locator('#deleteSelectedBtn')).toHaveAttribute('data-i18n', 'library.delete_selected');
    await expect(page.locator('#toggleActiveBtn')).toHaveAttribute('data-i18n', 'library.toggle_active');
    await expect(page.locator('#clearAllBtn')).toHaveAttribute('data-i18n', 'library.clear_all');
  });

  test('bulk buttons are disabled when nothing selected', async ({ page }) => {
    await expect(page.locator('#exportSelectedBtn')).toBeDisabled();
    await expect(page.locator('#deleteSelectedBtn')).toBeDisabled();
    await expect(page.locator('#toggleActiveBtn')).toBeDisabled();
  });

  test('selection count shows 0 selected', async ({ page }) => {
    await expect(page.locator('#selectionCount')).toContainText('0 selected');
  });

  /* ─── Tabulator Table ────────────────────────────────────── */

  test('Tabulator table container exists', async ({ page }) => {
    await expect(page.locator('#results-table')).toBeVisible();
  });

  test('Tabulator renders with expected column headers', async ({ page }) => {
    // Wait for Tabulator to initialise
    await page.waitForSelector('.tabulator-header');

    const headerText = await page.locator('.tabulator-header').textContent();
    expect(headerText).toContain('Active');
    expect(headerText).toContain('Format');
    expect(headerText).toContain('Test Type');
    expect(headerText).toContain('Start Time');
    expect(headerText).toContain('Duration');
    expect(headerText).toContain('Iterations');
    expect(headerText).toContain('Source');
    expect(headerText).toContain('Run ID');
    expect(headerText).toContain('Fastest');
  });

  test('empty table shows placeholder message', async ({ page }) => {
    await page.waitForSelector('.tabulator');
    const placeholder = page.locator('.tabulator-placeholder');
    await expect(placeholder).toBeVisible();
  });

  test('table shows records from RunStateStore', async ({ page }) => {
    // Seed a record, then reload
    await page.evaluate(() => {
      const rec = window.RunRecord.createRunRecord({
        format: 'css',
        testType: 'bulk',
        startTime: new Date().toISOString(),
        durationMs: 5000,
        iterations: 200,
        source: 'local',
        active: true,
        performanceRanking: [{ rank: 1, iconType: 'font_square', averageTime: 1.23 }]
      });
      window.RunStateStore.saveRecord(rec);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');

    const rowCount = await page.locator('.tabulator-row').count();
    expect(rowCount).toBe(1);

    // Verify cell content
    const rowText = await page.locator('.tabulator-row').first().textContent();
    expect(rowText).toContain('CSS');
    expect(rowText).toContain('bulk');
    expect(rowText).toContain('local');
    expect(rowText).toContain('font_square');
  });

  /* ─── Pagination ─────────────────────────────────────────── */

  test('pagination renders in the table footer', async ({ page }) => {
    await page.waitForSelector('.tabulator');
    const footer = page.locator('.tabulator-footer');
    await expect(footer).toBeVisible();
  });

  /* ─── Details Panel ──────────────────────────────────────── */

  test('details panel is hidden by default', async ({ page }) => {
    await expect(page.locator('#detailsPanel')).toBeHidden();
  });

  test('clicking a row opens the details panel', async ({ page }) => {
    // Seed a record
    await page.evaluate(() => {
      const rec = window.RunRecord.createRunRecord({
        format: 'svg',
        testType: 'stress',
        startTime: new Date().toISOString(),
        durationMs: 12000,
        iterations: 500,
        source: 'local',
        active: true,
        performanceRanking: [
          { rank: 1, iconType: 'inline_svg', averageTime: 0.85, standardDeviation: 0.05, sampleSize: 500 }
        ],
        statisticalAnalysis: {
          'external_svg vs inline_svg': { pValue: 0.02, isSignificant: true, power: 0.91, effectSize: 0.45 }
        }
      });
      window.RunStateStore.saveRecord(rec);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');

    // Click the row (on the Format cell to avoid checkboxes)
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').nth(2).click();

    // Details panel should be visible
    await expect(page.locator('#detailsPanel')).toBeVisible();
    await expect(page.locator('#detailsContent')).toContainText('Run Metadata');
    await expect(page.locator('#detailsContent')).toContainText('SVG');
    await expect(page.locator('#detailsContent')).toContainText('Performance Ranking');
    await expect(page.locator('#detailsContent')).toContainText('Statistical Analysis');
  });

  test('details panel has action buttons', async ({ page }) => {
    await expect(page.locator('#detailExportBtn')).toBeAttached();
    await expect(page.locator('#detailToggleBtn')).toBeAttached();
    await expect(page.locator('#detailDeleteBtn')).toBeAttached();
    await expect(page.locator('#closeDetailsBtn')).toBeAttached();
  });

  test('details panel close button hides the panel', async ({ page }) => {
    // Seed and open
    await page.evaluate(() => {
      const rec = window.RunRecord.createRunRecord({ format: 'png', source: 'local', active: true });
      window.RunStateStore.saveRecord(rec);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').nth(2).click();
    await expect(page.locator('#detailsPanel')).toBeVisible();

    // Close
    await page.locator('#closeDetailsBtn').click();
    await expect(page.locator('#detailsPanel')).toBeHidden();
  });

  /* ─── Bulk Operations ────────────────────────────────────── */

  test('selecting a row enables bulk buttons', async ({ page }) => {
    await page.evaluate(() => {
      const rec = window.RunRecord.createRunRecord({ format: 'gif', source: 'local', active: true });
      window.RunStateStore.saveRecord(rec);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');

    // Click the row selection checkbox (first cell)
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').first().click();

    await expect(page.locator('#selectionCount')).toContainText('1 selected');
    await expect(page.locator('#exportSelectedBtn')).toBeEnabled();
    await expect(page.locator('#deleteSelectedBtn')).toBeEnabled();
    await expect(page.locator('#toggleActiveBtn')).toBeEnabled();
  });

  test('toggle active flips active state of selected rows', async ({ page }) => {
    await page.evaluate(() => {
      const rec = window.RunRecord.createRunRecord({ format: 'jpeg', source: 'local', active: true });
      window.RunStateStore.saveRecord(rec);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');

    // Select the row
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').first().click();

    // Toggle active
    await page.locator('#toggleActiveBtn').click();

    // Verify the record in localStorage is now inactive
    const active = await page.evaluate(() => {
      const recs = window.RunStateStore.getAllCompleted();
      return recs[0].active;
    });
    expect(active).toBe(false);
  });

  test('delete selected removes records', async ({ page }) => {
    await page.evaluate(() => {
      const rec = window.RunRecord.createRunRecord({ format: 'webp', source: 'local', active: true });
      window.RunStateStore.saveRecord(rec);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');

    // Select the row
    await page.locator('.tabulator-row').first().locator('.tabulator-cell').first().click();

    // Accept the confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#deleteSelectedBtn').click();

    // Verify no records remain
    const count = await page.evaluate(() => window.RunStateStore.getAllCompleted().length);
    expect(count).toBe(0);
  });

  test('clear all removes all history', async ({ page }) => {
    await page.evaluate(() => {
      for (let i = 0; i < 3; i++) {
        const rec = window.RunRecord.createRunRecord({ format: 'avif', source: 'local', active: true });
        window.RunStateStore.saveRecord(rec);
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.tabulator-row');
    expect(await page.locator('.tabulator-row').count()).toBe(3);

    // Accept the confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#clearAllBtn').click();

    // Verify empty
    const count = await page.evaluate(() => window.RunStateStore.getAllCompleted().length);
    expect(count).toBe(0);
  });

  /* ─── External Dependencies ──────────────────────────────── */

  test('Tabulator JS is loaded', async ({ page }) => {
    const loaded = await page.evaluate(() => typeof /** @type {any} */ (window).Tabulator === 'function');
    expect(loaded).toBe(true);
  });

  test('Tabulator CSS is loaded', async ({ page }) => {
    const linkExists = await page.locator('link[href*="tabulator"]').count();
    expect(linkExists).toBeGreaterThan(0);
  });

  test('foundation modules are loaded', async ({ page }) => {
    const modules = await page.evaluate(() => ({
      RunId: typeof window.RunId === 'object',
      RunRecord: typeof window.RunRecord === 'object',
      RunStateStore: typeof window.RunStateStore === 'object'
    }));
    expect(modules.RunId).toBe(true);
    expect(modules.RunRecord).toBe(true);
    expect(modules.RunStateStore).toBe(true);
  });

  /* ─── Accessibility ──────────────────────────────────────── */

  test('page has exactly one h1', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('navigation has aria-label', async ({ page }) => {
    await expect(page.locator('nav[aria-label]')).toBeAttached();
  });

  test('file input has aria-label', async ({ page }) => {
    const fileInput = page.locator('#importFileInput');
    await expect(fileInput).toHaveAttribute('aria-label');
  });

  test('details panel has role region', async ({ page }) => {
    const panel = page.locator('#detailsPanel');
    await expect(panel).toHaveAttribute('role', 'region');
  });

  test('close details button has aria-label', async ({ page }) => {
    await expect(page.locator('#closeDetailsBtn')).toHaveAttribute('aria-label');
  });

  test('select all checkbox has aria-label', async ({ page }) => {
    await page.waitForSelector('.tabulator-header');
    const selectAllCb = page.locator('.tabulator-header input[type="checkbox"]');
    await expect(selectAllCb).toHaveAttribute('aria-label');
  });
});
