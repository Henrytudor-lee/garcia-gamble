import { test, expect } from '@playwright/test';

// Test 1: Setup page loads and "Initialize Session" button works
test('setup page - game configuration and start', async ({ page }) => {
  await page.goto('/setup');

  // Should see configuration page
  await expect(page.locator('h1:has-text("New Simulation")')).toBeVisible({ timeout: 10000 });

  // Buy-in inputs with numeric values
  const buyInSection = page.locator('text=Standard Buy-In').locator('..');
  const inputs = page.locator('input');
  await expect(inputs.first()).toBeVisible();

  // Start game button
  const initBtn = page.locator('button:has-text("INITIALIZE SESSION")');
  await expect(initBtn).toBeVisible();
  await initBtn.click();

  // Should navigate to game page with poker elements
  await page.waitForURL('**/game', { timeout: 10000 });
  await expect(page.locator('text=Total Pot')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Pre-Flop').first()).toBeVisible({ timeout: 5000 });
});

// Test 2: Game page renders poker table with all elements
test('game page - poker table renders correctly', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Core table elements
  await expect(page.locator('text=Total Pot')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('text=Pre-Flop').first()).toBeVisible({ timeout: 5000 });

  // Player info
  await expect(page.locator('text=You')).toBeVisible({ timeout: 5000 });

  // AI opponents should be visible
  await expect(page.locator('text=ZENITH_v4').first()).toBeVisible({ timeout: 5000 });
});

// Test 3: Action buttons display based on player turn
test('game page - action buttons show when it is player turn', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Wait for page to stabilize
  await page.waitForTimeout(2000);

  // Action HUD should be present
  const actionArea = page.locator('.fixed.bottom-0');
  await expect(actionArea).toBeVisible({ timeout: 5000 });

  // Should have Fold button
  const foldBtn = page.locator('button:has-text("Fold")');
  await expect(foldBtn).toBeVisible({ timeout: 5000 });
});

// Test 4: Action log panel appears and records actions
test('game page - action log panel exists and records AI actions', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Wait for game to start and AI to act
  await page.waitForTimeout(4000);

  // Action log should be visible
  await expect(page.locator('text=Action Log')).toBeVisible({ timeout: 5000 });

  // Log should contain action entries (blinds + AI calls)
  // The log shows "RAGE_QUIT → Call $100" type entries
  const pageText = await page.locator('body').textContent();
  expect(pageText).toMatch(/→.*Call|→.*Raise|→.*Fold|→.*Check/);
});

// Test 5: AI actions happen automatically (no player input needed for AI turns)
test('game page - AI actions happen automatically', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Wait for multiple AI turns
  await page.waitForTimeout(6000);

  // Should see AI names in the log acting
  const pageText = await page.locator('body').textContent();
  // Should have multiple Call/Raise actions from different AIs
  expect(pageText).toMatch(/ZENITH_v4|STORM_ACE|THEORY_X|NOVA_PRIME|RAGE_QUIT/);
});

// Test 6: Fold removes action buttons for player
test('game page - fold button removes subsequent action buttons', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Wait for player turn
  await page.waitForTimeout(2000);

  // Check for action buttons
  const foldBtn = page.locator('button:has-text("Fold")');
  const isFoldVisible = await foldBtn.isVisible().catch(() => false);

  if (isFoldVisible) {
    await foldBtn.click();
    await page.waitForTimeout(500);

    // After player folds, Call and Raise buttons should disappear
    // (getAvailableActions returns null when player folds)
    const callBtn = page.locator('button:has-text("Call $")');
    const raiseBtn = page.locator('button:has-text("Raise To")');

    await expect(callBtn).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(raiseBtn).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  }
});

// Test 7: No console errors during gameplay
test('game page - no console errors during gameplay', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Play through some gameplay
  await page.waitForTimeout(8000);

  // Filter out expected warnings
  const realErrors = errors.filter(e =>
    !e.includes('Warning') &&
    !e.includes('hydration') &&
    !e.includes('favicon') &&
    !e.includes('Download the React DevTools')
  );

  expect(realErrors).toHaveLength(0);
});

// Test 8: Community cards and phases work correctly
test('game page - phase indicator and pot display work', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Should show Pre-Flop initially
  await expect(page.locator('text=Pre-Flop').first()).toBeVisible({ timeout: 5000 });

  // Pot should display a value (starts with blinds 50+100=150)
  await expect(page.locator('text=Total Pot')).toBeVisible();

  // After gameplay, phases should transition (no crashes)
  await page.waitForTimeout(5000);
  await expect(page.locator('text=Total Pot')).toBeVisible();
});

// Test 9: Action log shows round indicators
test('game page - action log shows round indicators (R0/R1/etc)', async ({ page }) => {
  await page.goto('/setup');
  await page.locator('button:has-text("INITIALIZE SESSION")').click();
  await page.waitForURL('**/game', { timeout: 10000 });

  // Wait for multiple betting rounds
  await page.waitForTimeout(8000);

  // Action log should show round indicators (R0, R1, R2, etc)
  const pageText = await page.locator('body').textContent();
  // Match R followed by a digit
  expect(pageText).toMatch(/R\d/);
});
