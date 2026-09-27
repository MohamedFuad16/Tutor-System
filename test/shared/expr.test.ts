/**
 * The board's expression compiler: what people and models write for graphs
 * compiles to a function of x, and nothing else ever runs.
 */
import { describe, expect, it } from "vitest";
import { compileExpression } from "../../shared/expr";

const at = (source: string, x: number) => compileExpression(source)!(x);

describe("compileExpression", () => {
  it("handles school maths notation", () => {
    expect(at("x^2 - 5x + 6", 2)).toBe(0);
    expect(at("x**2", 3)).toBe(9);
    expect(at("y = 2x + 1", 4)).toBe(9);
    expect(at("f(x) = 3(x + 1)", 1)).toBe(6);
    expect(at("-x^2", 3)).toBe(-9);
    expect(at("2^-1", 0)).toBe(0.5);
    expect(at("x²", 5)).toBe(25);
    expect(at("|x - 4|", 1)).toBe(3);
    expect(at("sqrt(x)", 16)).toBe(4);
    expect(at("sin x", 0)).toBe(0);
    expect(at("2pi", 0)).toBeCloseTo(Math.PI * 2);
    expect(at("e^x", 1)).toBeCloseTo(Math.E);
    expect(at("3e^(-x)", 0)).toBe(3);
    expect(at("ln(e)", 0)).toBe(1);
    expect(at("1/x", 0)).toBeNaN();
  });

  it("refuses anything that isn't maths", () => {
    for (const bad of ["alert(1)", "window.close()", "x; y", "constructor", "x =>", "", "(x", "x +", "a".repeat(300)]) {
      expect(compileExpression(bad)).toBeNull();
    }
  });
});
