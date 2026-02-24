// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - System Specifications Module (src/js/system-specs.js)
 * DO NOT MODIFY unless explicitly requested by user
 * Tests the system specs manager: initialization, auto-detection, modal UI,
 * localStorage persistence, Belarc import, and hasCompleteSystemInfo logic.
 */

test.describe('System Specifications Module', () => {
  test.describe('Initialization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
    });

    test('systemSpecsManager global instance is created', async ({ page }) => {
      await page.waitForFunction(() => typeof window.systemSpecsManager === 'object');
      const exists = await page.evaluate(() => window.systemSpecsManager !== null);
      expect(exists).toBe(true);
    });

    test('systemInfo is populated with default structure', async ({ page }) => {
      await page.waitForFunction(() => window.systemSpecsManager && window.systemSpecsManager.systemInfo);
      const info = await page.evaluate(() => window.systemSpecsManager.systemInfo);
      expect(info).toHaveProperty('lastUpdated');
      expect(info).toHaveProperty('autoDetected');
      expect(info).toHaveProperty('manual');
    });

    test('auto-detected info contains browser data', async ({ page }) => {
      await page.waitForFunction(() => window.systemSpecsManager && window.systemSpecsManager.systemInfo);
      const auto = await page.evaluate(() => window.systemSpecsManager.systemInfo.autoDetected);
      expect(auto).toHaveProperty('userAgent');
      expect(auto).toHaveProperty('platform');
      expect(auto).toHaveProperty('language');
      expect(auto).toHaveProperty('hardwareConcurrency');
      expect(auto.userAgent).toBeTruthy();
    });

    test('auto-detected info includes screen data', async ({ page }) => {
      await page.waitForFunction(() => window.systemSpecsManager && window.systemSpecsManager.systemInfo);
      const auto = await page.evaluate(() => window.systemSpecsManager.systemInfo.autoDetected);
      expect(auto).toHaveProperty('screen');
      expect(auto.screen).toHaveProperty('resolution');
      expect(auto.screen).toHaveProperty('colorDepth');
      expect(auto.screen).toHaveProperty('pixelRatio');
    });

    test('auto-detected info includes GPU detection', async ({ page }) => {
      await page.waitForFunction(() => window.systemSpecsManager && window.systemSpecsManager.systemInfo);
      const auto = await page.evaluate(() => window.systemSpecsManager.systemInfo.autoDetected);
      expect(auto).toHaveProperty('gpu');
      expect(auto.gpu).toBeTruthy();
    });
  });

  test.describe('Default System Info Structure', () => {
    test('manual section has all required categories', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);
      const manual = await page.evaluate(() => window.systemSpecsManager.getDefaultSystemInfo().manual);
      expect(manual).toHaveProperty('systemConfiguration');
      expect(manual).toHaveProperty('processor');
      expect(manual).toHaveProperty('memory');
      expect(manual).toHaveProperty('graphics');
      expect(manual).toHaveProperty('storage');
      expect(manual).toHaveProperty('network');
      expect(manual).toHaveProperty('reportGeneratedBy');
    });

    test('processor sub-fields are present', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);
      const proc = await page.evaluate(() => window.systemSpecsManager.getDefaultSystemInfo().manual.processor);
      expect(proc).toHaveProperty('cpu');
      expect(proc).toHaveProperty('architecture');
      expect(proc).toHaveProperty('cores');
      expect(proc).toHaveProperty('cache');
      expect(proc).toHaveProperty('generation');
    });
  });

  test.describe('Persistence (localStorage)', () => {
    test('saveSystemInfo stores data and returns true', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);

      const result = await page.evaluate(() => {
        const info = window.systemSpecsManager.getDefaultSystemInfo();
        info.manual.processor.cpu = 'Test CPU';
        return window.systemSpecsManager.saveSystemInfo(info);
      });
      expect(result).toBe(true);

      // Verify it's in localStorage
      const stored = await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('systemSpecifications'));
        return data?.manual?.processor?.cpu;
      });
      expect(stored).toBe('Test CPU');

      // Clean up
      await page.evaluate(() => localStorage.removeItem('systemSpecifications'));
    });

    test('loadSystemInfo reads from localStorage', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);

      // Pre-populate localStorage
      await page.evaluate(() => {
        const info = window.systemSpecsManager.getDefaultSystemInfo();
        info.manual.memory.totalRAM = '32GB';
        localStorage.setItem('systemSpecifications', JSON.stringify(info));
      });

      const loaded = await page.evaluate(() => {
        const info = window.systemSpecsManager.loadSystemInfo();
        return info.manual.memory.totalRAM;
      });
      expect(loaded).toBe('32GB');

      // Clean up
      await page.evaluate(() => localStorage.removeItem('systemSpecifications'));
    });

    test('loadSystemInfo returns defaults when localStorage is empty', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);
      await page.evaluate(() => localStorage.removeItem('systemSpecifications'));
      const info = await page.evaluate(() => window.systemSpecsManager.loadSystemInfo());
      expect(info).toHaveProperty('autoDetected');
      expect(info).toHaveProperty('manual');
    });
  });

  test.describe('hasCompleteSystemInfo', () => {
    test('returns false when no manual fields are set', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);
      await page.evaluate(() => localStorage.removeItem('systemSpecifications'));

      const complete = await page.evaluate(() => {
        const info = window.systemSpecsManager.getDefaultSystemInfo();
        window.systemSpecsManager.systemInfo = info;
        return window.systemSpecsManager.hasCompleteSystemInfo();
      });
      expect(complete).toBe(false);
    });

    test('returns true when any manual field has data', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);

      const complete = await page.evaluate(() => {
        const info = window.systemSpecsManager.getDefaultSystemInfo();
        info.manual.processor.cpu = 'Intel i7';
        window.systemSpecsManager.systemInfo = info;
        return window.systemSpecsManager.hasCompleteSystemInfo();
      });
      expect(complete).toBe(true);
    });
  });

  test.describe('Modal UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForFunction(() => window.systemSpecsManager);
    });

    test('modal is initially hidden', async ({ page }) => {
      const modal = page.locator('#systemInfoModal');
      // Modal may not exist until initializeModal is called, or it's hidden
      const count = await modal.count();
      if (count > 0) {
        await expect(modal).toHaveClass(/hidden/);
      }
    });

    test('showModal creates and displays the modal', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      const modal = page.locator('#systemInfoModal');
      await expect(modal).toBeVisible();
    });

    test('modal contains auto-detected fields', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      await expect(page.locator('#detectedUserAgent')).toBeVisible();
      await expect(page.locator('#detectedPlatform')).toBeVisible();
      await expect(page.locator('#detectedCores')).toBeVisible();
      await expect(page.locator('#detectedScreen')).toBeVisible();
      await expect(page.locator('#detectedGPU')).toBeVisible();
    });

    test('modal contains manual input fields', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      await expect(page.locator('#systemModel')).toBeVisible();
      await expect(page.locator('#cpu')).toBeVisible();
      await expect(page.locator('#totalRAM')).toBeVisible();
      await expect(page.locator('#integratedGPU')).toBeVisible();
      await expect(page.locator('#systemDrive')).toBeVisible();
    });

    test('modal has save, clear, and close buttons', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      await expect(page.locator('#saveSystemInfo')).toBeVisible();
      await expect(page.locator('#clearSystemInfo')).toBeVisible();
      await expect(page.locator('#closeSystemModal')).toBeVisible();
    });

    test('hideModal closes the modal', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      await expect(page.locator('#systemInfoModal')).toBeVisible();

      await page.evaluate(() => window.systemSpecsManager.hideModal());
      await expect(page.locator('#systemInfoModal')).toHaveClass(/hidden/);
    });

    test('Escape key closes the modal', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      await expect(page.locator('#systemInfoModal')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('#systemInfoModal')).toHaveClass(/hidden/);
    });

    test('modal has Belarc import button and hidden file input', async ({ page }) => {
      await page.evaluate(() => window.systemSpecsManager.showModal());
      await expect(page.locator('#importBelarcBtn')).toBeVisible();
      await expect(page.locator('#belarcFileInput')).toBeAttached();
    });
  });

  test.describe('i18n Integration', () => {
    test('t() helper returns fallback when i18n not loaded', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);
      const result = await page.evaluate(() => {
        return window.systemSpecsManager.t('nonexistent.key', 'Fallback Text');
      });
      expect(result).toBe('Fallback Text');
    });

    test('system info status element exists on css page', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#systemInfoStatus')).toBeAttached();
    });
  });

  test.describe('GPU Detection', () => {
    test('detectGPU returns a string value', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);
      const gpu = await page.evaluate(() => window.systemSpecsManager.detectGPU());
      expect(typeof gpu).toBe('string');
      expect(gpu.length).toBeGreaterThan(0);
    });
  });
});
