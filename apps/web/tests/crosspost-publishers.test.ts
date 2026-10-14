import { describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { Buffer } from "node:buffer";
import { qiitaPublisher } from "../src/features/crosspost/publishers/qiita";
import { zennPublisher } from "../src/features/crosspost/publishers/zenn";
import {
  PublishError,
  type PublishInput,
  type HttpClient,
} from "../src/features/crosspost/publishers/publisher";

const article: PublishInput = {
  articleId: "9d88b4f9-6e2c-49bc-a848-bc7f6ed36e47",
  remoteId: null,
  title: "日本語の記事",
  markdown: "## 本文\n\nテスト",
  tags: ["typescript"],
  emoji: "📝",
  zennType: "tech",
};
const qiitaId = "abcdef0123456789abcd";
const qiitaResult = {
  id: qiitaId,
  url: `https://qiita.com/test/items/${qiitaId}`,
};
const zennConfig = {
  token: "fake-github-token",
  owner: "owner",
  repository: "articles",
  branch: "main",
  username: "test",
};
const githubResult = {
  content: { sha: "new-blob" },
  commit: { sha: "commit" },
};

function httpQueue(...responses: Array<Response | Error>) {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const http: HttpClient = async (url, init) => {
    requests.push({ url, init });
    const response = responses.shift();
    if (!response || response instanceof Error)
      throw response ?? new Error("Unexpected request");
    return response;
  };
  return { http, requests };
}
const json = (value: unknown, status = 200) => Response.json(value, { status });
const failure =
  (code: string, disposition: PublishError["disposition"]) =>
  (error: unknown) =>
    error instanceof PublishError &&
    error.code === code &&
    error.disposition === disposition;

describe("Qiitaへの投稿・更新（通信はすべて差し替え）", () => {
  test.each([301, 302, 307, 308])(
    "転送先へ認証情報を送らず停止する: %s",
    async (status) => {
      const mock = httpQueue(
        new Response(null, {
          status,
          headers: { Location: "https://other.example/" },
        }),
      );
      await rejects(
        qiitaPublisher({ token: "fake-token" }, mock.http)(article),
        failure(`HTTP_${status}`, "blocked"),
      );
      expect(mock.requests).toHaveLength(1);
      expect(mock.requests[0].init.redirect).toBe("manual");
    },
  );
  test("新規記事をPOSTし、投稿IDを返す", async () => {
    const mock = httpQueue(json(qiitaResult, 201));
    expect(
      await qiitaPublisher({ token: "fake-token" }, mock.http)(article),
    ).toEqual({
      status: "synced",
      remoteId: qiitaId,
      remoteUrl: qiitaResult.url,
    });
    expect(mock.requests[0].url).toBe("https://qiita.com/api/v2/items");
    expect(mock.requests[0].init).toMatchObject({
      method: "POST",
      redirect: "manual",
    });
    expect(JSON.parse(String(mock.requests[0].init.body))).toEqual({
      title: article.title,
      body: article.markdown,
      tags: [{ name: "typescript", versions: [] }],
      private: false,
    });
  });

  test("投稿済み記事は保存されたIDにPATCHする", async () => {
    const mock = httpQueue(json(qiitaResult));
    await qiitaPublisher(
      { token: "fake-token" },
      mock.http,
    )({ ...article, remoteId: qiitaId });
    expect(mock.requests[0].init.method).toBe("PATCH");
    expect(mock.requests[0].url).toEndWith(`/${qiitaId}`);
  });

  test("削除済みの記事をPOSTし直さない", async () => {
    const mock = httpQueue(json({}, 404));
    await rejects(
      qiitaPublisher(
        { token: "fake-token" },
        mock.http,
      )({ ...article, remoteId: qiitaId }),
      failure("REMOTE_NOT_FOUND", "missing_remote"),
    );
    expect(mock.requests).toHaveLength(1);
  });

  test.each([
    new Error("fake-token: network lost"),
    json({}, 500),
    new Response("invalid-json", { status: 201 }),
    json({ id: "invalid" }, 201),
  ])("新規投稿の結果が不明なら自動再試行しない: %p", async (response) => {
    const mock = httpQueue(response);
    await rejects(
      qiitaPublisher({ token: "fake-token" }, mock.http)(article),
      (error: unknown) =>
        failure("OUTCOME_UNKNOWN", "unknown")(error) &&
        !(error as Error).message.includes("fake-token"),
    );
    expect(mock.requests).toHaveLength(1);
  });

  test("更新時の一時エラーは再試行可能として返す", async () => {
    const mock = httpQueue(json({}, 503));
    await rejects(
      qiitaPublisher(
        { token: "fake-token" },
        mock.http,
      )({ ...article, remoteId: qiitaId }),
      failure("TEMPORARY", "retry"),
    );
  });

  test("利用制限の待ち時間を返す", async () => {
    const mock = httpQueue(
      new Response("", { status: 429, headers: { "Retry-After": "120" } }),
    );
    await rejects(
      qiitaPublisher({ token: "fake-token" }, mock.http)(article),
      (error: unknown) =>
        error instanceof PublishError &&
        error.disposition === "retry" &&
        error.retryAfterSeconds === 120,
    );
  });

  test.each([401, 403, 422])(
    "認証・入力エラーは停止する: %i",
    async (status) => {
      const mock = httpQueue(json({ message: "fake-token" }, status));
      await rejects(
        qiitaPublisher({ token: "fake-token" }, mock.http)(article),
        failure(`HTTP_${status}`, "blocked"),
      );
    },
  );

  test("不正なIDや空タグは通信前に停止する", async () => {
    const mock = httpQueue();
    const publish = qiitaPublisher({ token: "fake-token" }, mock.http);
    await rejects(
      publish({ ...article, remoteId: "../../other" }),
      failure("INVALID_REMOTE_ID", "blocked"),
    );
    await rejects(
      publish({ ...article, tags: [] }),
      failure("INVALID_INPUT", "blocked"),
    );
    expect(mock.requests).toHaveLength(0);
  });
});

describe("ZennのGitHub連携（通信はすべて差し替え）", () => {
  test("固定slugで作成し、GitHub送信成功を公開完了と区別する", async () => {
    const mock = httpQueue(json({}, 404), json(githubResult, 201));
    const result = await zennPublisher(zennConfig, mock.http)(article);
    expect(result).toMatchObject({
      status: "submitted",
      remoteId: `tomo-${article.articleId}`,
    });
    const payload = JSON.parse(String(mock.requests[1].init.body));
    expect(payload.branch).toBe("main");
    expect(payload).not.toHaveProperty("sha");
    const document = Buffer.from(payload.content, "base64").toString("utf8");
    expect(document).toContain('title: "日本語の記事"');
    expect(document).toContain("published: true");
    expect(document).toEndWith(article.markdown);
    expect(mock.requests[1].init.method).toBe("PUT");
  });

  test("更新は既存のSHAを指定し、タイトルを変えてもファイル名を変えない", async () => {
    const mock = httpQueue(
      json({ type: "file", sha: "old-sha" }),
      json(githubResult),
    );
    await zennPublisher(
      zennConfig,
      mock.http,
    )({
      ...article,
      remoteId: "fixed-zenn-slug",
      title: '変更: "タイトル"\n---\npublished: false',
    });
    expect(mock.requests[0].url).toContain(
      "articles/fixed-zenn-slug.md?ref=main",
    );
    const payload = JSON.parse(String(mock.requests[1].init.body));
    expect(payload.sha).toBe("old-sha");
    const document = Buffer.from(payload.content, "base64").toString("utf8");
    expect(document).not.toContain("\n---\npublished: false");
    expect(document).toContain('\\n---\\npublished: false"');
  });

  test("連携ファイルが消えていたら再作成しない", async () => {
    const mock = httpQueue(json({}, 404));
    await rejects(
      zennPublisher(
        zennConfig,
        mock.http,
      )({ ...article, remoteId: "fixed-zenn-slug" }),
      failure("REMOTE_NOT_FOUND", "missing_remote"),
    );
    expect(mock.requests).toHaveLength(1);
  });

  test("新規作成時の同名ファイルを上書きしない", async () => {
    const mock = httpQueue(json({ type: "file", sha: "someone-elses-file" }));
    await rejects(
      zennPublisher(zennConfig, mock.http)(article),
      failure("FILE_EXISTS", "blocked"),
    );
    expect(mock.requests).toHaveLength(1);
  });

  test("SHAの競合は最新のファイルを確認して再試行できる", async () => {
    const mock = httpQueue(json({ type: "file", sha: "old" }), json({}, 409));
    await rejects(
      zennPublisher(
        zennConfig,
        mock.http,
      )({ ...article, remoteId: "fixed-zenn-slug" }),
      failure("CONFLICT", "retry"),
    );
  });

  test("PUT後の通信切断は確認待ちにする", async () => {
    const mock = httpQueue(json({}, 404), new Error("network lost"));
    await rejects(
      zennPublisher(zennConfig, mock.http)(article),
      failure("OUTCOME_UNKNOWN", "unknown"),
    );
    expect(mock.requests).toHaveLength(2);
  });
});
