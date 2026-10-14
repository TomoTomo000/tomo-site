import { afterEach, beforeEach, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createHmac } from "node:crypto";
import { crosspostTestDatabase } from "./helpers/crosspost-database";
import { processJob } from "../src/features/crosspost/process-job";
import { microCmsWebhook } from "../src/features/crosspost/microcms-webhook";
import {
  PublishError,
  type Publisher,
  type PublishInput,
} from "../src/features/crosspost/publishers/publisher";
import type { CrosspostArticle } from "../src/features/crosspost/article";

let context: ReturnType<typeof crosspostTestDatabase>;
let time: number;
const now = () => new Date(time);
const article: CrosspostArticle = {
  source: { provider: "microcms", contentId: "post-id" },
  sourceUrl: "https://example.com/blog/post-id",
  title: "記事",
  bodyHtml: "<p>本文</p>",
  tags: ["typescript"],
  publishedAt: "2026-10-12T00:00:00Z",
  revision: "1",
  settings: { syncQiita: true, syncZenn: false, emoji: "📝", zennType: "tech" },
};
const source = async () => article;
const success: Publisher = async () => ({
  status: "synced",
  remoteId: "abcdef0123456789abcd",
  remoteUrl: "https://qiita.com/me/items/abcdef0123456789abcd",
});
const options = { now, sleep: async () => {} };
beforeEach(() => {
  time = Date.now();
  context = crosspostTestDatabase(now);
});
afterEach(() => context.database.close());
const run = (read = source, qiita = success) =>
  processJob("microcms", context.jobs, read, context.store, { qiita }, options);

test("署名付き通知は保存完了後に受理し、本文はDBに残さない", async () => {
  const body = JSON.stringify({
    service: "example",
    api: "blog",
    id: "post-id",
    type: "new",
    contents: {
      old: null,
      new: { id: "post-id", status: ["PUBLISH"], draftValue: "非公開データ" },
    },
  });
  const handler = microCmsWebhook(
    { service: "example", secret: "test" },
    (id) => context.jobs.enqueue("microcms", id),
  );
  const response = await handler(
    new Request("https://example.com", {
      method: "POST",
      body,
      headers: {
        "x-microcms-signature": createHmac("sha256", "test")
          .update(body)
          .digest("hex"),
      },
    }),
  );
  expect(response.status).toBe(202);
  const stored = await context.jobs.get("microcms", "post-id");
  expect(stored?.status).toBe("pending");
  expect(JSON.stringify(stored)).not.toContain("非公開データ");
  expect((await run())?.status).toBe("done");
});

test("連続通知を1件にまとめ、並列実行でも1つだけ取得する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  await context.jobs.enqueue("microcms", "post-id");
  const claims = await Promise.all([
    context.jobs.claim("microcms"),
    context.jobs.claim("microcms"),
  ]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  expect(claims.find(Boolean)?.generation).toBe(2);
});

test("処理中の通知を消さず、次回は最新の本文で同じ記事を更新する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  let current = article;
  const inputs: PublishInput[] = [];
  const publisher: Publisher = async (input) => {
    inputs.push(input);
    if (inputs.length === 1) {
      current = { ...article, bodyHtml: "<p>新しい本文</p>" };
      await context.jobs.enqueue("microcms", "post-id");
      expect(await context.jobs.claim("microcms")).toBeNull();
    }
    return success(input);
  };
  expect((await run(async () => current, publisher))?.status).toBe("pending");
  expect((await run(async () => current, publisher))?.status).toBe("done");
  expect(inputs).toHaveLength(2);
  expect(inputs[1].remoteId).toBe("abcdef0123456789abcd");
  expect(inputs[1].markdown).toContain("新しい本文");
});

test("一時的な取得失敗は時間を空けて再試行し、5回で確認待ちにする", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  const failing = async () => {
    throw new Error("secret details");
  };
  for (let attempt = 1; attempt <= 5; attempt++) {
    expect((await run(failing))?.status).toBe(
      attempt === 5 ? "review" : "pending",
    );
    expect(await run(failing)).toBeNull();
    const saved = await context.jobs.get("microcms", "post-id");
    expect(saved?.attempts).toBe(attempt);
    expect(JSON.stringify(saved)).not.toContain("secret details");
    time += 3_600_000;
  }
});

test("再試行時は再取得し、公開終了していたら送信しない", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  await run(async () => {
    throw new Error("temporary");
  });
  time += 60_000;
  let calls = 0;
  expect(
    (
      await processJob(
        "microcms",
        context.jobs,
        async () => null,
        context.store,
        {
          qiita: async (input) => {
            calls++;
            return success(input);
          },
        },
        options,
      )
    )?.status,
  ).toBe("done");
  expect(calls).toBe(0);
});

test("成功済みの媒体を再送せず、失敗した媒体だけ再処理する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  let qiitaCalls = 0;
  let zennCalls = 0;
  const publishers = {
    qiita: async (input: PublishInput) => {
      if (++qiitaCalls === 1)
        throw new PublishError("RATE_LIMIT", "待機", "retry", 120);
      return success(input);
    },
    zenn: async (input: PublishInput) => {
      zennCalls++;
      return {
        status: "submitted" as const,
        remoteId: `tomo-${input.articleId}`,
        remoteUrl: `https://zenn.dev/me/articles/tomo-${input.articleId}`,
      };
    },
  };
  const read = async () => ({
    ...article,
    settings: { ...article.settings, syncZenn: true },
  });
  expect(
    (
      await processJob(
        "microcms",
        context.jobs,
        read,
        context.store,
        publishers,
        options,
      )
    )?.status,
  ).toBe("pending");
  expect(
    await processJob(
      "microcms",
      context.jobs,
      read,
      context.store,
      publishers,
      options,
    ),
  ).toBeNull();
  // publishArticleは実時計を使うため、待機期限だけをテストDBで経過済みにする。
  context.database.run(
    "UPDATE crosspost_publications SET next_retry_at = '2000-01-01T00:00:00.000Z' WHERE status = 'failed'",
  );
  time += 180_000;
  expect(
    (
      await processJob(
        "microcms",
        context.jobs,
        read,
        context.store,
        publishers,
        options,
      )
    )?.status,
  ).toBe("done");
  expect(qiitaCalls).toBe(2);
  expect(zennCalls).toBe(1);
});

test("結果不明の投稿は確認待ちにし、新しい通知でも再投稿しない", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  let calls = 0;
  const unknown: Publisher = async () => {
    calls++;
    throw new PublishError("OUTCOME_UNKNOWN", "不明", "unknown");
  };
  expect((await run(source, unknown))?.status).toBe("review");
  await context.jobs.enqueue("microcms", "post-id");
  expect((await run(source, unknown))?.status).toBe("review");
  expect(calls).toBe(1);
});

test("中断した実行のロックは時間だけで解除しない・古い処理権で完了できない", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  const job = (await context.jobs.claim("microcms"))!;
  time += 86_400_000;
  await context.jobs.enqueue("microcms", "post-id");
  expect(await context.jobs.claim("microcms")).toBeNull();
  await rejects(
    context.jobs.finish({ ...job, token: "invalid" }, { status: "done" }),
  );
  await context.jobs.finish(job, { status: "done" });
  const next = (await context.jobs.claim("microcms"))!;
  await rejects(context.jobs.finish(job, { status: "done" }));
  await context.jobs.finish(next, { status: "done" });
});

test("再実行は確認待ちだけを原子的に再受付する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  expect(await context.jobs.retry("microcms", "post-id")).toBe(false);
  const claimed = (await context.jobs.claim("microcms"))!;
  expect(await context.jobs.retry("microcms", "post-id")).toBe(false);
  await context.jobs.finish(claimed, {
    status: "review",
    errorCode: "SOURCE_HTTP_401",
  });
  const results = await Promise.all([
    context.jobs.retry("microcms", "post-id"),
    context.jobs.retry("microcms", "post-id"),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect((await context.jobs.get("microcms", "post-id"))?.attempts).toBe(0);
  await run();
  expect(await context.jobs.retry("microcms", "post-id")).toBe(false);
});
test.each(["syncing", "missing_remote", "unknown"])(
  "危険な状態を再実行で解除しない: %s",
  async (state) => {
    await context.jobs.enqueue("microcms", "post-id");
    await run();
    context.database.run("UPDATE crosspost_jobs SET status='review'");
    context.database.run(
      "UPDATE crosspost_publications SET status=?,error_code=?",
      [
        state === "unknown" ? "blocked" : state,
        state === "unknown" ? "OUTCOME_UNKNOWN" : null,
      ],
    );
    expect(await context.jobs.retry("microcms", "post-id")).toBe(false);
    expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
      "review",
    );
  },
);

test("記事のDB保存失敗を取得失敗と区別する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  await processJob(
    "microcms",
    context.jobs,
    source,
    {
      ...context.store,
      ensureArticle: async () => {
        throw Error("secret SQL details");
      },
    },
    { qiita: success },
    options,
  );
  expect((await context.jobs.get("microcms", "post-id"))?.errorCode).toBe(
    "STORAGE",
  );
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "pending",
  );
});
