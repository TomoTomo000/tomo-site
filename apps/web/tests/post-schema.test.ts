import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { postSchema } from "../src/features/blog/server/post.schema";

const post = {
  id: "test-post",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  title: "記事タイトル",
  tags: [],
};

describe("microCMS post schema", () => {
  test("accepts posts before and after removing the legacy excerpt field", () => {
    const posts = z
      .array(postSchema)
      .parse([post, { ...post, excerpt: "説明文".repeat(200) }]);
    expect(posts).toHaveLength(2);
    expect(posts[1]).not.toHaveProperty("excerpt");
  });

  test("accepts a long description without rejecting the article", () => {
    const detail = {
      ...post,
      description: "あ".repeat(321),
      content: "<p>本文</p>",
    };
    expect(postSchema.parse(detail)).toEqual(detail);
  });

  test.each([undefined, null, "", "  "])(
    "accepts an unset description: %p",
    (description) => {
      expect(postSchema.safeParse({ ...post, description }).success).toBe(true);
    },
  );

  test("still rejects a non-string description", () => {
    expect(postSchema.safeParse({ ...post, description: 123 }).success).toBe(
      false,
    );
  });
});
