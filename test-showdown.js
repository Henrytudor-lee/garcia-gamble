const { chromium } = require('playwright');

async function testShowdown() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 监听 console 消息
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  // 监听 page errors
  page.on('pageerror', err => {
    console.log(`[Page Error] ${err.message}`);
  });

  try {
    // 导航到游戏
    console.log('Navigating to setup...');
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });

    // 点击 INITIALIZE SESSION
    console.log('Clicking INITIALIZE SESSION...');
    await page.click('button:has-text("INITIALIZE SESSION")');

    // 等待游戏加载
    await page.waitForTimeout(1000);

    // 检查当前状态
    console.log('\n=== Checking game state via page.evaluate ===');
    const gameState = await page.evaluate(() => {
      // 尝试从 DOM 获取信息
      const phaseEl = document.querySelector('.text-xs.font-bold.text-secondary.uppercase.tracking-widest');
      const potEl = document.querySelector('.text-2xl.font-headline.font-black.text-primary');

      return {
        phaseText: phaseEl?.textContent,
        potText: potEl?.textContent,
        url: window.location.href
      };
    });
    console.log('Game state:', gameState);

    // 等待一段时间看游戏进展
    console.log('\nWaiting 30 seconds for game to progress...');
    await page.waitForTimeout(30000);

    // 再次检查
    const finalState = await page.evaluate(() => {
      const phaseEl = document.querySelector('.text-xs.font-bold.text-secondary.uppercase.tracking-widest');
      const potEl = document.querySelector('.text-2xl.font-headline.font-black.text-primary');
      const showdownOverlay = document.querySelector('.glass-panel.rounded-2xl.border.border-white\\/10.p-6.max-w-md');
      const showdownCards = showdownOverlay?.querySelectorAll('.flex.gap-1');

      return {
        phaseText: phaseEl?.textContent,
        potText: potEl?.textContent,
        hasShowdownOverlay: !!showdownOverlay,
        showdownCardsCount: showdownCards?.length || 0,
        url: window.location.href
      };
    });
    console.log('Final state:', finalState);

    // 截图
    await page.screenshot({ path: '/tmp/poker-showdown-test.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/poker-showdown-test.png');

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testShowdown();