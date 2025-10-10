import { test, expect, chromium } from '@playwright/test';
import path from 'path';

test.describe('Obsidian Plugin Tests', () => {
  test('should render "# Hello LiterateMath" as h1 element', async () => {
    console.log('Connecting to Obsidian via CDP...');

    const browser = await chromium.connectOverCDP('http://localhost:9222', {
      timeout: 10000
    });

    const context = browser.contexts()[0];
    const page = context.pages()[0];

    console.log('Waiting for page to load...');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for workspace (vault should auto-open via pre-configured obsidian.json)
    console.log('Waiting for vault to open...');
    await page.waitForSelector('.workspace', { timeout: 20000 });

    // Take screenshot of opened vault
    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'vault-opened.png')
    });

    // Handle trust dialog if it appears
    console.log('Checking for trust dialog...');
    const trustButton = page.locator('button', { hasText: 'Trust author' });
    const trustVisible = await trustButton.isVisible().catch(() => false);

    if (trustVisible) {
      console.log('Clicking trust button...');
      await trustButton.click();
      await page.waitForTimeout(2000);

      // Close settings if they opened
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Open test-note.md using keyboard shortcut
    console.log('Opening test-note.md...');
    await page.keyboard.press('Control+o');  // Open quick switcher
    await page.waitForTimeout(500);
    await page.keyboard.type('test-note');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'note-opened.png')
    });

    // Check if we're in edit mode or reading mode
    const editorVisible = await page.locator('.cm-content').isVisible().catch(() => false);
    const readingVisible = await page.locator('.markdown-preview-view').isVisible().catch(() => false);

    console.log(`Edit mode: ${editorVisible}, Reading mode: ${readingVisible}`);

    // If in edit mode, switch to reading mode
    if (editorVisible && !readingVisible) {
      console.log('Switching to reading mode...');
      await page.keyboard.press('Control+e');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'reading-mode.png')
    });

    // Verify the h1 element exists with correct text
    console.log('Verifying h1 element...');
    const h1 = page.locator('h1', { hasText: 'Hello LiterateMath' });
    await expect(h1).toBeVisible({ timeout: 5000 });

    const h1Text = await h1.textContent();
    console.log(`Found h1 with text: "${h1Text}"`);
    expect(h1Text).toContain('Hello LiterateMath');

    console.log('Test passed! Header rendered correctly as <h1>');

    await browser.close();
  });

  test('should render literate-math expressions', async () => {
    console.log('Connecting to Obsidian via CDP...');

    const browser = await chromium.connectOverCDP('http://localhost:9222', {
      timeout: 10000
    });

    const context = browser.contexts()[0];
    const page = context.pages()[0];

    console.log('Waiting for page to load...');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    // Wait for workspace
    console.log('Waiting for vault to open...');
    await page.waitForSelector('.workspace', { timeout: 20000 });

    // Handle trust dialog if it appears (should not appear on second test, but just in case)
    const trustButton = page.locator('button', { hasText: 'Trust author' });
    const trustVisible = await trustButton.isVisible().catch(() => false);
    if (trustVisible) {
      await trustButton.click();
      await page.waitForTimeout(2000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    // Create a new note with literate-math syntax
    console.log('Creating new note with math expression...');
    await page.keyboard.press('Control+n');  // New note
    await page.waitForTimeout(1000);

    // Type math expression
    console.log('Typing math expression: `!x=3m`');
    await page.keyboard.type('Testing literate-math: `!x=3m`');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'math-edit-mode.png')
    });

    // Switch to reading mode
    console.log('Switching to reading mode...');
    await page.keyboard.press('Control+e');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'math-reading-mode.png')
    });

    // Verify the math was rendered (look for lmath tag or math rendering)
    console.log('Verifying math rendering...');

    // The plugin should convert `!x=3m` into rendered math
    // Looking for either <lmath> tags or MathJax/KaTeX rendered content
    const mathContent = page.locator('lmath, .math, mjx-container, .katex');
    const hasMath = await mathContent.count() > 0;

    if (!hasMath) {
      console.log('No math rendering found. Checking page content...');
      const bodyText = await page.locator('body').textContent();
      console.log('Page content:', bodyText);

      // Take a screenshot for debugging
      await page.screenshot({
        path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'math-not-found.png')
      });
    }

    expect(hasMath).toBe(true);
    console.log('Math rendered successfully!');

    await browser.close();
  });
});
