// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * LOCALE-SPECIFIC TRANSLATION TESTS
 * Verifies that translated text actually renders for non-English locales.
 * Tests a representative subset: Spanish (es), Chinese (zh), Portuguese-Brazil (pt-br).
 * Covers index.html and summary.html (Phase 1).
 *
 * Each locale is set via Playwright's locale option which controls navigator.language,
 * causing the i18n system to load the corresponding locale file.
 */

// Expected translations per locale for spot-checking
const LOCALE_DATA = {
  es: {
    navigatorLocale: 'es',
    index: {
      title: 'Suite de Pruebas de Rendimiento de Renderizado de Iconos',
    },
    summary: {
      title: 'Panel de Resumen de Rendimiento',
    },
    css: {
      h1: 'Implementación CSS',
      startTest: 'Iniciar Prueba de Estrés',
    },
    library: {
      title: 'Biblioteca de Resultados',
      importBtn: 'Importar Resultados',
    },
  },
  zh: {
    navigatorLocale: 'zh',
    index: {
      title: '图标渲染性能测试套件',
    },
    summary: {
      title: '性能概览仪表板',
    },
    css: {
      h1: 'CSS实现',
      startTest: '开始压力测试',
    },
    library: {
      title: '结果库',
      importBtn: '导入结果',
    },
  },
  'pt-br': {
    navigatorLocale: 'pt-BR',
    index: {
      title: 'Suíte de Teste de Performance de Renderização de Ícones',
    },
    summary: {
      title: 'Painel de Resumo de Performance',
    },
    css: {
      h1: 'Implementação CSS',
      startTest: 'Iniciar Teste de Stress',
    },
    library: {
      title: 'Biblioteca de Resultados',
      importBtn: 'Importar Resultados',
    },
  },
};

for (const [localeKey, data] of Object.entries(LOCALE_DATA)) {
  test.describe(`Locale: ${localeKey}`, () => {
    // Override the locale for all tests in this describe block
    test.use({ locale: data.navigatorLocale });

    test.describe('index.html', () => {
      test.beforeEach(async ({ page }) => {
        // Clear any stored language preference so navigator.language takes effect
        await page.addInitScript(() => localStorage.removeItem('preferredLanguage'));
        await page.goto('index.html');
        await page.waitForLoadState('domcontentloaded');
      });

      test('page title h1 is translated', async ({ page }) => {
        const h1 = page.locator('h1[data-i18n="app.title"]');
        await expect(h1).toBeVisible();
        await expect(h1).toHaveText(data.index.title);
      });

      test('language selector reflects detected locale', async ({ page }) => {
        const selector = page.locator('#languageSelector');
        await expect(selector).toBeVisible();
        await expect(selector).toHaveValue(localeKey);
      });

      test('format card titles are translated (not English)', async ({ page }) => {
        // Verify at least the CSS card title is not the English default
        const cssTitle = page.locator('[data-i18n="format.css.title"]');
        await expect(cssTitle).toBeVisible();
        const text = await cssTitle.textContent();
        expect(text).not.toBe('CSS Implementation');
      });

      test('data-i18n elements have non-empty content', async ({ page }) => {
        // Spot-check that several key elements have been populated
        const keys = ['app.subtitle', 'format.svg.title', 'format.png.title'];
        for (const key of keys) {
          const el = page.locator(`[data-i18n="${key}"]`);
          await expect(el).toBeVisible();
          const text = (await el.textContent()) || '';
          expect(text.trim().length).toBeGreaterThan(0);
        }
      });
    });

    test.describe('summary.html', () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.removeItem('preferredLanguage'));
        await page.goto('summary.html');
        await page.waitForLoadState('domcontentloaded');
      });

      test('page title h1 is translated', async ({ page }) => {
        const h1 = page.locator('h1[data-i18n="summary.title"]');
        await expect(h1).toBeVisible();
        await expect(h1).toHaveText(data.summary.title);
      });

      test('export buttons are translated (not English)', async ({ page }) => {
        const csvBtn = page.locator('#exportCsv');
        await expect(csvBtn).toBeVisible();
        const text = await csvBtn.textContent();
        expect(text).not.toBe('Export CSV');
      });

      test('no-data message is translated', async ({ page }) => {
        const noDataTitle = page.locator('[data-i18n="summary.no_data_title"]');
        await expect(noDataTitle).toBeVisible();
        const text = await noDataTitle.textContent();
        expect(text).not.toBe('No Test Data Available');
      });

      test('header navigation links are translated', async ({ page }) => {
        const backLink = page.locator('header a[data-i18n="summary.back_to_tests"]');
        await expect(backLink).toBeVisible();
        const text = await backLink.textContent();
        expect(text).not.toBe('← Back to Test Suite');
      });
    });

    test.describe('css.html', () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.removeItem('preferredLanguage'));
        await page.goto('css.html');
        await page.waitForLoadState('domcontentloaded');
      });

      test('page h1 is translated', async ({ page }) => {
        const h1 = page.locator('h1[data-i18n="format.css.title"]');
        await expect(h1).toBeVisible();
        await expect(h1).toHaveText(data.css.h1);
      });

      test('start test button is translated', async ({ page }) => {
        const btn = page.locator('#startTest');
        await expect(btn).toBeVisible();
        await expect(btn).toHaveText(data.css.startTest);
      });

      test('tab buttons are translated (not English)', async ({ page }) => {
        const testingTab = page.locator('#testingTab');
        await expect(testingTab).toBeVisible();
        const text = await testingTab.textContent();
        expect(text).not.toBe('Performance Testing');
      });

      test('data-i18n elements have non-empty content', async ({ page }) => {
        const keys = ['css.controls_title', 'css.examples_title', 'css.test_type'];
        for (const key of keys) {
          const el = page.locator(`[data-i18n="${key}"]`);
          await expect(el).toBeVisible();
          const text = (await el.textContent()) || '';
          expect(text.trim().length).toBeGreaterThan(0);
        }
      });
    });

    test.describe('results-library.html', () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.removeItem('preferredLanguage'));
        await page.goto('results-library.html');
        await page.waitForLoadState('networkidle');
      });

      test('page h1 is translated', async ({ page }) => {
        const h1 = page.locator('h1[data-i18n="library.title"]');
        await expect(h1).toBeVisible();
        await expect(h1).toHaveText(data.library.title);
      });

      test('import button is translated', async ({ page }) => {
        const btn = page.locator('#importBtn');
        await expect(btn).toBeVisible();
        await expect(btn).toHaveText(data.library.importBtn);
      });

      test('bulk action buttons are translated (not English)', async ({ page }) => {
        const el = page.locator('[data-i18n="library.export_selected"]');
        await expect(el).toBeVisible();
        const text = await el.textContent();
        expect(text).not.toBe('Export Selected');
      });

      test('data-i18n elements have non-empty content', async ({ page }) => {
        const keys = ['library.subtitle', 'library.nav_dashboard', 'library.clear_all'];
        for (const key of keys) {
          const el = page.locator(`[data-i18n="${key}"]`);
          await expect(el).toBeVisible();
          const text = (await el.textContent()) || '';
          expect(text.trim().length).toBeGreaterThan(0);
        }
      });
    });
  });
}
