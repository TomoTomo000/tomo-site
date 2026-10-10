import { describe, expect, test } from "bun:test";
import {
  BlogDataError,
  isBlogDataError,
} from "../src/features/blog/server/blog-data.error";

describe("BlogDataError", () => {
  test("uses a serializable Error with safe public fields", () => {
    const error = new BlogDataError("CONNECTION", 502);

    expect(error).toBeInstanceOf(Error);
    expect(isBlogDataError(error)).toBe(true);
    expect(error.message).not.toContain("microcms");
    expect(Object.hasOwn(error, "stack")).toBe(false);
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      name: "BlogDataError",
      code: "CONNECTION",
      status: 502,
    });
  });

  test("does not mistake unrelated errors for a blog data error", () => {
    expect(isBlogDataError(new Error("BlogDataError"))).toBe(false);

    const lookalike = new Error("safe");
    lookalike.name = "BlogDataError";
    expect(isBlogDataError(lookalike)).toBe(false);
  });
});
