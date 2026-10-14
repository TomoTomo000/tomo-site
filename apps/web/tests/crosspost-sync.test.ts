import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { crosspostTestDatabase } from "./helpers/crosspost-database";
import { publishArticle } from "../src/features/crosspost/publish-article";
import type { CrosspostArticle } from "../src/features/crosspost/article";
import {
  PublishError,
  type PublishInput,
  type Publisher,
} from "../src/features/crosspost/publishers/publisher";

let context: ReturnType<typeof crosspostTestDatabase>;
beforeEach(() => {
  context = crosspostTestDatabase();
});
afterEach(() => context.database.close());
const article: CrosspostArticle = {
  source: { provider: "microcms", contentId: "post-id" },
  sourceUrl: "https://example.com/blog/post-id",
  title: "記事",
  bodyHtml: "<p>本文</p>",
  tags: ["typescript"],
  publishedAt: "2026-10-12T00:00:00Z",
  revision: "2026-10-12T00:00:00Z",
  settings: { syncZenn: true, syncQiita: true, emoji: "📝", zennType: "tech" },
};
const noWait = { sleep: async () => {} };
function publishers() {
  const calls: Array<{ target: string; input: PublishInput }> = [];
  const qiita: Publisher = async (input) => {
    calls.push({ target: "qiita", input });
    return {
      status: "synced",
      remoteId: "abcdef0123456789abcd",
      remoteUrl: "https://qiita.com/me/items/abcdef0123456789abcd",
    };
  };
  const zenn: Publisher = async (input) => {
    calls.push({ target: "zenn", input });
    return {
      status: "submitted",
      remoteId: `tomo-${input.articleId}`,
      remoteUrl: `https://zenn.dev/me/articles/tomo-${input.articleId}`,
    };
  };
  return { calls, qiita, zenn };
}

describe("記事同期と保存処理の連携", () => {
  test("長い利用制限の待ち時間を保存し、再実行しても早く送信しない", async () => {
    let calls = 0;
    const qiita: Publisher = async () => {
      calls++;
      throw new PublishError("RATE_LIMIT", "再試行待ち", "retry", 120);
    };
    const value = {
      ...article,
      settings: { ...article.settings, syncZenn: false },
    };
    const result = await publishArticle(
      value,
      context.store,
      { qiita },
      noWait,
    );
    expect(result[1].publication?.status).toBe("failed");
    expect(Date.parse(result[1].publication!.nextRetryAt!) > Date.now()).toBe(
      true,
    );
    await publishArticle(value, context.store, { qiita }, noWait);
    expect(calls).toBe(1);
  });
  test("初回は新規、編集後は保存したIDで更新し、同じ内容は送信しない", async () => {
    const mock = publishers();
    const first = await publishArticle(article, context.store, mock, noWait);
    expect(first.map((result) => result.publication?.status)).toEqual([
      "submitted",
      "synced",
    ]);
    expect(mock.calls.every((call) => call.input.remoteId === null)).toBe(true);
    await publishArticle(article, context.store, mock, noWait);
    expect(mock.calls).toHaveLength(2);
    await publishArticle(
      { ...article, bodyHtml: "<p>編集後</p>" },
      context.store,
      mock,
      noWait,
    );
    expect(mock.calls).toHaveLength(4);
    expect(mock.calls[2].input.remoteId).toStartWith("tomo-");
    expect(mock.calls[3].input.remoteId).toBe("abcdef0123456789abcd");
    expect(mock.calls[3].input.markdown).toContain("元記事はこちら");
  });

  test("未公開・同期オフの媒体には送信せず、再チェック時は同じIDを使う", async () => {
    const mock = publishers();
    await publishArticle(
      { ...article, publishedAt: null },
      context.store,
      mock,
      noWait,
    );
    await publishArticle(
      {
        ...article,
        settings: { ...article.settings, syncZenn: false, syncQiita: false },
      },
      context.store,
      mock,
      noWait,
    );
    expect(mock.calls).toHaveLength(0);
    await publishArticle(article, context.store, mock, noWait);
    const edited = {
      ...article,
      bodyHtml: "<p>編集</p>",
      settings: { ...article.settings, syncQiita: false },
    };
    await publishArticle(edited, context.store, mock, noWait);
    expect(mock.calls.filter((call) => call.target === "qiita")).toHaveLength(
      1,
    );
    await publishArticle(
      { ...edited, settings: article.settings },
      context.store,
      mock,
      noWait,
    );
    expect(mock.calls.at(-1)?.input.remoteId).toBe("abcdef0123456789abcd");
  });

  test("一時エラーは失敗した媒体だけ再試行する", async () => {
    const mock = publishers();
    let tries = 0;
    const zenn: Publisher = async (input) => {
      if (++tries < 3)
        throw new PublishError("TEMPORARY", "一時エラー", "retry");
      return mock.zenn(input);
    };
    const result = await publishArticle(
      article,
      context.store,
      { qiita: mock.qiita, zenn },
      noWait,
    );
    expect(tries).toBe(3);
    expect(mock.calls.filter((call) => call.target === "qiita")).toHaveLength(
      1,
    );
    expect(result.every((item) => item.action === "updated")).toBe(true);
  });

  test("再試行に上限を設け、片方の失敗後ももう片方を処理する", async () => {
    const mock = publishers();
    let tries = 0;
    const zenn: Publisher = async () => {
      tries++;
      throw new PublishError("TEMPORARY", "一時エラー", "retry");
    };
    const result = await publishArticle(
      article,
      context.store,
      { qiita: mock.qiita, zenn },
      noWait,
    );
    expect(tries).toBe(3);
    expect(result.map((item) => item.publication?.status)).toEqual([
      "failed",
      "synced",
    ]);
  });

  test.each(["missing_remote", "unknown"] as const)(
    "外部削除・結果不明は次の実行でも自動再投稿しない: %s",
    async (disposition) => {
      let calls = 0;
      const qiita: Publisher = async () => {
        calls++;
        throw new PublishError(
          disposition === "unknown" ? "OUTCOME_UNKNOWN" : "REMOTE_NOT_FOUND",
          "確認待ち",
          disposition,
        );
      };
      const value = {
        ...article,
        settings: { ...article.settings, syncZenn: false },
      };
      await publishArticle(value, context.store, { qiita }, noWait);
      await publishArticle(
        { ...value, bodyHtml: "<p>変更</p>" },
        context.store,
        { qiita },
        noWait,
      );
      expect(calls).toBe(1);
    },
  );

  test("変換で内容が欠ける場合は送信せず、簡略化は記録する", async () => {
    const mock = publishers();
    const blocked = await publishArticle(
      { ...article, bodyHtml: "<video></video>" },
      context.store,
      mock,
      noWait,
    );
    expect(mock.calls).toHaveLength(0);
    expect(
      blocked.every((item) => item.publication?.status === "blocked"),
    ).toBe(true);
    const result = await publishArticle(
      { ...article, bodyHtml: '<p style="color:red">内容</p>' },
      context.store,
      mock,
      noWait,
    );
    expect(result[1].publication?.status).toBe("simplified");
    expect(result[1].publication?.warnings).not.toHaveLength(0);
    expect(result[0].publication?.status).toBe("submitted");
  });

  test("同時実行でも新規投稿を重複させない", async () => {
    const mock = publishers();
    await Promise.all([
      publishArticle(article, context.store, mock, noWait),
      publishArticle(article, context.store, mock, noWait),
    ]);
    expect(mock.calls.filter((call) => call.target === "qiita")).toHaveLength(
      1,
    );
    expect(mock.calls.filter((call) => call.target === "zenn")).toHaveLength(1);
  });

  test("送信成功後の保存失敗はsyncingを残し、再投稿しない", async () => {
    const mock = publishers();
    const store = {
      ...context.store,
      async savePublication(
        input: Parameters<typeof context.store.savePublication>[0],
      ) {
        if (input.status === "synced") throw new Error("Database unavailable");
        return context.store.savePublication(input);
      },
    };
    const value = {
      ...article,
      settings: { ...article.settings, syncZenn: false },
    };
    await publishArticle(value, store, mock, noWait);
    await publishArticle(value, context.store, mock, noWait);
    expect(mock.calls).toHaveLength(1);
    const stored = await context.store.ensureArticle({
      source: value.source,
      sourceUrl: value.sourceUrl,
    });
    expect((await context.store.listPublications(stored.id))[0].status).toBe(
      "syncing",
    );
  });
});
