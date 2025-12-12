import { test, expect } from '@playwright/test';

test.describe('Mask Selection and Deletion', () => {
  test('should create, select, and delete mask', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Switch to mask tool
    await page.click('#tool-mask');
    await page.waitForTimeout(500);

    console.log('Creating mask with 4 points...');

    // Create a mask with 4 points
    const canvas = await page.locator('#main-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 300, y: 100 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(200);

    // Close mask with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/mask-1-created.png' });
    console.log('Mask created');

    // Switch to select tool
    await page.click('#tool-select');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/mask-2-select-mode.png' });
    console.log('Switched to select mode');

    // Try to click on the mask center
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-screenshots/mask-3-clicked-center.png' });
    console.log('Clicked mask center');

    // Try to delete with Delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-screenshots/mask-4-after-delete.png' });
    console.log('Pressed delete key');
  });
});
