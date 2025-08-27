import {
    MarkdownPostProcessorContext,
  Plugin
} from "obsidian";
import {lmViewPlugin} from "./editExtension"

import {
  Extension
} from "@codemirror/state";
import { LMathBlock } from "./core";

/** Bundle editor extensions together for easy registration. */
function createEditorExtensions(): Extension[] {
  return [lmViewPlugin];
}

export default class LiterateMathPlugin extends Plugin {
  private cmExtensions: Extension[] = [];

  async onload(): Promise<void> {

    // Live Preview editor behaviors + widgets
    this.cmExtensions = createEditorExtensions();
    this.registerEditorExtension(this.cmExtensions);
    this.registerMarkdownPostProcessor(this.markdownPostProcessor.bind(this), 11)
  }

  onunload(): void {
    // Extensions are automatically unregistered by Obsidian when the plugin unloads.
  }
  async markdownPostProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const codeNodes = el.querySelectorAll("code");
    if (codeNodes.length === 0) {
      return
    }
    let guard = 1000
    while (guard-- > 0 && !el.closest('.markdown-preview-view')) {
      // sleep until document as a whole is ready
      await new Promise(resolve => window.setTimeout(resolve, 1))
    }
    const doc = el.closest('.markdown-preview-view')
    if (!doc) {
      console.warn("Did not find document")
      return
    }
    if (doc.hasAttribute("x--data-lmath-ran")) {
      console.log("Already ran")
    }
    doc.setAttribute("x--data-lmath-ran", "1")
    let scope = {}
    for (const node of doc.querySelectorAll("code")) {
      if (node.innerText.at(0) !== "!") {
        continue
      }
      const body = node.innerText.slice(1)
      const result = LMathBlock.init(body, scope)
      const lMathBlock = result.instance
      scope = result.newScope

      node.replaceWith(lMathBlock.toDomElement(document))
    }
  }
}
