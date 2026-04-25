// Test script with detailed logging
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('isBettingRoundComplete') || text.includes('actionIndex') || text.includes('advancePhase')) {
      logs.push(text.substring(0, 200));
    }
  });

  try {
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(3000);

    let rounds = 0;
    while (rounds < 10) {
      await page.waitForTimeout(6000);

      const phase = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/Pre-Flop|Flop|Turn|River|Showdown/i);
        return match ? match[0] : 'unknown';
      });

      const actionButtons = await page.$$('button');
      const buttonTexts = await Promise.all(actionButtons.map(b => b.textContent()));
      const hasFold = buttonTexts.some(bt => bt.includes('Fold'));

      console.log(`Round ${rounds + 1}: Phase=${phase}, PlayerTurn=${hasFold}`);

      if (phase.includes('Showdown') || phase.includes('FLOP') || phase.includes('Turn') || phase.includes('River')) {
        console.log('SUCCESS: Game progressed beyond Pre-Flop!');
        const bettingLogs = logs.filter(l => l.includes('isBettingRoundComplete'));
        console.log('Betting logs:', bettingLogs.slice(0, 5));
        break;
      }

      if (hasFold) {
        await actionButtons.find((b, i) => buttonTexts[i]?.includes('Fold')).click();
        await page.waitForTimeout(1000);
      }

      rounds++;
    }

    if (rounds >= 10) {
      console.log('Game stuck at Pre-Flop!');
      console.log('Last 10 relevant logs:');
      logs.slice(-10).forEach(l => console.log('  ', l));
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();