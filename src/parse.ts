/**
 * We're trying to parse something that looks like this:

- Tags look like this  `` `!...` `` where `...` is the content
- The content has one optional part (format) and one required part: formula
- The optional part for now looks simply like a combination of these characters:
  `$@=` where ` = ` can be followed optionally by formatting options between brackets: ` =(.3f;m^2)` . Either number format or unit or both can be given.
	- `$` means show the assignment part (error is there is no assignment part)
	- `@` means show the expression part
	- ` =` means show the evaluated answer
- Alternatively the optional part can be `!`, meaning no output at all.

 */

const FORMAT_REGEX = /^(?:\.(?<digits>[0-9]+)(?<type>[fFgG]))$/
const FORBIDDEN_UNIT_CHARS = [...".=+#$\";:"]
const BODY_REGEX = RegExp(
  "^(?<prefix>" + (
    "(?<no_output>!)" +
      "|(?:" + (
        "(?<assignment>\\$)?" +
          "(?<expression>@)?" +
          "(?<result>=(?:{[^}]*})?)?" )) +
    "))(?<formula>.*)$")

export type BodyRegexGroups = {
  prefix: "!"
  no_output: "!"
  assignment: undefined
  expression: undefined
  result: undefined
  formula: string
} | {
  prefix: string
  no_output: undefined
  assignment: "$" | undefined
  expression: "@" | undefined
  result: "=" | `={${string}}` | undefined
  formula: string
}


function applyBodyRegexGroups(body: string): BodyRegexGroups {
  return BODY_REGEX.exec(body)!.groups! as {
    [key: string]: string | undefined} as BodyRegexGroups
}

export type NumberFormat = {
  type: "f"|"g",
  digits: number,
}

export type OutputFormat = {
  readonly showAssign: boolean
  readonly showExpression: boolean
  readonly showResult: false | {
    readonly unit: string | null | undefined // NB: undef = auto, null = no unit
    readonly numberFormat: NumberFormat | undefined
  }
}

const defaultOutputFormat: OutputFormat = {
  showAssign: false,
  showExpression: true,
  showResult: false
}

export class ResultParseError extends Error {}

function parseResult(result: string | undefined): OutputFormat["showResult"] {
  if (result === undefined) {
    return false
  }
  if (result === "=") {
    return {unit: undefined, numberFormat: undefined}
  }
  if (result.at(0)! !== "=" ) {
    throw new Error("This should not happen, how can previous regexp have matched?")
  }
  if (result.at(1)! !== "{" || result.at(-1)! !== "}") {
    throw new Error("This should not happen, how can previous regexp have matched?")
  }
  const format = result.slice(2, -1).trim()
  const semiPos = format.indexOf(";")
  const numberFormatString = semiPos===0 ? undefined : semiPos === -1 ? format : format.slice(0, semiPos).trim()
  const numberFormat = numberFormatString === undefined ? undefined : (() =>  {
    const match = FORMAT_REGEX.exec(numberFormatString)
    if (!match) {
      throw new ResultParseError(`Format should be ".xf" or ".xg" where x is a number, found ${JSON.stringify(numberFormatString)}; ${semiPos}.`)
    }
    const digits = parseInt(match.groups!.digits!)
    const type = match.groups!.type!.toLowerCase() as "f" | "g"
    return {digits, type}
  })()
  const unitString = semiPos === -1 ? undefined : format.slice(semiPos + 1).trim()

  if (unitString) {
    FORBIDDEN_UNIT_CHARS.forEach(c => {
      if (unitString.indexOf(c) !== -1) {
        throw new ResultParseError(`Found forbidden character ${JSON.stringify(c)} in unit ${JSON.stringify(unitString)}.`)
      }
    })
  }
  const unit = unitString === "" ? undefined : unitString === "-" ? null : unitString
  return {
    unit,
    numberFormat
  }
}

export function parseBody(
  body: string
): {
  formula: string, format: OutputFormat
} {
  const {prefix, no_output, assignment, expression, result, formula} = applyBodyRegexGroups(body)
  const format: OutputFormat = prefix === "" ? defaultOutputFormat
    : no_output ? {showAssign: false, showExpression: false, showResult: false}
      : {
        showAssign: !!assignment,
        showExpression: !!expression,
        showResult: parseResult(result)
      }
  return {formula, format}
}
