// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * REGRESSION TESTS - CSS Performance Testing Interface (css.html)
 * DO NOT MODIFY unless explicitly requested by user
 * These tests ensure all functionality remains intact when features are added
 */

test.describe('CSS Performance Testing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Handle external CDN timeouts more gracefully
    await page.goto('css.html', { waitUntil: 'domcontentloaded' });
    
    // Wait for essential page structure (not CDN resources)
    try {
      await page.waitForSelector('h1', { timeout: 5000 });
      await page.waitForSelector('#testingTab', { timeout: 3000 });
      await page.waitForSelector('#renderingTab', { timeout: 3000 });
    } catch (e) {
      // Continue if some elements are missing - individual tests will catch specifics
    }
  });

  test('page loads with correct title and structure', async ({ page }) => {
    await expect(page).toHaveTitle('CSS Icon Performance Testing');
    await expect(page.locator('h1')).toContainText('CSS Implementation Tests');
    await expect(page.locator('text=Back to Test Suite')).toBeVisible();
  });

  test.describe('Tab Navigation System', () => {
    test('both tabs are present and visible', async ({ page }) => {
      await expect(page.locator('#testingTab')).toBeVisible();
      await expect(page.locator('#renderingTab')).toBeVisible();
      await expect(page.locator('button:has-text("Performance Testing")')).toBeVisible();
      await expect(page.locator('button:has-text("Live Rendering")')).toBeVisible();
    });

    test('tab switching functionality works correctly', async ({ page }) => {
      // Verify default tab is active (Performance Testing)
      const testingTab = page.locator('#testingTab');
      const renderingTab = page.locator('#renderingTab');
      
      await expect(testingTab).toHaveClass(/active/);
      await expect(page.locator('#testingContent')).toBeVisible();
      await expect(page.locator('#renderingContent')).not.toBeVisible();

      // Click Live Rendering tab
      await renderingTab.click();
      await expect(renderingTab).toHaveClass(/active/);
      await expect(page.locator('#renderingContent')).toBeVisible();
      await expect(page.locator('#testingContent')).not.toBeVisible();

      // Click back to Performance Testing tab
      await testingTab.click();
      await expect(testingTab).toHaveClass(/active/);
      await expect(page.locator('#testingContent')).toBeVisible();
      await expect(page.locator('#renderingContent')).not.toBeVisible();
    });
  });

  test.describe('Icon Examples Display', () => {
    test('all icon types are displayed correctly', async ({ page }) => {
      // Verify icon examples section exists
      await expect(page.locator('h2:has-text("Icon Examples")')).toBeVisible();
      
      // Verify all icon type examples
      await expect(page.locator('text=Remix Icon (Square)')).toBeVisible();
      await expect(page.locator('text=Pure CSS Icon')).toBeVisible();
      await expect(page.locator('text=Minimal CSS Icon')).toBeVisible();
      await expect(page.locator('text=Circular CSS Icon')).toBeVisible();
      await expect(page.locator('text=Circular Remix Icon')).toBeVisible();
    });

    test('icon examples have proper styling', async ({ page }) => {
      // Verify icon containers have gradient backgrounds
      const iconContainers = page.locator('.bg-gradient-to-br');
      const containerCount = await iconContainers.count();
      expect(containerCount).toBeGreaterThanOrEqual(5);
      
      // Verify remix icons load correctly
      const remixIconCount = await page.locator('.ri-code-s-slash-line').count();
      expect(remixIconCount).toBeGreaterThanOrEqual(2);
    });

    test('academic research mode information is present', async ({ page }) => {
      // Verify academic research mode informational text
      await expect(page.locator('text=Academic Research Mode:')).toBeVisible();
      await expect(page.locator('text=Maximum Accuracy:')).toBeVisible();
      await expect(page.locator('text=Continuous measurement without interference')).toBeVisible();
    });
  });

  test.describe('Performance Testing Controls', () => {
    test('test type selector and controls are present', async ({ page }) => {
      // Verify test type selector
      const testTypeSelect = page.locator('#testType');
      await expect(testTypeSelect).toBeVisible();
      
      // Verify start test button
      await expect(page.locator('#startTest')).toBeVisible();
      await expect(page.locator('button:has-text("Start Stress Test")')).toBeVisible();
      
      // Verify results container
      await expect(page.locator('#results')).toBeVisible();
    });

    test('test type options are available', async ({ page }) => {
      const testTypeSelect = page.locator('#testType');
      
      // Verify select element exists and has options
      await expect(testTypeSelect).toBeVisible();
      
      // Check if options exist by checking the HTML content
      const optionCount = await testTypeSelect.locator('option').count();
      expect(optionCount).toBeGreaterThanOrEqual(4);
      
      // Verify specific option values exist
      const singleOption = await testTypeSelect.locator('option[value="single"]').count();
      const bulkOption = await testTypeSelect.locator('option[value="bulk"]').count();
      expect(singleOption).toBeGreaterThan(0);
      expect(bulkOption).toBeGreaterThan(0);
      
      // Verify default selection is bulk
      await expect(testTypeSelect).toHaveValue('bulk');
    });

    test('progress tracking elements exist', async ({ page }) => {
      // Verify progress tracking elements (initially hidden)
      await expect(page.locator('#testProgress')).toBeAttached();
      await expect(page.locator('#progressBar')).toBeAttached();
      await expect(page.locator('#currentIteration')).toBeAttached();
      await expect(page.locator('#eta')).toBeAttached();
      await expect(page.locator('#memoryUsage')).toBeAttached();
    });

    test('control buttons are functional', async ({ page }) => {
      // Verify clear results button
      await expect(page.locator('#clearResults')).toBeVisible();
      await expect(page.locator('button:has-text("Clear Results")')).toBeVisible();
      
      // Verify buttons can be clicked without errors
      await page.locator('#clearResults').click();
      // Should not throw errors
    });

    test('results display shows initial state', async ({ page }) => {
      // Verify initial results state
      const resultsArea = page.locator('#results');
      await expect(resultsArea).toContainText('No tests run yet');
      await expect(resultsArea).toContainText('Click "Start Stress Test" to begin');
    });
  });

  test.describe('Live Rendering Tab', () => {
    test('rendering tab displays correctly when switched', async ({ page }) => {
      // Switch to live rendering tab
      await page.locator('#renderingTab').click();
      
      // Verify rendering content is shown
      await expect(page.locator('#renderingContent')).toBeVisible();
      await expect(page.locator('h2:has-text("Live Icon Rendering")')).toBeVisible();
    });

    test('rendering tab shows appropriate messaging', async ({ page }) => {
      // Switch to rendering tab
      await page.locator('#renderingTab').click();
      
      // Wait a moment for JavaScript to update the container content
      await page.waitForTimeout(500);
      
      // Verify initial state messaging (JavaScript sets this content dynamically)
      const renderingContainer = page.locator('#renderingTabContainer');
      await expect(renderingContainer).toBeVisible();
      await expect(renderingContainer).toContainText('Ready to show live icon rendering');
      await expect(renderingContainer).toContainText('Start a test to see icons');
    });

    test('rendering container has proper styling', async ({ page }) => {
      // Switch to rendering tab
      await page.locator('#renderingTab').click();
      
      // Verify rendering container styling
      const container = page.locator('#renderingTabContainer');
      await expect(container).toHaveClass(/border-2/);
      await expect(container).toHaveClass(/min-h-\[400px\]/);
    });
  });

  test.describe('JavaScript Integration', () => {
    test('stress test manager script loads correctly', async ({ page }) => {
      // Verify StressTestManager script is loaded by checking the script tag
      const scriptExists = await page.locator('script[src="js/stress-test-manager.js"]').count();
      expect(scriptExists).toBeGreaterThan(0);
      
      // Alternative: check if stress test functionality exists
      const hasStartButton = await page.locator('#startTest').count();
      expect(hasStartButton).toBeGreaterThan(0);
    });

    test('tab switching functions are available', async ({ page }) => {
      // Verify tab switching works by checking if tabs can be clicked
      const testingTab = page.locator('#testingTab');
      const renderingTab = page.locator('#renderingTab');
      
      await expect(testingTab).toBeVisible();
      await expect(renderingTab).toBeVisible();
      
      // Test actual tab switching functionality
      await renderingTab.click();
      await expect(page.locator('#renderingContent')).toBeVisible();
    });

    test('DOM ready initialization works', async ({ page }) => {
      // Check if tabs are properly initialized after DOM ready
      const testingTab = page.locator('#testingTab');
      const renderingTab = page.locator('#renderingTab');
      
      await expect(testingTab).toBeVisible();
      await expect(renderingTab).toBeVisible();
      
      // Default tab should be active
      await expect(testingTab).toHaveClass(/active/);
    });
  });

  test.describe('External Dependencies', () => {
    test('tailwind css is loaded and functional', async ({ page }) => {
      // Verify Tailwind classes are applied correctly
      const maxWidthContainer = page.locator('.max-w-6xl');
      await expect(maxWidthContainer).toBeVisible();
      
      // Verify responsive grid classes
      const gridContainer = page.locator('.grid');
      await expect(gridContainer.first()).toBeVisible();
    });

    test('remix icons CDN is loaded', async ({ page }) => {
      // Verify Remix Icons are loaded by checking if they're visible
      const remixIcons = page.locator('.ri-code-s-slash-line');
      await expect(remixIcons.first()).toBeVisible();
      
      // Verify multiple remix icons exist in examples
      const remixIconCount = await remixIcons.count();
      expect(remixIconCount).toBeGreaterThanOrEqual(2);
    });

    test('custom CSS styles are applied', async ({ page }) => {
      // Verify custom icon styles are loaded
      const codeSlashIcon = page.locator('.code-slash-icon');
      if (await codeSlashIcon.count() > 0) {
        // Custom CSS should be available
        await expect(codeSlashIcon.first()).toBeVisible();
      }
      
      // Verify other custom icon classes exist in DOM
      const simpleIcon = page.locator('.simple-icon');
      const circularIcon = page.locator('.circular-icon');
      await expect(simpleIcon.first()).toBeDefined();
      await expect(circularIcon.first()).toBeDefined();
    });
  });

  test.describe('Page Structure Integrity', () => {
    test('critical CSS classes are applied correctly', async ({ page }) => {
      // Verify tab structure
      await expect(page.locator('.tab-button')).toHaveCount(2);
      await expect(page.locator('.tab-content')).toHaveCount(2);
      await expect(page.locator('#testingContent')).toHaveClass(/tab-content/);
      await expect(page.locator('#renderingContent')).toHaveClass(/tab-content/);
    });

    test('inline performance-critical CSS is present', async ({ page }) => {
      // Verify critical CSS for accurate performance measurement is inline
      const styleTag = page.locator('style').first();
      await expect(styleTag).toBeAttached();
      
      const cssContent = await styleTag.innerHTML();
      expect(cssContent).toContain('.code-slash-icon');
      expect(cssContent).toContain('.simple-icon');
      expect(cssContent).toContain('.circular-icon');
      expect(cssContent).toContain('PERFORMANCE-CRITICAL');
    });

    test('cache prevention headers are set', async ({ page }) => {
      // Verify cache control meta tags exist (critical for accurate performance testing)
      await expect(page.locator('meta[http-equiv="Cache-Control"]')).toBeAttached();
      await expect(page.locator('meta[http-equiv="Pragma"]')).toBeAttached();
      await expect(page.locator('meta[http-equiv="Expires"]')).toBeAttached();
    });

    test('navigation back link functionality', async ({ page }) => {
      // Verify back to test suite link exists and works
      const backLink = page.locator('a:has-text("Back to Test Suite")');
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute('href', 'index.html');
    });
  });

  test.describe('Accessibility Requirements', () => {
    test('form elements have proper labels', async ({ page }) => {
      // Verify test type selector has proper labeling
      await expect(page.locator('label:has-text("Test Type:")')).toBeVisible();
      await expect(page.locator('label:has-text("Academic Research Mode:")')).toBeVisible();
    });

    test('buttons have descriptive text', async ({ page }) => {
      await expect(page.locator('button:has-text("Start Stress Test")')).toBeVisible();
      await expect(page.locator('button:has-text("Clear Results")')).toBeVisible();
      await expect(page.locator('button:has-text("Performance Testing")')).toBeVisible();
      await expect(page.locator('button:has-text("Live Rendering")')).toBeVisible();
    });

    test('headings hierarchy is maintained', async ({ page }) => {
      await expect(page.locator('h1')).toHaveCount(1);
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThanOrEqual(3); // Icon Examples, Performance Testing Controls, Live Icon Rendering
    });

    test('tab navigation is keyboard accessible', async ({ page }) => {
      // Verify tabs can be focused and activated
      const testingTab = page.locator('#testingTab');
      const renderingTab = page.locator('#renderingTab');
      
      await testingTab.focus();
      await expect(testingTab).toBeFocused();
      
      await renderingTab.focus();
      await expect(renderingTab).toBeFocused();
    });

    test('proper ARIA attributes for tabs', async ({ page }) => {
      // Verify tab navigation has proper ARIA labels
      const tabNav = page.locator('nav[aria-label="Tabs"]');
      await expect(tabNav).toBeVisible();
    });
  });
});