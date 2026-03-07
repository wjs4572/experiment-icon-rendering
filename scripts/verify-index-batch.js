const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.log('CONSOLE:', message.text());
    }
  });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    localStorage.removeItem('iconTestRunRecords');
    document.querySelectorAll('#batchSuiteSelection input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = checkbox.value === 'css';
    });
    document.getElementById('batchTestType').value = 'bulk';
  });

  await page.click('#startBatchTest');

  await page.waitForFunction(() => {
    const label = document.getElementById('batchOverallLabel');
    if (!label) return false;
    const text = label.textContent || '';
    return text.includes('complete') || text.includes('Stopped');
  }, { timeout: 120000 });

  const summary = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('iconTestRunRecords') || '[]');
    return {
      label: document.getElementById('batchOverallLabel')?.textContent || '',
      count: records.length,
      format: records[0]?.format,
      hasResults: !!records[0]?.results
    };
  });

  console.log(JSON.stringify(summary));

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
