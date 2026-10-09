import { describe, expect, test } from "bun:test";
import { getPageStylesheet } from "../src/lib/page-styles";

const fallback = { notFound: "/404.css", error: "/error.css" };
const root = { status: "success" as const, staticData: {} };

describe("page stylesheet selection", () => {
  test("uses the deepest page, including a preview nested in a blog layout", () => {
    expect(
      getPageStylesheet(
        [
          root,
          { status: "success", staticData: { pageStylesheet: "/blog.css" } },
          { status: "success", staticData: { pageStylesheet: "/preview.css" } },
        ],
        fallback,
      ),
    ).toBe("/preview.css");
  });

  test("unknown routes and missing content use the 404 stylesheet", () => {
    expect(getPageStylesheet([root], fallback)).toBe("/404.css");
    expect(
      getPageStylesheet(
        [
          root,
          {
            status: "notFound",
            staticData: { pageStylesheet: "/work.css" },
          },
        ],
        fallback,
      ),
    ).toBe("/404.css");
    expect(
      getPageStylesheet(
        [
          { ...root, _notFound: true },
          {
            status: "success",
            staticData: { pageStylesheet: "/work.css" },
          },
        ],
        fallback,
      ),
    ).toBe("/404.css");
  });

  test("a loader error takes priority over the requested page", () => {
    expect(
      getPageStylesheet(
        [
          root,
          {
            status: "error",
            staticData: { pageStylesheet: "/blog.css" },
          },
        ],
        fallback,
      ),
    ).toBe("/error.css");
  });
});
