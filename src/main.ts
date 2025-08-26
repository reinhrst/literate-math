import {
    MarkdownPostProcessorContext,
  Plugin
} from "obsidian";
import {lmViewPlugin} from "./editExtension"

import {
  Extension
} from "@codemirror/state";
import { LMathBlock } from "./core";
import type { MathScope } from "mathjs"

type ContextWithScope = MarkdownPostProcessorContext & {
  mathScope?: MathScope
}

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
    this.registerMarkdownPostProcessor(this.markdownPostProcessor.bind(this))
  }

  onunload(): void {
    // Extensions are automatically unregistered by Obsidian when the plugin unloads.
  }
  async markdownPostProcessor(el: HTMLElement, ctx: ContextWithScope) {
    const codeNodes = el.querySelectorAll("code");
    if (ctx.mathScope === undefined) {
      ctx.mathScope = {}
    }
    for (const node of codeNodes) {
      if (node.innerText.at(0) !== "!") {
        return
      }
      const body = node.innerText.slice(1)
      const result = LMathBlock.init(body, ctx.mathScope)
      const lMathBlock = result.instance
      ctx.mathScope = result.newScope

      const el = document.createElement("lmath")
      el.innerText=lMathBlock.output.type === "ok"
      ? lMathBlock.output.displayResult ?? ""
      : `\u26A0 ${lMathBlock.output.error} \u26A0`
      node.replaceWith(el);
    }
  }
}
