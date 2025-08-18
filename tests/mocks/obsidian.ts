// Minimal runtime mock of the Obsidian API used by main.ts.
// Keep it tiny; add surface only as you need it.

export interface MarkdownPostProcessorContext {
  sourcePath: string;
  frontmatter: Record<string, unknown> | null;
  addChild(component: unknown): void;
}

export class Plugin {
  // In real Obsidian this is set; we don't need it in tests.
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get app(): unknown {
    return {};
  }

  // No-ops for tests
  registerMarkdownPostProcessor(
    _cb: (element: HTMLElement, context: MarkdownPostProcessorContext) => void
  ): void {
    /* noop */
  }

  registerEditorExtension(_ext: unknown): void {
    /* noop */
  }

  // Lifecycle hooks present in real API; not used in unit tests.
  // They exist so that subclassing doesn't explode at runtime.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onload(): Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onunload(): void {}
}
