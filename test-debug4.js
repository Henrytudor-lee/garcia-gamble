// Capture ALL console output
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('isBettingRoundComplete') || text.includes('moveToNextPlayer') || text.includes('advancePhase') || text.includes('actionIndex')) {
      logs.push(text);
    }
  });

  try {
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(3000);

    let rounds = 0;
    while (rounds < 5) {
      await page.waitForTimeout(8000);

      const phase = await page.evaluate(() => {
        const text = document.body.innerText;
        if (/Pre-Flop/i.test(text) && !/Flop|Turn|River|Showdown/i.test(text)) return 'PREFLOP';
        if (/Flop/i.test(text) && !/Turn|River|Showdown/i.test(text)) return 'FLOP';
        if (/Turn/i.test(text) && !/River|Showdown/i.test(text)) return 'TURN';
        if (/River/i.test(text) && !/Showdown/i.test(text)) return 'RIVER';
        if (/Showdown/i.test(text)) return 'SHOWDOWN';
        return 'unknown';
      });

      const actionButtons = await page.$$('button');
      const buttonTexts = await Promise.all(actionButtons.map(b => b.textContent()));
      const hasFold = buttonTexts.some(bt => bt.includes('Fold'));

      console.log(`\n=== Round ${rounds + 1}: Phase=${phase}, hasFold=${hasFold} ===`);

      // Print all captured logs
      if (logs.length > 0) {
        console.log('Logs:');
        logs.forEach(l => console.log('  ', l.substring(0, 200)));
      } else {
        console.log('No matching logs!');
      }

      if (phase === 'SHOWDOWN') {
        console.log('SUCCESS: Reached SHOWDOWN!');
        break;
      }

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