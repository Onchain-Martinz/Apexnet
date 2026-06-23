import { describe, expect, it } from "vitest";
import { normalizeCourseCode } from "./course-code";

describe("normalizeCourseCode", () => {
  it("leaves an already-canonical code unchanged", () => {
    expect(normalizeCourseCode("PSY202")).toBe("PSY202");
  });

  it("uppercases lowercase input", () => {
    expect(normalizeCourseCode("psy202")).toBe("PSY202");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeCourseCode("  PSY202  ")).toBe("PSY202");
  });

  it("removes an internal space", () => {
    expect(normalizeCourseCode("PSY 202")).toBe("PSY202");
  });

  it("removes a hyphen", () => {
    expect(normalizeCourseCode("PSY-202")).toBe("PSY202");
  });

  it("removes an underscore", () => {
    expect(normalizeCourseCode("PSY_202")).toBe("PSY202");
  });

  it("combines lowercase and a hyphen", () => {
    expect(normalizeCourseCode("psy-202")).toBe("PSY202");
  });

  it("collapses duplicate/mixed separators instead of leaving stray characters", () => {
    expect(normalizeCourseCode("psy--202")).toBe("PSY202");
    expect(normalizeCourseCode("PSY  202")).toBe("PSY202");
    expect(normalizeCourseCode("PSY_-_202")).toBe("PSY202");
    expect(normalizeCourseCode(" PSY - 202 ")).toBe("PSY202");
  });

  it("does not use fuzzy matching — distinct codes stay distinct", () => {
    expect(normalizeCourseCode("PSY220")).not.toBe(normalizeCourseCode("PSY202"));
    expect(normalizeCourseCode("PSY20")).not.toBe(normalizeCourseCode("PSY202"));
  });

  it("is idempotent — normalizing twice gives the same result", () => {
    const once = normalizeCourseCode("psy-202");
    expect(normalizeCourseCode(once)).toBe(once);
  });
});
