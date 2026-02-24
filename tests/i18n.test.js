// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - i18n System (src/js/i18n.js)
 * DO NOT MODIFY unless explicitly requested by user
 * Tests the internationalization module: language detection, translation loading,
 * page translation, language switching, and formatting utilities.
 */

test.describe('i18n System', () => {
  test.describe('Initialization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('index.html');
      await page.waitForLoadState('domcontentloaded');
    });

    test('i18n global instance is created', async ({ page }) => {
      const hasI18n = await page.evaluate(() => typeof window.i18n === 'object' && window.i18n !== null);
      expect(hasI18n).toBe(true);
    });

    test('i18nReady event fires during initialization', async ({ page }) => {
      // Navigate to a page and listen for the event on next load
      const eventFired = await page.evaluate(() => {
        return new Promise(resolve => {
          // The event may have already fired; check if translations are loaded
          if (window.i18n && Object.keys(window.i18n.translations).length > 0) {
            resolve(true);
          } else {
            document.addEventListener('i18nReady', () => resolve(true));
            setTimeout(() => resolve(false), 5000);
          }
        });
      });
      expect(eventFired).toBe(true);
    });

    test('translations are loaded after init', async ({ page }) => {
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0, null, { timeout: 5000 });
      const keyCount = await page.evaluate(() => Object.keys(window.i18n.translations).length);
      expect(keyCount).toBeGreaterThan(10);
    });

    test('HTML lang attribute is set after init', async ({ page }) => {
      await page.waitForFunction(() => window.i18n && window.i18n.translations && Object.keys(window.i18n.translations).length > 0);
      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang).toBeTruthy();
      expect(lang).not.toBe('');
    });
  });

  test.describe('Language Detection', () => {
    test('detects en-us from browser locale', async ({ page }) => {
      // Playwright config pins locale to en-US
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
      const lang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      // en-US browser locale maps to en-us (supported) or en (base fallback)
      expect(['en', 'en-us']).toContain(lang);
    });

    test('stores language preference in localStorage', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
      const stored = await page.evaluate(() => localStorage.getItem('preferredLanguage'));
      expect(stored).toBeTruthy();
    });

    test('respects stored language preference', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
      // Set preference to Spanish
      await page.evaluate(() => localStorage.setItem('preferredLanguage', 'es'));
      // Reload to pick up the preference
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0, null, { timeout: 10000 });
      const lang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      expect(lang).toBe('es');
      // Clean up
      await page.evaluate(() => localStorage.removeItem('preferredLanguage'));
    });
  });

  test.describe('Language Support', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
    });

    test('isLanguageSupported returns true for supported languages', async ({ page }) => {
      const supported = await page.evaluate(() => {
        const codes = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'pt-br', 'zh-tw'];
        return codes.every(code => window.i18n.isLanguageSupported(code));
      });
      expect(supported).toBe(true);
    });

    test('isLanguageSupported returns false for unsupported languages', async ({ page }) => {
      const unsupported = await page.evaluate(() => {
        const codes = ['xx', 'klingon', 'pig-latin'];
        return codes.every(code => !window.i18n.isLanguageSupported(code));
      });
      expect(unsupported).toBe(true);
    });

    test('getSupportedLanguages returns all languages with required fields', async ({ page }) => {
      const languages = await page.evaluate(() => window.i18n.getSupportedLanguages());
      expect(languages.length).toBeGreaterThanOrEqual(10);
      for (const lang of languages) {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('native');
      }
    });
  });

  test.describe('Translation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
    });

    test('translate() returns translation for valid key', async ({ page }) => {
      const result = await page.evaluate(() => window.i18n.translate('app.title'));
      expect(result).toBeTruthy();
      expect(result).not.toBe('app.title'); // Should not return the key itself
    });

    test('translate() returns key for missing translation', async ({ page }) => {
      const result = await page.evaluate(() => window.i18n.translate('nonexistent.key.12345'));
      expect(result).toBe('nonexistent.key.12345');
    });

    test('translate() supports parameter substitution', async ({ page }) => {
      // Inject a test translation with parameters
      const result = await page.evaluate(() => {
        window.i18n.translations['test.param'] = 'Hello {{name}}, you have {{count}} items';
        return window.i18n.translate('test.param', { name: 'World', count: '5' });
      });
      expect(result).toBe('Hello World, you have 5 items');
    });

    test('data-i18n elements are translated on page load', async ({ page }) => {
      // Check that elements with data-i18n have been translated
      const translated = await page.evaluate(() => {
        const el = document.querySelector('[data-i18n="app.title"]');
        if (!el) return null;
        return { text: el.textContent, key: el.getAttribute('data-i18n') };
      });
      expect(translated).not.toBeNull();
      if (!translated) return; // TS null guard — narrowed by assertion above
      expect(translated.text).toBeTruthy();
      expect(translated.text.length).toBeGreaterThan(0);
    });
  });

  test.describe('Language Switching', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
    });

    test('setLanguage changes current language and reloads translations', async ({ page }) => {
      await page.evaluate(() => window.i18n.setLanguage('es'));
      const lang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      expect(lang).toBe('es');

      // Verify translations were reloaded
      const titleTranslation = await page.evaluate(() => window.i18n.translate('app.title'));
      expect(titleTranslation).toBeTruthy();
      expect(titleTranslation).not.toBe('app.title');
    });

    test('setLanguage dispatches languageChanged event', async ({ page }) => {
      const eventFired = await page.evaluate(() => {
        return new Promise(resolve => {
          document.addEventListener('languageChanged', (e) => {
            resolve(/** @type {CustomEvent} */ (e).detail.language);
          });
          window.i18n.setLanguage('fr');
        });
      });
      expect(eventFired).toBe('fr');
    });

    test('setLanguage ignores unsupported languages', async ({ page }) => {
      const originalLang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      await page.evaluate(() => window.i18n.setLanguage('xx-unsupported'));
      const afterLang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      expect(afterLang).toBe(originalLang);
    });

    test('setLanguage ignores same language', async ({ page }) => {
      const currentLang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      // This should be a no-op
      await page.evaluate((lang) => window.i18n.setLanguage(lang), currentLang);
      const afterLang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      expect(afterLang).toBe(currentLang);
    });
  });

  test.describe('Language Selector UI', () => {
    test('language selector exists on index page', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#languageSelector')).toBeVisible();
    });

    test('language selector has options for supported languages', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForLoadState('domcontentloaded');
      const optionCount = await page.locator('#languageSelector option').count();
      expect(optionCount).toBeGreaterThanOrEqual(10);
    });

    test('language selector reflects current language', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
      const selectorVal = await page.locator('#languageSelector').inputValue();
      const currentLang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      expect(selectorVal).toBe(currentLang);
    });

    test('changing selector triggers language switch', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);

      // Change language via selector
      await page.locator('#languageSelector').selectOption('es');

      // Wait for translation to complete
      await page.waitForFunction(() => window.i18n.getCurrentLanguage() === 'es');
      const lang = await page.evaluate(() => window.i18n.getCurrentLanguage());
      expect(lang).toBe('es');
    });
  });

  test.describe('Formatting Utilities', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && Object.keys(window.i18n.translations).length > 0);
    });

    test('formatNumber formats numbers according to locale', async ({ page }) => {
      const result = await page.evaluate(() => window.i18n.formatNumber(1234567.89));
      expect(result).toBeTruthy();
      // Should contain the number in some locale format
      expect(result).toContain('1');
    });

    test('formatDate formats dates according to locale', async ({ page }) => {
      const result = await page.evaluate(() => {
        return window.i18n.formatDate(new Date(2024, 0, 15)); // Jan 15, 2024
      });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    test('formatRelativeTime returns human-readable relative time', async ({ page }) => {
      const result = await page.evaluate(() => {
        const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
        return window.i18n.formatRelativeTime(pastDate);
      });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test.describe('Fallback Behavior', () => {
    test('getFallbackTranslations returns basic translations', async ({ page }) => {
      await page.goto('index.html');
      await page.waitForFunction(() => window.i18n && typeof window.i18n.getFallbackTranslations === 'function');
      const fallbacks = await page.evaluate(() => window.i18n.getFallbackTranslations());
      expect(fallbacks['app.title']).toBeTruthy();
      expect(fallbacks['nav.back_to_suite']).toBeTruthy();
    });
  });
});
