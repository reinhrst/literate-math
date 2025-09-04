import { describe, expect, it } from "vitest";
import { parseBody, ResultParseError, OutputFormat } from "../src/parse";

const defaultOutputFormat: OutputFormat = {
  rawFormat: "",
  showAssign: false,
  showExpression: false,
  showResult: {
    unit: undefined,
    numberFormat: undefined
  }
}

describe("testParsingRules", () => {
  it("parses correctly", () => {
    expect(parseBody("hello")).to.deep.equal({formula: "hello",
      format: defaultOutputFormat})
    expect(parseBody("!hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "!", showAssign: false, showExpression: false, showResult: false}})
    expect(parseBody("$hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "$", showAssign: true, showExpression: false, showResult: false}})
    expect(parseBody("$!hello")).to.deep.equal({formula: "!hello",
      format: {rawFormat: "$", showAssign: true, showExpression: false, showResult: false}})
    expect(parseBody("$@hello")).to.deep.equal({formula: "hello",
      format: {rawFormat:"$@", showAssign: true, showExpression: true, showResult: false}})
    expect(parseBody("$@=hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "$@=", showAssign: true, showExpression: true, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("$=hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "$=", showAssign: true, showExpression: false, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("=hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "=", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("@=hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "@=", showAssign: false, showExpression: true, showResult: {unit: undefined, numberFormat: undefined}}})
    expect(parseBody("={.1f}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.1f}", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 1}}}})
    expect(parseBody("={.1F}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.1F}", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 1}}}})
    expect(parseBody("={.15F  ; }hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.15F  ; }", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 15}}}})
    expect(parseBody("={.0F}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.0F}", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "f", digits: 0}}}})
    expect(parseBody("={.1g;}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.1g;}", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 1}}}})
    expect(parseBody("={.1G}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.1G}", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 1}}}})
    expect(parseBody("={ .15G}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={ .15G}", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 15}}}})
    expect(parseBody("={.0G }hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.0G }", showAssign: false, showExpression: false, showResult: {unit: undefined, numberFormat: {type: "g", digits: 0}}}})
    expect(parseBody("={; m^2}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={; m^2}", showAssign: false, showExpression: false, showResult: {unit: "m^2", numberFormat: undefined}}})
    expect(parseBody("={.5G; m^2}hello")).to.deep.equal({formula: "hello",
      format: {rawFormat: "={.5G; m^2}", showAssign: false, showExpression: false, showResult: {unit: "m^2", numberFormat: {type: "g", digits: 5}}}})
  })
  it("throws errors", () => {
    expect(() => parseBody("={.5H; m^2}hello")).toThrow(ResultParseError)
    expect(() => parseBody("={; m ; 2}hello")).toThrow(ResultParseError)
    expect(() => parseBody("={m^2}hello")).toThrow(ResultParseError)
  })
})

