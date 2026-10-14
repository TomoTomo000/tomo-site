import { describe, expect, test } from "bun:test";
import {
  crosspostArticleFromMicroCms,
  microCmsCrosspostSettingsSchema,
} from "../src/features/crosspost/microcms-article";

describe("microCMSのクロスポスト設定", () => {
  test.each([
    {},
    { syncZenn: null, syncQiita: null, emoji: null, zennType: null },
    { emoji: " ", zennType: [] },
  ])("未設定の記事は同期オフになる: %p", (value) => {
    expect(microCmsCrosspostSettingsSchema.parse(value)).toEqual({
      syncZenn: false,
      syncQiita: false,
      emoji: "📝",
      zennType: "tech",
    });
  });

  test("媒体の選択と単一選択の配列を読み取る", () => {
    expect(
      microCmsCrosspostSettingsSchema.parse({
        syncZenn: true,
        syncQiita: false,
        zennType: ["idea"],
        emoji: "👩‍💻",
      }),
    ).toEqual({
      syncZenn: true,
      syncQiita: false,
      zennType: "idea",
      emoji: "👩‍💻",
    });
  });

  test.each(["🇯🇵", "👍🏽", "1️⃣", "📝"])(
    "複数コードポイントの絵文字も1つとして扱う: %s",
    (emoji) => {
      expect(microCmsCrosspostSettingsSchema.parse({ emoji }).emoji).toBe(
        emoji,
      );
    },
  );

  test.each([
    { syncZenn: "false" },
    { zennType: "tech" },
    { zennType: ["tech", "idea"] },
    { zennType: ["other"] },
    { emoji: "文章" },
    { emoji: "📝📝" },
  ])("不正な設定を黙って採用しない: %p", (value) => {
    expect(microCmsCrosspostSettingsSchema.safeParse(value).success).toBe(
      false,
    );
  });

  test("元のHTMLを維持し、CMSに依存しない記事形式に揃える", () => {
    const article = crosspostArticleFromMicroCms(
      {
        id: "post-id",
        title: "記事",
        content: '<pre><code class="language-js">const a = 1;</code></pre>',
        tags: [{ id: "js", name: "JavaScript" }],
        updatedAt: "2026-10-01",
        revisedAt: "2026-10-02",
        syncQiita: true,
      },
      "https://example.com",
    );
    expect(article.source).toEqual({
      provider: "microcms",
      contentId: "post-id",
    });
    expect(article.sourceUrl).toBe("https://example.com/blog/post-id");
    expect(article.bodyHtml).toContain('class="language-js"');
    expect(article.tags).toEqual(["JavaScript"]);
    expect(article.revision).toBe("2026-10-02");
    expect(article.settings.syncQiita).toBe(true);
  });
});
