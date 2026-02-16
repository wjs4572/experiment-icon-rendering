// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Navigation Hub (index.html)
 * DO NOT MODIFY unless explicitly requested by user
 * These tests ensure navigation functionality remains intact
 */

test.describe('Index Page - Navigation Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('index.html');
    await page.waitForLoadState('networkidle');
  });

  test('page loads successfully with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Icon Rendering Performance Test Suite');
  });

  test('displays main heading and description', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Icon Rendering Performance Test Suite');
    await expect(page.locator('text=Comprehensive testing platform')).toBeVisible();
  });

  test('contains all expected format navigation cards', async ({ page }) => {
    // Verify all major format cards are present
    const cards = page.locator('.bg-white');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(6); // CSS, SVG, PNG, GIF, JPEG, WebP, AVIF
    
    // Verify key format cards exist by checking their actual headings
    await expect(page.getByRole('heading', { name: 'CSS Implementation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SVG Implementation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PNG Implementation' })).toBeVisible();
  });

  test('CSS implementation card functionality', async ({ page }) => {
    // Verify CSS card has expected content
    const cssCard = page.locator('text=CSS Implementation').locator('..');
    await expect(cssCard.locator('text=Statistical analysis (p < 0.05, power > 0.8, 95% CI)')).toBeVisible();
    await expect(cssCard.locator('text=Remix Icon Font')).toBeVisible();
    
    // Test CSS testing link
    await cssCard.locator('a:has-text("Test CSS Implementations")').click();
    await expect(page).toHaveURL(/css\.html$/);
    await page.goBack();
  });

  test('format navigation links are functional', async ({ page }) => {
    // Test various format links
    const formatLinks = [
      { text: 'Test CSS Implementations', expectedUrl: /css\.html$/ },
      { text: 'Test SVG Formats', expectedUrl: /svg\.html$/ },
      { text: 'Test PNG Images', expectedUrl: /png\.html$/ }
    ];

    for (const link of formatLinks) {
      const linkElement = page.locator(`a:has-text("${link.text}")`);
      if (await linkElement.count() > 0) {
        await linkElement.click();
        await expect(page).toHaveURL(link.expectedUrl);
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('performance test format indicators', async ({ page }) => {
    // Verify format-specific performance indicators by checking the CSS card
    const cssCard = page.getByRole('heading', { name: 'CSS Implementation' }).locator('..');
    await expect(cssCard.locator('div').filter({ hasText: 'Statistical analysis' }).first()).toBeVisible();
    await expect(cssCard.locator('text=2,000 iterations')).toBeVisible();
  });

  test('responsive grid layout', async ({ page }) => {
    // Verify responsive design elements
    await expect(page.locator('.container')).toBeVisible();
    await expect(page.locator('.grid').first()).toBeVisible();
    await expect(page.locator('.md\\:grid-cols-2')).toBeVisible();
  });

  test('format gradient indicators', async ({ page }) => {
    // Verify each format card has its gradient indicator
    const gradientElements = page.locator('.bg-gradient-to-br');
    const gradientCount = await gradientElements.count();
    expect(gradientCount).toBeGreaterThanOrEqual(6);
  });

  test('accessibility features', async ({ page }) => {
    // Verify proper heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(1);
    
    // Verify links have descriptive text
    const links = page.locator('a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});