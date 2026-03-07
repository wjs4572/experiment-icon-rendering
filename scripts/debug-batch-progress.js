/**
 * debug-batch-progress.js - Debug batch progress display
 * 
 * Tests:
 * 1. Start batch on index.html
 * 2. Open css.html in another tab
 * 3. Check if batch progress is displayed
 * 4. Verify localStorage is being updated
 */

const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    
    // Open index.html
    const indexPage = await context.newPage();
    await indexPage.goto('http://localhost:3000/src/index.html', { waitUntil: 'networkidle' });
    
    console.log('📋 INDEX PAGE LOADED\n');
    
    // Wait a moment for scripts to load
    await indexPage.waitForTimeout(500);
    
    // Check RunStateStore exists
    const hasRunStateStore = await indexPage.evaluate(() => {
        return typeof window.RunStateStore !== 'undefined';
    });
    console.log(`✓ RunStateStore available: ${hasRunStateStore}`);
    
    // Select CSS only and start batch
    console.log('\n▶️  Starting batch with CSS only...');
    await indexPage.click('#batchSuiteSelection input[value="css"]');
    
    // Uncheck others
    const checkboxes = await indexPage.$$('#batchSuiteSelection input');
    for (const checkbox of checkboxes) {
        const value = await checkbox.getAttribute('value');
        if (value !== 'css') {
            const isChecked = await checkbox.isChecked();
            if (isChecked) {
                await checkbox.click();
            }
        }
    }
    
    // Start batch
    await indexPage.click('#startBatchTest');
    
    // Wait for batch to start
    await indexPage.waitForTimeout(2000);
    
    // Check localStorage on index page
    const indexStorage = await indexPage.evaluate(() => {
        const progressState = localStorage.getItem('iconTestProgressState');
        const runRecords = localStorage.getItem('iconTestRunRecords');
        return {
            hasProgressState: !!progressState,
            progressState: progressState ? JSON.parse(progressState) : null,
            hasRunRecords: !!runRecords,
            runRecordCount: runRecords ? JSON.parse(runRecords).length : 0
        };
    });
    
    console.log('\n📊 INDEX PAGE STORAGE:');
    console.log(`   Progress State exists: ${indexStorage.hasProgressState}`);
    if (indexStorage.progressState) {
        console.log(`   Progress State: ${JSON.stringify(indexStorage.progressState, null, 2)}`);
    }
    console.log(`   Run Records: ${indexStorage.runRecordCount}`);
    
    // Now open CSS page
    console.log('\n📄 Opening CSS page...');
    const cssPage = await context.newPage();
    await cssPage.goto('http://localhost:3000/src/css.html', { waitUntil: 'networkidle' });
    
    // Wait for DOMContentLoaded
    await cssPage.waitForTimeout(1000);
    
    // Check RunStateStore on CSS page
    const cssPageState = await cssPage.evaluate(() => {
        if (!window.RunStateStore) return { error: 'RunStateStore not loaded' };
        
        const activeRun = window.RunStateStore.getProgressForFormat('css');
        const progressState = localStorage.getItem('iconTestProgressState');
        const batchRunning = !!activeRun;
        
        return {
            hasRunStateStore: true,
            batchRunning,
            activeRun: activeRun ? {
                format: activeRun.format,
                progress: activeRun.progress
            } : null,
            localStorageProgressState: progressState ? JSON.parse(progressState) : null,
            testProgressElement: document.getElementById('testProgress') ? {
                visible: !document.getElementById('testProgress').classList.contains('hidden'),
                classes: document.getElementById('testProgress').className
            } : null
        };
    });
    
    console.log('\n📊 CSS PAGE STATE:');
    console.log(JSON.stringify(cssPageState, null, 2));
    
    // Check if progress bar is showing
    let progressVisible = false;
    try {
        const el = await cssPage.$('#testProgress');
        if (el) {
            progressVisible = !(await el.evaluate(e => e.classList.contains('hidden')));
        }
    } catch (e) {
        // ignore
    }
    console.log(`\n✓ Progress bar visible: ${progressVisible}`);
    
    // Get current progress display text
    const progressText = await cssPage.evaluate(() => {
        const el = document.getElementById('progressText');
        return el ? el.textContent : 'NOT FOUND';
    });
    console.log(`✓ Progress text: "${progressText}"`);
    
    // Check batch status on index page
    const batchStatus = await indexPage.evaluate(() => {
        const batchProgress = document.getElementById('batchProgress');
        const currentLabel = document.getElementById('batchCurrentLabel');
        const currentPercent = document.getElementById('batchCurrentPercent');
        
        return {
            batchProgressVisible: !batchProgress.classList.contains('hidden'),
            currentLabel: currentLabel ? currentLabel.textContent : 'UNKNOWN',
            currentPercent: currentPercent ? currentPercent.textContent : 'UNKNOWN'
        };
    });
    
    console.log('\n📊 INDEX PAGE BATCH STATUS:');
    console.log(JSON.stringify(batchStatus, null, 2));
    
    console.log('\n✅ Debug complete. Check the pages in browser.');
    console.log('   Batch should be running on index.html');
    console.log('   CSS page should show progress if batch integration works');
    
    // Keep pages open for inspection
    await indexPage.waitForTimeout(10000);
    
    await browser.close();
})();
