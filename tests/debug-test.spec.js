import { test } from '@playwright/test';

test('debug sketch rendering', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.type(), msg.text());
  });

  // Listen to page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('http://localhost:5175/');

  // Wait for the canvas
  await page.waitForSelector('#main-canvas');

  // Wait a bit for sketch to render
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });

  // Get any error messages from the sketch containers
  const sketchContainers = await page.locator('[id^="sketch-"]').all();
  console.log('Number of sketch containers:', sketchContainers.length);

  for (let i = 0; i < sketchContainers.length; i++) {
    const html = await sketchContainers[i].innerHTML();
    console.log(`Sketch ${i} HTML:`, html.substring(0, 200));
  }
});
