import { afterEach, beforeEach, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { crosspostTestDatabase } from "./helpers/crosspost-database";
import { stopZenn } from "../src/features/crosspost/stop-zenn";
import { publishArticle } from "../src/features/crosspost/publish-article";
import { zennFileRemoval } from "../src/features/crosspost/publishers/zenn";
import type { CrosspostArticle } from "../src/features/crosspost/article";
import type { Publisher } from "../src/features/crosspost/publishers/publisher";

let context: ReturnType<typeof crosspostTestDatabase>;
const article: CrosspostArticle = {
  source: { provider: "microcms", contentId: "post-id" },
  sourceUrl: "https://example.com/blog/post-id",
  title: "記事",
  bodyHtml: "<p>本文</p>",
  tags: ["typescript"],
  publishedAt: "2026-10-12T00:00:00Z",
  revision: "1",
  settings: { syncZenn: true, syncQiita: true, emoji: "📝", zennType: "tech" },
};
const zenn: Publisher = async (input) => ({
  status: "submitted",
  remoteId: `tomo-${input.articleId}`,
  remoteUrl: `https://zenn.dev/me/articles/tomo-${input.articleId}`,
});
const qiita: Publisher = async () => ({
  status: "synced",
  remoteId: "abcdef0123456789abcd",
  remoteUrl: "https://qiita.com/me/items/abcdef0123456789abcd",
});
beforeEach(async () => {
  context = crosspostTestDatabase();
  await publishArticle(article, context.store, { zenn, qiita });
});
afterEach(() => context.database.close());
async function current() {
  const a = await context.store.ensureArticle({
    source: article.source,
    sourceUrl: article.sourceUrl,
  });
  return context.store.ensurePublication(a.id, "zenn");
}

test("停止保存後に削除し、チェックがオンでもZennを再投稿しない", async () => {
  await stopZenn(article.source, context.store, async (id) => {
    expect((await current()).status).toBe("paused");
    expect((await current()).remoteId).toBe(id);
  });
  let sends = 0;
  const results = await publishArticle(
    { ...article, bodyHtml: "<p>編集後</p>" },
    context.store,
    {
      zenn: async () => {
        throw Error("送信禁止");
      },
      qiita: async (input) => {
        sends++;
        expect(input.remoteId).toBe("abcdef0123456789abcd");
        return qiita(input);
      },
    },
  );
  expect(results[0].action).toBe("skipped");
  expect(sends).toBe(1);
  expect((await current()).status).toBe("paused");
  await context.jobs.enqueue("microcms", "post-id");
  const job = (await context.jobs.claim("microcms"))!;
  await context.jobs.finish(job, { status: "review" });
  expect(await context.jobs.retry("microcms", "post-id")).toBe(true);
  expect((await current()).status).toBe("paused");
});
test("削除失敗・再実行でも停止状態を維持する", async () => {
  await rejects(
    stopZenn(article.source, context.store, async () => {
      throw Error("secret");
    }),
    /Zenn同期は停止済み/,
  );
  expect((await current()).status).toBe("paused");
  let calls = 0;
  await stopZenn(article.source, context.store, async () => {
    calls++;
  });
  expect(calls).toBe(1);
});
test.each(["syncing", "unknown"])(
  "送信中・結果不明の停止は拒否する: %s",
  async (state) => {
    context.database.run(
      "UPDATE crosspost_publications SET status=?, error_code=? WHERE target='zenn'",
      [
        state === "unknown" ? "blocked" : state,
        state === "unknown" ? "OUTCOME_UNKNOWN" : null,
      ],
    );
    let calls = 0;
    await rejects(
      stopZenn(article.source, context.store, async () => {
        calls++;
      }),
    );
    expect(calls).toBe(0);
  },
);
test("停止前に読み取った状態では送信権を取得できない", async () => {
  const stale = await current();
  await stopZenn(article.source, context.store, async () => {});
  await rejects(
    context.store.savePublication({
      articleId: stale.articleId,
      target: "zenn",
      expectedRevision: stale.revision,
      status: "syncing",
    }),
  );
  const paused = await current();
  await rejects(
    context.store.savePublication({
      articleId: paused.articleId,
      target: "zenn",
      expectedRevision: paused.revision,
      status: "syncing",
    }),
  );
});
test("未登録の記事では削除APIを呼ばない", async () => {
  await rejects(
    stopZenn(
      { provider: "microcms", contentId: "missing" },
      context.store,
      async () => {
        throw Error("削除禁止");
      },
    ),
    /掲載終了できません/,
  );
});

const config = {
  token: "test-token",
  owner: "owner",
  repository: "repo",
  branch: "main",
  username: "me",
};
const slug = "tomo-123456789012";
test("GitHubのSHAと指定ブランチで対象ファイルだけ削除する", async () => {
  const methods: string[] = [];
  await zennFileRemoval(config, async (url, init) => {
    methods.push(init.method!);
    expect(init.redirect).toBe("manual");
    expect(url).toStartWith(
      `https://api.github.com/repos/owner/repo/contents/articles/${slug}.md`,
    );
    if (init.method === "GET")
      return Response.json({ type: "file", sha: "current-sha" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      sha: "current-sha",
      branch: "main",
    });
    return Response.json({ commit: { sha: "deleted" } });
  })(slug);
  expect(methods).toEqual(["GET", "DELETE"]);
});
test("削除済みはブランチの実在確認後に完了し、DELETEしない", async () => {
  let calls = 0;
  await zennFileRemoval(config, async (url, init) => {
    calls++;
    expect(init.method).toBe("GET");
    return url.includes("/contents/")
      ? new Response(null, { status: 404 })
      : Response.json({ name: "main" });
  })(slug);
  expect(calls).toBe(2);
});
test("権限不足の404を削除済みと誤認しない", async () => {
  await rejects(
    zennFileRemoval(
      config,
      async () => new Response(null, { status: 404 }),
    )(slug),
  );
});
test("ファイル変更の競合では削除を再送しない", async () => {
  let calls = 0;
  await rejects(
    zennFileRemoval(config, async () =>
      ++calls === 1
        ? Response.json({ type: "file", sha: "old" })
        : new Response(null, { status: 409 }),
    )(slug),
  );
  expect(calls).toBe(2);
});
