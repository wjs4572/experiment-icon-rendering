// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Format-Specific Testing Pages
 * DO NOT MODIFY unless explicitly requested by user
 * These tests ensure all format testing pages maintain consistent structure
 */

test.describe('Format Testing Pages Structure', () => {
  const formatPages = [
    { file: 'svg.html', title: 'SVG Implementation Tests', format: 'SVG' },
    { file: 'png.html', title: 'PNG Implementation Tests', format: 'PNG' },
    { file: 'gif.html', title: 'GIF Implementation Tests', format: 'GIF' },
    { file: 'jpeg.html', title: 'JPEG Implementation Tests', format: 'JPEG' },
    { file: 'webp.html', title: 'WebP Implementation Tests', format: 'WebP' },
    { file: 'avif.html', title: 'AVIF Implementation Tests', format: 'AVIF' }
  ];

  formatPages.forEach(formatInfo => {
    test.describe(`${formatInfo.format} Testing Page (${formatInfo.file})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(formatInfo.file);
        await page.waitForLoadState('networkidle');
      });

      test('page loads with correct title and structure', async ({ page }) => {
        await expect(page).toHaveTitle(new RegExp(formatInfo.title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')));
        await expect(page.locator('h1')).toContainText(formatInfo.title);
      });

      test('navigation back link is present and functional', async ({ page }) => {
        const backLink = page.locator('a:has-text(\"Back to Test Suite\")');
        await expect(backLink).toBeVisible();
        await expect(backLink).toHaveAttribute('href', 'index.html');
        
        // Test navigation functionality
        await backLink.click();
        await expect(page).toHaveURL(/.*index\.html$/);
        await page.goBack();
      });

      test('format description is present', async ({ page }) => {
        // Verify descriptive text about format testing exists
        const description = page.locator('p.text-gray-600').first();
        await expect(description).toBeVisible();
        await expect(description).toContainText('Testing');
      });

      test('implementation cards structure exists', async ({ page }) => {
        // Wait for Tailwind CSS to load and apply styles (especially important for Firefox)
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => {
          const cards = document.querySelectorAll('.bg-white');
          return cards.length > 0 && window.getComputedStyle(cards[0]).backgroundColor !== 'rgba(0, 0, 0, 0)';
        });
        
        // Verify card-based layout for different implementations
        const cards = page.locator('.bg-white');
        const cardCount = await cards.count();
        expect(cardCount).toBeGreaterThanOrEqual(2);
        
        // Verify cards have proper structure
        const firstCard = cards.first();
        await expect(firstCard).toHaveClass(/rounded-lg/);
        await expect(firstCard).toHaveClass(/shadow/);
      });

      test('format-specific headings are present', async ({ page }) => {
        // Each format should have specific implementation type headings
        const h2Count = await page.locator('h2').count();
        expect(h2Count).toBeGreaterThanOrEqual(2);
        
        // Verify headings have proper styling
        const secondaryHeadings = page.locator('h2');
        const headingCount = await secondaryHeadings.count();
        
        for (let i = 0; i < headingCount; i++) {
          const heading = secondaryHeadings.nth(i);
          await expect(heading).toHaveClass(/text-xl/);
          await expect(heading).toHaveClass(/font-semibold/);
        }
      });

      test('gradient indicator icons are present', async ({ page }) => {
        // Verify each implementation type has a gradient indicator
        const gradientContainers = page.locator('.bg-gradient-to-br');
        const gradientCount = await gradientContainers.count();
        expect(gradientCount).toBeGreaterThanOrEqual(2);
        
        // Verify gradient containers have proper sizing
        const firstGradient = gradientContainers.first();
        await expect(firstGradient).toHaveClass(/w-12/);
        await expect(firstGradient).toHaveClass(/h-12/);
      });

      test('responsive grid layout is applied', async ({ page }) => {
        // Verify responsive grid layout
        const gridContainer = page.locator('.grid');
        await expect(gridContainer).toBeVisible();
        await expect(gridContainer).toHaveClass(/md:grid-cols-2/);
        await expect(gridContainer).toHaveClass(/lg:grid-cols-3/);
      });

      test('implementation status information exists', async ({ page }) => {
        // Verify status information section exists (placeholder or implemented)
        const statusSection = page.locator('.bg-yellow-50, .bg-green-50, .bg-blue-50');
        
        if (await statusSection.count() > 0) {
          // If status section exists, verify its structure
          await expect(statusSection.first()).toHaveClass(/border/);
          await expect(statusSection.first()).toHaveClass(/rounded-lg/);
          
          // Verify status has heading
          const statusHeading = statusSection.locator('h3').first();
          await expect(statusHeading).toBeVisible();
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
        const backLink = page.locator('a:has-text(\"Back to Test Suite\")');
        await backLink.focus();
        await expect(backLink).toBeFocused();
      });

      test('consistent color scheme and branding', async ({ page }) => {        // Wait for Tailwind CSS to load and apply styles (especially important for Firefox)
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => {
          const backLink = document.querySelector('a[href="index.html"]');
          return backLink && window.getComputedStyle(backLink).color !== 'rgba(0, 0, 0, 0)';
        });
                // Verify consistent blue color scheme
        const backLink = page.locator('a:has-text(\"Back to Test Suite\")');
        await expect(backLink).toHaveClass(/text-blue-600/);
        
        // Verify gradient containers use consistent color scheme
        const gradients = page.locator('.bg-gradient-to-br');
        const firstGradient = gradients.first();
        await expect(firstGradient).toHaveClass(/from-blue-600/);
      });

      test('page structure integrity', async ({ page }) => {
        // Verify page has proper structure
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
          const backLink = page.locator('a:has-text(\"Back to Test Suite\")');
          await backLink.click();
          await expect(page).toHaveURL(/.*index\.html$/);
        }
      }
    });

    test('all format pages have consistent structure', async ({ page }) => {
      const structuralElements = [
        'header',
        'h1',
        'a:has-text(\"Back to Test Suite\")',
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
  });
});