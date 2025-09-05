import {
  App,
  MarkdownPostProcessorContext,
  Plugin,
  PluginSettingTab,
  Setting
} from "obsidian";
import {enterCatcher, lmViewPlugin} from "./editExtension"

import {
  Extension
} from "@codemirror/state";
import { LMathBlock } from "./core";
import * as math from "mathjs"
import { DEFAULT_SETTINGS, LMSettings } from "./settings";

/** Bundle editor extensions together for easy registration. */
function createEditorExtensions(): Extension[] {
  return [enterCatcher, lmViewPlugin];
}

export default class LiterateMathPlugin extends Plugin {
  private cmExtensions: Extension[] = [];
  public settings: LMSettings = undefined as unknown as LMSettings

  async onload(): Promise<void> {
    await this.loadSettings()

    math.createUnit("EUR")

    // Live Preview editor behaviors + widgets
    this.cmExtensions = createEditorExtensions();
    this.registerEditorExtension(this.cmExtensions);
    this.registerMarkdownPostProcessor(this.markdownPostProcessor.bind(this), 11)
    this.addSettingTab(new LMSettingsTab(this.app, this));
  }

  async loadSettings() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...await this.loadData()
    }
    this.applySettings()
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.applySettings()
  }

  applySettings() {
    if (this.settings.mouseOverShowsAssign) {
      document.body.classList.add("lmath-show-assign-on-hover");
    } else {
      document.body.classList.remove("lmath-show-assign-on-hover");
    }
  }

  onunload(): void {}

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
      console.debug("Already ran")
    }
    doc.setAttribute("x--data-lmath-ran", "1")
    let scope = {}
    const allCodeNodes = doc.querySelectorAll("code")
    for (const node of allCodeNodes) {
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

// Settings tab class
export class LMSettingsTab extends PluginSettingTab {
  plugin: LiterateMathPlugin;

  constructor(app: App, plugin: LiterateMathPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Hover shows assignment")
      .setDesc("When switched on, hovering over elements that do assignments shows the variable name that is being assigned to.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.mouseOverShowsAssign)
        .onChange(async (value) => {
          this.plugin.settings.mouseOverShowsAssign = value;
          await this.plugin.saveSettings();
        }));
  }
}

