import { RangeSetBuilder} from "@codemirror/state"
import * as math from "mathjs"
import { OutputFormat, parseBody } from "./parse"
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { LMathBlock } from "./core"

type ValidId = string

class LMElement {
  static counter: number = 0

  private constructor(
    readonly id: number,
    readonly from: number,
    readonly to: number,
    readonly formula: {
      readonly raw: string
      readonly formula: string
      readonly format: OutputFormat
    },
    readonly result: {
      readonly type: "ok"
      readonly value: string
      afterCalculationScope: math.MathScope
      // readonly assigns: ValidId | null,  needed for reference tracking
      // readonly references: ReadonlyArray<ValidId>, needed for refrenece tracking
    } | {
      readonly type: "error"
      readonly error: string
    }
  )
  {}

  static new (
    from: number,
    to: number,
    body: string,
    previousScope: math.MathScope | undefined
  ) {
    // At this point the reference tracking could be done, later
    const {formula, format} = parseBody(body)
    const scope = math.clone(previousScope ?? Object.create(null))
    try {
      const result = math.evaluate(formula, scope)
      return new LMElement(
        LMElement.counter++,
        from, to,
        {raw: body, formula, format},
        {type: "ok", value: result, afterCalculationScope: scope})
    } catch (e) {
      return new LMElement(
        LMElement.counter++,
        from, to,
        {raw: body, formula, format},
        {type: "error", error: (e as Error).message})
    }
  }

  withNewPositions(from: number, to: number): LMElement {
    return new LMElement(this.id, from, to, this.formula, this.result)
  }
}

class LMWidget extends WidgetType {
  constructor(readonly id: number, readonly value: string) { super(); }

  eq(other: WidgetType) {
    return other instanceof LMWidget
      && this.id === other.id
      && this.value === other.value
  }

  toDOM() {
    const el = document.createElement("lmath")
    el.textContent = this.value
    return el
  }

  ignoreEvent(_event: Event): boolean {
    return false
  }
}

let mouseButtonIsDown = false

function shouldDecorate(view: EditorView, from: number, to: number): boolean {
  for (const r of view.state.selection.ranges) {
    const tail = r.from === r.head ? r.to : r.from
    if (mouseButtonIsDown) {
      if (tail <= to && tail >= from) return false;
    } else {
      if (r.from <= to && r.to >= from) return false;
    }
  }
  return true;
}

class LMViewPlugin implements PluginValue {
  decos: DecorationSet;

  constructor(readonly view: EditorView) {
    this.decos = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged  || update.selectionSet) {
      this.decos = this.buildDecorations(update.view);
    }
  }

  destroy() {
    // nothing to clean up for now
  }

  private buildDecorations(view: EditorView): DecorationSet {
    let scope = {}
    const builder = new RangeSetBuilder<Decoration>();
    // TODO use TreeWalker to find elements
    // Then use StateField to update if any changes
    // Finally use buildDecorations to only build those decorations in view
    //
    const tree = syntaxTree(view.state)
    let openingTagSize: number | undefined = undefined

    tree.iterate({
      enter: (node) => {
        if (node.type.name !== "inline-code") {
          if (node.type.name === "formatting_formatting-code_inline-code") {
            openingTagSize = node.to - node.from
          } else {
            openingTagSize = undefined
          }
          return
        }
        let tagSize = openingTagSize
        if (tagSize === undefined) {
          console.warn("openingTagSize is undefined")
          tagSize = 1
        }
        const innerFrom = node.from
        const innerTo = node.to
        const outerFrom = innerFrom - tagSize
        const outerTo = innerTo + tagSize
        const fullBody = view.state.sliceDoc(innerFrom, innerTo);
        if (fullBody[0] !== "!") {
          return
        }
        const body = fullBody.slice(1)
        // TODO use caching
        const result = LMathBlock.init(body, scope)
        const lMathBlock = result.instance
        scope = result.newScope

        if (!shouldDecorate(view, outerFrom, outerTo)) {
          return
        }

        // Replace the whole `` `!body` `` span with our widget
        builder.add(outerFrom, outerTo, Decoration.replace({
          widget: new LMWidget(1, lMathBlock.output.type === "error" ? "Error: " + lMathBlock.output.error : lMathBlock.output.displayResult ?? ""),
          inclusive: false
        }))
      }
    })

    return builder.finish();
  }
}

export const lmViewPlugin = ViewPlugin.fromClass(LMViewPlugin, {
  decorations: v => v.decos,
  eventHandlers: {
    mousedown: function(e: MouseEvent, view: EditorView) {
      if (e.button !== 0) return; // Left click only
      mouseButtonIsDown = true;
      // Request an update to re-evaluate decorations
      view.requestMeasure();
    },
    mouseup: function(e: MouseEvent, view: EditorView) {
      if (e.button !== 0) return; // Left click only
      mouseButtonIsDown = false;
      // Request an update to re-evaluate decorations
      view.requestMeasure();
    }
  }
});
