import { describe, expect, it } from "vitest";
import { LMathBlock } from "../src/core";


function expectResult(lMath: LMathBlock, expectedResult: string) {
  if (lMath.output.type === "error") {
    throw new Error("Error found: " + lMath.output.error)
  }
  expect(lMath.output.displayResult).to.equal(expectedResult)
}


function runAndExpectSuccess(
  statements: string[],
  displayResult: string
) {
  let scope = {}
  statements.forEach((line, i) => {
    const {instance, newScope} = LMathBlock.init(line, scope)
    if (instance.output.type !== "ok") {
      throw new Error(`Line "${line}" failed: ${instance.output.error}`)
    }
    scope = newScope
    if (i === statements.length - 1) {
      expect(instance.output.displayResult).to.equal(displayResult)
    }
  })
}

function runAndExpectError(
  statements: string[],
  error: string
) {
  let scope = {}
  statements.forEach((line, i) => {
    const {instance, newScope} = LMathBlock.init(line, scope)
    scope = newScope
    if (i === statements.length - 1) {
    if (instance.output.type !== "error") {
      throw new Error(`Line "${line}" should have failed: ${instance.output.displayResult}`)
    }
      expect(instance.output.error).to.equal(error)
    } else {
    if (instance.output.type !== "ok") {
      throw new Error(`Line "${line}" failed: ${instance.output.error}`)
    }
    }
  })
}


describe("core", () => {
  it("can calculate", () => {
    runAndExpectSuccess(["x = 3 m / 6", "= x ^ 2 + 5 cm^2"], "0.2505 m^2")
  })

  it("can display arbitrary unit and numbers", () => {
    runAndExpectSuccess(["x = 3 m / 6", "@={.10f; dm2} x ^ 2 + 5 cm^2"],
      "x ^ 2 + 5 cm ^ 2 = 25.0500000000 dm2")
  })

  it("Will error on unknown units", () => {
    runAndExpectError(["={;unknown_unit} 3 m"],
      `Unit "unknown" not found.`)
  })

  it("Will error if asked for assignment display without assignment", () => {
    runAndExpectError(["$@ 3 m"],
      `Cannot show assignment ($) when formula has no assignment`)
  })

  it("Will error if trying function assignment", () => {
    runAndExpectError(["f(x) = 3"],
      `Function assignments not allowed inline with output`)
  })

  it("Will error if trying multiple expressions", () => {
    runAndExpectError(["x=3;y=5"],
      `Multiple statements not allowed inline with output`)
  })

  it("Will error if trying multiple expressions", () => {
    runAndExpectError(["x=3;y=5"],
      `Multiple statements not allowed inline with output`)
  })

  it("Will not error if trying multiple expressions without output", () => {
    runAndExpectSuccess(["!x=3;y=5", "= x + y"], `8`)
  })

  it("Will error if forcing non-unit on unit value", () => {
    runAndExpectError(["={;-} 3m"],
      `Failed to convert "3 m" into a unitless number`)
  })

  it("Will error if forcing unit on non-unit value", () => {
    runAndExpectError(["={;m} 3 + 4"],
      `Failed to apply unit "m" to the unitless number 7`)
  })

})

