// Detailed debug test
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
  });

  try {
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(3000);

    let rounds = 0;
    while (rounds < 8) {
      await page.waitForTimeout(10000);

      const phase = await page.evaluate(() => {
        const text = document.body.innerText;
        if (/Pre-Flop/i.test(text) && !/Flop|Turn|River|Showdown/i.test(text)) return 'PREFLOP';
        if (/Flop/i.test(text) && !/Turn|River|Showdown/i.test(text)) return 'FLOP';
        if (/Turn/i.test(text) && !/River|Showdown/i.test(text)) return 'TURN';
        if (/River/i.test(text) && !/Showdown/i.test(text)) return 'RIVER';
        if (/Showdown/i.test(text)) return 'SHOWDOWN';
        return 'unknown';
      });

      console.log(`\n=== Round ${rounds + 1}: Phase=${phase} ===`);

      // Check if stuck at FLOP with all-in
      const bettingLogs = logs.filter(l => l.includes('FLOP') || l.includes('allHaveEqualBet'));
      if (bettingLogs.length > 0) {
        console.log('Last 10 FLOP/allHaveEqualBet logs:');
        bettingLogs.slice(-10).forEach(l => console.log('  ', l.substring(0, 150)));
      }

      if (phase === 'SHOWDOWN' || phase === 'TURN' || phase === 'RIVER') {
        console.log('SUCCESS: Game progressed!');
        break;
      }

      // Check for action buttons
      const actionButtons = await page.$$('button');
      const buttonTexts = await Promise.all(actionButtons.map(b => b.textContent()));
      const hasFold = buttonTexts.some(bt => bt.includes('Fold'));

      if (hasFold) {
        await actionButtons.find((b, i) => buttonTexts[i]?.includes('Fold')).click();
        await page.waitForTimeout(1000);
      }

      rounds++;
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();