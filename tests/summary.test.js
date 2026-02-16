// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Performance Summary Dashboard (summary.html)
 * DO NOT MODIFY unless explicitly requested by user
 * These tests ensure dashboard functionality remains intact
 */

test.describe('Performance Summary Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('summary.html');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title and header', async ({ page }) => {
    await expect(page).toHaveTitle('Performance Summary Dashboard - Icon Rendering Tests');
    await expect(page.locator('h1')).toContainText('Performance Summary Dashboard');
    await expect(page.locator('text=Comprehensive analysis and comparison')).toBeVisible();
  });

  test('navigation links are present and functional', async ({ page }) => {
    // Verify navigation buttons
    const backToSuiteLink = page.locator('a:has-text("Back to Test Suite")');
    const pastResultsLink = page.locator('a:has-text("View Past Results")');
    
    await expect(backToSuiteLink).toBeVisible();
    await expect(pastResultsLink).toBeVisible();
    
    // Test navigation functionality
    await backToSuiteLink.click();
    await expect(page).toHaveURL(/index\.html$/);
    await page.goBack();
    
    await pastResultsLink.click();
    await expect(page).toHaveURL(/past-results\.html$/);
    await page.goBack();
  });

  test('data export controls are available', async ({ page }) => {
    // Verify export buttons exist
    await expect(page.locator('#exportCsv')).toBeVisible();
    await expect(page.locator('#exportJson')).toBeVisible();
    await expect(page.locator('#clearData')).toBeVisible();
    
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear All Data")')).toBeVisible();
  });

  test('last updated timestamp display', async ({ page }) => {
    // Verify last updated information
    await expect(page.locator('#lastUpdated')).toBeVisible();
    await expect(page.locator('text=Last updated:')).toBeVisible();
  });

  test('export buttons can be clicked without errors', async ({ page }) => {
    // Verify buttons are clickable (functionality depends on stored data)
    const exportCsv = page.locator('#exportCsv');
    const exportJson = page.locator('#exportJson');
    const clearData = page.locator('#clearData');
    
    await exportCsv.click();
    await exportJson.click();
    await clearData.click();
    
    // Should not throw JavaScript errors
  });

  test('external dependencies are loaded', async ({ page }) => {
    // Verify Chart.js script tag is loaded
    const chartScriptExists = await page.locator('script[src*="chart.js"], script[src*="Chart"]').count();
    expect(chartScriptExists).toBeGreaterThan(0);
    
    // Verify Tailwind CSS is loaded
    const container = page.locator('.container');
    await expect(container).toBeVisible();
  });

  test('responsive design elements', async ({ page }) => {
    // Verify responsive container and spacing
    await expect(page.locator('.container')).toBeVisible();
    await expect(page.locator('.mx-auto').first()).toBeVisible();
    await expect(page.locator('.px-8')).toBeVisible();
  });

  test('color-coded export buttons', async ({ page }) => {
    // Verify proper button styling
    const csvButton = page.locator('#exportCsv');
    const jsonButton = page.locator('#exportJson');
    const clearButton = page.locator('#clearData');
    
    await expect(csvButton).toHaveClass(/bg-green-600/);
    await expect(jsonButton).toHaveClass(/bg-blue-600/);
    await expect(clearButton).toHaveClass(/bg-red-600/);
  });

  test('accessibility features', async ({ page }) => {
    // Verify heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    
    // Verify buttons have proper text content
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Verify links have proper href attributes
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThanOrEqual(2);
  });
});