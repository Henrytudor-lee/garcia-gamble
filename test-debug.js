// Test script to reproduce the all-in at River bug with console logging
const { chromium } = require('playwright');

async function testAllInAtRiver() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    console.log('Starting game...');
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(3000);

    let rounds = 0;
    const maxRounds = 15;

    while (rounds < maxRounds) {
      // Wait for AI actions
      await page.waitForTimeout(8000);

      // Get game phase
      const phase = await page.evaluate(() => {
        const text = document.body.innerText;
        const match = text.match(/Pre-Flop|Flop|Turn|River|Showdown|SHOWDOWN/i);
        return match ? match[0].toLowerCase() : 'unknown';
      });

      // Get current action log
      const logSnippet = logs.slice(-20).map(l => `${l.type}: ${l.text}`).join('\n');

      console.log(`\n=== Round ${rounds + 1}: Phase=${phase} ===`);

      // Check for betting round complete logs
      const bettingLogs = logs.filter(l => l.text.includes('[isBettingRoundComplete]'));
      if (bettingLogs.length > 0) {
        console.log('Betting round checks:');
        bettingLogs.slice(-5).forEach(l => console.log('  ', l.text.substring(0, 200)));
      }

      // Check if stuck
      const actionButtons = await page.$$('button');
      const buttonTexts = await Promise.all(actionButtons.map(b => b.textContent()));
      const hasPlayerTurn = buttonTexts.some(bt => bt.includes('Fold') || bt.includes('Call'));

      console.log(`Player turn: ${hasPlayerTurn}`);

      if (phase.includes('showdown')) {
        console.log('SHOWDOWN reached - test passed!');
        break;
      }

      // If player needs to act, fold to speed up
      if (hasPlayerTurn) {
        console.log('Clicking Fold to speed up...');
        const foldBtn = actionButtons.find((b, i) => buttonTexts[i]?.includes('Fold'));
        if (foldBtn) await foldBtn.click();
      }

      // Check if game ended (redirected)
      const url = page.url();
      if (url.includes('summary')) {
        console.log('Game ended, restarting...');
        await page.goto('http://localhost:3001/setup');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("INITIALIZE SESSION")');
        await page.waitForTimeout(2000);
        logs.length = 0; // Clear logs
      }

      rounds++;
    }

    if (rounds >= maxRounds) {
      console.log('\nTest completed - did not reach showdown');
      // Print last betting logs
      const bettingLogs = logs.filter(l => l.text.includes('[isBettingRoundComplete]'));
      console.log('\nLast 10 betting round checks:');
      bettingLogs.slice(-10).forEach(l => console.log('  ', l.text.substring(0, 300)));
    }

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }
}

testAllInAtRiver();