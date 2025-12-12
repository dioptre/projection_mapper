import { test, expect } from '@playwright/test';

test('projection mapper loads with default sketch', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // Wait for the canvas to be visible
  await page.waitForSelector('#main-canvas');

  // Wait for p5.js sketch to render
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: 'projection-mapper-initial.png', fullPage: true });

  // Check that toolbar is visible
  const toolbar = await page.locator('.toolbar');
  await expect(toolbar).toBeVisible();

  // Check that tools are present
  const selectTool = await page.locator('#tool-select');
  await expect(selectTool).toBeVisible();

  const maskTool = await page.locator('#tool-mask');
  await expect(maskTool).toBeVisible();
});

test('can select and show properties panel', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // Wait for sketch to load
  await page.waitForTimeout(2000);

  // Click on the canvas (should select the sketch)
  await page.click('#main-canvas', { position: { x: 300, y: 200 } });

  // Wait for properties panel
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'projection-mapper-selected.png', fullPage: true });

  // Check if properties panel is visible
  const propertiesPanel = await page.locator('#properties-panel');
  const isVisible = await propertiesPanel.evaluate(el => !el.classList.contains('hidden'));
  expect(isVisible).toBe(true);
});

test('can switch to mask tool', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // Wait for sketch to load
  await page.waitForTimeout(1500);

  // Click mask tool
  await page.click('#tool-mask');

  // Check that mask tool is active
  const maskTool = await page.locator('#tool-mask');
  await expect(maskTool).toHaveClass(/active/);

  // Add a few mask points
  await page.click('#main-canvas', { position: { x: 100, y: 100 } });
  await page.click('#main-canvas', { position: { x: 300, y: 100 } });
  await page.click('#main-canvas', { position: { x: 300, y: 300 } });
  await page.click('#main-canvas', { position: { x: 100, y: 300 } });

  await page.waitForTimeout(500);

  // Take screenshot with mask
  await page.screenshot({ path: 'projection-mapper-mask.png', fullPage: true });
});

test('can open code editor', async ({ page }) => {
  await page.goto('http://localhost:5175/');

  // Wait for sketch to load
  await page.waitForTimeout(2000);

  // Click on canvas to select sketch
  await page.click('#main-canvas', { position: { x: 300, y: 200 } });

  await page.waitForTimeout(500);

  // Press 'e' key to open editor
  await page.keyboard.press('e');

  await page.waitForTimeout(500);

  // Check editor is visible
  const editorPanel = await page.locator('#editor-panel');
  const isVisible = await editorPanel.evaluate(el => !el.classList.contains('hidden'));
  expect(isVisible).toBe(true);

  // Take screenshot
  await page.screenshot({ path: 'projection-mapper-editor.png', fullPage: true });
});
