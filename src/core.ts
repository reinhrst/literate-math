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
    if (Array.isArray(ast)) {
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
        return createErrorBlock((e as Error).message)
      }
    }
    if (format.showExpression) {
      partsToShow.push(extractExpressionPart(ast))
    }
    if (format.showResult) {
      const formatNumber = (x: number): string => {
        return x.toPrecision(3)
      }
      if (math.isNumber(resultValue)) {
        partsToShow.push(formatNumber(resultValue))
      }
      if (math.isUnit(resultValue)) {
        const bestUnit = resultValue.toBest()
        partsToShow.push(math.format(bestUnit))
      }
    }
    return {
      instance: new LMathBlock(body, {
        type: "ok", formula, format, displayResult: partsToShow.join(" = ")}),
      newScope: scope
    }
  }
}
