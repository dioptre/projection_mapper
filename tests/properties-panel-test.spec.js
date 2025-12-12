import { test, expect } from '@playwright/test';

test.describe('Properties Panel', () => {
  test('should display properties panel correctly', async ({ page }) => {
    await page.goto('http://localhost:5176');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Add a sketch
    await page.click('#tool-add-sketch');
    await page.waitForTimeout(2000);

    // Switch to select mode
    await page.click('#tool-select');
    await page.waitForTimeout(500);

    // Click on the sketch to show properties
    const sketch = await page.locator('[id^="sketch-"]').first();
    const box = await sketch.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/properties-panel.png' });

    // Check that properties panel is visible
    const propertiesPanel = page.locator('#properties-panel');
    await expect(propertiesPanel).not.toHaveClass(/hidden/);

    // Check that all sections are present
    const sections = page.locator('.prop-section');
    const count = await sections.count();
    console.log('Number of property sections:', count);
    expect(count).toBeGreaterThan(0);
  });
});
