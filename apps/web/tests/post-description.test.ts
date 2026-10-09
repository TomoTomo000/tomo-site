import { describe, expect, test } from "bun:test";
import { createPostDescription } from "../src/features/blog/server/post-description";
import { sanitizeMicroCmsArticle } from "../src/features/blog/server/microcms-content.server";

describe("post description", () => {
  test("keeps literal entity examples from the article intact", () => {
    const article = sanitizeMicroCmsArticle("<p>&amp;amp; の書き方</p>");
    expect(createPostDescription(null, article.text)).toBe("&amp; の書き方");
  });
  test("prefers the configured description", () => {
    expect(createPostDescription("  SEO用の説明  ", "本文")).toBe(
      "SEO用の説明",
    );
  });

  test.each([undefined, null, "", " \n "])(
    "uses article text when description is %p",
    (description) => {
      const article = sanitizeMicroCmsArticle(
        "<p>React &amp; TypeScript</p><script>secret()</script>",
      );
      expect(createPostDescription(description, article.text)).toBe(
        "React & TypeScript",
      );
    },
  );

  test("limits generated descriptions without breaking emoji", () => {
    expect(createPostDescription(null, "😀".repeat(161))).toBe(
      `${"😀".repeat(160)}…`,
    );
  });

  test("normalizes whitespace and allows an empty article", () => {
    expect(createPostDescription(null, " 一行目\n  二行目 ")).toBe(
      "一行目 二行目",
    );
    expect(createPostDescription(null, "")).toBe("");
  });
});
