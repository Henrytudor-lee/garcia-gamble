// Test script to reproduce the all-in at River bug
// Scenario: At River phase, human player and one AI are both all-in, no other players
// Expected: Game should advance to SHOWDOWN
// Actual: Game gets stuck

const { chromium } = require('playwright');

async function testAllInAtRiver() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    console.log('Navigating to setup page...');
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });

    // Click INITIALIZE SESSION
    console.log('Starting game...');
    await page.click('button:has-text("INITIALIZE SESSION")');

    // Wait for game to load
    await page.waitForTimeout(3000);

    // Play through multiple hands to get to River with all-in scenario
    // We'll manually inspect the game state
    console.log('Game started, monitoring for River phase with all-in...');

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await page.waitForTimeout(5000); // Wait for AI actions

      // Get current game state
      const gameInfo = await page.evaluate(() => {
        // Try to read game state from console or DOM
        const potText = document.querySelector('main')?.textContent?.match(/Total Pot \$?[\d,]+/);
        const phaseText = document.querySelector('main')?.textContent?.match(/(Pre-Flop|Flop|Turn|River|Showdown)/i);
        return {
          pot: potText ? potText[0] : null,
          phase: phaseText ? phaseText[0] : null,
          url: window.location.href
        };
      });

      console.log(`Attempt ${attempts + 1}: Phase=${gameInfo.phase}, Pot=${gameInfo.pot}`);

      // Check if we see "All-In" in action log
      const allInCount = await page.evaluate(() => {
        const text = document.querySelector('main')?.textContent || '';
        const matches = text.match(/All-In/g);
        return matches ? matches.length : 0;
      });

      if (allInCount >= 2) {
        console.log('Found All-In scenario! Checking if game advances...');
      }

      // Check for action buttons (if player needs to act)
      const actionButtons = await page.$$('button');
      const buttonTexts = await Promise.all(actionButtons.map(b => b.textContent()));

      if (buttonTexts.some(bt => bt.includes('Fold') || bt.includes('Call'))) {
        console.log('Player turn detected, clicking Fold to speed up...');
        const foldBtn = actionButtons.find((b, i) => buttonTexts[i]?.includes('Fold'));
        if (foldBtn) {
          await foldBtn.click();
          await page.waitForTimeout(2000);
        }
      }

      // Check if game is stuck (no action for a while)
      const isStuck = await page.evaluate(() => {
        // If we're at River and there's no "Next Hand" prompt and no action buttons
        const text = document.body.innerText;
        const hasRiver = /River/i.test(text);
        const hasShowdown = /Showdown/i.test(text);
        const hasNextHand = /Next Hand/i.test(text);
        const hasActionButtons = /Fold|Call|Raise|All-In/.test(text);
        return hasRiver && !hasShowdown && !hasNextHand && !hasActionButtons;
      });

      if (isStuck) {
        console.log('BUG REPRODUCED: Game is stuck at River with no action possible!');
        const screenshot = await page.screenshot({ path: '/tmp/stuck-river.png' });
        console.log('Screenshot saved to /tmp/stuck-river.png');
        break;
      }

      // Check if game ended
      if (gameInfo.url.includes('summary')) {
        console.log('Game ended, going back to setup...');
        await page.goto('http://localhost:3001/setup');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("INITIALIZE SESSION")');
        await page.waitForTimeout(2000);
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('Test completed without reproducing the bug');
    }

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
  }
}

testAllInAtRiver();