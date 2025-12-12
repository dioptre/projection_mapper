import { test, expect } from '@playwright/test';

test.describe('Interact Mode', () => {
  test('should allow clicking sliders in interact mode', async ({ page }) => {
    await page.goto('http://localhost:5176');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Add a sketch with sliders (click the + button)
    await page.click('#tool-add-sketch');
    await page.waitForTimeout(2000);

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-screenshots/interact-1-initial.png' });

    // Switch to interact mode
    await page.click('#tool-interact');
    await page.waitForTimeout(500);

    // Take screenshot with interact mode active
    await page.screenshot({ path: 'test-screenshots/interact-2-mode-active.png' });

    // Try to click on a slider in the sketch
    // The sliders should be near the top left of the sketch
    const sketch = await page.locator('[id^="sketch-"]').first();
    const box = await sketch.boundingBox();

    console.log('Sketch bounding box:', box);

    // Try clicking on where the first slider should be (roughly 150px from left, 30px from top)
    const sliderX = box.x + 150;
    const sliderY = box.y + 30;

    console.log('Clicking at slider position:', sliderX, sliderY);
    await page.mouse.click(sliderX, sliderY);
    await page.waitForTimeout(500);

    // Take screenshot after clicking
    await page.screenshot({ path: 'test-screenshots/interact-3-after-click.png' });

    // Try dragging the slider
    await page.mouse.move(sliderX, sliderY);
    await page.mouse.down();
    await page.mouse.move(sliderX + 50, sliderY);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Take screenshot after dragging
    await page.screenshot({ path: 'test-screenshots/interact-4-after-drag.png' });

    // Check if canvas has pointer-events: none
    const canvasPointerEvents = await page.evaluate(() => {
      const canvas = document.getElementById('main-canvas');
      return window.getComputedStyle(canvas).pointerEvents;
    });

    console.log('Canvas pointer-events:', canvasPointerEvents);
    expect(canvasPointerEvents).toBe('none');

    // Check if iframe is accessible
    const iframeCount = await page.locator('iframe').count();
    console.log('Number of iframes:', iframeCount);
    expect(iframeCount).toBeGreaterThan(0);
  });
});
