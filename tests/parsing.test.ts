import { describe, expect, it } from "vitest";
import { parseBody } from "../src/parse";

describe("testParsingRules", () => {
  it("parses correctly", () => {
    expect(parseBody("hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: true, showResult: false}})
    expect(parseBody("!hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: false}})
    expect(parseBody("$hello")).to.deep.equal({formula: "hello",
      format: {showAssign: true, showExpression: false, showResult: false}})
    expect(parseBody("$!hello")).to.deep.equal({formula: "!hello",
      format: {showAssign: true, showExpression: false, showResult: false}})
    expect(parseBody("$@hello")).to.deep.equal({formula: "hello",
      format: {showAssign: true, showExpression: true, showResult: false}})
    expect(parseBody("$@=hello")).to.deep.equal({formula: "hello",
      format: {showAssign: true, showExpression: true, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("$=hello")).to.deep.equal({formula: "hello",
      format: {showAssign: true, showExpression: false, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("=hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("@=hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: true, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("={.1f}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 1}}}})
    expect(parseBody("={.1F}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 1}}}})
    expect(parseBody("={.15F  ; }hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 15}}}})
    expect(parseBody("={.0F}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 0}}}})
    expect(parseBody("={.1g;}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 1}}}})
    expect(parseBody("={.1G}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 1}}}})
    expect(parseBody("={ .15G}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 15}}}})
    expect(parseBody("={.0G }hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 0}}}})
    expect(parseBody("={; m^2}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: "m^2", numberFormat: undefined}}})
    expect(parseBody("={.5G; m^2}hello")).to.deep.equal({formula: "hello",
      format: {showAssign: false, showExpression: false, showResult: {unit: "m^2", numberFormat: {type: "g", digits: 5}}}})
  })
})

