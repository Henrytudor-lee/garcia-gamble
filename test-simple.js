// Simple test to check console capture
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
    await page.waitForTimeout(5000);

    console.log('Total logs captured:', logs.length);
    console.log('Error logs:', logs.filter(l => l.type === 'error').length);
    console.log('First 10 logs:');
    logs.slice(0, 10).forEach(l => console.log(`  [${l.type}] ${l.text.substring(0, 100)}`));
    console.log('\nLast 10 logs:');
    logs.slice(-10).forEach(l => console.log(`  [${l.type}] ${l.text.substring(0, 100)}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();