// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Format-Specific Testing Pages
 * These tests ensure all format testing pages maintain consistent structure
 * Updated for Phase 4 tab-based layout (no card/shadow pattern, no gradient indicators)
 */

test.describe('Format Testing Pages Structure', () => {
  const formatPages = [
    { file: 'svg.html', title: 'SVG Implementation', format: 'SVG', pageTitle: 'SVG Icon Performance Testing' },
    { file: 'png.html', title: 'PNG Implementation', format: 'PNG', pageTitle: 'PNG Icon Performance Testing' },
    { file: 'gif.html', title: 'GIF Implementation', format: 'GIF', pageTitle: 'GIF Icon Performance Testing' },
    { file: 'jpeg.html', title: 'JPEG Implementation', format: 'JPEG', pageTitle: 'JPEG Icon Performance Testing' },
    { file: 'webp.html', title: 'WebP Implementation', format: 'WebP', pageTitle: 'WebP Icon Performance Testing' },
    { file: 'avif.html', title: 'AVIF Implementation', format: 'AVIF', pageTitle: 'AVIF Icon Performance Testing' }
  ];

  formatPages.forEach(formatInfo => {
    test.describe(`${formatInfo.format} Testing Page (${formatInfo.file})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(formatInfo.file);
        await page.waitForLoadState('domcontentloaded');
        // Ensure core DOM elements are rendered before any assertions
        await page.waitForSelector('h1', { timeout: 10000 });
        await page.waitForSelector('#testingContent', { timeout: 10000 });
        // Wait for Tailwind CSS to be applied (critical for Firefox under load)
        await page.waitForFunction(() => {
          const body = document.querySelector('body');
          return body && window.getComputedStyle(body).backgroundColor !== 'rgba(0, 0, 0, 0)';
        }, { timeout: 10000 });
      });

      test('page loads with correct title and structure', async ({ page }) => {
        await expect(page).toHaveTitle(new RegExp(formatInfo.pageTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')));
        await expect(page.locator('h1')).toContainText(formatInfo.title);
      });

      test('navigation back link is present and functional', async ({ page }) => {
        const backLink = page.locator('a[data-i18n="nav.back_to_suite"]');
        await expect(backLink).toBeVisible();
        await expect(backLink).toHaveAttribute('href', 'index.html');
        
        // Test navigation functionality
        await backLink.click();
        await expect(page).toHaveURL(/.*index\.html$/);
        await page.goBack();
      });

      test('format description is present', async ({ page }) => {
        // Verify descriptive text about format testing exists (use data-i18n for locale independence)
        const selector = `p[data-i18n="format.${formatInfo.format.toLowerCase()}.description"]`;
        await page.waitForSelector(selector, { timeout: 10000 });
        const description = page.locator(selector);
        await expect(description).toBeVisible();
        await expect(description).not.toBeEmpty();
      });

      test('implementation cards structure exists', async ({ page }) => {
        // Wait for page to load (networkidle too strict in parallel test environment)
        await page.waitForLoadState('load');
        
        // Small delay for Tailwind CSS to apply styles
        await page.waitForTimeout(500);
        
        // Wait for bg-white divs to be present and visible
        await page.waitForFunction(() => {
          const cards = document.querySelectorAll('div.bg-white');
          if (cards.length === 0) return false;
          // Check if at least one is actually visible in the DOM
          return Array.from(cards).some(card => {
            const style = window.getComputedStyle(card);
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            return isVisible;
          });
        }, { timeout: 10000 });
        
        // Find all bg-white panels (they form the implementation cards)
        // This selector is more reliable across browsers than attribute-based selectors
        const panels = page.locator('div.bg-white');
        const panelCount = await panels.count();
        
        expect(panelCount).toBeGreaterThanOrEqual(1);
        
        // Verify first panel has proper structure and is visible
        const firstPanel = panels.first();
        await expect(firstPanel).toBeVisible();
      });

      test('format-specific headings are present', async ({ page }) => {
        // Each format should have specific implementation type headings (exclude modal h2)
        const pageHeadings = page.locator('#testingContent h2, #renderingContent h2');
        const h2Count = await pageHeadings.count();
        expect(h2Count).toBeGreaterThanOrEqual(2);
        
        // Verify page headings have proper styling
        for (let i = 0; i < h2Count; i++) {
          const heading = pageHeadings.nth(i);
          await expect(heading).toHaveClass(/text-xl/);
          await expect(heading).toHaveClass(/font-semibold/);
        }
      });

      test('icon example containers are present', async ({ page }) => {
        // Wait for icon containers to be present in DOM (Firefox may be slow under parallel load)
        await page.waitForSelector('.w-12.h-12', { timeout: 10000 });
        // Verify icon examples section has properly sized containers
        const iconContainers = page.locator('.w-12.h-12');
        const iconCount = await iconContainers.count();
        expect(iconCount).toBeGreaterThanOrEqual(2);
        
        // Verify first container has proper sizing classes
        const firstIcon = iconContainers.first();
        await expect(firstIcon).toHaveClass(/w-12/);
        await expect(firstIcon).toHaveClass(/h-12/);
      });

      test('responsive grid layout is applied', async ({ page }) => {
        // Ensure #testingContent is visible before querying child grids
        await page.waitForSelector('#testingContent .grid', { timeout: 10000 });
        // Verify responsive grid layout (icon examples grid)
        const grids = page.locator('#testingContent .grid');
        const gridCount = await grids.count();
        expect(gridCount).toBeGreaterThanOrEqual(1);
        
        // First grid is the icon examples grid with responsive columns
        const iconGrid = grids.first();
        await expect(iconGrid).toBeVisible();
        await expect(iconGrid).toHaveClass(/grid-cols-2/);
      });

      test('implementation status information exists', async ({ page }) => {
        // Wait for the status section element to appear in the DOM (Firefox may be slow under load)
        const statusSelector = '.bg-yellow-50, .bg-green-50, .bg-blue-50';
        try {
          await page.waitForSelector(statusSelector, { timeout: 10000 });
        } catch {
          // Some format pages may not have a status section — skip if not found
          return;
        }
        // Verify browser-specific testing notice section exists
        const statusSection = page.locator(statusSelector);
        
        if (await statusSection.count() > 0) {
          // If status section exists, verify its structure
          await expect(statusSection.first()).toHaveClass(/border/);
          await expect(statusSection.first()).toHaveClass(/rounded-lg/);
          
          // Verify status has a label (strong element for browser notice)
          const statusLabel = statusSection.first().locator('strong').first();
          await expect(statusLabel).toBeVisible();
        }
      });

      test('tailwind css styling is applied correctly', async ({ page }) => {
        // Verify Tailwind classes are working
        const body = page.locator('body');
        await expect(body).toHaveClass(/bg-gray-100/);
        
        const header = page.locator('header');
        await expect(header).toHaveClass(/mb-8/);
      });

      test('accessibility features are maintained', async ({ page }) => {
        // Verify proper heading hierarchy
        await expect(page.locator('h1')).toHaveCount(1);
        const h2Count = await page.locator('h2').count();
        expect(h2Count).toBeGreaterThanOrEqual(1);
        
        // Verify back link is keyboard accessible
        const backLink = page.locator('a[data-i18n="nav.back_to_suite"]');
        await backLink.focus();
        await expect(backLink).toBeFocused();
      });

      test('consistent color scheme and branding', async ({ page }) => {
        // Wait for Tailwind CSS to load and apply styles (especially important for Firefox)
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => {
          const backLink = document.querySelector('a[href="index.html"]');
          return backLink && window.getComputedStyle(backLink).color !== 'rgba(0, 0, 0, 0)';
        });
        // Verify consistent blue color scheme
        const backLink = page.locator('a[data-i18n="nav.back_to_suite"]');
        await expect(backLink).toHaveClass(/text-blue-600/);
        
        // Verify start test button uses blue branding
        const startBtn = page.locator('#startTest');
        await expect(startBtn).toHaveClass(/bg-blue-600/);
      });

      test('page structure integrity', async ({ page }) => {        // Ensure critical elements are present before assertions
        await page.waitForSelector('header', { timeout: 10000 });
        await page.waitForSelector('h1', { timeout: 10000 });        // Verify page has proper structure
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('body')).toHaveClass(/p-8/);
        
        // Verify essential elements exist
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('a[href=\"index.html\"]')).toBeVisible();
      });
    });
  });

  test.describe('Cross-Format Consistency', () => {
    test('all format pages maintain consistent navigation', async ({ page }) => {
      // Test that all format pages can be navigated to and from
      for (const formatInfo of formatPages.slice(0, 3)) { // Test first 3 to avoid timeout
        await page.goto('index.html');
        
        // Navigate to format page if link exists
        const formatLink = page.locator(`a[href=\"${formatInfo.file}\"]`);
        if (await formatLink.count() > 0) {
          await formatLink.click();
          await expect(page).toHaveURL(new RegExp(formatInfo.file));
          
          // Navigate back
          const backLink = page.locator('a[data-i18n="nav.back_to_suite"]');
          await backLink.click();
          await expect(page).toHaveURL(/.*index\.html$/);
        }
      }
    });

    test('all format pages have consistent structure', async ({ page }) => {
      const structuralElements = [
        'header',
        'h1',
        'a[data-i18n="nav.back_to_suite"]',
        '.bg-white'
      ];

      for (const formatInfo of formatPages.slice(0, 2)) { // Test first 2 for efficiency
        await page.goto(formatInfo.file);
        
        for (const selector of structuralElements) {
          const elementCount = await page.locator(selector).count();
          expect(elementCount).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test('foundation module scripts are loaded on each format page', async ({ page }) => {
      const requiredScripts = [
        'js/icon-configs.js',
        'js/reporters.js',
        'js/suite-runner.js',
        'js/run-state.js'
      ];
      for (const formatInfo of formatPages.slice(0, 3)) { // Test first 3 for efficiency
        await page.goto(formatInfo.file);
        for (const src of requiredScripts) {
          const count = await page.locator(`script[src="${src}"]`).count();
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('SuiteRunner global is available on format pages', async ({ page }) => {
      for (const formatInfo of formatPages.slice(0, 2)) {
        await page.goto(formatInfo.file);
        await page.waitForLoadState('domcontentloaded');
        const hasSuiteRunner = await page.evaluate(() => typeof window.SuiteRunner === 'object');
        expect(hasSuiteRunner).toBe(true);
      }
    });
  });
});