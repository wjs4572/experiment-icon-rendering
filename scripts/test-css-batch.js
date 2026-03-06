/**
 * test-css-batch.js
 * 
 * Simple script to:
 * 1. Start a batch for CSS only
 * 2. Monitor localStorage for progress data
 * 3. Check if suite pages properly detect it
 */

const puppeteer = require('puppeteer');

async function testCSSBatch() {
    console.log('🧪 Starting CSS-only batch test...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--disable-blink-features=AutomationControlled']
        });

        const page = await browser.newPage();
        
        // Listen for console messages
        page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log(`[PAGE LOG] ${msg.text()}`);
            } else if (msg.type() === 'warn') {
                console.warn(`[PAGE WARN] ${msg.text()}`);
            } else if (msg.type() === 'error') {
                console.error(`[PAGE ERROR] ${msg.text()}`);
            }
        });

        // Navigate to index.html
        console.log('📄 Loading index.html...');
        await page.goto('http://localhost:3000/src/index.html', { 
            waitUntil: 'networkidle2' 
        });

        // Wait for page to fully load
        await page.waitForTimeout(2000);

        // Select only CSS test
        console.log('\n✓ Selecting CSS test only...');
        await page.evaluate(() => {
            const checkbox = document.querySelector('input[value="css"]');
            if (checkbox) {
                checkbox.checked = true;
                console.log('[PAGE] CSS checkbox checked');
            }
        });

        // Start batch
        console.log('\n▶️ Starting batch...');
        await page.click('#startBatchTest');
        
        // Monitor localStorage and progress for 15 seconds
        console.log('\n📊 Monitoring progress for 15 seconds...\n');
        
        let lastProgress = null;
        const monitorInterval = setInterval(async () => {
            try {
                const data = await page.evaluate(() => {
                    const progressKey = 'iconTestProgressState';
                    const stored = localStorage.getItem(progressKey);
                    const suiteRunId = stored ? JSON.parse(stored)[0]?.suiteRunId : null;
                    const progress = stored ? JSON.parse(stored)[0]?.progress : null;
                    const currentLabel = document.getElementById('batchCurrentLabel')?.textContent || 'N/A';
                    const currentPercent = document.getElementById('batchCurrentPercent')?.textContent || '0%';
                    return {
                        stored,
                        suiteRunId,
                        progress,
                        currentLabel,
                        currentPercent,
                        timestamp: new Date().toISOString()
                    };
                });

                if (data.stored) {
                    if (!lastProgress || lastProgress !== JSON.stringify(data.progress)) {
                        lastProgress = JSON.stringify(data.progress);
                        console.log(`⏱ [${data.timestamp}]`);
                        console.log(`  📍 Suite Run ID: ${data.suiteRunId}`);
                        console.log(`  📊 Progress: ${data.progress?.percentage || 0}% - ${data.progress?.message || 'N/A'}`);
                        console.log(`  🏷️  UI Label: ${data.currentLabel}`);
                        console.log(`  📈 UI Percent: ${data.currentPercent}`);
                    }
                }
            } catch (err) {
                console.error('Monitor error:', err.message);
            }
        }, 1000);

        // After 15 seconds, check CSS page
        await page.waitForTimeout(15000);
        clearInterval(monitorInterval);

        console.log('\n🔍 Checking if CSS page can detect the progress...\n');
        
        // Open CSS page in new tab
        const cssPage = await browser.newPage();
        cssPage.on('console', msg => {
            if (msg.type() === 'log') {
                console.log(`[CSS-PAGE] ${msg.text()}`);
            }
        });

        console.log('📄 Loading css.html...');
        await cssPage.goto('http://localhost:3000/src/css.html', {
            waitUntil: 'networkidle2'
        });

        // Wait a moment for restoration
        await cssPage.waitForTimeout(2000);

        // Check what the CSS page sees
        const cssPageData = await cssPage.evaluate(() => {
            const progressKey = 'iconTestProgressState';
            const stored = localStorage.getItem(progressKey);
            const formatProgress = stored ? JSON.parse(stored).find(r => r.format === 'css') : null;
            const progressBar = document.getElementById('progressBar')?.style.width || 'N/A';
            const progressText = document.getElementById('progressText')?.textContent || 'N/A';
            
            return {
                localStorageKey: progressKey,
                storedData: stored ? JSON.parse(stored) : null,
                cssFormatProgress: formatProgress,
                progressBar,
                progressText,
                currentBatchRunId: window.currentBatchRunId || 'Not set'
            };
        });

        console.log('\n📋 CSS Page Storage Check:');
        console.log('  Storage Data:', JSON.stringify(cssPageData.storedData, null, 2));
        console.log('  CSS Format Progress:', JSON.stringify(cssPageData.cssFormatProgress, null, 2));
        console.log('  Progress Bar Width:', cssPageData.progressBar);
        console.log('  Progress Text:', cssPageData.progressText);

        // Final status
        console.log('\n✅ Test complete. Check browser windows for visual confirmation.');
        console.log('   You can now manually test the pages.');
        console.log('\nPress Ctrl+C to close browser.');

        // Keep browser open for manual inspection
        await page.waitForTimeout(60000);

    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testCSSBatch();
