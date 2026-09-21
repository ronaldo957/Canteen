import { describe, expect, it } from "vitest";
import { computeOrderTotals, generateOrderNumber, formatINR } from "@/lib/utils";

describe("order total calculations", () => {
  it("computes 5% GST tax and rounds to 2 decimals", () => {
    const { taxAmount, totalAmount } = computeOrderTotals(200);
    expect(taxAmount).toBe(10);
    expect(totalAmount).toBe(210);
  });

  it("handles fractional subtotals without floating point drift", () => {
    const { taxAmount, totalAmount } = computeOrderTotals(99.99);
    expect(taxAmount).toBeCloseTo(5, 2);
    expect(totalAmount).toBeCloseTo(104.99, 2);
  });
});

describe("generateOrderNumber", () => {
  it("produces a unique-looking order number in the expected format", () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^SC\d{6}-\d{4}$/);
  });

  it("generates different numbers across calls (extremely low collision chance)", () => {
    const numbers = new Set(Array.from({ length: 20 }, () => generateOrderNumber()));
    expect(numbers.size).toBeGreaterThan(1);
  });
});

describe("formatINR", () => {
  it("formats numbers as Indian Rupee currency", () => {
    expect(formatINR(1234.5)).toContain("1,234.50");
  });
});
