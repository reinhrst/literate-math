import {
  Plugin
} from "obsidian";
import {lmViewPlugin} from "./editExtension"

import {
  EditorState,
  RangeSetBuilder,
  Extension
} from "@codemirror/state";


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
  }

  onunload(): void {
    // Extensions are automatically unregistered by Obsidian when the plugin unloads.
  }
}
