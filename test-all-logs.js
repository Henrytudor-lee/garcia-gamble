// Capture ALL console output
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(10000);

    console.log('Total logs:', logs.length);
    console.log('All logs:');
    logs.forEach((l, i) => console.log(`  [${i}] [${l.type}] ${l.text.substring(0, 200)}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();