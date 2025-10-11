import { test, expect } from '@playwright/test';
import path from 'path';
import {
  connectToObsidian,
  handleTrustDialog,
  openNote,
  createFreshNote,
  switchToReadingMode,
  getActiveReadingView,
  typeInEditor,
  ObsidianConnection
} from './helpers';

let obsidian: ObsidianConnection;

test.describe('Basic Rendering Tests', () => {
  test.beforeAll(async () => {
    console.log('Connecting to Obsidian via CDP...');
    obsidian = await connectToObsidian();

    // Handle trust dialog on first connection
    await handleTrustDialog(obsidian.page);

    console.log('Obsidian ready for testing');
  });

  test.afterAll(async () => {
    await obsidian.browser.close();
  });

  test('should render markdown header as h1 element', async () => {
    const { page } = obsidian;

    console.log('Opening test-note.md...');
    await openNote(page, 'test-note');

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'header-test-edit-mode.png')
    });

    console.log('Switching to reading mode...');
    await switchToReadingMode(page);

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'header-test-reading-mode.png')
    });

    // Verify the header is rendered as <h1>
    console.log('Verifying h1 element...');
    const h1 = page.locator('h1', { hasText: 'Hello LiterateMath' });
    await expect(h1).toBeVisible({ timeout: 5000 });

    const h1Text = await h1.textContent();
    console.log(`Found h1 with text: "${h1Text}"`);
    expect(h1Text).toContain('Hello LiterateMath');

    console.log('✓ Header rendered correctly as <h1>');
  });

  test('should render simple math expression', async () => {
    const { page } = obsidian;

    console.log('Creating new note with math expression...');
    const editor = await createFreshNote(page);

    console.log('Typing: `!x=3m`');
    await typeInEditor(page, 'Testing literate-math: `!x=3m`');

    // Verify content was typed
    const editorContent = await editor.textContent();
    console.log('Editor content:', editorContent);
    expect(editorContent).toContain('`!x=3m`');

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'math-edit-mode.png')
    });

    console.log('Switching to reading mode...');
    await switchToReadingMode(page);

    await page.screenshot({
      path: path.join(process.env.TEST_VAULT_PATH || './test-results', 'math-reading-mode.png')
    });

    console.log('Verifying math rendering...');
    const readingView = await getActiveReadingView(page);
    const readingContent = await readingView.textContent();
    console.log('Reading view content:', readingContent);

    // Check for lmath elements
    const lmathElements = await page.locator('.workspace-leaf.mod-active lmath').count();
    console.log(`Found ${lmathElements} lmath elements`);

    // Verify the content was transformed (should show "3 m" instead of "!x=3m")
    const hasTransformedContent = readingContent.includes('3 m');
    console.log(`Content transformed: ${hasTransformedContent}`);

    if (lmathElements === 0 && !hasTransformedContent) {
      console.log('ERROR: No lmath elements or transformed content found');
      const html = await readingView.innerHTML();
      console.log('Reading view HTML:', html.substring(0, 500));
    }

    // Plugin is working if either lmath tags exist OR content was transformed
    expect(lmathElements > 0 || hasTransformedContent).toBe(true);

    console.log('✓ Math expression rendered successfully!');
  });
});
