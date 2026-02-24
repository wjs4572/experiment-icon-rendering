// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Stress Test Manager (src/js/stress-test-manager.js)
 * DO NOT MODIFY unless explicitly requested by user
 * Tests the stress-test manager: initialization, icon configs, UI controls,
 * test configuration, progress UI, system info delegation, and tab switching.
 */

test.describe('Stress Test Manager', () => {
  test.describe('Initialization', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
    });

    test('stressTestManager global instance is created', async ({ page }) => {
      await page.waitForFunction(() => typeof window.stressTestManager === 'object');
      const exists = await page.evaluate(() => window.stressTestManager !== null);
      expect(exists).toBe(true);
    });

    test('isRunning is false on init', async ({ page }) => {
      await page.waitForFunction(() => window.stressTestManager);
      const running = await page.evaluate(() => window.stressTestManager.isRunning);
      expect(running).toBe(false);
    });

    test('results object is empty on init', async ({ page }) => {
      await page.waitForFunction(() => window.stressTestManager);
      const keys = await page.evaluate(() => Object.keys(window.stressTestManager.results).length);
      expect(keys).toBe(0);
    });

    test('batchSize is set to a positive number', async ({ page }) => {
      await page.waitForFunction(() => window.stressTestManager);
      const batchSize = await page.evaluate(() => window.stressTestManager.batchSize);
      expect(batchSize).toBeGreaterThan(0);
    });
  });

  test.describe('Icon Configurations', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);
    });

    test('iconConfigs contains 5 icon types', async ({ page }) => {
      const count = await page.evaluate(() => window.stressTestManager.iconConfigs.length);
      expect(count).toBe(5);
    });

    test('each config has required properties', async ({ page }) => {
      const configs = await page.evaluate(() => window.stressTestManager.iconConfigs);
      for (const config of configs) {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('selector');
        expect(config).toHaveProperty('containerSelector');
        expect(config).toHaveProperty('hasNetworkOverhead');
      }
    });

    test('icon config names include expected types', async ({ page }) => {
      const names = await page.evaluate(() =>
        window.stressTestManager.iconConfigs.map((/** @type {{ name: string }} */ c) => c.name)
      );
      expect(names).toContain('Remix Icon (Square)');
      expect(names).toContain('Pure CSS Icon');
      expect(names).toContain('Minimal CSS Icon');
      expect(names).toContain('Circular CSS Icon');
      expect(names).toContain('Circular Remix Icon');
    });

    test('font-based icons are marked with hasNetworkOverhead', async ({ page }) => {
      const configs = await page.evaluate(() => window.stressTestManager.iconConfigs);
      const remixSquare = configs.find((/** @type {{ name: string }} */ c) => c.name === 'Remix Icon (Square)');
      const pureCss = configs.find((/** @type {{ name: string }} */ c) => c.name === 'Pure CSS Icon');
      expect(remixSquare.hasNetworkOverhead).toBe(true);
      expect(pureCss.hasNetworkOverhead).toBe(false);
    });

    test('circular Remix config has isCircular flag', async ({ page }) => {
      const configs = await page.evaluate(() => window.stressTestManager.iconConfigs);
      const circular = configs.find((/** @type {{ name: string }} */ c) => c.name === 'Circular Remix Icon');
      expect(circular.isCircular).toBe(true);
    });
  });

  test.describe('Test Configuration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);
    });

    test('getTestConfig returns valid config for all types', async ({ page }) => {
      const types = ['single', 'bulk', 'stress', 'statistical', 'massive', 'ultra', 'extreme'];
      for (const type of types) {
        const config = await page.evaluate((t) => window.stressTestManager.getTestConfig(t), type);
        expect(config).toHaveProperty('iterations');
        expect(config).toHaveProperty('iconsPerTest');
        expect(config).toHaveProperty('description');
        expect(config.iterations).toBeGreaterThan(0);
        expect(config.iconsPerTest).toBeGreaterThan(0);
      }
    });

    test('getTestConfig falls back to bulk for unknown type', async ({ page }) => {
      const config = await page.evaluate(() => window.stressTestManager.getTestConfig('unknown-type'));
      const bulkConfig = await page.evaluate(() => window.stressTestManager.getTestConfig('bulk'));
      expect(config.iterations).toBe(bulkConfig.iterations);
      expect(config.iconsPerTest).toBe(bulkConfig.iconsPerTest);
    });

    test('single test has 2000 iterations with 1 icon', async ({ page }) => {
      const config = await page.evaluate(() => window.stressTestManager.getTestConfig('single'));
      expect(config.iterations).toBe(2000);
      expect(config.iconsPerTest).toBe(1);
    });

    test('bulk test has 50 iterations with 100 icons', async ({ page }) => {
      const config = await page.evaluate(() => window.stressTestManager.getTestConfig('bulk'));
      expect(config.iterations).toBe(50);
      expect(config.iconsPerTest).toBe(100);
    });
  });

  test.describe('UI Controls', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
    });

    test('start test button exists and is enabled', async ({ page }) => {
      const startBtn = page.locator('#startTest');
      await expect(startBtn).toBeVisible();
      await expect(startBtn).toBeEnabled();
    });

    test('stop test button exists and is hidden initially', async ({ page }) => {
      const stopBtn = page.locator('#stopTest');
      await expect(stopBtn).toBeHidden();
    });

    test('clear results button exists', async ({ page }) => {
      const clearBtn = page.locator('#clearResults');
      await expect(clearBtn).toBeVisible();
    });

    test('system info button exists', async ({ page }) => {
      const sysBtn = page.locator('#systemInfoButton');
      await expect(sysBtn).toBeVisible();
    });

    test('test type selector has all expected options', async ({ page }) => {
      const options = await page.locator('#testType option').allTextContents();
      expect(options.length).toBe(7);
    });

    test('test type defaults to bulk', async ({ page }) => {
      const value = await page.locator('#testType').inputValue();
      expect(value).toBe('bulk');
    });

    test('progress section is hidden initially', async ({ page }) => {
      await expect(page.locator('#testProgress')).toHaveClass(/hidden/);
    });

    test('memory usage element exists', async ({ page }) => {
      await expect(page.locator('#memoryUsage')).toBeAttached();
    });

    test('results section shows default message', async ({ page }) => {
      const resultsDiv = page.locator('#results');
      await expect(resultsDiv).toBeVisible();
    });
  });

  test.describe('Progress UI', () => {
    test('showProgress reveals progress section and disables start', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      await page.evaluate(() => window.stressTestManager.showProgress(true));
      await expect(page.locator('#testProgress')).not.toHaveClass(/hidden/);

      const disabled = await page.locator('#startTest').isDisabled();
      expect(disabled).toBe(true);

      await expect(page.locator('#stopTest')).not.toHaveClass(/hidden/);
    });

    test('showProgress(false) hides progress and re-enables start', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      // First show, then hide
      await page.evaluate(() => window.stressTestManager.showProgress(true));
      await page.evaluate(() => window.stressTestManager.showProgress(false));

      await expect(page.locator('#testProgress')).toHaveClass(/hidden/);

      const disabled = await page.locator('#startTest').isDisabled();
      expect(disabled).toBe(false);

      await expect(page.locator('#stopTest')).toHaveClass(/hidden/);
    });
  });

  test.describe('Clear and Reset', () => {
    test('clearResults resets results display', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      await page.evaluate(() => window.stressTestManager.clearResults());

      const text = await page.locator('#results').textContent();
      expect(text).toContain('No tests run yet');
    });

    test('resetTestState clears internal state', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      // Set some state
      await page.evaluate(() => {
        window.stressTestManager.completedIterations = 100;
        window.stressTestManager.totalIterations = 500;
        window.stressTestManager.isRunning = true;
      });

      await page.evaluate(() => window.stressTestManager.resetTestState());

      const state = await page.evaluate(() => ({
        isRunning: window.stressTestManager.isRunning,
        completedIterations: window.stressTestManager.completedIterations,
        totalIterations: window.stressTestManager.totalIterations,
        results: Object.keys(window.stressTestManager.results).length,
      }));

      expect(state.isRunning).toBe(false);
      expect(state.completedIterations).toBe(0);
      expect(state.totalIterations).toBe(0);
      expect(state.results).toBe(0);
    });
  });

  test.describe('System Info Delegation', () => {
    test('delegates to systemSpecsManager for system info', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager && window.systemSpecsManager);

      const hasSystemInfo = await page.evaluate(() =>
        window.stressTestManager.systemInfo !== null &&
        typeof window.stressTestManager.systemInfo === 'object'
      );
      expect(hasSystemInfo).toBe(true);
    });

    test('systemInfoButton opens system specs modal', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.systemSpecsManager);

      await page.locator('#systemInfoButton').click();
      await expect(page.locator('#systemInfoModal')).toBeVisible();
    });

    test('systemInfoStatus element is present', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('#systemInfoStatus')).toBeAttached();
    });
  });

  test.describe('Tab Switching', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('css.html');
      await page.waitForLoadState('domcontentloaded');
    });

    test('testing tab is visible by default', async ({ page }) => {
      await expect(page.locator('#testingContent')).not.toHaveClass(/hidden/);
    });

    test('rendering tab content is hidden by default', async ({ page }) => {
      await expect(page.locator('#renderingContent')).toHaveClass(/hidden/);
    });

    test('clicking rendering tab shows rendering content', async ({ page }) => {
      await page.locator('#renderingTab').click();
      await expect(page.locator('#renderingContent')).not.toHaveClass(/hidden/);
      await expect(page.locator('#testingContent')).toHaveClass(/hidden/);
    });

    test('clicking testing tab returns to testing content', async ({ page }) => {
      await page.locator('#renderingTab').click();
      await page.locator('#testingTab').click();
      await expect(page.locator('#testingContent')).not.toHaveClass(/hidden/);
      await expect(page.locator('#renderingContent')).toHaveClass(/hidden/);
    });

    test('renderingTabContainer exists', async ({ page }) => {
      await expect(page.locator('#renderingTabContainer')).toBeAttached();
    });
  });

  test.describe('Test Container', () => {
    test('bulkTestContainer is created on init', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      // Switch to rendering tab to see the container
      await page.locator('#renderingTab').click();
      await expect(page.locator('#bulkTestContainer')).toBeAttached();
    });

    test('bulkTestContainer has ready message', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      await page.locator('#renderingTab').click();
      const text = await page.locator('#bulkTestContainer').textContent();
      expect(text).toBeTruthy();
    });
  });

  test.describe('Stop Test', () => {
    test('stopTest sets shouldStop and resets isRunning', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      // Simulate running state
      await page.evaluate(() => {
        window.stressTestManager.isRunning = true;
        window.stressTestManager.showProgress(true);
      });

      await page.evaluate(() => window.stressTestManager.stopTest());

      const state = await page.evaluate(() => ({
        shouldStop: window.stressTestManager.shouldStop,
        isRunning: window.stressTestManager.isRunning,
      }));

      expect(state.shouldStop).toBe(true);
      expect(state.isRunning).toBe(false);
    });

    test('stopTest shows user-stopped message in results', async ({ page }) => {
      await page.goto('css.html');
      await page.waitForFunction(() => window.stressTestManager);

      await page.evaluate(() => {
        window.stressTestManager.isRunning = true;
        window.stressTestManager.showProgress(true);
      });
      await page.evaluate(() => window.stressTestManager.stopTest());

      const text = await page.locator('#results').textContent();
      expect(text).toContain('stopped by user');
    });
  });
});
