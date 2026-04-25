// Test River scenario with detailed state logging
const { chromium } = require('playwright');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    logs.push({ type: 'error', text: err.message });
  });

  try {
    // Start game
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(3000);

    // Play multiple rounds, trying to get to RIVER with both all-in
    for (let i = 0; i < 10; i++) {
      const snapshot = await page.evaluate(() => {
        // Try to find game state from window or global
        const buttons = Array.from(document.querySelectorAll('button'));
        return {
          phase: document.body.innerText.includes('RIVER') ? 'RIVER' :
                 document.body.innerText.includes('FLOP') ? 'FLOP' :
                 document.body.innerText.includes('TURN') ? 'TURN' :
                 document.body.innerText.includes('Pre-Flop') ? 'PRE_FLOP' :
                 document.body.innerText.includes('SHOWDOWN') ? 'SHOWDOWN' : 'UNKNOWN',
          buttons: buttons.map(b => b.textContent.trim()).filter(t => t),
        };
      });

      console.log(`Round ${i + 1}: ${snapshot.phase}`);
      console.log('Buttons:', snapshot.buttons.slice(0, 8));

      // Try to find an action button
      const foldBtn = await page.$('button:has-text("Fold")');
      const callBtn = await page.$('button:has-text("Call")');
      const checkBtn = await page.$('button:has-text("Check")');
      const allinBtn = await page.$('button:has-text("All-In")');

      if (foldBtn) {
        // If we have Fold button, we're in a player turn
        if (allinBtn && Math.random() > 0.5) {
          // Sometimes go all-in to force the scenario
          await allinBtn.click();
          console.log('Clicked All-In');
        } else if (callBtn) {
          await callBtn.click();
          console.log('Clicked Call');
        } else if (checkBtn) {
          await checkBtn.click();
          console.log('Clicked Check');
        } else {
          await foldBtn.click();
          console.log('Clicked Fold');
        }
        await page.waitForTimeout(5000); // Wait for AI
      } else {
        // Not player's turn, wait for AI to act
        await page.waitForTimeout(3000);
      }

      // Check if game ended or showdown
      if (snapshot.phase === 'SHOWDOWN') {
        console.log('Reached SHOWDOWN!');
        break;
      }
    }

    // Print all logs
    console.log('\n--- Console Logs ---');
    logs.forEach(l => console.log(`[${l.type}] ${l.text.substring(0, 300)}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();