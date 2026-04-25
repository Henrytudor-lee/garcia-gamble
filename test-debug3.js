// Test script with detailed player state logging
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
    await page.waitForTimeout(3000);

    let rounds = 0;
    while (rounds < 15) {
      await page.waitForTimeout(6000);

      // Get EXACT phase - use regex that won't match PRE-FLOP as FLOP
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

      // Print betting logs
      const bettingLogs = logs.filter(l => l.text.includes('isBettingRoundComplete'));
      if (bettingLogs.length > 0) {
        const last = bettingLogs[bettingLogs.length - 1].text;
        console.log('Last betting check:', last.substring(0, 300));
      }

      if (phase === 'SHOWDOWN') {
        console.log('SUCCESS: Reached SHOWDOWN!');
        break;
      }

      if (phase === 'PREFLOP' && !hasFold) {
        console.log('Game stuck at PREFLOP without player turn...');
        // Print all betting logs to see the pattern
        console.log('\nAll betting round logs:');
        bettingLogs.slice(-10).forEach(l => console.log('  ', l.text.substring(0, 300)));
      }

      if (hasFold) {
        await actionButtons.find((b, i) => buttonTexts[i]?.includes('Fold')).click();
        await page.waitForTimeout(1000);
      }

      rounds++;
    }

    if (rounds >= 15) {
      console.log('\nTest ended without reaching SHOWDOWN');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();