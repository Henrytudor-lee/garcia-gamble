const { chromium } = require('playwright');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickButtonContaining(page, text) {
  try {
    const btn = page.locator(`button:has-text("${text}")`).first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click();
      return true;
    }
  } catch (e) {}
  return false;
}

async function autoPlay(page) {
  // Wait for any action buttons
  await sleep(1000);
  
  // Try to take an action based on what's available
  if (await clickButtonContaining(page, 'Call')) {
    console.log('[PLAYER] Call');
  } else if (await clickButtonContaining(page, 'Check')) {
    console.log('[PLAYER] Check');
  } else if (await clickButtonContaining(page, 'Raise')) {
    console.log('[PLAYER] Raise');
  } else if (await clickButtonContaining(page, 'Fold')) {
    console.log('[PLAYER] Fold');
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const logs = [];
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[ACTION_LOG]') || text.includes('[COMMUNITY_CARDS]') || 
        text.includes('[advancePhase]') || text.includes('[isBettingRoundComplete]') ||
        text.includes('[moveToNextPlayer]') || text.includes('[executePlayerAction]') ||
        text.includes('[GameSetup]') || text.includes('[GameContext]')) {
      console.log('BROWSER:', text);
      logs.push(text);
    }
  });
  
  console.log('Starting 5-game auto-play test...\n');
  
  for (let game = 1; game <= 5; game++) {
    console.log(`\n========== GAME ${game} ==========`);
    
    // Navigate to setup
    await page.goto('http://localhost:3001/setup');
    await page.waitForLoadState('networkidle');
    await sleep(500);
    
    // Start game
    await page.locator('button:has-text("INITIALIZE SESSION")').click();
    await page.waitForURL('**/game', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    let gameEnded = false;
    let iterations = 0;
    const maxIterations = 100; // Safety limit
    
    while (!gameEnded && iterations < maxIterations) {
      iterations++;
      
      // Wait for AI to think
      await sleep(800);
      
      // Check phase
      const phaseText = await page.evaluate(() => {
        const el = document.querySelector('.glass-panel');
        return el ? el.textContent : '';
      });
      
      // Try player action
      await autoPlay(page);
      
      // Check if game ended
      const nextHandBtn = await page.$('button:has-text("Next Hand")');
      if (nextHandBtn) {
        console.log('[GAME] Ended, clicking Next Hand...');
        await nextHandBtn.click();
        await page.waitForLoadState('networkidle');
        gameEnded = true;
      } else if (await page.$('button:has-text("New Game")')) {
        console.log('[GAME] Ended, starting new game...');
        await page.goto('http://localhost:3001/setup');
        await page.waitForLoadState('networkidle');
        gameEnded = true;
      }
      
      await sleep(300);
    }
    
    if (iterations >= maxIterations) {
      console.log(`[WARNING] Game ${game} reached max iterations, forcing next...`);
      await page.goto('http://localhost:3001/setup');
      await page.waitForLoadState('networkidle');
    }
    
    await sleep(1000);
  }
  
  console.log('\n========== COMPLETED 5 GAMES ==========');
  console.log(`Total logs captured: ${logs.length}`);
  
  await browser.close();
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
