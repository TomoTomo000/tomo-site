import { beforeEach, afterEach, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  receiveCrosspost,
  queuedCrosspost,
  scheduledCrosspost,
  type CrosspostEnv,
} from "../src/features/crosspost/runtime.server";
import { crosspostTestDatabase } from "./helpers/crosspost-database";

let context: ReturnType<typeof crosspostTestDatabase>;
let env: CrosspostEnv;
beforeEach(() => {
  context = crosspostTestDatabase();
  env = {
    APP_ENV: "production",
    CROSSPOST_ENABLED: "true",
    CROSSPOST_DB: context.adapter,
    CROSSPOST_QUEUE: { send: async () => {} },
    MICROCMS_SERVICE_DOMAIN: "example",
    MICROCMS_API_KEY: "cms-secret",
    SITE_URL: "https://example.com",
    CROSSPOST_WEBHOOK_SECRET: "hook-secret",
    QIITA_TOKEN: "qiita-secret",
    ZENN_GITHUB_TOKEN: "github-secret",
    ZENN_GITHUB_OWNER: "owner",
    ZENN_GITHUB_REPOSITORY: "repo",
    ZENN_GITHUB_BRANCH: "main",
    ZENN_USERNAME: "me",
  };
});
afterEach(() => context.database.close());
function queueDelivery(body: unknown = { contentId: "post-id" }) {
  let acknowledgements = 0;
  const retries: (QueueRetryOptions | undefined)[] = [];
  const message = {
    id: "message-id",
    timestamp: new Date(),
    attempts: 1,
    body,
    ack: () => {
      acknowledgements++;
    },
    retry: (options?: QueueRetryOptions) => {
      retries.push(options);
    },
  };
  return {
    batch: {
      queue: "tomo-site-crosspost",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [message],
      ackAll() {},
      retryAll() {},
    },
    get acknowledgements() {
      return acknowledgements;
    },
    retries,
  };
}
function notification() {
  const body = JSON.stringify({
    service: "example",
    api: "blog",
    id: "post-id",
    type: "new",
    contents: { old: null, new: { id: "post-id", status: ["PUBLISH"] } },
  });
  return new Request("https://example.com/api/crosspost/webhook", {
    method: "POST",
    body,
    headers: {
      "x-microcms-signature": createHmac("sha256", "hook-secret")
        .update(body)
        .digest("hex"),
    },
  });
}
test.each([
  { APP_ENV: "preview" },
  { APP_ENV: "development" },
  { APP_ENV: "test" },
  { CROSSPOST_ENABLED: "false" },
  { CROSSPOST_ENABLED: undefined },
])("無効・本番以外はDBにも通信にも触れない: %p", async (override) => {
  const disabled = { ...env, ...override };
  expect((await receiveCrosspost(notification(), disabled)).status).toBe(404);
  let calls = 0;
  await scheduledCrosspost(disabled, async () => {
    calls++;
    throw new Error("禁止");
  });
  expect(calls).toBe(0);
  expect(await context.jobs.get("microcms", "post-id")).toBeNull();
});
test("受信は保存だけを行い、定期実行で公開内容を取得して投稿する", async () => {
  expect((await receiveCrosspost(notification(), env)).status).toBe(202);
  await context.jobs.enqueue("microcms", "second-id");
  const requests: string[] = [];
  await scheduledCrosspost(env, async (url, init) => {
    requests.push(url);
    if (url.startsWith("https://example.microcms.io/"))
      return Response.json({
        id: "post-id",
        title: "記事",
        content: "<p>公開本文</p>",
        tags: [{ id: "ts", name: "typescript" }],
        publishedAt: "2026-10-12T00:00:00Z",
        updatedAt: "2026-10-12T00:00:00Z",
        syncQiita: true,
      });
    expect(url).toBe("https://qiita.com/api/v2/items");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body)).body).toContain("公開本文");
    return Response.json({
      id: "abcdef0123456789abcd",
      url: "https://qiita.com/me/items/abcdef0123456789abcd",
    });
  });
  expect(requests).toHaveLength(2);
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe("done");
  expect((await context.jobs.get("microcms", "second-id"))?.status).toBe(
    "pending",
  );
});
test("設定不足なら受信503・定期実行失敗となり、ジョブは取得しない", async () => {
  expect(
    (
      await receiveCrosspost(notification(), {
        ...env,
        CROSSPOST_DB: undefined,
      })
    ).status,
  ).toBe(503);
  expect(
    (
      await receiveCrosspost(notification(), {
        ...env,
        CROSSPOST_WEBHOOK_SECRET: undefined,
      })
    ).status,
  ).toBe(503);
  await context.jobs.enqueue("microcms", "post-id");
  let calls = 0;
  await rejects(
    scheduledCrosspost({ ...env, CROSSPOST_DB: undefined }, async () => {
      calls++;
      throw new Error("禁止");
    }),
    {
      message: "クロスポストの処理に失敗しました。設定とDBを確認してください。",
    },
  );
  expect(calls).toBe(0);
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "pending",
  );
});

test.each([false, true])(
  "Zenn設定がなくてもQiitaは同期できる（Zenn選択: %s）",
  async (syncZenn) => {
    await context.jobs.enqueue("microcms", "post-id");
    let sends = 0;
    await scheduledCrosspost(
      { ...env, ZENN_GITHUB_TOKEN: undefined },
      async (url) => {
        if (url.startsWith("https://example.microcms.io/"))
          return Response.json({
            id: "post-id",
            title: "記事",
            content: "<p>本文</p>",
            tags: [{ id: "ts", name: "typescript" }],
            publishedAt: "2026-10-12T00:00:00Z",
            updatedAt: "2026-10-12T00:00:00Z",
            syncQiita: true,
            syncZenn,
          });
        expect(url).toBe("https://qiita.com/api/v2/items");
        sends++;
        return Response.json({
          id: "abcdef0123456789abcd",
          url: "https://qiita.com/me/items/abcdef0123456789abcd",
        });
      },
    );
    expect(sends).toBe(1);
    expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
      syncZenn ? "review" : "done",
    );
    const rows = context.database
      .query(
        "SELECT target, status, error_code FROM crosspost_publications ORDER BY target",
      )
      .all();
    expect(rows).toContainEqual({
      target: "qiita",
      status: "synced",
      error_code: null,
    });
    if (syncZenn)
      expect(rows).toContainEqual({
        target: "zenn",
        status: "blocked",
        error_code: "CONFIGURATION",
      });
  },
);
test("CMS認証エラーを記録して無駄な再試行を止める", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  await scheduledCrosspost(
    env,
    async () => new Response("secret details", { status: 401 }),
  );
  expect((await context.jobs.get("microcms", "post-id"))?.errorCode).toBe(
    "SOURCE_HTTP_401",
  );
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "review",
  );
});

test("Qiita設定がなくてもZennだけを同期できる", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  let writes = 0;
  await scheduledCrosspost(
    { ...env, QIITA_TOKEN: undefined },
    async (url, init) => {
      if (url.startsWith("https://example.microcms.io/"))
        return Response.json({
          id: "post-id",
          title: "記事",
          content: "<p>本文</p>",
          tags: [{ id: "ts", name: "typescript" }],
          publishedAt: "2026-10-12T00:00:00Z",
          updatedAt: "2026-10-12T00:00:00Z",
          syncZenn: true,
        });
      expect(url.startsWith("https://api.github.com/")).toBe(true);
      if (init.method === "GET") return new Response(null, { status: 404 });
      writes++;
      return Response.json({
        content: { sha: "blob" },
        commit: { sha: "commit" },
      });
    },
  );
  expect(writes).toBe(1);
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe("done");
});
test("CMS設定不足もジョブに理由を残す", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  await scheduledCrosspost(
    { ...env, MICROCMS_API_KEY: undefined },
    async () => {
      throw Error("通信禁止");
    },
  );
  expect((await context.jobs.get("microcms", "post-id"))?.errorCode).toBe(
    "SOURCE_CONFIGURATION",
  );
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "review",
  );
});

test("署名検証・DB保存後に記事IDだけをQueueへ送り、投稿完了は待たない", async () => {
  const messages: unknown[] = [];
  env.CROSSPOST_QUEUE = {
    send: async (body) => {
      expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
        "pending",
      );
      messages.push(body);
    },
  };
  expect((await receiveCrosspost(notification(), env)).status).toBe(202);
  expect(messages).toEqual([{ contentId: "post-id" }]);
  const invalid = notification();
  invalid.headers.set("x-microcms-signature", "0".repeat(64));
  expect((await receiveCrosspost(invalid, env)).status).toBe(401);
  expect(messages).toHaveLength(1);
});

test("Queue送信失敗でも保存した通知をCronで回収できる", async () => {
  env.CROSSPOST_QUEUE = {
    send: async () => {
      throw Error("secret detail");
    },
  };
  expect((await receiveCrosspost(notification(), env)).status).toBe(202);
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "pending",
  );
  await scheduledCrosspost(
    env,
    async () => new Response(null, { status: 404 }),
  );
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe("done");
});

test("Queueは通知対象だけを即時処理し、重複配信で再投稿しない", async () => {
  await context.jobs.enqueue("microcms", "older-id");
  await receiveCrosspost(notification(), env);
  let reads = 0;
  let posts = 0;
  const http = async (url: string) => {
    if (url.startsWith("https://example.microcms.io/")) {
      expect(url).toContain("/post-id");
      reads++;
      return Response.json({
        id: "post-id",
        title: "記事",
        content: "<p>本文</p>",
        tags: [{ id: "ts", name: "typescript" }],
        publishedAt: "2026-10-12T00:00:00Z",
        updatedAt: "2026-10-12T00:00:00Z",
        syncQiita: true,
      });
    }
    posts++;
    return Response.json({
      id: "abcdef0123456789abcd",
      url: "https://qiita.com/me/items/abcdef0123456789abcd",
    });
  };
  const delivery = queueDelivery();
  await queuedCrosspost(delivery.batch, env, http);
  await queuedCrosspost(queueDelivery().batch, env, http);
  expect(reads).toBe(1);
  expect(posts).toBe(1);
  expect(delivery.acknowledgements).toBe(1);
  expect((await context.jobs.get("microcms", "older-id"))?.status).toBe(
    "pending",
  );
});

test("処理中の編集通知は元の処理終了後に再配信する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  const delivery = queueDelivery();
  await queuedCrosspost(delivery.batch, env, async () => {
    await context.jobs.enqueue("microcms", "post-id");
    return new Response(null, { status: 404 });
  });
  expect(delivery.acknowledgements).toBe(0);
  expect(delivery.retries).toEqual([{ delaySeconds: 0 }]);
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "pending",
  );
});

test("別実行が処理中の場合にロックを解除せず再配信する", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  const claimed = await context.jobs.claim("microcms");
  const delivery = queueDelivery();
  await queuedCrosspost(delivery.batch, env, async () => {
    throw Error("通信禁止");
  });
  expect(delivery.retries).toEqual([{ delaySeconds: 5 }]);
  expect((await context.jobs.get("microcms", "post-id"))?.token).toBe(
    claimed?.token,
  );
});

test("未到来の再試行日時をQueueで早めない", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  const job = (await context.jobs.claim("microcms"))!;
  await context.jobs.finish(job, {
    status: "pending",
    retryAt: new Date(Date.now() + 60000).toISOString(),
  });
  const delivery = queueDelivery();
  await queuedCrosspost(delivery.batch, env, async () => {
    throw Error("通信禁止");
  });
  expect(delivery.retries[0]?.delaySeconds).toBeGreaterThan(55);
  expect(delivery.acknowledgements).toBe(0);
});

test("不正なQueue本文とプレビュー環境では記事を処理しない", async () => {
  await context.jobs.enqueue("microcms", "post-id");
  for (const [body, settings] of [
    [{ contentId: "../bad" }, env],
    [{ contentId: "post-id" }, { ...env, APP_ENV: "preview" }],
  ] as const) {
    const delivery = queueDelivery(body);
    await queuedCrosspost(delivery.batch, settings, async () => {
      throw Error("通信禁止");
    });
    expect(delivery.acknowledgements).toBe(1);
  }
  expect((await context.jobs.get("microcms", "post-id"))?.status).toBe(
    "pending",
  );
});
