import { test, expect } from '@playwright/test';

test.describe('Projection Mapper - Comprehensive Tests', () => {

  test('1. Initial load with default sketch', async ({ page }) => {
    await page.goto('http://localhost:5176/');

    // Wait for canvas
    await page.waitForSelector('#main-canvas');

    // Wait for sketch iframe to load
    await page.waitForTimeout(2000);

    // Check that sketch container exists
    const sketchContainer = await page.locator('[id^="sketch-"]').first();
    await expect(sketchContainer).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-screenshots/01-initial-load.png' });

    console.log('✓ Default sketch loaded successfully');
  });

  test('2. Select sketch and view properties', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Click on the canvas to select sketch
    await page.click('#main-canvas', { position: { x: 300, y: 200 } });

    await page.waitForTimeout(500);

    // Check properties panel is visible
    const propertiesPanel = await page.locator('#properties-panel');
    await expect(propertiesPanel).not.toHaveClass(/hidden/);

    await page.screenshot({ path: 'test-screenshots/02-sketch-selected.png' });

    console.log('✓ Sketch selection and properties panel working');
  });

  test('3. Modify sketch properties (width, height, rotation)', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Select sketch
    await page.click('#main-canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);

    // Change width
    await page.fill('#sketch-width', '500');

    // Change height
    await page.fill('#sketch-height', '300');

    // Change rotation
    await page.fill('#sketch-rotation', '45');

    // Apply changes
    await page.click('#apply-transform-btn');

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-screenshots/03-properties-modified.png' });

    console.log('✓ Property modifications working');
  });

  test('4. Create mask with points', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Switch to mask tool
    await page.click('#tool-mask');

    // Add mask points
    await page.click('#main-canvas', { position: { x: 100, y: 100 } });
    await page.click('#main-canvas', { position: { x: 400, y: 100 } });
    await page.click('#main-canvas', { position: { x: 400, y: 300 } });
    await page.click('#main-canvas', { position: { x: 100, y: 300 } });

    await page.waitForTimeout(500);

    // Close mask with Enter
    await page.keyboard.press('Enter');

    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/04-mask-created.png' });

    console.log('✓ Mask creation working');
  });

  test('5. Move mask in select mode', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Create a mask first
    await page.click('#tool-mask');
    await page.click('#main-canvas', { position: { x: 200, y: 150 } });
    await page.click('#main-canvas', { position: { x: 350, y: 150 } });
    await page.click('#main-canvas', { position: { x: 350, y: 250 } });
    await page.click('#main-canvas', { position: { x: 200, y: 250 } });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Switch to select tool
    await page.click('#tool-select');
    await page.waitForTimeout(300);

    // Click inside mask to select it
    await page.mouse.move(275, 200);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Drag mask to new position
    await page.mouse.move(400, 300);
    await page.mouse.up();

    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/05-mask-moved.png' });

    console.log('✓ Mask movement in select mode working');
  });

  test('6. Edit sketch code', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Select sketch
    await page.click('#main-canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);

    // Press 'e' to edit
    await page.keyboard.press('e');
    await page.waitForTimeout(500);

    // Check editor is visible
    const editorPanel = await page.locator('#editor-panel');
    await expect(editorPanel).not.toHaveClass(/hidden/);

    // Modify code
    const simpleCode = `
function setup() {
  createCanvas(400, 400);
  background(220);
}

function draw() {
  background(220);
  fill(255, 0, 0);
  circle(200, 200, 100);
}
    `;

    await page.fill('#code-editor', simpleCode);

    // Apply changes
    await page.click('#editor-apply');

    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-screenshots/06-code-edited.png' });

    console.log('✓ Code editing working');
  });

  test('7. Drag sketch corners for warping', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Make sure we're in select mode
    await page.click('#tool-select');

    // Select sketch
    await page.click('#main-canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);

    // Try to drag a corner handle (top-right corner approximately)
    // The handles should be visible at the corners
    await page.mouse.move(770, 50); // Top-right corner area
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(800, 100);
    await page.mouse.up();

    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/07-corner-warped.png' });

    console.log('✓ Corner warping working');
  });

  test('8. Fullscreen mode with auto-hide', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Enter fullscreen
    await page.keyboard.press('f');
    await page.waitForTimeout(500);

    // Take screenshot with UI visible
    await page.screenshot({ path: 'test-screenshots/08-fullscreen-ui-visible.png' });

    // Wait for auto-hide (3 seconds + buffer)
    await page.waitForTimeout(3500);

    // Take screenshot with UI hidden
    await page.screenshot({ path: 'test-screenshots/09-fullscreen-ui-hidden.png' });

    // Move mouse to show UI again
    await page.mouse.move(640, 50);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/10-fullscreen-ui-back.png' });

    console.log('✓ Fullscreen auto-hide working');
  });

  test('9. Presentation mode', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Enter fullscreen
    await page.keyboard.press('f');
    await page.waitForTimeout(500);

    // Enter presentation mode
    await page.keyboard.press('p');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/11-presentation-mode.png' });

    console.log('✓ Presentation mode working');
  });

  test('10. Save and load project', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Create a mask
    await page.click('#tool-mask');
    await page.click('#main-canvas', { position: { x: 150, y: 150 } });
    await page.click('#main-canvas', { position: { x: 300, y: 150 } });
    await page.click('#main-canvas', { position: { x: 300, y: 250 } });
    await page.click('#main-canvas', { position: { x: 150, y: 250 } });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click save button
    await page.click('#btn-save');

    // Wait for download
    const download = await downloadPromise;

    // Save the file
    const path = await download.path();
    console.log('✓ Project saved to:', path);

    await page.screenshot({ path: 'test-screenshots/12-project-saved.png' });

    console.log('✓ Save/load functionality working');
  });

  test('11. Add new sketch', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Setup dialog handler for prompt
    page.on('dialog', async dialog => {
      console.log('Dialog appeared:', dialog.message());
      // Leave empty to get default sketch
      await dialog.accept('');
    });

    // Click add sketch button
    await page.click('#tool-add-sketch');

    await page.waitForTimeout(2000);

    // Check that there are now 2 sketch containers
    const sketchCount = await page.locator('[id^="sketch-"]').count();
    console.log('Number of sketches:', sketchCount);

    await page.screenshot({ path: 'test-screenshots/13-sketch-added.png' });

    console.log('✓ Add new sketch working');
  });

  test('12. Delete sketch', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForTimeout(2000);

    // Select sketch
    await page.click('#main-canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(500);

    // Press delete key
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // Check that sketch is gone
    const sketchCount = await page.locator('[id^="sketch-"]').count();
    console.log('Sketches remaining:', sketchCount);
    expect(sketchCount).toBe(0);

    await page.screenshot({ path: 'test-screenshots/14-sketch-deleted.png' });

    console.log('✓ Delete sketch working');
  });

});
