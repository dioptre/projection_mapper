import { test } from '@playwright/test';

test('test with simple animated sketch', async ({ page }) => {
  // Listen to console
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));

  await page.goto('http://localhost:5175/');
  await page.waitForSelector('#main-canvas');

  // Add a simple animated sketch via the + button
  await page.click('#tool-add-sketch');

  // Wait for prompt and enter simple code
  await page.waitForTimeout(500);

  // Type simple sketch code in the prompt
  page.on('dialog', async dialog => {
    console.log('Dialog:', dialog.message());
    await dialog.accept(`
let x = 0;

function setup() {
  createCanvas(400, 400);
  background(220);
}

function draw() {
  background(220);
  fill(255, 0, 0);
  circle(x, 200, 50);
  x = (x + 2) % width;
}
    `.trim());
  });

  await page.click('#tool-add-sketch');

  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'simple-sketch.png', fullPage: true });
});
