import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { rejects } from "node:assert/strict";
import { microCmsWebhook } from "../src/features/crosspost/microcms-webhook";
import { microCmsSource } from "../src/features/crosspost/microcms-source";
import { syncSourceArticle } from "../src/features/crosspost/sync-source-article";
import type { PublishInput } from "../src/features/crosspost/publishers/publisher";
import { crosspostTestDatabase } from "./helpers/crosspost-database";

const config = { service: "example", secret: "test-webhook-secret" };
const sourceConfig = {
  service: "example",
  apiKey: "test-api-key",
  siteUrl: "https://example.com",
};
const event = {
  service: "example",
  api: "blog",
  id: "post-id",
  type: "edit",
  contents: {
    old: { id: "post-id" },
    new: {
      id: "post-id",
      status: ["PUBLISH", "DRAFT"],
      draftKey: "never-forward-this",
      draftValue: { content: "非公開の本文" },
      publishValue: { content: "古い本文" },
    },
  },
};
const article = {
  id: "post-id",
  title: "記事",
  content: "<p>最新の公開本文</p>",
  tags: [{ id: "typescript", name: "typescript" }],
  updatedAt: "2026-10-12T00:00:00Z",
  publishedAt: "2026-10-12T00:00:00Z",
  syncQiita: true,
  syncZenn: false,
};
function request(value: unknown = event, secret = config.secret) {
  const body = typeof value === "string" ? value : JSON.stringify(value);
  return new Request("https://example.com/test-webhook", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "x-microcms-signature": createHmac("sha256", secret)
        .update(body)
        .digest("hex"),
    },
  });
}

describe("microCMSの署名付き通知", () => {
  test("署名を検証し、本文や下書きキーを渡さずIDだけ受け付ける", async () => {
    const ids: string[] = [];
    const handler = microCmsWebhook(config, async (id) => {
      ids.push(id);
    });
    expect((await handler(request())).status).toBe(202);
    expect(ids).toEqual(["post-id"]);
  });

  test("署名なし・誤った署名・署名後の本文改ざんは拒否する", async () => {
    let calls = 0;
    const handler = microCmsWebhook(config, async () => {
      calls++;
    });
    const unsigned = request();
    unsigned.headers.delete("x-microcms-signature");
    const original = request();
    const tampered = new Request(original.url, {
      method: "POST",
      headers: original.headers,
      body: JSON.stringify({ ...event, id: "other" }),
    });
    for (const input of [unsigned, request(event, "wrong-secret"), tampered])
      expect((await handler(input)).status).toBe(401);
    expect(calls).toBe(0);
  });

  test.each([
    {
      ...event,
      type: "delete",
      contents: { old: { id: "post-id" }, new: null },
    },
    { ...event, id: null, contents: null },
    ...["DRAFT", "CLOSED"].map((status) => ({
      ...event,
      contents: {
        ...event.contents,
        new: { ...event.contents.new, status: [status] },
      },
    })),
  ])("削除・API設定・未公開の通知は同期しない: %p", async (value) => {
    let calls = 0;
    const response = await microCmsWebhook(config, async () => {
      calls++;
    })(request(value));
    expect(response.status).toBe(200);
    expect(calls).toBe(0);
  });

  test.each([
    [{ ...event, service: "another" }, 403],
    [{ ...event, api: "other" }, 403],
    [{ ...event, id: "../other" }, 400],
    [{ ...event, id: "different" }, 400],
    [
      { ...event, contents: { ...event.contents, old: { id: "previous-id" } } },
      409,
    ],
    ["invalid JSON", 400],
  ] as const)("通知の不一致や形式不正は拒否する: %p", async (value, status) => {
    let calls = 0;
    const response = await microCmsWebhook(config, async () => {
      calls++;
    })(request(value));
    expect(response.status).toBe(status);
    expect(calls).toBe(0);
  });

  test("処理を引き渡せなかった場合に受理成功を返さない", async () => {
    const response = await microCmsWebhook(config, async () => {
      throw new Error("secret failure details");
    })(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });

  test("POST以外と大きすぎる通知を拒否する", async () => {
    let calls = 0;
    const handler = microCmsWebhook(config, async () => {
      calls++;
    });
    expect((await handler(new Request("https://example.com"))).status).toBe(
      405,
    );
    expect(
      (await handler(request("x".repeat(10 * 1024 * 1024 + 1)))).status,
    ).toBe(413);
    expect(calls).toBe(0);
  });
});

describe("通知から公開記事の同期まで", () => {
  let context: ReturnType<typeof crosspostTestDatabase>;
  beforeEach(() => {
    context = crosspostTestDatabase();
  });
  afterEach(() => context.database.close());

  test("古い通知や公開中の下書き編集でも公開APIの内容を使い、重複投稿しない", async () => {
    const calls: PublishInput[] = [];
    let current = article;
    const source = microCmsSource(sourceConfig, async (url, init) => {
      const parsed = new URL(url);
      expect(parsed.origin).toBe("https://example.microcms.io");
      expect(parsed.pathname).toBe("/api/v1/blog/post-id");
      expect(parsed.searchParams.has("draftKey")).toBe(false);
      expect(init.method).toBe("GET");
      expect(init.redirect).toBe("manual");
      expect(init.cache).toBe("no-store");
      expect(new Headers(init.headers).get("X-MICROCMS-API-KEY")).toBe(
        "test-api-key",
      );
      return Response.json(current);
    });
    const handler = microCmsWebhook(config, async (id) => {
      // ローカルの結合テストだけ直接実行。本番では永続化した通知を別途処理する。
      await syncSourceArticle(id, source, context.store, {
        qiita: async (input) => {
          calls.push(input);
          return {
            status: "synced",
            remoteId: "abcdef0123456789abcd",
            remoteUrl: "https://qiita.com/me/items/abcdef0123456789abcd",
          };
        },
      });
    });
    expect((await handler(request())).status).toBe(202);
    expect(calls[0].markdown).toContain("最新の公開本文");
    expect(calls[0].markdown).not.toContain("非公開");
    expect(calls[0].markdown).not.toContain("古い本文");
    await handler(request());
    expect(calls).toHaveLength(1);
    current = { ...article, content: "<p>公開後の編集</p>" };
    await handler(request());
    expect(calls).toHaveLength(2);
    expect(calls[1].remoteId).toBe("abcdef0123456789abcd");
    current = { ...current, syncQiita: false };
    await handler(request());
    expect(calls).toHaveLength(2);
  });

  test.each([404, 200])(
    "取得時点で非公開なら投稿先に触れない: %s",
    async (status) => {
      let calls = 0;
      const source = microCmsSource(sourceConfig, async () =>
        status === 404
          ? new Response(null, { status: 404 })
          : Response.json({ ...article, publishedAt: undefined }),
      );
      const results = await syncSourceArticle(
        "post-id",
        source,
        context.store,
        {
          qiita: async () => {
            calls++;
            throw new Error("送信禁止");
          },
        },
      );
      expect(results).toEqual([]);
      expect(calls).toBe(0);
    },
  );

  test.each([301, 302, 307, 308, 401, 429, 500])(
    "CMSの取得失敗を非公開として握りつぶさない: %s",
    async (status) => {
      const source = microCmsSource(
        sourceConfig,
        async () => new Response("secret response", { status }),
      );
      await rejects(source("post-id"), {
        message: `SOURCE_HTTP_${status}`,
      });
    },
  );

  test("通信失敗・記事の不一致・不正JSONを安全なエラーで返す", async () => {
    const network = microCmsSource(sourceConfig, async () => {
      throw new Error("secret network details");
    });
    await rejects(network("post-id"), {
      message: "SOURCE_NETWORK",
    });
    for (const response of [
      Response.json({ ...article, id: "other" }),
      new Response("not json"),
    ]) {
      const source = microCmsSource(sourceConfig, async () => response);
      await rejects(source("post-id"), {
        message: "SOURCE_INVALID_DATA",
      });
    }
  });
});
