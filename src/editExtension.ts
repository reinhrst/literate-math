import { RangeSetBuilder} from "@codemirror/state"
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { LMathBlock } from "./core"

class LMWidget extends WidgetType {
  constructor(readonly id: number, readonly lMathBlock: LMathBlock) { super(); }

  eq(other: WidgetType) {
    return other instanceof LMWidget
      && this.id === other.id
      && this.lMathBlock.body === other.lMathBlock.body
      && (this.lMathBlock.output.type === "ok"
        ? (
          other.lMathBlock.output.type === "ok"
            && this.lMathBlock.output.displayResult === other.lMathBlock.output.displayResult)
        :
        (
          other.lMathBlock.output.type === "error"
            && this.lMathBlock.output.error === other.lMathBlock.output.error
        )
      )
  }

  toDOM() {
    return this.lMathBlock.toDomElement(document)
  }

  ignoreEvent(_event: Event): boolean {
    return false
  }
}

let mouseButtonIsDown = false

function shouldShowCode(view: EditorView, from: number, to: number): boolean {
  for (const r of view.state.selection.ranges) {
    const tail = r.from === r.head ? r.to : r.from
    if (mouseButtonIsDown) {
      if (tail <= to && tail >= from) return true;
    } else {
      if (r.from <= to && r.to >= from) return true;
    }
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

        if (shouldShowCode(view, outerFrom, outerTo)) {
          if (lMathBlock.output.type === "error") {
            builder.add(outerFrom, outerTo, Decoration.mark({
              class: "lmath-error",
            }))
          }
          builder.add(innerFrom, innerFrom + "!".length, Decoration.mark({
            class: "lmath-identifier",
          }))
          if (lMathBlock.output.type === "ok") {
            const prefixFrom = innerFrom + "!".length
            const prefixTo = prefixFrom + lMathBlock.output.format.rawFormat.length
            builder.add(prefixFrom, prefixTo, Decoration.mark({
              class: "lmath-format",
            }))
          }
        } else {
          builder.add(outerFrom, outerTo, Decoration.replace({
            widget: new LMWidget(1, lMathBlock),
            inclusive: false
          }))
        }
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
      const onMouseUp = (e: MouseEvent) => {
        if (e.button !== 0) return; // Left click only
        mouseButtonIsDown = false;
        // Request an update to re-evaluate decorations
        view.requestMeasure();
        document.removeEventListener("mouseup", onMouseUp)
      }
      document.addEventListener("mouseup", onMouseUp)
    }
  }
});
