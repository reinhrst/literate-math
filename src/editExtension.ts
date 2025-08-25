import { RangeSetBuilder} from "@codemirror/state"
import * as math from "mathjs"
import { OutputFormat, parseBody } from "./parse"
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"

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

function cursorInside(view: EditorView, from: number, to: number): boolean {
  // “Inside” means strictly between from and to (not at edges).
  for (const r of view.state.selection.ranges) {
    const pos = r.head; // you can also consider anchor if you like
    if (pos >= from && pos <= to) return true;
  }
  return false;
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
    const scope = {}
    const builder = new RangeSetBuilder<Decoration>();
    // TODO use TreeWalker to find elements
    // Then use StateField to update if any changes
    // Finally use buildDecorations to only build those decorations in view
    //
    const tree = syntaxTree(view.state)

    tree.iterate({
      enter(node) {
        if (node.type.name !== "inline-code") {
          return
        }
        const fullBody = view.state.sliceDoc(node.from, node.to);
        if (fullBody[0] !== "!") {
          return
        }
        const body = fullBody.slice(1)
        // TODO use caching
        const {formula} = parseBody(body)
        console.log({formula})
        let result: string
        try {
          result = math.evaluate(formula, scope)
        } catch (e) {
          result = `Error: ${e}`
        }
        console.log({result})

        if (cursorInside(view, node.from, node.to)) {
          return
        }

        const prettyBody = math.parse(body).toString({ parenthesis: 'auto', implicit: 'hide'})

        // Replace the whole `` `!body` `` span with our widget
        builder.add(node.from, node.to, Decoration.replace({
          widget: new LMWidget(1,
            `${prettyBody} = ${math.format(result, {notation: 'fixed', precision: 2})}`),
          inclusive: false
        }))
      }
    })

    return builder.finish();
  }
}

export const lmViewPlugin = ViewPlugin.fromClass(LMViewPlugin, {
  decorations: v => v.decos
});
