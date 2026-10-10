import { describe, expect, test } from "bun:test";
import { parseBlogSearch } from "../src/lib/blog-search";
import { blogUrl } from "../src/lib/urls";
import { validatePreview } from "../src/features/blog/server/preview";
describe("Astro blog URLs", () => {
  test("defaults and invalid input normalize to a single index URL", () => {
    for (const query of [
      "",
      "page=1&query=&tag=",
      "page=-1",
      "page=999999",
      "query=" + "x".repeat(101),
    ])
      expect(blogUrl(parseBlogSearch(new URLSearchParams(query)))).toBe(
        "/blog",
      );
  });
  test("Japanese search, tags, and pagination survive URL encoding", () => {
    const search = { page: 2, query: "CSS & 日本語", tag: "web" };
    expect(
      parseBlogSearch(
        new URL(blogUrl(search), "https://tomo-site.page").searchParams,
      ),
    ).toEqual(search);
  });
});
describe("preview access", () => {
  const secret = "a".repeat(32);
  test("requires a configured secret and does not accept malformed IDs", async () => {
    const query = new URLSearchParams({ secret, draftKey: "draft" });
    expect(await validatePreview("article-id", query, undefined)).toBeNull();
    expect(await validatePreview("article-id", query, "short")).toBeNull();
    expect(await validatePreview("../private", query, secret)).toBeNull();
    expect(
      await validatePreview(
        "article-id",
        new URLSearchParams({ secret: "b".repeat(32) }),
        secret,
      ),
    ).toBeNull();
  });
  test("authorized preview keeps its draft key, and supports published previews", async () => {
    expect(
      await validatePreview(
        "article-id",
        new URLSearchParams({ secret, draftKey: "draft" }),
        secret,
      ),
    ).toEqual({ contentId: "article-id", draftKey: "draft", secret });
    expect(
      (
        await validatePreview(
          "article-id",
          new URLSearchParams({ secret }),
          secret,
        )
      )?.draftKey,
    ).toBe("");
  });
});
