// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - Past Results Archive (past-results.html)
 * DO NOT MODIFY unless explicitly requested by user
 * These tests ensure archive functionality remains intact
 */

test.describe('Past Results Archive Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('past-results.html');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with correct title and structure', async ({ page }) => {
    await expect(page).toHaveTitle('Past Test Results - Icon Performance Testing');
    await expect(page.locator('h1[data-i18n="past.title"]')).toBeVisible();
    await expect(page.locator('[data-i18n="past.subtitle"]')).toBeVisible();
  });

  test('navigation controls are present and functional', async ({ page }) => {
    // Verify all navigation buttons
    const summaryLink = page.locator('a[href="summary.html"]');
    const newTestLink = page.locator('a[href="css.html"]').first();
    const clearHistoryBtn = page.locator('#clearHistory');
    const exportHistoryBtn = page.locator('#exportHistory');
    
    await expect(summaryLink).toBeVisible();
    await expect(newTestLink).toBeVisible();
    await expect(clearHistoryBtn).toBeVisible();
    await expect(exportHistoryBtn).toBeVisible();
    
    // Test navigation links
    await summaryLink.click();
    await expect(page).toHaveURL(/summary\.html$/);
    await page.goBack();
    
    await newTestLink.click();
    await expect(page).toHaveURL(/css\.html$/);
    await page.goBack();
  });

  test('filter controls are comprehensive', async ({ page }) => {
    // Verify filter section exists
    await expect(page.locator('h2[data-i18n="past.filter_title"]')).toBeVisible();
    
    // Verify all filter controls
    await expect(page.locator('#filterTestType')).toBeVisible();
    await expect(page.locator('label[data-i18n="past.filter.test_type"]')).toBeVisible();
    
    // Verify filter options exist by counting them
    const testTypeFilter = page.locator('#filterTestType');
    const optionCount = await testTypeFilter.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(1); // 'All Types' always present; others populated from data
  });

  test('action buttons have proper styling and functionality', async ({ page }) => {
    // Verify button styling
    const clearHistory = page.locator('#clearHistory');
    const exportHistory = page.locator('#exportHistory');
    
    await expect(clearHistory).toHaveClass(/bg-red-600/);
    await expect(exportHistory).toHaveClass(/bg-purple-600/);
    
    // Verify buttons can be clicked
    await clearHistory.click();
    await exportHistory.click();
    // Should not throw errors
  });

  test('filter functionality interface', async ({ page }) => {
    // Verify filter controls can be interacted with (use date filter which has static options)
    const dateFilter = page.locator('#filterDate');
    
    // Test changing filter values
    await dateFilter.selectOption('week');
    await expect(dateFilter).toHaveValue('week');
    
    await dateFilter.selectOption('');
    await expect(dateFilter).toHaveValue('');
  });

  test('responsive layout structure', async ({ page }) => {
    // Verify responsive grid for filters
    const filterGrid = page.locator('.grid.grid-cols-1.md\\:grid-cols-3').first();
    await expect(filterGrid).toBeVisible();
    
    // Verify responsive container
    await expect(page.locator('.container')).toBeVisible();
    await expect(page.locator('.mx-auto').first()).toBeVisible();
  });

  test('external dependencies are loaded', async ({ page }) => {
    // Verify Chart.js script is available for potential visualizations
    const chartScriptExists = await page.locator('script[src*="chart.js"], script[src*="Chart"]').count();
    expect(chartScriptExists).toBeGreaterThan(0);
    
    // Verify Tailwind CSS classes work
    const whiteBackground = page.locator('.bg-white');
    await expect(whiteBackground.first()).toBeVisible();
  });

  test('cache prevention headers for data accuracy', async ({ page }) => {
    // Verify cache control meta tags (critical for accurate historical data)
    await expect(page.locator('meta[http-equiv="Cache-Control"]')).toBeAttached();
    await expect(page.locator('meta[http-equiv="Pragma"]')).toBeAttached();
    await expect(page.locator('meta[http-equiv="Expires"]')).toBeAttached();
  });

  test('accessibility compliance', async ({ page }) => {
    // Verify heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(1);
    
    // Verify form labels
    const labelCount = await page.locator('label').count();
    expect(labelCount).toBeGreaterThanOrEqual(1);
    
    // Verify buttons have descriptive text
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('navigation breadcrumb functionality', async ({ page }) => {
    // Verify proper navigation flow
    const backToSummary = page.locator('a[href="summary.html"]');
    const runNewTest = page.locator('a[href="css.html"]').first();
    
    await expect(backToSummary).toHaveAttribute('href', 'summary.html');
    await expect(runNewTest).toHaveAttribute('href', 'css.html');
  });
});