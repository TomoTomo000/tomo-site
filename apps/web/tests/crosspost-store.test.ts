import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { rejects } from "node:assert/strict";
import { publicationStore } from "../src/features/crosspost/publication-store";
import { crosspostTestDatabase } from "./helpers/crosspost-database";

// 本番側ではD1Databaseをそのまま渡せることを型でも確認する。
function fromD1(database: D1Database) {
  return publicationStore(database);
}
void fromD1;

let database: Database;
let store: ReturnType<typeof publicationStore>;
const source = { provider: "microcms", contentId: "sample-post" };
const sourceUrl = "https://example.com/blog/sample-post";
const hash = "a".repeat(64);

beforeEach(() => {
  ({ database, store } = crosspostTestDatabase());
});
afterEach(() => database.close());

describe("投稿IDと同期状態の保存", () => {
  test("同じ記事の再登録でも固定IDは変わらない", async () => {
    const first = await store.ensureArticle({ source, sourceUrl });
    const again = await store.ensureArticle({
      source,
      sourceUrl: "https://example.com/blog/new-url",
    });
    expect(again.id).toBe(first.id);
    expect(again.sourceUrl).toEndWith("/new-url");
    expect(
      database.query("SELECT COUNT(*) AS count FROM crosspost_articles").get(),
    ).toEqual({ count: 1 });
  });

  test("片方が失敗しても、もう片方の投稿ID・同期成功は維持する", async () => {
    const article = await store.ensureArticle({ source, sourceUrl });
    await store.ensurePublication(article.id, "qiita");
    await store.ensurePublication(article.id, "zenn");
    await store.savePublication({
      articleId: article.id,
      target: "qiita",
      expectedRevision: 0,
      status: "synced",
      remoteId: "qiita-123",
      remoteUrl: "https://qiita.com/me/items/123",
      contentHash: hash,
    });
    await store.savePublication({
      articleId: article.id,
      target: "zenn",
      expectedRevision: 0,
      status: "failed",
      error: { code: "TEMPORARY", message: "再試行待ち" },
    });
    const [qiita, zenn] = await store.listPublications(article.id);
    expect(qiita).toMatchObject({
      remoteId: "qiita-123",
      status: "synced",
      lastSyncedHash: hash,
    });
    expect(qiita.lastSyncedAt).not.toBeNull();
    expect(zenn).toMatchObject({
      status: "failed",
      remoteId: null,
      lastSyncedAt: null,
    });
  });

  test("停止・再登録で外部IDや前回同期日時を消さない", async () => {
    const article = await store.ensureArticle({ source, sourceUrl });
    await store.ensurePublication(article.id, "qiita");
    const success = await store.savePublication({
      articleId: article.id,
      target: "qiita",
      expectedRevision: 0,
      status: "simplified",
      remoteId: "123",
      contentHash: hash,
      warnings: ["文字色を省略"],
    });
    await store.savePublication({
      articleId: article.id,
      target: "qiita",
      expectedRevision: 1,
      status: "paused",
    });
    const again = await store.ensurePublication(article.id, "qiita");
    expect(again).toMatchObject({
      remoteId: "123",
      status: "paused",
      lastSyncedAt: success.lastSyncedAt,
      lastSyncedHash: hash,
      revision: 2,
    });
  });

  test("外部削除による停止状態を再登録で解除しない", async () => {
    const article = await store.ensureArticle({ source, sourceUrl });
    await store.ensurePublication(article.id, "qiita");
    await store.savePublication({
      articleId: article.id,
      target: "qiita",
      expectedRevision: 0,
      status: "missing_remote",
      remoteId: "deleted-id",
      error: { code: "REMOTE_NOT_FOUND", message: "外部記事が見つかりません" },
    });
    expect(await store.ensurePublication(article.id, "qiita")).toMatchObject({
      status: "missing_remote",
      remoteId: "deleted-id",
    });
  });

  test("古い実行結果や外部IDの差し替えを拒否する", async () => {
    const article = await store.ensureArticle({ source, sourceUrl });
    await store.ensurePublication(article.id, "qiita");
    await store.savePublication({
      articleId: article.id,
      target: "qiita",
      expectedRevision: 0,
      status: "synced",
      remoteId: "123",
      contentHash: hash,
    });
    await rejects(
      store.savePublication({
        articleId: article.id,
        target: "qiita",
        expectedRevision: 0,
        status: "pending",
      }),
      /同期状態が変更/,
    );
    await rejects(
      store.savePublication({
        articleId: article.id,
        target: "qiita",
        expectedRevision: 1,
        status: "synced",
        remoteId: "other",
        contentHash: hash,
      }),
      /同期状態が変更/,
    );
  });

  test("CMSを変更しても投稿先との対応を引き継ぐ", async () => {
    const article = await store.ensureArticle({ source, sourceUrl });
    await store.ensurePublication(article.id, "zenn");
    await store.savePublication({
      articleId: article.id,
      target: "zenn",
      expectedRevision: 0,
      status: "submitted",
      remoteId: "stable-zenn-slug",
      contentHash: hash,
    });
    const nextSource = { provider: "custom", contentId: "new-cms-id" };
    await store.changeSource(article.id, nextSource);
    const again = await store.ensureArticle({ source: nextSource, sourceUrl });
    expect(again.id).toBe(article.id);
    expect(await store.listPublications(again.id)).toMatchObject([
      { remoteId: "stable-zenn-slug", status: "submitted", lastSyncedAt: null },
    ]);
  });

  test("同じ外部記事を別の記事に割り当てない", async () => {
    const first = await store.ensureArticle({ source, sourceUrl });
    const second = await store.ensureArticle({
      source: { ...source, contentId: "second" },
      sourceUrl,
    });
    for (const article of [first, second])
      await store.ensurePublication(article.id, "qiita");
    await store.savePublication({
      articleId: first.id,
      target: "qiita",
      expectedRevision: 0,
      status: "synced",
      remoteId: "123",
      contentHash: hash,
    });
    await rejects(
      store.savePublication({
        articleId: second.id,
        target: "qiita",
        expectedRevision: 0,
        status: "synced",
        remoteId: "123",
        contentHash: hash,
      }),
    );
  });

  test("記事のない保存・理由のない失敗・IDのない成功を拒否する", async () => {
    await rejects(store.ensurePublication(crypto.randomUUID(), "qiita"));
    const article = await store.ensureArticle({ source, sourceUrl });
    await store.ensurePublication(article.id, "qiita");
    await rejects(
      store.savePublication({
        articleId: article.id,
        target: "qiita",
        expectedRevision: 0,
        status: "failed",
      }),
    );
    await rejects(
      store.savePublication({
        articleId: article.id,
        target: "qiita",
        expectedRevision: 0,
        status: "synced",
        contentHash: hash,
      }),
    );
  });
});
