import { Page, chromium, Browser, BrowserContext } from '@playwright/test';

export interface ObsidianConnection {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Connect to Obsidian via CDP
 */
export async function connectToObsidian(): Promise<ObsidianConnection> {
  const browser = await chromium.connectOverCDP('http://localhost:9222', {
    timeout: 10000
  });

  const context = browser.contexts()[0];
  if (!context) {
    throw new Error('No browser context found');
  }

  const page = context.pages()[0];
  if (!page) {
    throw new Error('No page found');
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
  await page.waitForSelector('.workspace', { timeout: 20000 });

  return { browser, context, page };
}

/**
 * Handle trust dialog if it appears (only on first connection)
 */
export async function handleTrustDialog(page: Page): Promise<void> {
  const trustButton = page.locator('button', { hasText: 'Trust author' });
  const trustVisible = await trustButton.isVisible().catch(() => false);

  if (trustVisible) {
    await trustButton.click();
    // Wait for settings to open
    await page.locator('.modal.mod-settings').waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    // Close with Escape
    await page.keyboard.press('Escape');
    // Wait for settings to close
    await page.locator('.modal.mod-settings').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

/**
 * Open an existing note by name using quick switcher
 */
export async function openNote(page: Page, filename: string): Promise<void> {
  await page.keyboard.press('Control+o');
  // Wait for quick switcher to open
  await page.locator('.prompt').waitFor({ state: 'visible', timeout: 5000 });

  await page.keyboard.type(filename, { delay: 30 });
  await page.keyboard.press('Enter');

  // Wait for the note to be visible in the active editor
  await page.locator('.workspace-leaf.mod-active .cm-content').waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Create a fresh new note
 * Returns the editor element for the new note
 */
export async function createFreshNote(page: Page) {
  // Create new note
  await page.keyboard.press('Control+n');

  // Wait for the active editor to appear
  const editor = page.locator('.workspace-leaf.mod-active .cm-content').first();
  await editor.waitFor({ state: 'visible', timeout: 5000 });

  // Wait for editor to be actually editable
  await editor.evaluate((el) => el.isContentEditable);

  // Click on the editor to ensure it has focus
  await editor.click();

  // Wait for focused class to appear after click
  await page.locator('.workspace-leaf.mod-active .cm-editor.cm-focused').waitFor({
    state: 'visible',
    timeout: 5000
  });

  return editor;
}

/**
 * Switch the current note to reading mode
 * Waits for reading view to be visible
 */
export async function switchToReadingMode(page: Page) {
  // Check if already in reading mode
  const readingView = page.locator('.workspace-leaf.mod-active .markdown-preview-view');
  const alreadyInReadingMode = await readingView.isVisible().catch(() => false);

  if (!alreadyInReadingMode) {
    await page.keyboard.press('Control+e');

    // Wait for reading view to appear
    await readingView.waitFor({ state: 'visible', timeout: 5000 });
  }

  return readingView;
}

/**
 * Switch the current note to editing mode
 */
export async function switchToEditingMode(page: Page) {
  // Check if already in edit mode
  const editor = page.locator('.workspace-leaf.mod-active .cm-content');
  const alreadyInEditMode = await editor.isVisible().catch(() => false);

  if (!alreadyInEditMode) {
    await page.keyboard.press('Control+e');

    // Wait for editor to appear
    await editor.waitFor({ state: 'visible', timeout: 5000 });
  }

  return editor;
}

/**
 * Get the active editor element
 */
export async function getActiveEditor(page: Page) {
  const editor = page.locator('.workspace-leaf.mod-active .cm-content').first();
  await editor.waitFor({ state: 'visible', timeout: 5000 });
  return editor;
}

/**
 * Get the active reading view element
 */
export async function getActiveReadingView(page: Page) {
  const readingView = page.locator('.workspace-leaf.mod-active .markdown-preview-view').first();
  await readingView.waitFor({ state: 'visible', timeout: 5000 });
  return readingView;
}

/**
 * Type text into the active editor and wait for it to appear
 */
export async function typeInEditor(page: Page, text: string, options?: { delay?: number }) {
  await page.keyboard.type(text, { delay: options?.delay ?? 30 });

  // Wait for the text to actually appear in the editor
  const editor = page.locator('.workspace-leaf.mod-active .cm-content').first();
  await editor.locator(`text=${text}`).waitFor({ state: 'attached', timeout: 5000 }).catch(() => {
    // Text might be split across elements, that's ok
  });
}
