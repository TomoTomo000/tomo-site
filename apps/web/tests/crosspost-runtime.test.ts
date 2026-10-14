import { beforeEach, afterEach, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  receiveCrosspost,
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
      message:
        "クロスポストの定期処理に失敗しました。設定とDBを確認してください。",
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
