import { Annotation, Prec, RangeSetBuilder, Transaction} from "@codemirror/state"
import { Decoration, DecorationSet, EditorView, keymap, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { LMathBlock } from "./core"
export const fromMyEnter = Annotation.define<{ reason: string }>();


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

function shouldShowCode(view: EditorView, from: number, to: number, showAlsoUnderCursor: boolean): boolean {
  if (showAlsoUnderCursor) {
    return false
  }
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
    this.decos = this.buildDecorations(view, true);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged  || update.selectionSet) {
      const isFromEnter = update.transactions.some(
        tr => tr.annotation(Transaction.userEvent) === "input.enter")
      this.decos = this.buildDecorations(update.view, isFromEnter);
    }
  }

  destroy() {
    // nothing to clean up for now
  }

  private buildDecorations(view: EditorView, showAlsoUnderCursor: boolean): DecorationSet {
    let scope = {}
    const builder = new RangeSetBuilder<Decoration>();
    // TODO use TreeWalker to find elements
    // Then use StateField to update if any changes
    // Finally use buildDecorations to only build those decorations in view
    //
    const tree = syntaxTree(view.state)
    let openingTagFrom: number | undefined  = undefined
    let inlineCodeNode: {from: number, to: number} | undefined = undefined

    tree.iterate({
      mode: 4,
      enter: (node) => {
        // we're looking for an formatting_formatting-code_inline-code,
        // followed by an inline-code followed by another
        // formatting_formatting-code_inline-code
        if (node.type.name === "inline-code") {
          if (openingTagFrom === undefined) {
            console.warn("No openingTag")
            return
          }
          if (inlineCodeNode) {
            console.warn("Already have inlineCodeTag")
            return
          }
          inlineCodeNode = {from: node.from, to: node.to}
          return
        }
        if (node.type.name === "formatting_formatting-code_inline-code") {
          if (openingTagFrom === undefined
            // filter out line tags with enters inside
            || (inlineCodeNode && inlineCodeNode.to !== node.from)
          ) {
            inlineCodeNode = undefined
            openingTagFrom = node.from
            return
          }
          if (!inlineCodeNode) {
            console.assert(inlineCodeNode)
            return
          }
          const innerFrom = inlineCodeNode.from
          const outerFrom = openingTagFrom
          const innerTo = inlineCodeNode.to
          const outerTo = node.to
          const fullBody = view.state.sliceDoc(innerFrom, innerTo)
          if (fullBody.at(0) !== "!" || fullBody.contains("\n")) {
            return
          }
          const body = fullBody.slice(1)
          // TODO use caching
          const result = LMathBlock.init(body, scope)
          const lMathBlock = result.instance
          scope = result.newScope

          if (shouldShowCode(view, outerFrom, outerTo, showAlsoUnderCursor)) {
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
        openingTagFrom = undefined
        inlineCodeNode = undefined
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

export const enterCatcher =Prec.highest(keymap.of([{
  key: "Enter",
  run: (view: EditorView) => {

    // Basic scan: walk upward and look for code block
    const tree = syntaxTree(view.state)
    if (view.state.selection.main.from !== view.state.selection.main.to) {
      // don't do anything if there is a selection
      return false
    }
    const cursorOffset = view.state.selection.main.head;
    const nodeUnderCursor = tree.resolve(cursorOffset, -1)
    type SyntaxNode = typeof nodeUnderCursor

    const handleInlineCodeNode = (node: SyntaxNode): boolean => {
      console.assert(node.name === "inline-code")
      const body = view.state.sliceDoc(node.from, node.to)
      if (body[0] !== "!") {
        return false
      }
      const openingTagSize = (node.prevSibling
        && node.prevSibling.name === "formatting_formatting-code_inline-code")
        ? node.prevSibling.to - node.prevSibling.from
        : (() => {
          console.warn("No prev sibling")
          return 1
        })()
      const outerTo = node.to + openingTagSize
      if (cursorOffset === outerTo) {
        return false
      }
      view.dispatch({
        selection: { anchor: outerTo},
        scrollIntoView: true,
        annotations: [
          fromMyEnter.of({ reason: "enter-handler" }),
          Transaction.userEvent.of("input.enter") // optional, but handy
  ]
      });
      return true
    }
    if (nodeUnderCursor.type.name === "inline-code") {
      return handleInlineCodeNode(nodeUnderCursor)
    }
    if (nodeUnderCursor.type.name === "formatting_formatting-code_inline-code") {
      if (nodeUnderCursor.prevSibling?.name === "inline-code") {
        return handleInlineCodeNode(nodeUnderCursor.prevSibling)
      } else if (nodeUnderCursor.nextSibling?.name === "inline-code") {
        return handleInlineCodeNode(nodeUnderCursor.nextSibling)
      } else {
        console.warn("Cannot find inline code node")
      }
    }
    return false; // allow default Enter otherwise
  },
}]))
