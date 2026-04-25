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
  await sleep(800);
  
  // Try actions in priority order
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
  
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]:', err.message);
  });
  
  console.log('Starting 5-game auto-play test...\n');
  
  for (let game = 1; game <= 5; game++) {
    console.log(`\n========== GAME ${game} ==========`);
    
    try {
      await page.goto('http://localhost:3001/setup', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await sleep(500);
      
      const sessionBtn = page.locator('button:has-text("INITIALIZE SESSION")');
      await sessionBtn.click({ timeout: 5000 });
      await page.waitForURL('**/game', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      let gameEnded = false;
      let iterations = 0;
      const maxIterations = 80;
      
      while (!gameEnded && iterations < maxIterations) {
        iterations++;
        
        await autoPlay(page);
        await sleep(500);
        
        // Check for end state
        const nextHandBtn = await page.$('button:has-text("Next Hand")');
        const newGameBtn = await page.$('button:has-text("New Game")');
        
        if (nextHandBtn) {
          console.log('[GAME] Ended');
          await nextHandBtn.click();
          await page.waitForLoadState('networkidle');
          gameEnded = true;
        } else if (newGameBtn) {
          console.log('[GAME] Ended (New Game visible)');
          gameEnded = true;
        }
      }
      
      if (iterations >= maxIterations) {
        console.log(`[WARNING] Game ${game} max iterations`);
      }
      
      await sleep(1000);
    } catch (e) {
      console.log(`[ERROR in game ${game}]:`, e.message);
      logs.push(`[ERROR in game ${game}]: ${e.message}`);
    }
  }
  
  console.log('\n========== SUMMARY ==========');
  console.log(`Total logs: ${logs.length}`);
  
  // Show key events
  const phases = logs.filter(l => l.includes('COMMUNITY_CARDS'));
  console.log(`Phase completions: ${phases.length}`);
  
  await browser.close();
}

run().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
