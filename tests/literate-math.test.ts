import { describe, expect, it } from "vitest";
import { __test__ } from "../main";

describe("findLmathRanges", () => {
  it("finds simple single-line ranges", () => {
    const text = "before {{x+y}} after";
    const ranges = __test__.findLmathRanges(text);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({
      from: 7,
      to: 14,
      content: "x+y"
    });
  });

  it("finds multi-line ranges (non-nested)", () => {
    const text = "a\n{{line1\nline2}}\nb";
    const ranges = __test__.findLmathRanges(text);
    expect(ranges).toHaveLength(1);
    expect(ranges[0]!.content).toBe("line1\nline2");
  });

  it("finds two adjacent single-line items", () => {
    const text = "{{ hello}} there {{ world }}";
    const ranges = __test__.findLmathRanges(text);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]!.content).toBe(" hello");
    expect(ranges[1]!.content).toBe(" world ");
  });

  it("pos inclusion check works", () => {
    const text = "A {{abc}} Z";
    const ranges = __test__.findLmathRanges(text);
    const inside = __test__.isPosInsideAny(4, ranges);  // inside
    const outside = __test__.isPosInsideAny(2, ranges); // outside
    expect(inside).toBe(true);
    expect(outside).toBe(false);
  });

});
