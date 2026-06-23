import { describe, expect, it } from "vitest";
import { isValidTextbookPrice } from "./textbook";

describe("isValidTextbookPrice", () => {
  it("rejects ₦99.99 (Kobo)", () => {
    expect(isValidTextbookPrice(99.99)).toBe(false);
  });

  it("rejects ₦100.50 (Kobo)", () => {
    expect(isValidTextbookPrice(100.5)).toBe(false);
  });

  it("rejects ₦100.01 (Kobo)", () => {
    expect(isValidTextbookPrice(100.01)).toBe(false);
  });

  it("accepts ₦100 (whole Naira)", () => {
    expect(isValidTextbookPrice(100)).toBe(true);
  });

  it("accepts ₦500 (whole Naira)", () => {
    expect(isValidTextbookPrice(500)).toBe(true);
  });

  it("accepts ₦0 (free textbook)", () => {
    expect(isValidTextbookPrice(0)).toBe(true);
  });

  it("rejects negative whole numbers", () => {
    expect(isValidTextbookPrice(-100)).toBe(false);
  });

  it("rejects NaN and non-finite values", () => {
    expect(isValidTextbookPrice(NaN)).toBe(false);
    expect(isValidTextbookPrice(Infinity)).toBe(false);
    expect(isValidTextbookPrice(-Infinity)).toBe(false);
  });
});
