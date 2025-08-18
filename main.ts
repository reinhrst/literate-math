import {
  MarkdownPostProcessorContext,
  Plugin
} from "obsidian";

import {
  EditorState,
  RangeSetBuilder,
  Extension
} from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from "@codemirror/view";

/** Match non-nested {{ ... }} across lines (first closing '}}' wins). */
const LMATH_REGEX = /{{([\s\S]*?)}}/g;

type LmathRange = {
  from: number;
  to: number;
  content: string;
};

function findLmathRanges(text: string): LmathRange[] {
  const ranges: LmathRange[] = [];
  let match: RegExpExecArray | null;
  LMATH_REGEX.lastIndex = 0;
  while ((match = LMATH_REGEX.exec(text)) !== null) {
    const full = match[0] ?? "";
    const inner = match[1] ?? "";
    const start = match.index;
    ranges.push({
      from: start,
      to: start + full.length,
      content: inner
    });
  }
  return ranges;
}

function isPosInsideAny(pos: number, ranges: readonly LmathRange[]): boolean {
  return ranges.some((r) => pos > r.from && pos < r.to);
}

/** Inline DOM widget for Live Preview replacement. */
class LmathWidget extends WidgetType {
  constructor(private readonly content: string) {
    super();
  }
  override eq(other: WidgetType): boolean {
    return other instanceof LmathWidget && other.content === this.content;
  }
  override toDOM(): HTMLElement {
    const el = document.createElement("lmath");
    // Prefix as requested
    el.textContent = `lmath: ${this.content}`;
    el.classList.add("cm-lmath-widget");
    return el;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

/** Build decorations: hide raw {{...}} and show the widget unless selection is inside. */
function computeDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const text = state.doc.toString();
  const ranges = findLmathRanges(text);

  const builder = new RangeSetBuilder<Decoration>();
  const selPos = state.selection.main.head;

  for (const r of ranges) {
    if (selPos > r.from && selPos < r.to) {
      // caret inside -> show raw text
      continue;
    }
    // Hide the raw {{...}}
    builder.add(r.from, r.to, Decoration.replace({}));
    // Insert a widget at start
    builder.add(
      r.from,
      r.from,
      Decoration.widget({
        widget: new LmathWidget(r.content),
        side: 1
      })
    );
  }
  return builder.finish();
}

/** True when caret is inside any {{ ... }} pair (whole-document search). */
function isInsideLmath(state: EditorState, pos: number): boolean {
  const text = state.doc.toString();
  const ranges = findLmathRanges(text);
  return isPosInsideAny(pos, ranges);
}

/** Input handler: pair {{ }} with cursor in middle, overtype }} and suppress magic * / _ inside lmath. */
const lmathInputHandler = EditorView.inputHandler.of(
  (view, from, to, insert): boolean => {
    const state = view.state;

    // If selecting a range, let default behavior handle it
    if (!state.selection.main.empty) return false;

    // 1) When typing the second '{', expand to '{{}}' and place cursor in the middle.
    if (insert === "{") {
      if (from > 0 && state.doc.sliceString(from - 1, from) === "{") {
        view.dispatch({
          changes: { from: from - 1, to, insert: "{{}}" },
          selection: { anchor: from + 1 } // after '{{'
        });
        return true;
      }
      return false;
    }

    // 2) Overtype behavior for '}}' like Obsidian's [[...]]
    if (insert === "}") {
      const ahead = state.doc.sliceString(to, to + 2);
      if (ahead.startsWith("}}")) {
        view.dispatch({ selection: { anchor: to + 1 } });
        return true;
      }
      return false;
    }

    // 3) Suppress Obsidian typing magic for '*' and '_' inside {{...}}
    if (insert === "*" || insert === "_") {
      if (isInsideLmath(state, from)) {
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + 1 }
        });
        return true;
      }
    }

    return false;
  }
);

/** ViewPlugin that renders inline widgets when cursor is outside {{...}}. */
const lmathViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(private readonly view: EditorView) {
      this.decorations = computeDecorations(view);
    }

    update(u: ViewUpdate): void {
      const selChanged = u.selectionSet;
      const docChanged = u.docChanged;
      if (selChanged || docChanged || u.viewportChanged) {
        this.decorations = computeDecorations(this.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

/** Bundle editor extensions together for easy registration. */
function createEditorExtensions(): Extension[] {
  return [lmathInputHandler, lmathViewPlugin];
}

/** Reading-mode postprocessor: replace text nodes containing {{...}} with <lmath>lmath: ...</lmath>. */
function registerReadingModeProcessor(plugin: Plugin): void {
  plugin.registerMarkdownPostProcessor(
    (element: HTMLElement, _context: MarkdownPostProcessorContext) => {
      // Walk all text nodes; replace {{...}} occurrences inline.
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      const texts: Text[] = [];
      let node: Node | null;
      // Collect first to avoid live mutation issues.
      // eslint-disable-next-line no-cond-assign
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          texts.push(node as Text);
        }
      }

      for (const textNode of texts) {
        const raw = textNode.nodeValue ?? "";
        if (!raw.includes("{{")) continue;

        let lastIndex = 0;
        const frag = document.createDocumentFragment();
        LMATH_REGEX.lastIndex = 0;

        let match: RegExpExecArray | null;
        // eslint-disable-next-line no-cond-assign
        while ((match = LMATH_REGEX.exec(raw)) !== null) {
          const start = match.index;
          const end = start + (match[0]?.length ?? 0);
          const inner = match[1] ?? "";

          if (start > lastIndex) {
            frag.append(raw.slice(lastIndex, start));
          }
          const el = document.createElement("lmath");
          el.textContent = `lmath: ${inner}`;
          frag.append(el);

          lastIndex = end;
        }

        if (lastIndex === 0) continue; // no matches

        if (lastIndex < raw.length) {
          frag.append(raw.slice(lastIndex));
        }

        textNode.replaceWith(frag);
      }
    }
  );
}

export default class LiterateMathPlugin extends Plugin {
  private cmExtensions: Extension[] = [];

  async onload(): Promise<void> {
    // Reading mode (post) processor (runs after Markdown→HTML, which is the supported hook).
    registerReadingModeProcessor(this);

    // Live Preview editor behaviors + widgets
    this.cmExtensions = createEditorExtensions();
    this.registerEditorExtension(this.cmExtensions);
  }

  onunload(): void {
    // Extensions are automatically unregistered by Obsidian when the plugin unloads.
  }
}

// Export a couple of utilities for testing
export const __test__ = {
  findLmathRanges,
  isPosInsideAny
};
