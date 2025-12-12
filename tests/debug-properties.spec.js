import { test } from '@playwright/test';

test('debug properties panel HTML', async ({ page }) => {
  await page.goto('http://localhost:5176');
  await page.waitForTimeout(1000);

  // Add sketch
  await page.click('#tool-add-sketch');
  await page.waitForTimeout(2000);

  // Select sketch
  await page.click('#tool-select');
  await page.waitForTimeout(500);

  const sketch = await page.locator('[id^="sketch-"]').first();
  const box = await sketch.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);

  // Get the HTML of the Canvas Size section
  const html = await page.evaluate(() => {
    const canvasSizeSection = Array.from(document.querySelectorAll('.prop-section'))
      .find(section => section.textContent.includes('CANVAS SIZE'));
    return canvasSizeSection ? canvasSizeSection.innerHTML : 'NOT FOUND';
  });

  console.log('Canvas Size Section HTML:');
  console.log(html);

  await page.screenshot({ path: 'test-screenshots/debug-properties.png' });
});
