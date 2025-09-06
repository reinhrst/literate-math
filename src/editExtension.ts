import { Annotation, Prec, RangeSetBuilder, Transaction} from "@codemirror/state"
import { Decoration, DecorationSet, EditorView, keymap, PluginValue, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { LMathBlock } from "./core"
import { Notice } from "obsidian"
export const fromMyEnter = Annotation.define<{ reason: string }>();


class LMWidget extends WidgetType {
  constructor(
    readonly id: number,
    readonly lMathBlock: LMathBlock,
    readonly clickHandler?: HTMLElement["onclick"]
  ) { super(); }

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
    return this.lMathBlock.toDomElement(document, this.clickHandler)
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

const lmBlockOffsets: {
  outerFrom: number
  innerFrom: number
  innerTo: number
  outerTo: number
  fullBody: string
}[] = []

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
    lmBlockOffsets.length = 0
    let scope = {}
    const builder = new RangeSetBuilder<Decoration>();
    const tree = syntaxTree(view.state)
    let openingTagFrom: number | undefined  = undefined
    let inlineCodeNode: {from: number, to: number} | undefined = undefined

    const clickHandler = (event: MouseEvent) => {
      const isModClick = event.metaKey || event.ctrlKey;
      if (!isModClick) {
        return
      }
      const assignment = (event.currentTarget as HTMLElement).dataset.assignment
      const lmBlockOffset = findLMElementUnderCursor(view, "inner")
      if (!lmBlockOffset) {
        return
      }
      if (assignment === undefined) {
        new Notice("\u26A0 the clicked element does not assign its value")
        return
      }
      const cursorPos = view.state.selection.main.head
      view.dispatch({
        changes: { from: cursorPos, insert: assignment },
        selection: { anchor: cursorPos + assignment.length },
        scrollIntoView: true
      });

      event.preventDefault();
      event.stopPropagation();
    }

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
              widget: new LMWidget(1, lMathBlock, clickHandler),
              inclusive: false
            }))
          }
          lmBlockOffsets.push({
            outerFrom,
            innerFrom,
            innerTo,
            outerTo,
            fullBody,
          })
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

function findLMElementUnderCursor(
  view: EditorView,
  detectionRange: "outer" | "inner"
): {
  outerFrom: number
  innerFrom: number
  innerTo: number
  outerTo: number
  fullBody: string
} | null
{
  if (view.state.selection.ranges.length !== 1) {
    console.debug("not working with multiple cursors")
    return null
  }
  const r = view.state.selection.ranges[0]!
  if (r.from !== r.to) {
    console.debug("not working when range is selected")
    return null
  }
  const cursor = r.from
  for (const lmBlockOffset of lmBlockOffsets) {
    const from = detectionRange === "outer" ? lmBlockOffset.outerFrom : lmBlockOffset.innerFrom
    const to = detectionRange === "outer" ? lmBlockOffset.outerTo : lmBlockOffset.innerTo
    if (to < cursor) {
      // cursor is beyond this section
      continue
    }
    if (from > cursor) {
      // section is beyond cursor; since sections are in order, there is no match
      return null
    }
    return lmBlockOffset
  }
  return null
}

export const enterCatcher =Prec.highest(keymap.of([{
  key: "Enter",
  run: (view: EditorView) => {

    const lmBlockOffset = findLMElementUnderCursor(view, "outer")
    if (lmBlockOffset === null) {
      return false
    }
    const {outerTo} = lmBlockOffset

    view.dispatch({
      selection: { anchor: outerTo},
      scrollIntoView: true,
      annotations: [
        fromMyEnter.of({ reason: "enter-handler" }),
        Transaction.userEvent.of("input.enter") // optional, but handy
      ]
    });
    return true
  },
}]))
