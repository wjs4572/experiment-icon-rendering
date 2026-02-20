// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Academic Research Tool - Playwright Configuration
 * Comprehensive regression testing for icon performance research platform
 */
module.exports = defineConfig({
  testDir: './tests',
  // Run tests in files in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Limit workers to prevent resource exhaustion with WebKit
  workers: process.env.CI ? 1 : 2,
  // Global timeout to prevent hanging tests
  globalTimeout: 30 * 60 * 1000, // 30 minutes
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: 'html',
  // Use efficient local development server for testing
  webServer: {
    command: 'npx http-server src -p 3000 --cors --silent',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
  // Shared settings for all the projects below
  use: {
    // Base URL for tests (local server instead of file://)
    baseURL: 'http://localhost:3000',
    // Pin locale to en-US so text-based selectors match English content
    locale: 'en-US',
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    // Record video on failure
    video: 'retain-on-failure',
    // Increase timeouts for reliability
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Enhanced WebKit stability for Windows with comprehensive crash prevention
        launchOptions: {
          args: [
            '--disable-accelerated-compositing',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-dev-shm-usage',
            '--no-startup-window',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-plugins',
            '--no-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--single-process',
            '--disable-background-media-suspend'
          ],
          // Additional process management
          handleSIGTERM: false,
          handleSIGINT: false
        },
        // Increase timeouts for WebKit specifically
        actionTimeout: 15000,
        navigationTimeout: 45000,
      },
    },
  ],
});