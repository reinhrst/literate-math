import * as math from "mathjs"
import { OutputFormat, parseBody, ResultParseError } from "./parse";
import { DeepReadOnly } from "./tsmagic";
import { tryCatch } from "./util"


// Type guard for AssignmentNode
function isAssignmentNode(node: math.MathNode): node is math.AssignmentNode {
  return node.type === 'AssignmentNode';
}

// Type guard for FunctionAssignmentNode
function isFunctionAssignmentNode(node: math.MathNode): node is math.FunctionAssignmentNode {
  return node.type === 'FunctionAssignmentNode';
}


function extractAssignmentPart(ast: math.MathNode): string {
  if (!isAssignmentNode(ast)) {
    throw new Error("Cannot extract assignment section")
  }
  return ast.name
}

function extractExpressionPart(ast: math.MathNode): string {
  if (isAssignmentNode(ast)) {
    return ast.value.toString()
  }
  return ast.toString()
}

export class LMathBlock {
  private constructor(
    public readonly body: string,
    public readonly output: DeepReadOnly<{
      type: "ok"
      formula: string
      format: OutputFormat
      displayResult: string | null
    } | {
      type: "error"
      error: string
    }>,
  ) {}

  static init(
    body: string, previousScope: math.MathScope)
  : {
    instance: LMathBlock,
    newScope: math.MathScope
  } {
    const createErrorBlock = (message: string) => {
      // return previous scope
      const newScope = math.clone(previousScope)
        return {
          instance: new LMathBlock(
            body,
            {type: "error", error: message}
          ),
          newScope
        }
    }

    const scope = math.clone(previousScope)

    const parseResult = tryCatch(() => parseBody(body))
    if (!parseResult.ok)
      if (parseResult.error instanceof ResultParseError) {
        return createErrorBlock(parseResult.error.message)
      } else {
      throw parseResult.error
    }
    const {formula, format} = parseResult.value
    const mathParseResult = tryCatch(() => math.parse(formula))
    if (!mathParseResult.ok) {
      return createErrorBlock(mathParseResult.error.message)
    }
    const ast = mathParseResult.value
    const evalResult = tryCatch(() => ast.evaluate(scope))
    if (!evalResult.ok) {
      return createErrorBlock(evalResult.error.message)

    }
    const resultValue = evalResult.value
    if (!format.showAssign
      && !format.showExpression
      && !format.showResult) {
      return {
        instance: new LMathBlock(body, {type: "ok", formula, format, displayResult: null}),
        newScope: scope
      }
    }
    if ("blocks" in ast && Array.isArray(ast.blocks) && ast.blocks.length > 1) {
      return createErrorBlock("Multiple statements not allowed inline with output")
    }

    if (isFunctionAssignmentNode(ast)) {
      return createErrorBlock("Function assignments not allowed inline with output")
    }

    const partsToShow: string[] = []
    if (format.showAssign) {
      try {
        partsToShow.push(extractAssignmentPart(ast))
      } catch (e) {
        if ((e as Error).message === "Cannot extract assignment section") {
          return createErrorBlock("Cannot show assignment ($) when formula has no assignment")
        }
        throw e
      }
    }
    if (format.showExpression) {
      partsToShow.push(extractExpressionPart(ast))
    }
    if (format.showResult) {
      const formatOptions: (math.FormatOptions | ((n: number) => string)) = format.showResult.numberFormat === undefined
        ? defaultNumberFormatter
        : format.showResult.numberFormat.type === "f"
        ? {notation: "fixed", precision: format.showResult.numberFormat.digits}
        : {notation: "exponential", precision: format.showResult.numberFormat.digits}
      try {
        const formatUnit = (() => {
          const unit = format.showResult.unit
          if (resultValue instanceof math.Unit) {
            if (unit === null) {
              throw new Error(`Failed to convert "${resultValue}" into a unitless number`)
            }
            return unit === undefined
              ? resultValue.toBest()
              : resultValue.to(unit)
          }
          if (typeof resultValue === "number") {
            if (format.showResult.unit !== undefined
              && format.showResult.unit !== null
              && format.showResult.unit !== "") {
              throw new Error(`Failed to apply unit "${unit}" to the unitless number ${resultValue}`)
            }
          }
          return resultValue
        })()
        partsToShow.push(math.format(formatUnit, formatOptions))
      } catch (e) {
        return createErrorBlock((e as Error).message)
      }
    }
    return {
      instance: new LMathBlock(body, {
        type: "ok", formula, format, displayResult: partsToShow.join(" = ")}),
      newScope: scope
    }
  }

  toDomElement(doc: Document): HTMLElement {
    const el = doc.createElement("lmath")
    el.title = this.body
    if (this.output.type === "error") {
      el.classList.add("lmath-error")
    }
    el.innerText = this.output.type === "ok"
      ? this.output.displayResult ?? ""
      : this.output.error
    return el
  }
}

function defaultNumberFormatter(n: number): string {
  const MAX_NUMBER_LENGTH = 5
  const MAX_LEADING_ZEROS_AFTER_DECIMAL = 4
  const MIN_PRECISION = 3
  const naive = n.toString()
  if (naive.length < MAX_NUMBER_LENGTH) {
    return naive
  }
  const a = Math.abs(n)
  const showIntOnly = a >= Math.pow(10, MIN_PRECISION)
  const showExpLarge = a >= Math.pow(10, MAX_NUMBER_LENGTH + 1)
  const showExpSmall = a < Math.pow(10, -MAX_LEADING_ZEROS_AFTER_DECIMAL)
  const complex = showExpLarge || showExpSmall ? n.toExponential(MIN_PRECISION - 1)
      : showIntOnly ? n.toFixed(0)
        : n.toPrecision(MIN_PRECISION)
  const parts = complex.split("e")
  if (parts[0]!.indexOf(".") !== -1) {
    parts[0] = parts[0]!.replace(/0*$/, "") // remove trailing 0s after .
  }
  parts[0] = parts[0]!.replace(/\.$/, "") // remove trailing dot
  return parts.join("e")
}
