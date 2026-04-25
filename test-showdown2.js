const { chromium } = require('playwright');

async function testShowdown() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 监听 console 消息
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser ERROR] ${msg.text()}`);
    }
  });

  try {
    console.log('Navigating to setup...');
    await page.goto('http://localhost:3001/setup', { waitUntil: 'networkidle' });

    // 点击 INITIALIZE SESSION
    console.log('Starting game...');
    await page.click('button:has-text("INITIALIZE SESSION")');
    await page.waitForTimeout(500);

    let rounds = 0;
    const maxRounds = 100; // 防止无限循环

    // 游戏循环 - 等待并处理每个回合
    while (rounds < maxRounds) {
      rounds++;

      // 等待一下让游戏状态更新
      await page.waitForTimeout(500);

      // 检查游戏是否已经结束
      const gameStatus = await page.evaluate(() => {
        const phaseEl = document.querySelector('.text-xs.font-bold.text-secondary.uppercase.tracking-widest');
        const showdownOverlay = document.querySelector('.glass-panel.rounded-2xl.border.border-white\\/10.p-6.max-w-md');
        const showdownCards = showdownOverlay?.querySelectorAll('.flex.gap-1');
        const playerChipsEl = document.querySelector('.text-2xl.font-headline.font-black.text-primary');
        const waitingText = document.querySelector('.animate-pulse:has-text("Waiting")');

        return {
          phase: phaseEl?.textContent || 'Unknown',
          hasShowdownOverlay: !!showdownOverlay,
          showdownCardsCount: showdownCards?.length || 0,
          playerChips: playerChipsEl?.textContent || 'Unknown',
          isWaitingForOpponent: !!waitingText
        };
      });

      console.log(`Round ${rounds}: Phase=${gameStatus.phase}, Showdown=${gameStatus.hasShowdownOverlay}, Cards=${gameStatus.showdownCardsCount}, Waiting=${gameStatus.isWaitingForOpponent}`);

      // 如果到了 SHOWDOWN，记录并截图
      if (gameStatus.hasShowdownOverlay) {
        console.log('\n=== SHOWDOWN DETECTED ===');
        const showdownInfo = await page.evaluate(() => {
          const overlay = document.querySelector('.glass-panel.rounded-2xl.border.border-white\\/10.p-6.max-w-md');
          const cards = overlay?.querySelectorAll('.flex.gap-1');
          const cardDetails = [];
          cards?.forEach(cardRow => {
            const cardEls = cardRow.querySelectorAll('.w-16.h-24, .w-12.h-18, [class*="rounded"]');
            cardDetails.push(cardEls?.length || 0);
          });

          return {
            overlayText: overlay?.textContent?.substring(0, 200),
            cardRowsCount: cards?.length || 0
          };
        });
        console.log('Showdown info:', showdownInfo);

        await page.screenshot({ path: '/tmp/poker-showdown.png', fullPage: true });
        console.log('Screenshot saved to /tmp/poker-showdown.png');
        break;
      }

      // 如果在等待对手，AI会自己行动，等待即可
      if (gameStatus.isWaitingForOpponent) {
        // 等待AI行动（2秒延迟 + 处理时间）
        await page.waitForTimeout(3000);
        continue;
      }

      // 检查是否有 Fold 按钮可用（玩家回合）
      const foldButton = await page.$('button:has-text("Fold")');
      if (foldButton) {
        const isDisabled = await foldButton.evaluate(el => el.disabled);
        if (!isDisabled) {
          // 玩家回合！点击 Fold 继续游戏
          console.log('  -> Player turn, clicking Fold');
          await foldButton.click();
          await page.waitForTimeout(500);
        } else {
          // 按钮存在但被禁用，等待一下
          await page.waitForTimeout(1000);
        }
      } else {
        // 没有 Fold 按钮，可能是 Check/Call/Raise
        const checkButton = await page.$('button:has-text("Check")');
        if (checkButton) {
          const isDisabled = await checkButton.evaluate(el => el.disabled);
          if (!isDisabled) {
            console.log('  -> Player turn, clicking Check');
            await checkButton.click();
            await page.waitForTimeout(500);
          } else {
            await page.waitForTimeout(1000);
          }
        } else {
          // 等待AI
          await page.waitForTimeout(2000);
        }
      }
    }

    if (rounds >= maxRounds) {
      console.log('Max rounds reached');
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testShowdown();